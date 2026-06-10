import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function AboutMePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const ownerName = user?.name || 'Website Owner'

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-8 text-slate-100 sm:px-8 lg:px-12">
      <section className="mx-auto w-full max-w-4xl rounded-3xl border border-cyan-900/35 bg-[#0b1020]/90 p-6 shadow-[0_20px_42px_rgba(2,6,23,0.5)] sm:p-8">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mb-6 rounded-lg border border-cyan-400/45 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
        >
          Back to Dashboard
        </button>

        <h1 className="mt-2 text-3xl font-bold text-cyan-200 sm:text-4xl">About Me</h1>

        <div className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-900/45 p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-100">Website Owner</h2>
          <p className="mt-3 text-slate-300">
            I built this platform to combine interview coaching with modern AI so users can improve communication, technical thinking, and confidence in one place.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Owner Name</p>
              <p className="mt-1 text-base font-semibold text-slate-100">{ownerName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Contact</p>
              <p className="mt-1 text-base font-semibold text-slate-100">{user?.email || 'Not set'}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-900/45 p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-100">Website Features</h2>
          <ul className="mt-4 space-y-3 text-slate-300">
            <li>
              <span className="font-semibold text-cyan-200">AI Mock Interview:</span> Start voice-based interview sessions and practice answering in a realistic format.
            </li>
            <li>
              <span className="font-semibold text-cyan-200">Interview Feedback:</span> Get score-based feedback, strengths, improvement areas, and actionable suggestions.
            </li>
            <li>
              <span className="font-semibold text-cyan-200">Tech Q&A Generator:</span> Create topic-wise technical questions and answers for quick revision.
            </li>
            <li>
              <span className="font-semibold text-cyan-200">Online Assessment:</span> Practice verbal, numerical, and reasoning sets in one assessment flow.
            </li>
            <li>
              <span className="font-semibold text-cyan-200">Session History:</span> Review previous interview sessions and track your progress over time.
            </li>
          </ul>
        </div>

      </section>
    </main>
  )
}
