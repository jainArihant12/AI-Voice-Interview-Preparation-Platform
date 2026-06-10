import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useInterview } from '../context/InterviewContext.jsx'
import api from '../services/api'

const DIFFICULTY_SEGMENTS = [
  { value: 'Junior', label: 'Easy' },
  { value: 'Mid', label: 'Medium' },
  { value: 'Senior', label: 'Hard' },
  { value: 'Mixed', label: 'Mixed' },
]

const TOPIC_CHIPS = [
  { value: 'System Design', label: 'System Design', icon: '⚙️' },
  { value: 'Algorithms', label: 'Algorithms', icon: '🧠' },
  { value: 'React', label: 'React', icon: '⚛️' },
  { value: 'JavaScript', label: 'JavaScript', icon: '📜' },
  { value: 'Node.js', label: 'Node.js', icon: '🟢' },
  { value: 'Java', label: 'Java', icon: '☕' },
  { value: 'Databases', label: 'Databases', icon: '🗄️' },
  { value: 'Behavioral', label: 'Behavioral', icon: '💬' },
]

const ROLE_PRESETS = [
  {
    id: 'backend-java',
    topic: 'Java',
    title: 'Backend Engineer (Java)',
    subtitle: 'Java · Spring · JVM',
  },
  {
    id: 'frontend-react',
    topic: 'React',
    title: 'Frontend Engineer (React)',
    subtitle: 'React · TypeScript · UI',
  },
]

/** Values match backend interviewConfig.companyType */
const COMPANY_CARDS = [
  {
    value: 'startup',
    title: 'Startup',
    subtitle: 'Small tech · fast pace',
    icon: '🚀',
  },
  {
    value: 'FAANG',
    title: 'Enterprise',
    subtitle: 'Large product orgs',
    icon: '🏢',
  },
  {
    value: 'service-based',
    title: 'Service-based',
    subtitle: 'Consulting & IT services',
    icon: '💼',
  },
]

const emptyExperience = () => ({
  education: '',
  role: '',
  year: '',
  optional: '',
})

