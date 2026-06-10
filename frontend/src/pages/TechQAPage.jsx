import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function TechQAPage() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [resultTopic, setResultTopic] = useState('')

  const hasResult = items.length > 0
  const canGenerate = topic.trim().length > 1 && !loading

  const createSet = async () => {
    const resolvedTopic = topic.trim()
    if (!resolvedTopic || loading) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/interview/tech-qa', {
        questionCount: 10,
        difficulty: 'Medium',
        topic: resolvedTopic,
      })
      const rows = (data?.items || []).slice(0, 10).map((q, idx) => ({
        id: `${resolvedTopic}-${idx}`,
        question: String(q?.question || '').trim(),
        answer: String(q?.answer || '').trim(),
        difficulty: String(q?.difficulty || 'Medium').trim(),
      }))
      setItems(rows)
      setResultTopic(resolvedTopic)
    } catch (e) {
      setItems([])
      setError(e.response?.data?.message || e.message || 'Could not generate Q&A set right now.')
    } finally {
      setLoading(false)
    }
  }

  const visibleRows = useMemo(() => items.slice(0, 10), [items])

  return (
    <main className="min-h-screen bg-[#070b16] px-4 py-6 text-slate-100">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
        >
          ← Back to dashboard
        </Link>

        {!hasResult ? (
          <section className="mt-5 rounded-[1.75rem] border border-cyan-300/30 bg-[linear-gradient(165deg,rgba(30,41,59,0.84)_0%,rgba(15,23,42,0.94)_52%,rgba(2,6,23,0.95)_100%)] p-6 shadow-[0_22px_56px_rgba(2,6,23,0.78)]">
            <div className="rounded-2xl border border-cyan-300/35 bg-slate-900/55 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">AI Tech Prep</p>
                  <h1 className="mt-2 text-3xl font-bold text-cyan-200 md:text-4xl">TECH Q&A SETS</h1>
                  <p className="mt-2 max-w-xl text-sm text-slate-300 md:text-base">
                    Generate custom 10-Q&A sets on any interview topic.
                  </p>
                </div>
                <span className="rounded-xl border border-cyan-500/45 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200">
                  Max 10
                </span>
              </div>
              <label className="mt-6 block text-sm font-medium text-slate-300">Enter any topic</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="mt-2 w-full rounded-xl border border-violet-300/35 bg-[#151b2a] px-4 py-3 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/70"
                placeholder="e.g. Explain CAP Theorem"
              />
              {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
              <button
                type="button"
                disabled={!canGenerate}
                onClick={createSet}
                className="mt-5 inline-flex min-h-[2.8rem] min-w-[12rem] items-center justify-center rounded-xl border border-cyan-400/60 bg-cyan-500/10 px-6 text-sm font-semibold uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Go To Q&A Generator'}
              </button>
            </div>
          </section>
        ) : (
          <section className="mt-5 rounded-[1.75rem] border border-cyan-300/30 bg-[linear-gradient(170deg,rgba(30,41,59,0.8)_0%,rgba(15,23,42,0.95)_58%,rgba(2,6,23,0.98)_100%)] p-4 shadow-[0_24px_58px_rgba(2,6,23,0.82)]">
            <header className="rounded-xl border border-cyan-400/30 bg-slate-900/55 px-4 py-3">
              <h1 className="text-xl font-semibold text-cyan-200 md:text-2xl">
                Results For: <span className="text-slate-100">{resultTopic}</span>
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Showing {visibleRows.length} Q&A pair{visibleRows.length === 1 ? '' : 's'} (max 10).
              </p>
            </header>

            <div className="mt-4 space-y-3">
              {visibleRows.map((row, idx) => (
                <article
                  key={row.id}
                  className="rounded-xl border border-cyan-900/40 bg-slate-900/45 p-4 shadow-[0_0_0_1px_rgba(56,189,248,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-base font-semibold text-slate-100">
                      Q{idx + 1}. {row.question || 'Question unavailable'}
                    </p>
                    <p className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                      {row.difficulty}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    <span className="font-medium text-cyan-200">Answer:</span> {row.answer || 'N/A'}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setItems([])
                  setError('')
                }}
                className="rounded-lg border border-slate-600 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700/70"
              >
                Generate Another Set
              </button>
              <Link
                to="/dashboard"
                className="rounded-lg border border-cyan-400/45 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
              >
                Go To Dashboard
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
