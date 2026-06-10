import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../services/api.js'
import { downsampleBuffer } from '../utils/audioResample.js'

/** First audio packet sent ASAP so you see text sooner (then steady chunks). */
const FIRST_CHUNK_SEC = 0.75
/** Steady chunk length — shorter = lower latency, more API calls. */
const CHUNK_SEC = 1.05

/**
 * Streams microphone audio to the backend Whisper model (OpenAI Whisper via Transformers.js).
 * Chains flushes so work is not skipped while the server is still transcribing.
 */
export default function useWhisperSpeechRecognition(onTranscript, language = 'en', options = {}) {
  const { enabled = true } = options
  const pendingRef = useRef(new Float32Array(0))
  const finalTextRef = useRef('')
  const finalAugmentRef = useRef('')
  const firstChunkDoneRef = useRef(false)
  const inputSampleRateRef = useRef(48000)
  const chunkTimerRef = useRef(null)
  const flushBusyRef = useRef(false)
  const audioCtxRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const processorRef = useRef(null)
  const sourceRef = useRef(null)
  const gainRef = useRef(null)

  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [warmupOk, setWarmupOk] = useState(false)
  const [warmupLoading, setWarmupLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      setWarmupOk(false)
      setWarmupLoading(false)
      return undefined
    }
    let cancelled = false
    setWarmupLoading(true)
    api
      .get('/stt/warmup')
      .then(() => {
        if (!cancelled) {
          setWarmupOk(true)
          setError('')
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setWarmupOk(false)
          setError(
            e?.response?.data?.message ||
              'Whisper warmup failed. Is the backend running?'
          )
        }
      })
      .finally(() => {
        if (!cancelled) setWarmupLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  const releaseAudio = useCallback(() => {
    try {
      processorRef.current?.disconnect()
    } catch {
      /* noop */
    }
    processorRef.current = null
    try {
      sourceRef.current?.disconnect()
    } catch {
      /* noop */
    }
    sourceRef.current = null
    try {
      gainRef.current?.disconnect()
    } catch {
      /* noop */
    }
    gainRef.current = null
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null
    if (audioCtxRef.current?.state !== 'closed') {
      audioCtxRef.current?.close().catch(() => {})
    }
    audioCtxRef.current = null
  }, [])

  const getChunkSamples = useCallback((rate) => {
    const sec = firstChunkDoneRef.current ? CHUNK_SEC : FIRST_CHUNK_SEC
    return Math.floor(rate * sec)
  }, [])

  const flushPending = useCallback(
    async (isFinal) => {
      const rate = inputSampleRateRef.current
      const chunkSamples = getChunkSamples(rate)
      const minTail = Math.floor(rate * 0.2)

      const len = pendingRef.current.length
      if (len === 0) return
      if (!isFinal && len < chunkSamples) return
      if (isFinal && len < minTail) return
      if (flushBusyRef.current) return

      const segment = isFinal
        ? pendingRef.current
        : pendingRef.current.subarray(0, chunkSamples)

      const pcm16k = downsampleBuffer(segment, rate, 16000)
      /** Aligned with backend min ~0.22s at 16 kHz */
      if (pcm16k.length < 3520) return

      if (isFinal) {
        pendingRef.current = new Float32Array(0)
      } else {
        pendingRef.current = pendingRef.current.subarray(chunkSamples)
      }

      flushBusyRef.current = true
      setIsTranscribing(true)
      try {
        const buf = pcm16k.buffer.slice(
          pcm16k.byteOffset,
          pcm16k.byteOffset + pcm16k.byteLength
        )
        const { data } = await api.post('/stt/transcribe', buf, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Sample-Rate': '16000',
            'X-STT-Lang': language === 'hi' ? 'hi' : 'en',
          },
        })
        const piece = typeof data?.text === 'string' ? data.text.trim() : ''
        const aug = typeof data?.augment === 'string' ? data.augment.trim() : ''
        if (piece) {
          finalTextRef.current = `${finalTextRef.current} ${piece}`.trim()
        }
        if (aug) {
          finalAugmentRef.current = `${finalAugmentRef.current} ${aug}`.trim()
        }
        if (piece || aug) {
          onTranscript(finalTextRef.current, finalAugmentRef.current)
        }
        if (!isFinal) {
          firstChunkDoneRef.current = true
        }
      } catch (e) {
        const msg =
          e?.response?.data?.message || e?.message || 'Transcription request failed'
        setError(msg)
      } finally {
        flushBusyRef.current = false
        setIsTranscribing(false)
        if (!isFinal) {
          const need = getChunkSamples(inputSampleRateRef.current)
          if (pendingRef.current.length >= need) {
            queueMicrotask(() => {
              void flushPending(false)
            })
          }
        }
      }
    },
    [getChunkSamples, language, onTranscript]
  )

  useEffect(() => {
    return () => {
      if (chunkTimerRef.current) {
        window.clearInterval(chunkTimerRef.current)
      }
      releaseAudio()
    }
  }, [releaseAudio])

  const stopListening = useCallback(() => {
    if (chunkTimerRef.current) {
      window.clearInterval(chunkTimerRef.current)
      chunkTimerRef.current = null
    }
    setIsListening(false)
    releaseAudio()
    void (async () => {
      await flushPending(true)
      pendingRef.current = new Float32Array(0)
    })()
  }, [flushPending, releaseAudio])

  const startListening = useCallback(async () => {
    if (!enabled || !warmupOk || warmupLoading) return
    if (isListening) return
    setError('')
    finalTextRef.current = ''
    finalAugmentRef.current = ''
    firstChunkDoneRef.current = false
    pendingRef.current = new Float32Array(0)
    onTranscript('', '')

    const audioContext = new AudioContext()
    inputSampleRateRef.current = audioContext.sampleRate
    audioCtxRef.current = audioContext

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      })
    } catch {
      setError('Microphone access denied or unavailable.')
      await audioContext.close().catch(() => {})
      audioCtxRef.current = null
      return
    }

    mediaStreamRef.current = stream
    await audioContext.resume()

    const bufferSize = 4096
    const processor = audioContext.createScriptProcessor(bufferSize, 1, 1)
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0)
      const chunk = new Float32Array(input.length)
      chunk.set(input)
      const prev = pendingRef.current
      const next = new Float32Array(prev.length + chunk.length)
      next.set(prev)
      next.set(chunk, prev.length)
      pendingRef.current = next
    }

    const source = audioContext.createMediaStreamSource(stream)
    const gain = audioContext.createGain()
    gain.gain.value = 0
    source.connect(processor)
    processor.connect(gain)
    gain.connect(audioContext.destination)

    processorRef.current = processor
    sourceRef.current = source
    gainRef.current = gain

    const tickMs = 180
    chunkTimerRef.current = window.setInterval(() => {
      void flushPending(false)
    }, tickMs)

    setIsListening(true)
  }, [enabled, flushPending, isListening, onTranscript, warmupLoading, warmupOk])

  return {
    isListening,
    isTranscribing,
    startListening,
    stopListening,
    isSupported: true,
    error,
    warmupOk,
    warmupLoading,
  }
}