export default function InterviewSetupPage() {
  const { user } = useAuth()
  const [starting, setStarting] = useState(false)
  const [err, setErr] = useState('')
  const [questionCount, setQuestionCount] = useState(3)
  const [difficulty, setDifficulty] = useState('Junior')
  const [topic, setTopic] = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [topicSearch, setTopicSearch] = useState('')
  const [rolePreset, setRolePreset] = useState(null)
  const [experience, setExperience] = useState(() => emptyExperience())
  const [companyType, setCompanyType] = useState('')
  const [useProfileResume, setUseProfileResume] = useState(false)
  const { setSessionId, setQuestions, resetInterviewState, setCurrentQuestionIndex } =
    useInterview()
  const navigate = useNavigate()

  const hasProfileResume = Boolean(
    user?.profileResumeFile && String(user.profileResumeFile).trim() !== ''
  )

  const filteredChips = useMemo(() => {
    const q = topicSearch.trim().toLowerCase()
    if (!q) return TOPIC_CHIPS
    return TOPIC_CHIPS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) || c.value.toLowerCase().includes(q)
    )
  }, [topicSearch])

  const selectedTopicPreview =
    topic === '__custom__' ? customTopic.trim() : topic === '' ? '' : topic.trim()

  const difficultyLabel =
    DIFFICULTY_SEGMENTS.find((d) => d.value === difficulty)?.label ?? difficulty

  const companyLabel =
    COMPANY_CARDS.find((c) => c.value === companyType)?.title ??
    (companyType ? companyType : 'No preference')

  const canStartInterview =
    Boolean(selectedTopicPreview) &&
    questionCount >= 1 &&
    !(useProfileResume && !hasProfileResume) &&
    !starting

  const selectChip = (value) => {
    setTopic(value)
    setCustomTopic('')
    setRolePreset(null)
  }

  const selectRolePreset = (preset) => {
    setRolePreset(preset.id)
    setTopic(preset.topic)
    setCustomTopic('')
  }

  const startInterview = async () => {
    const resolvedTopic = topic === '__custom__' ? customTopic.trim() : topic.trim()
    if (!resolvedTopic) return
    if (questionCount < 1) return
    if (useProfileResume && !hasProfileResume) {
      setErr('Add a resume in Profile to use resume-based questioning.')
      return
    }
    setErr('')
    setStarting(true)
    resetInterviewState()
    try {
      const { data: created } = await api.post('/interview/session', {
        questionCount,
        difficulty,
        topic: resolvedTopic,
        experience: {
          education: experience.education.trim(),
          role: experience.role.trim(),
          year: experience.year.trim(),
          optional: experience.optional.trim(),
        },
        companyType: companyType || '',
        useProfileResume,
      })
      const activeSessionId = created?.sessionId
      if (!activeSessionId) throw new Error('No session returned')
      setSessionId(activeSessionId)
      const { data } = await api.post(`/interview/${activeSessionId}/questions`, {
        questionCount,
        difficulty,
        topic: resolvedTopic,
        experience: {
          education: experience.education.trim(),
          role: experience.role.trim(),
          year: experience.year.trim(),
          optional: experience.optional.trim(),
        },
        companyType: companyType || '',
      })
      setQuestions(data.questions)
      setCurrentQuestionIndex(0)
      navigate(`/interview/${activeSessionId}`)
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Could not start interview'
      setErr(msg)
      console.error(error)
    } finally {
      setStarting(false)
    }
  }

  return (
    <main className="min-h-screen w-full min-w-0 bg-[#0b0e14] text-slate-100">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.85]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 90% 50% at 50% -15%, rgba(34,211,238,0.1), transparent 50%), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(99,102,241,0.06), transparent 45%)',
        }}
      />
      <div className="relative z-10 mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-10">
        <header className="mb-10 text-center lg:text-left">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400/90 transition hover:text-cyan-300"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Mock interview setup
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-400 lg:mx-0">
            Select your topic and settings, then start your session. Resume context uses the PDF
            from your Profile when enabled.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_240px] xl:items-start">
          {/* Column 1 — Topic, difficulty, roles */}
          <section className="rounded-2xl border border-slate-800/90 bg-slate-950/50 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Topic &amp; difficulty
            </h2>
            <label className="relative mt-4 block">
              <span className="sr-only">Search topic</span>
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                className="input w-full rounded-xl border-slate-700/90 bg-slate-900/80 py-2.5 pl-10 pr-4 text-slate-100 placeholder:text-slate-500"
                placeholder="Search topic…"
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              {filteredChips.map((c) => {
                const active = topic === c.value && topic !== '__custom__'
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => selectChip(c.value)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                      active
                        ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-100'
                        : 'border-slate-700/80 bg-slate-900/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800/50'
                    }`}
                  >
                    <span aria-hidden>{c.icon}</span>
                    {c.label}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => {
                  setTopic('__custom__')
                  setRolePreset(null)
                }}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  topic === '__custom__'
                    ? 'border-violet-500/60 bg-violet-500/15 text-violet-100'
                    : 'border-slate-700/80 bg-slate-900/50 text-slate-300 hover:border-slate-600'
                }`}
              >
                Custom…
              </button>
            </div>

            {topic === '__custom__' && (
              <input
                className="input mt-4 w-full"
                placeholder="e.g. Redis, GraphQL, Microservices"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
              />
            )}

            <p className="mt-6 text-xs font-medium uppercase tracking-wider text-slate-500">
              Difficulty
            </p>
            <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
              {DIFFICULTY_SEGMENTS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDifficulty(value)}
                  className={`rounded-lg py-2 text-center text-xs font-medium transition sm:text-sm ${
                    difficulty === value
                      ? 'bg-cyan-500/20 text-cyan-200 shadow-inner ring-1 ring-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="mt-8 text-xs font-medium uppercase tracking-wider text-slate-500">
              Role focus (optional)
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {ROLE_PRESETS.map((preset) => {
                const selected = rolePreset === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => selectRolePreset(preset)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_24px_rgba(34,211,238,0.12)]'
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-100">{preset.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{preset.subtitle}</p>
                      </div>
                      {selected && (
                        <span className="shrink-0 rounded-md bg-cyan-500/20 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-cyan-200">
                          ✓
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Column 2 — Experience */}
          <section className="rounded-2xl border border-slate-800/90 bg-slate-950/50 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Your experience
            </h2>
            <p className="mt-1 text-xs text-slate-500">Optional — helps tailor questions.</p>
            <div className="mt-5 space-y-4">
              <label className="block text-sm text-slate-300">
                Education
                <input
                  className="input mt-1.5 border-slate-700/90 bg-slate-900/80"
                  placeholder="e.g. B.S. Computer Science"
                  value={experience.education}
                  maxLength={500}
                  onChange={(e) =>
                    setExperience((prev) => ({ ...prev, education: e.target.value }))
                  }
                />
              </label>
              <label className="block text-sm text-slate-300">
                Role
                <input
                  className="input mt-1.5 border-slate-700/90 bg-slate-900/80"
                  placeholder="e.g. Software Engineer"
                  value={experience.role}
                  maxLength={500}
                  onChange={(e) =>
                    setExperience((prev) => ({ ...prev, role: e.target.value }))
                  }
                />
              </label>
              <label className="block text-sm text-slate-300">
                Year
                <input
                  className="input mt-1.5 border-slate-700/90 bg-slate-900/80"
                  placeholder="e.g. 4 years, or 2021–present"
                  value={experience.year}
                  maxLength={200}
                  onChange={(e) =>
                    setExperience((prev) => ({ ...prev, year: e.target.value }))
                  }
                />
              </label>
              <label className="block text-sm text-slate-300">
                Additional info
                <textarea
                  className="input mt-1.5 min-h-[5.5rem] resize-y border-slate-700/90 bg-slate-900/80"
                  placeholder="Anything else you want the mock interview to consider"
                  value={experience.optional}
                  maxLength={1000}
                  rows={3}
                  onChange={(e) =>
                    setExperience((prev) => ({ ...prev, optional: e.target.value }))
                  }
                />
              </label>
            </div>
          </section>

          {/* Column 3 — Company, questions, resume toggle */}
          <section className="rounded-2xl border border-slate-800/90 bg-slate-950/50 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Company &amp; format
            </h2>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-500">
              Company type
            </p>
            <div className="mt-2 space-y-2">
              <button
                type="button"
                onClick={() => setCompanyType('')}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                  companyType === ''
                    ? 'border-slate-600 bg-slate-800/50 text-slate-100'
                    : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-lg" aria-hidden>
                  ○
                </span>
                <span>No preference</span>
              </button>
              {COMPANY_CARDS.map((c) => {
                const active = companyType === c.value
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCompanyType(c.value)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-cyan-500/45 bg-cyan-500/10 text-slate-50'
                        : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xl" aria-hidden>
                      {c.icon}
                    </span>
                    <span>
                      <span className="block font-medium">{c.title}</span>
                      <span className="text-xs text-slate-500">{c.subtitle}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="q-range">
                  Number of questions
                </label>
                <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-sm font-semibold tabular-nums text-cyan-200">
                  {questionCount}
                </span>
              </div>
              <input
                id="q-range"
                type="range"
                min={1}
                max={20}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-cyan-500"
              />
              <div className="mt-1 flex justify-between text-[0.65rem] text-slate-600">
                <span>1</span>
                <span>20</span>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">Resume-based questioning</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Uses your <strong className="text-slate-400">Profile</strong> resume PDF to
                    ground questions in your projects, skills, and experience.
                  </p>
                  {!hasProfileResume && (
                    <Link
                      to="/profile/complete"
                      className="mt-2 inline-block text-xs font-medium text-amber-400/90 hover:text-amber-300"
                    >
                      Upload a resume in Profile →
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useProfileResume}
                  disabled={!hasProfileResume}
                  onClick={() => setUseProfileResume((v) => !v)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    !hasProfileResume
                      ? 'cursor-not-allowed bg-slate-800'
                      : useProfileResume
                        ? 'bg-cyan-600'
                        : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                      useProfileResume ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Session summary */}
          <aside className="rounded-2xl border border-slate-800/90 bg-slate-950/70 p-5 shadow-xl backdrop-blur-sm xl:sticky xl:top-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Session summary
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex justify-between gap-2 border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">Topic</span>
                <span className="max-w-[55%] text-right font-medium text-slate-200">
                  {selectedTopicPreview || '—'}
                </span>
              </li>
              <li className="flex justify-between gap-2 border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">Difficulty</span>
                <span className="font-medium text-slate-200">{difficultyLabel}</span>
              </li>
              <li className="flex justify-between gap-2 border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">Role preset</span>
                <span className="max-w-[55%] text-right text-slate-300">
                  {rolePreset
                    ? ROLE_PRESETS.find((r) => r.id === rolePreset)?.title ?? '—'
                    : '—'}
                </span>
              </li>
              <li className="flex justify-between gap-2 border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">Company</span>
                <span className="max-w-[55%] text-right text-slate-300">{companyLabel}</span>
              </li>
              <li className="flex justify-between gap-2 border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">Questions</span>
                <span className="font-medium tabular-nums text-cyan-200">{questionCount}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-slate-500">Resume mode</span>
                <span className="text-slate-300">
                  {useProfileResume && hasProfileResume ? 'On' : 'Off'}
                </span>
              </li>
            </ul>
          </aside>
        </div>

        {err && (
          <p className="mx-auto mt-8 max-w-xl rounded-xl border border-rose-900/50 bg-rose-950/40 px-4 py-3 text-center text-sm text-rose-200">
            {err}
          </p>
        )}

        <div className="mt-12 flex flex-col items-center gap-4 pb-16">
          {!canStartInterview && !starting && (
            <p className="max-w-lg text-center text-sm text-slate-500">
              {!selectedTopicPreview
                ? 'Pick a topic (chip, role card, or custom) to continue.'
                : questionCount < 1
                  ? 'Set at least one question.'
                  : useProfileResume && !hasProfileResume
                    ? 'Upload a resume in Profile, or turn off resume-based questioning.'
                    : null}
            </p>
          )}
          <button
            type="button"
            onClick={startInterview}
            disabled={!canStartInterview}
            className="group relative inline-flex min-w-[min(100%,22rem)] items-center justify-center overflow-hidden rounded-full border-2 border-transparent bg-slate-950 px-10 py-4 text-base font-semibold text-white shadow-[0_0_40px_rgba(34,211,238,0.2)] transition hover:shadow-[0_0_56px_rgba(34,211,238,0.35)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          >
            <span
              className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 opacity-90 transition group-hover:opacity-100"
              aria-hidden
            />
            <span className="absolute inset-[2px] rounded-full bg-[#0b0e14]" aria-hidden />
            <span className="relative bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              {starting ? 'Starting…' : 'Start Mock Interview Session'}
            </span>
          </button>
        </div>
      </div>
    </main>
  )
}
