import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useNavigate, useParams } from 'react-router-dom'

import VoiceWave from '../components/VoiceWave.jsx'

import useSpeechRecognition from '../hooks/useSpeechRecognition.js'

import { useInterview } from '../context/InterviewContext.jsx'

import api from '../services/api'

import { analyzeFillerWords } from '../utils/fillerWords.js'



export default function LiveInterviewPage() {

  const { sessionId: routeSessionId } = useParams()

  const navigate = useNavigate()

  const {

    questions,

    currentQuestionIndex,

    nextQuestion,

    transcript,

    setTranscript,

    addAnswer,

    answers,

  } = useInterview()

  const [saving, setSaving] = useState(false)

  /** Merged STT alternate hypotheses — improves filler detection when the primary line omits short sounds. */

  const [fillerAugment, setFillerAugment] = useState('')

  const [sttLang, setSttLang] = useState('en')

  const spokenQuestionIndexRef = useRef(-1)



  const currentQuestionMeta = questions[currentQuestionIndex] || null

  const currentQuestion = useMemo(

    () => currentQuestionMeta?.question || 'Preparing question...',

    [currentQuestionMeta]

  )

  const currentDifficulty = currentQuestionMeta?.difficulty || 'Medium'



  const speakQuestion = useCallback(() => {

    if (!currentQuestion || currentQuestion === 'Preparing question...') return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(currentQuestion)

    window.speechSynthesis.speak(utterance)

  }, [currentQuestion])



  const handleTranscript = useCallback((text, augment) => {

    setTranscript(text)

    setFillerAugment(typeof augment === 'string' ? augment : '')

  }, [setTranscript])



  const webLang = sttLang === 'hi' ? 'hi-IN' : 'en-US'

  const {

    isListening: webListening,

    startListening: startWebListening,

    stopListening: stopWebListening,

    clearTranscriptBuffer: clearWebTranscriptBuffer,

    isSupported: webSupported,

    error: webError,

  } = useSpeechRecognition(handleTranscript, {
    lang: webLang,

  })
  const isListening = webListening
  const isSupported = webSupported
  const error = webError



  const startListening = useCallback(() => {
    startWebListening()
  }, [startWebListening])



  const stopListening = useCallback(() => {
    stopWebListening()
  }, [stopWebListening])



  // Only react to question changes. Do not depend on isListening — when the user

  // starts recognition, isListening becomes true and would re-run this effect and

  // call stopListening(), which immediately cancels the mic.

  useEffect(() => {

    if (!currentQuestionMeta?.question) return

    stopListening()

    clearWebTranscriptBuffer()

    if (spokenQuestionIndexRef.current !== currentQuestionIndex) {

      speakQuestion()

      spokenQuestionIndexRef.current = currentQuestionIndex

    }

  }, [currentQuestionIndex, currentQuestionMeta?.question, clearWebTranscriptBuffer, stopListening, speakQuestion])



  useEffect(() => {
    stopListening()
  }, [sttLang, stopListening])



  const submitCurrentAnswer = async () => {

    if (!transcript.trim()) return

    if (!currentQuestionMeta?.question) return

    setSaving(true)

    try {

      if (isListening) stopListening()

      await api.post(`/interview/${routeSessionId}/answer`, {

        question: currentQuestion,

        answerText: transcript,

        transcript,

      })

      addAnswer({ question: currentQuestion, transcript })

      clearWebTranscriptBuffer()

      if (!isLast) {

        nextQuestion()

      }

    } catch (error) {

      console.error(error)

    } finally {

      setSaving(false)

    }

  }



  const finishInterview = async () => {

    try {

      const { data } = await api.post(`/feedback/${routeSessionId}`)
      navigate(`/interview/${routeSessionId}/result`, {
        state: {
          sessionId: routeSessionId,
          feedback: data?.feedback || null,
          result: data?.result || null,
          session: {
            questions,
            answers,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      })

    } catch (error) {

      console.error(error)

    }

  }



  const isLast = currentQuestionIndex >= questions.length - 1



  const fillerStats = useMemo(() => {

    const merged = [transcript, fillerAugment].filter(Boolean).join(' ')

    return analyzeFillerWords(merged)

  }, [transcript, fillerAugment])


  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060e20] px-4 py-6 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(34,211,238,0.12),transparent_33%),radial-gradient(circle_at_85%_80%,rgba(129,140,248,0.12),transparent_30%)]" />
      <section className="relative mx-auto w-full max-w-6xl rounded-[28px] border border-cyan-200/30 bg-[linear-gradient(160deg,rgba(30,41,59,0.88)_0%,rgba(15,23,42,0.94)_55%,rgba(2,6,23,0.92)_100%)] p-5 shadow-[0_24px_70px_rgba(2,6,23,0.85),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-xl">
        <header className="mb-5 rounded-2xl border border-cyan-200/35 bg-slate-800/65 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="text-4xl font-bold tracking-wide text-cyan-200">
                QUESTION {currentQuestionIndex + 1} / {questions.length}
              </p>
              <span className="rounded-xl border border-cyan-200/25 bg-slate-700/65 px-3 py-1 text-lg font-semibold uppercase tracking-wide text-slate-100">
                Difficulty: {currentDifficulty}
              </span>
            </div>
            <p className="text-sm uppercase tracking-wide text-cyan-100/90">
              Browser speech only
            </p>
          </div>
        </header>

        <h1 className="mb-6 text-4xl font-semibold leading-snug text-slate-100">
          {currentQuestion}
        </h1>

        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-cyan-300/30 bg-slate-800/45 p-4 shadow-[0_8px_20px_rgba(2,6,23,0.5)]">
            <p className="mb-2 text-sm uppercase tracking-wider text-cyan-100/85">Listening Engine</p>
            <div className="flex items-center justify-between rounded-xl border border-cyan-300/30 bg-slate-900/65 px-4 py-3">
              <div>
                <p className="text-2xl font-semibold text-slate-100">Browser Speech</p>
                <p className="text-sm text-slate-300">Web Speech API (local browser recognition)</p>
              </div>
              <span className="rounded-full border border-emerald-300/35 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                active
              </span>
            </div>
          </article>

          <article className="rounded-2xl border border-violet-300/30 bg-slate-800/45 p-4 shadow-[0_8px_20px_rgba(2,6,23,0.5)]">
            <label className="mb-2 block text-sm uppercase tracking-wider text-violet-100/85">
              Answer Language
            </label>
            <select
              className="w-full rounded-xl border border-violet-300/35 bg-slate-900/70 px-4 py-3 text-lg text-slate-100 outline-none transition focus:border-violet-200 focus:ring-2 focus:ring-violet-300/30"
              value={sttLang}
              onChange={(e) => setSttLang(e.target.value)}
            >
              <option value="en">English</option>
              <option value="hi">Hindi (हिन्दी)</option>
            </select>
          </article>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <button className="rounded-xl border border-slate-200/35 bg-slate-700/70 px-5 py-3 text-2xl font-semibold text-slate-100 shadow-[0_5px_15px_rgba(15,23,42,0.5)] transition hover:bg-slate-700" onClick={speakQuestion}>
            Speak Question
          </button>
          {!isListening ? (
            <button
              className="rounded-xl border border-indigo-200/35 bg-indigo-700/70 px-5 py-3 text-2xl font-semibold text-slate-100 shadow-[0_5px_15px_rgba(67,56,202,0.45)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={startListening}
              disabled={!isSupported}
            >
              Start Answering
            </button>
          ) : (
            <button className="rounded-xl border border-rose-200/35 bg-rose-700/70 px-5 py-3 text-2xl font-semibold text-slate-100 shadow-[0_5px_15px_rgba(190,24,93,0.4)] transition hover:brightness-110" onClick={stopListening}>
              Stop Listening
            </button>
          )}
        </div>

        {!isSupported && (
          <p className="mb-3 text-sm text-amber-300">
            Speech recognition is not supported in this browser. Try Chrome or Edge.
          </p>
        )}
        {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}

        <div className="mb-5">
          <VoiceWave active={isListening} />
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <article className="lg:col-span-3 rounded-2xl border border-cyan-300/30 bg-slate-800/42 p-4 shadow-[0_8px_20px_rgba(2,6,23,0.55)]">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-cyan-100/85">Real-time Transcript</p>
            <p className="min-h-52 text-2xl leading-relaxed text-slate-100">{transcript || 'Your answer appears here...'}</p>
          </article>

          <article className="lg:col-span-2 rounded-2xl border border-violet-300/30 bg-slate-800/42 p-4 shadow-[0_8px_20px_rgba(2,6,23,0.55)]">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-violet-100/90">Filler Word Check (Live)</p>
            {fillerStats.total === 0 ? (
              <p className="min-h-52 text-lg uppercase leading-relaxed text-slate-300/90">
                {transcript.trim()
                  ? 'No common fillers detected in this answer so far.'
                  : 'Start speaking to see filler counts for this answer.'}
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xl font-semibold text-amber-200">
                  {fillerStats.total} filler{fillerStats.total === 1 ? '' : 's'} detected
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {fillerStats.items.map(({ key, count }) => (
                    <div
                      key={key}
                      className="rounded-xl border border-violet-300/35 bg-slate-700/55 px-3 py-2 text-center"
                    >
                      <p className="text-2xl font-bold text-slate-100">{count}</p>
                      <p className="text-lg uppercase text-violet-100">{key}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="rounded-xl border border-slate-200/35 bg-slate-700/75 px-6 py-3 text-2xl font-semibold text-slate-100 shadow-[0_5px_15px_rgba(15,23,42,0.5)] transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={submitCurrentAnswer}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Answer'}
          </button>
          {isLast && answers.length > 0 && (
            <button className="rounded-xl border border-indigo-300/50 bg-indigo-800/65 px-6 py-3 text-2xl font-semibold text-indigo-100 transition hover:brightness-110" onClick={finishInterview}>
              Finish Interview
            </button>
          )}
        </div>
      </section>
    </main>

  )

}

