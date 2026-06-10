import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** @param {string} lang BCP-47 tag, e.g. en-US, hi-IN */
export default function useSpeechRecognition(onTranscript, options = {}) {
  const { enabled = true, lang = 'en-US', resetOnStart = false } = options
  const recognitionRef = useRef(null)
  const finalTranscriptRef = useRef('')
  /** Extra text from non-primary STT alternatives (cumulative for final segments) — helps catch hesitations the top hypothesis drops. */
  const fillerAltAugmentRef = useRef('')
  const isStartingRef = useRef(false)
  const shouldListenRef = useRef(false)
  const retryStartTimeoutRef = useRef(null)
  const startListeningRef = useRef(() => {})
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState('')

  const isSupported = useMemo(() => {
    if (!enabled) return true
    if (typeof window === 'undefined') return true
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      recognitionRef.current = null
      return undefined
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      return undefined
    }

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang
    recognition.maxAlternatives = 3

    recognition.onresult = (event) => {
      let interimTranscript = ''
      let interimAltAugment = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const bestTranscript = result?.[0]?.transcript || ''
        if (!bestTranscript) continue
        const bestTrim = bestTranscript.trim()
        const appendDistinctAlts = () => {
          for (let a = 1; a < result.length; a += 1) {
            const alt = result[a]?.transcript?.trim()
            if (alt && alt !== bestTrim) {
              if (result.isFinal) {
                fillerAltAugmentRef.current = `${fillerAltAugmentRef.current} ${alt}`.trim()
              } else {
                interimAltAugment = `${interimAltAugment} ${alt}`.trim()
              }
            }
          }
        }
        appendDistinctAlts()
        if (result.isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${bestTranscript}`.trim()
        } else {
          interimTranscript = `${interimTranscript} ${bestTranscript}`.trim()
        }
      }
      const combined = `${finalTranscriptRef.current} ${interimTranscript}`.trim()
      const fillerAugment = `${fillerAltAugmentRef.current} ${interimAltAugment}`.trim()
      onTranscript(combined, fillerAugment)
    }

    recognition.onstart = () => {
      isStartingRef.current = false
      setError('')
      setIsListening(true)
    }

    recognition.onerror = (event) => {
      isStartingRef.current = false
      setError(event?.error ? `Speech error: ${event.error}` : 'Speech recognition error')
      setIsListening(false)
    }

    recognition.onend = () => {
      isStartingRef.current = false
      setIsListening(false)
      // Some browsers stop after short silence even with continuous=true.
      // Auto-restart while the user is still in listening mode.
      if (shouldListenRef.current) {
        retryStartTimeoutRef.current = window.setTimeout(() => {
          if (isStartingRef.current) return
          startListeningRef.current()
        }, 180)
      }
    }

    recognitionRef.current = recognition

    return () => {
      isStartingRef.current = false
      if (retryStartTimeoutRef.current) {
        window.clearTimeout(retryStartTimeoutRef.current)
      }
      try {
        recognition.stop()
      } catch {
        // Ignore stop errors during cleanup.
      }
    }
  }, [onTranscript, enabled, lang])

  const startListening = useCallback(() => {
    if (!enabled) return
    if (!recognitionRef.current) return
    if (isListening || isStartingRef.current) return
    shouldListenRef.current = true
    setError('')
    isStartingRef.current = true
    if (resetOnStart) {
      finalTranscriptRef.current = ''
      fillerAltAugmentRef.current = ''
      onTranscript('', '')
    }
    try {
      recognitionRef.current.start()
    } catch (error) {
      isStartingRef.current = false
      const msg = String(error?.message || '').toLowerCase()
      const isAlreadyStarted =
        error?.name === 'InvalidStateError' || msg.includes('already started')
      if (isAlreadyStarted) {
        // Browser may still be transitioning from stop -> start.
        retryStartTimeoutRef.current = window.setTimeout(() => {
          if (isListening || isStartingRef.current) return
          startListeningRef.current()
        }, 250)
        return
      }
      setError('Unable to start microphone recognition. Please allow microphone access and try again.')
      setIsListening(false)
    }
  }, [enabled, isListening, onTranscript])

  useEffect(() => {
    startListeningRef.current = startListening
  }, [startListening])

  const stopListening = useCallback(() => {
    if (!enabled) return
    if (!recognitionRef.current) return
    shouldListenRef.current = false
    isStartingRef.current = false
    if (retryStartTimeoutRef.current) {
      window.clearTimeout(retryStartTimeoutRef.current)
      retryStartTimeoutRef.current = null
    }
    try {
      recognitionRef.current.stop()
    } catch {
      // Ignore stop errors triggered by duplicate stop calls.
    }
    setIsListening(false)
  }, [enabled])

  const clearTranscriptBuffer = useCallback(() => {
    finalTranscriptRef.current = ''
    fillerAltAugmentRef.current = ''
    onTranscript('', '')
  }, [onTranscript])

  return { isListening, startListening, stopListening, clearTranscriptBuffer, isSupported, error }
}
