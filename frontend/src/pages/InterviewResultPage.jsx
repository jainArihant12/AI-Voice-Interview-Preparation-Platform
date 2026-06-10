import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { analyzeFillerWords } from '../utils/fillerWords.js'

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
}

function getBadgeTone(difficulty) {
  const diff = String(difficulty || '').toLowerCase()
  if (diff.includes('hard') || diff.includes('senior')) {
    return 'border-rose-300/35 bg-rose-500/10 text-rose-200'
  }
  if (diff.includes('medium') || diff.includes('mid')) {
    return 'border-amber-300/35 bg-amber-500/10 text-amber-200'
  }
  return 'border-emerald-300/35 bg-emerald-500/10 text-emerald-200'
}

function formatMsDuration(ms) {
  const safe = Math.max(0, Number(ms) || 0)
  const totalSeconds = Math.floor(safe / 1000)
  const min = Math.floor(totalSeconds / 60)
  const sec = totalSeconds % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function InterviewResultPage() {
  const { sessionId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState(location.state?.session || null)
  const [feedback, setFeedback] = useState(location.state?.feedback || null)
  const [result, setResult] = useState(location.state?.result || null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [historyRes, feedbackRes] = await Promise.all([
          api.get('/interview/history'),
          api.get(`/feedback/${sessionId}`),
        ])
        if (cancelled) return
        const match =
          (historyRes.data?.history || []).find((item) => String(item?._id) === String(sessionId)) || null
        setSession(match)
        setFeedback(feedbackRes.data?.feedback || match?.feedback || null)
        setResult(feedbackRes.data?.result || match?.result || null)
      } catch (err) {
        if (cancelled) return
        setError(err?.response?.data?.message || err?.message || 'Failed to load result')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const hasStateData = location.state?.feedback || location.state?.result
    if (hasStateData) {
      setLoading(false)
      load()
      return () => {
        cancelled = true
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [sessionId, location.state])

  const overallScore = clampScore(result?.percentage ?? feedback?.overallScore ?? 0)
  const totalQuestions = Array.isArray(session?.questions) ? session.questions.length : 0
  const qaAnalysis = Array.isArray(feedback?.questionAnalysis) ? feedback.questionAnalysis : []
  const strengths = Array.isArray(feedback?.strengths) ? feedback.strengths : []
  const improvements = Array.isArray(feedback?.improvements) ? feedback.improvements : []
  const interviewMs =
    new Date(session?.updatedAt || 0).getTime() - new Date(session?.createdAt || 0).getTime()

  const perQuestionRows = useMemo(() => {
    const questions = Array.isArray(session?.questions) ? session.questions : []
    return questions.map((question, index) => {
      const text = String(question?.question || '').trim()
      const analysis =
        qaAnalysis.find((item) => String(item?.question || '').trim() === text) || qaAnalysis[index] || {}
      const score = clampScore(analysis?.score)
      const reason =
        (Array.isArray(analysis?.mistakes) && analysis.mistakes[0]) ||
        analysis?.idealApproach ||
        'Good effort. Keep sharpening depth and precision.'
      return {
        index: index + 1,
        difficulty: question?.difficulty || 'Easy',
        question: text || 'Question unavailable',
        score,
        reason,
      }
    })
  }, [session?.questions, qaAnalysis])

  const fillerMetrics = useMemo(() => {
    const answers = Array.isArray(session?.answers) ? session.answers : []
    const combined = answers
      .map((ans) => String(ans?.transcript || ans?.answerText || '').trim())
      .filter(Boolean)
      .join(' ')
    const stats = analyzeFillerWords(combined)
    const map = Object.fromEntries(stats.items.map((i) => [String(i.key).toLowerCase(), i.count]))
    return {
      um: map.um || 0,
      like: map.like || 0,
      uh: map.uh || 0,
      ah: map.ah || 0,
    }
  }, [session?.answers])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060e20] p-6 text-slate-200">
        Loading interview result...
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#060e20] p-6 text-slate-100">
        <p className="text-lg text-rose-300">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="rounded-xl border border-cyan-300/45 bg-cyan-500/10 px-4 py-2 text-cyan-100"
        >
          Back to dashboard
        </button>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060e20] px-4 py-6 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_85%_78%,rgba(129,140,248,0.14),transparent_30%)]" />
      <section className="relative mx-auto w-full max-w-6xl rounded-[28px] border border-cyan-200/30 bg-[linear-gradient(160deg,rgba(30,41,59,0.88)_0%,rgba(15,23,42,0.94)_55%,rgba(2,6,23,0.92)_100%)] p-5 shadow-[0_24px_70px_rgba(2,6,23,0.85),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-xl">
        <header className="mb-5 rounded-2xl border border-cyan-200/35 bg-slate-800/65 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-wide text-cyan-200">
              ASSESSMENT COMPLETE - FINAL INTERVIEW RESULTS
            </h1>
            <div className="text-right">
              <p className="text-lg text-slate-200">Total Interview Time: {formatMsDuration(interviewMs)}</p>
              <p className="text-sm text-slate-400">Questions: {totalQuestions}</p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <article className="rounded-2xl border border-cyan-300/30 bg-slate-800/45 p-4">
              <p className="text-center text-lg uppercase tracking-wide text-slate-300">Final Score</p>
              <div className="mx-auto mt-3 h-44 w-44 rounded-full border-[10px] border-cyan-300/60 bg-slate-900/50 shadow-[0_0_30px_rgba(34,211,238,0.25)]" />
              <p className="-mt-28 text-center text-6xl font-bold text-cyan-300">{overallScore}</p>
              <p className="text-center text-3xl text-slate-300">/100</p>
              <p className="mt-6 text-center text-2xl font-semibold text-emerald-300">
                {overallScore >= 80 ? 'PROFICIENT CANDIDATE' : 'KEEP IMPROVING'}
              </p>
              <p className="mt-2 text-center text-lg text-slate-300">
                {feedback?.finalSummary || 'Strong progress with clear communication and technical framing.'}
              </p>
            </article>

            <article className="rounded-2xl border border-violet-300/30 bg-slate-800/45 p-4">
              <p className="mb-3 text-lg font-semibold uppercase tracking-wide text-violet-100">
                Final Communication Metrics
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                {['Fluency', 'Clarity', 'Tone'].map((metric) => (
                  <div key={metric} className="rounded-xl border border-slate-600/40 bg-slate-900/45 px-2 py-3">
                    <p className="text-sm text-slate-300">{metric}</p>
                    <p className="text-2xl font-semibold text-cyan-200">{overallScore}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm font-semibold uppercase text-slate-300">Filler Word Count</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[
                  ['Um', fillerMetrics.um],
                  ['Like', fillerMetrics.like],
                  ['Uh', fillerMetrics.uh],
                  ['Ah', fillerMetrics.ah],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-600/40 bg-slate-900/45 px-2 py-2 text-center">
                    <p className="text-xl font-semibold text-slate-100">{value}</p>
                    <p className="text-sm text-slate-300">{label}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="space-y-4 lg:col-span-3">
            {perQuestionRows.map((row) => (
              <article key={row.index} className="rounded-2xl border border-cyan-300/30 bg-slate-800/45 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-4xl">
                    <p className="text-4xl font-semibold text-slate-100">
                      Q{row.index}: {row.question}
                    </p>
                    <p className="mt-2 text-xl text-slate-300">- {row.reason}</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-xl border px-3 py-1 text-sm font-semibold uppercase ${getBadgeTone(row.difficulty)}`}>
                      {row.difficulty}
                    </span>
                    <p className="mt-2 text-5xl font-bold text-cyan-300">{row.score}</p>
                    <p className="text-xl text-slate-300">/100</p>
                  </div>
                </div>
              </article>
            ))}

            <article className="rounded-2xl border border-violet-300/30 bg-slate-800/45 p-4">
              <p className="text-2xl font-semibold uppercase text-violet-100">AI Insights & Next Steps</p>
              <p className="mt-3 text-xl text-emerald-200">
                Strengths: {strengths.length ? strengths.slice(0, 2).join(' ') : 'Good clarity and communication.'}
              </p>
              <p className="mt-2 text-xl text-amber-200">
                Areas to Improve:{' '}
                {improvements.length ? improvements.slice(0, 2).join(' ') : 'Add more depth to system design trade-offs.'}
              </p>
            </article>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/interview/setup')}
            className="rounded-xl border border-indigo-300/45 bg-indigo-500/10 px-5 py-2.5 text-lg font-semibold text-indigo-100 transition hover:bg-indigo-500/20"
          >
            Retry Assessment
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-xl border border-slate-300/35 bg-slate-600/20 px-5 py-2.5 text-lg font-semibold text-slate-100 transition hover:bg-slate-600/30"
          >
            Back to Dashboard
          </button>
        </div>
      </section>
    </main>
  )
}
