import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const ASSESSMENTS = [
  { id: 'aptitude', title: 'Aptitude', icon: '🧮' },
  { id: 'reasoning', title: 'Reasoning', icon: '🧩' },
  { id: 'verbal', title: 'Verbal Ability', icon: '💬' },
]

export default function OnlineAssessmentPage() {
  const [selected, setSelected] = useState('aptitude')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [err, setErr] = useState('')
  const [liveSession, setLiveSession] = useState(null)
  const [answers, setAnswers] = useState({})
  const [resultSummary, setResultSummary] = useState(null)

  const fetchHistory = async () => {
    setLoading(true)
    setErr('')
    try {
      const { data } = await api.get('/assessment/history')
      setHistory(data?.history || [])
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Could not load assessment history.')
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const stats = useMemo(() => {
    const totalScore = history.reduce((sum, s) => sum + (Number(s?.scoreReceived) || 0), 0)
    const totalMax = history.reduce((sum, s) => sum + (Number(s?.maxScore) || 0), 0)
    const attempted = history.reduce((sum, s) => sum + (Number(s?.attemptedCount) || 0), 0)
    const totalQuestions = history.reduce((sum, s) => sum + (Number(s?.totalQuestions) || 0), 0)
    return { totalScore, totalMax, attempted, totalQuestions }
  }, [history])

  const byType = useMemo(() => {
    return ASSESSMENTS.reduce((acc, a) => {
      const sessions = history.filter((s) => s?.category === a.id)
      const avgPct =
        sessions.length > 0
          ? Math.round(
              sessions.reduce((sum, s) => sum + (Number(s?.percentage) || 0), 0) / sessions.length
            )
          : 0
      acc[a.id] = { sessions, avgPct }
      return acc
    }, {})
  }, [history])

  const selectedMeta = ASSESSMENTS.find((a) => a.id === selected) || ASSESSMENTS[0]

  const startAssessment = async () => {
    setErr('')
    setStarting(true)
    setResultSummary(null)
    try {
      const { data } = await api.post('/assessment/session', {
        category: selected,
        difficulty: 'medium',
        questionCount: 10,
      })
      const session = data?.session
      setLiveSession(session)
      const initialAnswers = {}
      ;(session?.questions || []).forEach((q) => {
        initialAnswers[q._id] = null
      })
      setAnswers(initialAnswers)
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Could not start assessment.')
      setLiveSession(null)
    } finally {
      setStarting(false)
    }
  }

  const submitAssessment = async () => {
    if (!liveSession?._id) return
    setErr('')
    setSubmitting(true)
    try {
      const payload = Object.entries(answers)
        .filter(([, value]) => Number.isInteger(value))
        .map(([questionId, selectedOptionIndex]) => ({ questionId, selectedOptionIndex }))
      const { data } = await api.post(`/assessment/${liveSession._id}/submit`, {
        answers: payload,
      })
      setResultSummary(data?.summary || null)
      setLiveSession(data?.session || liveSession)
      await fetchHistory()
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Could not submit assessment.')
    } finally {
      setSubmitting(false)
    }
  }

  const removeAssessment = async (sessionId) => {
    if (!window.confirm('Remove this assessment from history? This cannot be undone.')) return
    setRemovingId(sessionId)
    setErr('')
    try {
      await api.delete(`/assessment/${sessionId}`)
      if (liveSession?._id === sessionId) {
        setLiveSession(null)
        setAnswers({})
        setResultSummary(null)
      }
      await fetchHistory()
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Could not remove assessment.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#020617] text-slate-100">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(56,189,248,0.14), transparent 48%), radial-gradient(ellipse 55% 45% at 100% 60%, rgba(99,102,241,0.12), transparent 52%)',
        }}
      />
      <div className="relative z-10 mx-auto w-full max-w-[92rem] px-4 py-8 sm:px-8 lg:px-12">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
        >
          ← Back to Dashboard
        </Link>

        <section className="mt-4 rounded-2xl border border-cyan-900/30 bg-[#0b1020]/95 p-6 shadow-[0_18px_42px_rgba(2,6,23,0.65)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-100 md:text-3xl">
                Online Assessment
              </h1>
              <div className="mt-3 flex flex-wrap items-end gap-8">
                <p className="text-4xl font-bold text-cyan-200">
                  {stats.totalScore}
                  <span className="text-slate-500">/{stats.totalMax || 0}</span>
                </p>
                <p className="text-lg text-slate-300">
                  Questions Attempted: {stats.attempted}/{stats.totalQuestions}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={startAssessment}
              disabled={starting}
              className="rounded-2xl border border-cyan-400/50 bg-cyan-500/10 px-7 py-3.5 text-base font-semibold text-cyan-200 shadow-[0_0_26px_rgba(34,211,238,0.25)] transition hover:bg-cyan-500/20"
            >
              {starting ? 'Generating assessment...' : 'Start New Assessment'}
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {ASSESSMENTS.map((item) => {
            const active = selected === item.id
            const details = byType[item.id]
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.id)}
                className={`rounded-2xl border p-6 text-left transition ${
                  active
                    ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_26px_rgba(34,211,238,0.2)]'
                    : 'border-cyan-900/25 bg-[#0b1020]/95 hover:border-cyan-700/60'
                }`}
              >
                <p className="text-sm text-slate-400">{item.icon}</p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-100">{item.title}</h2>
                <p className="mt-3 text-base text-slate-300">Average score: {details.avgPct}%</p>
                <p className="mt-1 text-sm text-slate-400">Sessions: {details.sessions.length}</p>
              </button>
            )
          })}
        </section>

        {liveSession && (
          <section className="mt-8 rounded-2xl border border-cyan-900/25 bg-[#0b1020]/95 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-2xl font-semibold text-slate-100">
                {selectedMeta.title} MCQ Assessment
              </h3>
              <p className="text-sm text-slate-400">
                {liveSession.questions?.length || 0} questions
              </p>
            </div>
            <div className="space-y-4">
              {(liveSession.questions || []).map((q, idx) => (
                <article
                  key={q._id}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4"
                >
                  <p className="text-base font-medium text-slate-100">
                    Q{idx + 1}. {q.question}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(q.options || []).map((opt, optIdx) => (
                      <label
                        key={optIdx}
                        className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                          answers[q._id] === optIdx
                            ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-100'
                            : 'border-slate-700/80 bg-slate-950/40 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          className="mr-2"
                          name={`question-${q._id}`}
                          checked={answers[q._id] === optIdx}
                          onChange={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              [q._id]: optIdx,
                            }))
                          }
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={submitAssessment}
                disabled={submitting}
                className="rounded-xl border border-cyan-400/50 bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
              >
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLiveSession(null)
                  setAnswers({})
                  setResultSummary(null)
                }}
                className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-900/60"
              >
                Cancel
              </button>
            </div>
            {resultSummary && (
              <div className="mt-5 rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4">
                <p className="text-lg font-semibold text-emerald-300">
                  Score: {resultSummary.scoreReceived}/{resultSummary.maxScore} ({resultSummary.percentage}%)
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Attempted {resultSummary.attemptedCount}/{resultSummary.totalQuestions} questions.
                </p>
              </div>
            )}
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-cyan-900/25 bg-[#0b1020]/95 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold text-slate-100">Assessment History</h3>
            <p className="text-sm text-slate-400">Selected: {selectedMeta.title}</p>
          </div>

          {loading ? (
            <p className="text-slate-400">Loading history...</p>
          ) : err ? (
            <p className="text-rose-300">{err}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-sm uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Total Score</th>
                    <th className="px-3 py-3">Attempted / Total</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history
                    .filter((s) => s?.category === selected)
                    .map((s) => {
                      const score = Number(s?.scoreReceived) || 0
                      const max = Number(s?.maxScore) || 0
                      const attempted = Number(s?.attemptedCount) || 0
                      const total = Number(s?.totalQuestions) || 0
                      return (
                        <tr key={s._id} className="border-b border-slate-900/80 text-sm text-slate-200">
                          <td className="px-3 py-3">{selectedMeta.title}</td>
                          <td className="px-3 py-3">{new Date(s.createdAt).toLocaleString()}</td>
                          <td className="px-3 py-3 text-cyan-200">
                            {score}/{max}
                          </td>
                          <td className="px-3 py-3">
                            {attempted}/{total}
                          </td>
                          <td className="px-3 py-3">{s.status}</td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => removeAssessment(s._id)}
                              disabled={removingId === s._id}
                              className="rounded-lg border border-rose-900/70 bg-rose-950/30 px-3 py-1 text-xs text-rose-200 transition hover:bg-rose-950/55 disabled:opacity-50"
                            >
                              {removingId === s._id ? 'Removing…' : 'Remove'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
              {history.filter((s) => s?.category === selected).length === 0 && (
                <p className="py-4 text-slate-500">No {selectedMeta.title} sessions yet.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
