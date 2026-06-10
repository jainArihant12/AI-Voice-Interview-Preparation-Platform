import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api'

const NAV_LINKS = [{ id: 'overview', label: 'Overview' }, ...[
  { id: 'username', label: 'Username', hint: 'Display name for your account' },
  { id: 'gender', label: 'Gender', hint: 'Helps us personalize your experience' },
  { id: 'education', label: 'Education', hint: 'Qualification & institution' },
  { id: 'resume', label: 'Resume', hint: 'Upload your CV (PDF)' },
  { id: 'languages', label: 'Languages', hint: 'Languages & proficiency' },
  { id: 'skills', label: 'Key skills', hint: 'Technical & professional skills' },
]]

const SECTIONS = NAV_LINKS.slice(1)

const GENDER_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const PROFICIENCY = ['', 'Basic', 'Conversational', 'Professional', 'Native']

function getInitials(name) {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ProfileCompletionPage() {
  const { user, loading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [savedMsg, setSavedMsg] = useState(false)
  const [username, setUsername] = useState('')
  const [gender, setGender] = useState('')
  const [education, setEducation] = useState({
    level: '',
    field: '',
    institute: '',
    year: '',
  })
  const [resumeFile, setResumeFile] = useState(null)
  const [languages, setLanguages] = useState([{ language: '', proficiency: '' }])
  const [skillsText, setSkillsText] = useState('')

  useEffect(() => {
    if (loading || !user) return
    setUsername(user.username || '')
    setGender(user.gender || '')
    setEducation({
      level: user.education?.level || '',
      field: user.education?.field || '',
      institute: user.education?.institute || '',
      year: user.education?.year || '',
    })
    if (user.languages?.length) {
      setLanguages(
        user.languages.map((l) => ({
          language: l.language || '',
          proficiency: l.proficiency || '',
        }))
      )
    } else {
      setLanguages([{ language: '', proficiency: '' }])
    }
    setSkillsText((user.keySkills || []).join(', '))
  }, [loading, user])

  const pct = user?.profileCompletionPercent ?? 0

  const saveAll = async () => {
    setErr('')
    setSavedMsg(false)
    setSaving(true)
    try {
      const keySkills = skillsText
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
      await api.post(
        '/auth/profile',
        {
          username: username.trim(),
          gender,
          education,
          languages,
          keySkills,
        },
        { headers: { 'Content-Type': 'application/json' } }
      )
      if (resumeFile) {
        const fd = new FormData()
        fd.append('resume', resumeFile)
        await api.post('/auth/profile/resume', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setResumeFile(null)
      }
      await refreshUser()
      setSavedMsg(true)
      window.setTimeout(() => setSavedMsg(false), 4000)
    } catch (e) {
      const status = e.response?.status
      const msg =
        e.response?.data?.message ||
        (status === 404
          ? 'Profile API not found — check VITE_API_URL ends with /api and the backend is running.'
          : null) ||
        (e.code === 'ERR_NETWORK' ? 'Network error — check that the API is running.' : null) ||
        e.message ||
        'Could not save'
      setErr(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-400">
        Loading…
      </main>
    )
  }

  return (
    <main className="min-h-screen w-full bg-[#020617] text-slate-100">
      <div
        className="pointer-events-none fixed inset-0 opacity-90"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 100% 60% at 50% -10%, rgba(34,211,238,0.12), transparent 45%), radial-gradient(ellipse 70% 50% at 100% 50%, rgba(59,130,246,0.06), transparent 50%), radial-gradient(ellipse 70% 50% at 0% 80%, rgba(15,23,42,0.85), transparent 55%)',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <Link
              to="/dashboard"
              className="text-sm font-medium text-cyan-400/90 transition hover:text-cyan-300"
            >
              ← Back to dashboard
            </Link>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              Profile
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              View and update your details on one page — same fields as before.
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-slate-500 underline decoration-slate-600 underline-offset-2 transition hover:text-slate-300"
            onClick={() => navigate('/dashboard', { replace: true })}
          >
            Skip for now
          </button>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          <aside className="lg:w-56 lg:shrink-0">
            <nav
              className="sticky top-6 rounded-2xl border border-slate-800/90 bg-slate-950/70 p-4 shadow-lg backdrop-blur-md"
              aria-label="Profile sections"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Quick links
              </p>
              <ul className="space-y-1">
                {NAV_LINKS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#section-${s.id}`}
                      className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-cyan-200"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="min-w-0 flex-1 space-y-6 pb-24">
            {/* Profile header strip */}
            <section
              id="section-overview"
              className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/60 p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-8"
            >
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/90 to-indigo-600 text-xl font-bold text-white shadow-lg ring-2 ring-slate-900">
                    {getInitials(user.name)}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold text-slate-50">{user.name}</h2>
                    {user.username ? (
                      <p className="text-sm text-cyan-400/90">@{user.username}</p>
                    ) : null}
                    <p className="mt-1 truncate text-sm text-slate-400">{user.email}</p>
                    <p className="mt-2 text-xs text-slate-500">Keep your profile updated for better interview context.</p>
                  </div>
                </div>
                <div className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:w-auto">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Profile strength
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-lg font-bold tabular-nums text-cyan-200">{pct}%</span>
                  </div>
                  {pct < 100 && (
                    <p className="mt-2 text-xs text-amber-200/80">Add missing details below to reach 100%.</p>
                  )}
                </div>
              </div>
            </section>

            <section
              id="section-username"
              className="scroll-mt-24 rounded-2xl border border-slate-800/90 bg-slate-950/55 p-6 shadow-lg backdrop-blur-sm sm:p-8"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">{SECTIONS[0].label}</h2>
                  <p className="text-sm text-slate-500">{SECTIONS[0].hint}</p>
                </div>
              </div>
              <label className="block text-sm text-slate-300">
                Username
                <input
                  className="input mt-2"
                  placeholder="e.g. priya_sharma"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </label>
            </section>

            <section
              id="section-gender"
              className="scroll-mt-24 rounded-2xl border border-slate-800/90 bg-slate-950/55 p-6 shadow-lg backdrop-blur-sm sm:p-8"
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-100">{SECTIONS[1].label}</h2>
                <p className="text-sm text-slate-500">{SECTIONS[1].hint}</p>
              </div>
              <label className="block text-sm text-slate-300">
                Gender
                <select
                  className="input mt-2"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.value || 'empty'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section
              id="section-education"
              className="scroll-mt-24 rounded-2xl border border-slate-800/90 bg-slate-950/55 p-6 shadow-lg backdrop-blur-sm sm:p-8"
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-100">{SECTIONS[2].label}</h2>
                <p className="text-sm text-slate-500">{SECTIONS[2].hint}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-300 sm:col-span-2">
                  Degree / level
                  <input
                    className="input mt-2"
                    placeholder="e.g. B.Tech Computer Science"
                    value={education.level}
                    onChange={(e) =>
                      setEducation((prev) => ({ ...prev, level: e.target.value }))
                    }
                  />
                </label>
                <label className="block text-sm text-slate-300 sm:col-span-2">
                  Field / specialization
                  <input
                    className="input mt-2"
                    placeholder="e.g. Software Engineering"
                    value={education.field}
                    onChange={(e) =>
                      setEducation((prev) => ({ ...prev, field: e.target.value }))
                    }
                  />
                </label>
                <label className="block text-sm text-slate-300 sm:col-span-2">
                  Institute
                  <input
                    className="input mt-2"
                    placeholder="e.g. IIT Delhi"
                    value={education.institute}
                    onChange={(e) =>
                      setEducation((prev) => ({ ...prev, institute: e.target.value }))
                    }
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  Year
                  <input
                    className="input mt-2"
                    placeholder="e.g. 2024"
                    value={education.year}
                    onChange={(e) =>
                      setEducation((prev) => ({ ...prev, year: e.target.value }))
                    }
                  />
                </label>
              </div>
            </section>

            <section
              id="section-resume"
              className="scroll-mt-24 rounded-2xl border border-slate-800/90 bg-slate-950/55 p-6 shadow-lg backdrop-blur-sm sm:p-8"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">{SECTIONS[3].label}</h2>
                  <p className="text-sm text-slate-500">{SECTIONS[3].hint}</p>
                </div>
              </div>
              {user.profileResumeFile ? (
                <p className="text-sm text-emerald-400/90">
                  Resume on file. Choose a new PDF below to replace it.
                </p>
              ) : (
                <p className="text-sm text-slate-400">Upload a PDF resume (max size as per server).</p>
              )}
              <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-8 text-center">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="mx-auto block max-w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-4 file:py-2 file:text-sm file:font-medium file:text-cyan-200 hover:file:bg-cyan-500/30"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                />
                {resumeFile && (
                  <p className="mt-3 text-sm text-slate-300">Selected: {resumeFile.name}</p>
                )}
              </div>
            </section>

            <section
              id="section-languages"
              className="scroll-mt-24 rounded-2xl border border-slate-800/90 bg-slate-950/55 p-6 shadow-lg backdrop-blur-sm sm:p-8"
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-100">{SECTIONS[4].label}</h2>
                <p className="text-sm text-slate-500">{SECTIONS[4].hint}</p>
              </div>
              <div className="space-y-4">
                {languages.map((row, i) => (
                  <div key={i} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="block flex-1 text-sm text-slate-300">
                      Language
                      <input
                        className="input mt-2"
                        placeholder="e.g. English"
                        value={row.language}
                        onChange={(e) => {
                          const next = [...languages]
                          next[i] = { ...next[i], language: e.target.value }
                          setLanguages(next)
                        }}
                      />
                    </label>
                    <label className="block w-full text-sm text-slate-300 sm:w-48">
                      Proficiency
                      <select
                        className="input mt-2"
                        value={row.proficiency}
                        onChange={(e) => {
                          const next = [...languages]
                          next[i] = { ...next[i], proficiency: e.target.value }
                          setLanguages(next)
                        }}
                      >
                        {PROFICIENCY.map((p) => (
                          <option key={p || 'p0'} value={p}>
                            {p || 'Select…'}
                          </option>
                        ))}
                      </select>
                    </label>
                    {languages.length > 1 && (
                      <button
                        type="button"
                        className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:bg-white/5"
                        onClick={() => setLanguages(languages.filter((_, j) => j !== i))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {languages.length < 6 && (
                  <button
                    type="button"
                    className="text-sm font-medium text-cyan-400/90 hover:text-cyan-300"
                    onClick={() =>
                      setLanguages([...languages, { language: '', proficiency: '' }])
                    }
                  >
                    + Add language
                  </button>
                )}
              </div>
            </section>

            <section
              id="section-skills"
              className="scroll-mt-24 rounded-2xl border border-slate-800/90 bg-slate-950/55 p-6 shadow-lg backdrop-blur-sm sm:p-8"
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-100">{SECTIONS[5].label}</h2>
                <p className="text-sm text-slate-500">{SECTIONS[5].hint}</p>
              </div>
              <label className="block text-sm text-slate-300">
                Comma-separated
                <textarea
                  className="input mt-2 min-h-[8rem]"
                  placeholder="e.g. React, Node.js, System design, Communication"
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                />
              </label>
            </section>

            {err && (
              <p className="rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
                {err}
              </p>
            )}
            {savedMsg && (
              <p className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
                Profile saved successfully.
              </p>
            )}

            <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/90 bg-[#020617]/95 py-4 backdrop-blur-md">
              <p className="text-xs text-slate-500">
                Saves username, gender, education, languages, skills, and optional new resume.
              </p>
              <button
                type="button"
                className="rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-8 py-3 font-semibold text-white shadow-lg shadow-cyan-900/20 transition hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-60"
                onClick={saveAll}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save all changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
