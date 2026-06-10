import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api'
import onlineAssessmentImg from '../assets/online-assessment.png'

function getInitials(name) {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function clampScore(n) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)))
}

function deriveEvaluationScores(session, feedback, result) {
  const overall = clampScore(result?.percentage ?? feedback?.overallScore ?? 0)
  const qa = Array.isArray(feedback?.questionAnalysis) ? feedback.questionAnalysis : []
  const technicalRaw =
    qa.length > 0
      ? qa.reduce((sum, q) => {
          const max = Number(q?.maxScore) > 0 ? Number(q.maxScore) : 100
          const score = Math.max(0, Math.min(max, Number(q?.score) || 0))
          return sum + (score / max) * 100
        }, 0) / qa.length
      : overall
  const mistakes = Array.isArray(feedback?.mistakePatterns) ? feedback.mistakePatterns.length : 0
  const answers = Array.isArray(session?.answers) ? session.answers : []
  const avgAnswerWords =
    answers.length > 0
      ? answers.reduce((sum, a) => sum + String(a?.answerText || a?.transcript || '').trim().split(/\s+/).filter(Boolean).length, 0) /
        answers.length
      : 0
  const communicationRaw = overall * 0.55 + Math.min(avgAnswerWords, 140) * 0.35
  const confidenceRaw = overall - mistakes * 2 + Math.min(avgAnswerWords / 3, 15)
  return {
    confidence: clampScore(confidenceRaw),
    technical: clampScore(technicalRaw),
    communication: clampScore(communicationRaw),
  }
}

export default function DashboardPage() {
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const historySectionRef = useRef(null)
  const historyCarouselRef = useRef(null)
  const profileMenuRef = useRef(null)
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const { data } = await api.get('/interview/history')
      setHistory(data.history || [])
    } catch (error) {
      console.error(error)
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  useEffect(() => {
    if (!profileMenuOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setProfileMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [profileMenuOpen])

  const scrollToHistory = () => {
    setProfileMenuOpen(false)
    requestAnimationFrame(() =>
      historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    )
  }

  const handleLogout = async () => {
    setProfileMenuOpen(false)
    await logout()
  }

  const goToInterviewSetup = () => {
    navigate('/interview/setup')
  }
  const goToOnlineAssessment = () => {
    navigate('/assessment/online')
  }
  const goToTechQA = () => {
    navigate('/assessment/tech-qa')
  }
  const goToAboutMe = () => {
    navigate('/about')
  }

  const scrollHistoryBy = (dir) => {
    if (!historyCarouselRef.current) return
    historyCarouselRef.current.scrollBy({
      left: dir * 460,
      behavior: 'smooth',
    })
  }

  const goToProfileWizard = () => {
    setProfileMenuOpen(false)
    navigate('/profile/complete')
    // Fallback for rare dropdown/event layering issues where SPA navigation is swallowed.
    window.setTimeout(() => {
      if (window.location.pathname !== '/profile/complete') {
        window.location.assign('/profile/complete')
      }
    }, 80)
  }

  const removeSession = async (sessionId) => {
    if (!window.confirm('Remove this interview from history? This cannot be undone.')) return
    setRemovingId(sessionId)
    try {
      await api.delete(`/interview/${sessionId}`)
      if (expandedSession === sessionId) setExpandedSession(null)
      await fetchHistory()
    } catch (error) {
      console.error(error)
    } finally {
      setRemovingId(null)
    }
  }

  const profilePct = user?.profileCompletionPercent ?? 0
  const totalSessions = history.length

  return (
    <main className="min-h-screen w-full min-w-0">
      <div className="relative flex min-h-[100svh] w-full flex-col border-b border-slate-800/40 bg-[#020617]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 100% 70% at 50% -5%, rgba(34,211,238,0.16), transparent 50%), radial-gradient(ellipse 80% 50% at 50% 40%, rgba(59,130,246,0.08), transparent 55%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(15,23,42,0.9), transparent 70%)',
          }}
        />
        <p className="pointer-events-none absolute bottom-10 right-12 text-2xl text-slate-600/70" aria-hidden>
          ✦
        </p>

        <div className="relative z-20 w-full shrink-0 px-3 pt-5 sm:px-5 sm:pt-8 lg:px-8 lg:pt-10 xl:px-10 xl:pt-12">
          <nav
            className="mx-auto flex w-full max-w-[min(100%,110rem)] flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-white/10 bg-slate-950/55 px-5 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:gap-5 sm:rounded-[1.75rem] sm:px-7 sm:py-4 md:rounded-[2rem] lg:gap-6 lg:rounded-[2.25rem] lg:px-9 lg:py-4"
            aria-label="Primary"
          >
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-500/35 bg-slate-900/90 text-cyan-300 shadow-inner shadow-cyan-500/10 sm:h-12 sm:w-12"
                aria-hidden
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="opacity-90 sm:h-6 sm:w-6">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
              <span className="truncate text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl md:text-3xl">
                Interview AI
              </span>
            </div>

            <div className="order-3 flex w-full min-w-0 flex-1 basis-full items-center justify-center gap-x-5 gap-y-2 overflow-x-auto py-1 text-base text-slate-400 sm:order-none sm:w-auto sm:basis-auto sm:gap-6 sm:py-0 md:gap-7 md:text-lg md:justify-center lg:gap-9 lg:text-xl">
              <button
                type="button"
                className="shrink-0 whitespace-nowrap transition hover:text-cyan-200"
                onClick={goToInterviewSetup}
              >
                Interview Assessment
              </button>
              <button
                type="button"
                className="shrink-0 whitespace-nowrap text-slate-400 transition hover:text-cyan-200"
                onClick={goToTechQA}
              >
                Tech Q&amp;A
              </button>
              <button
                type="button"
                className="shrink-0 whitespace-nowrap text-slate-400 transition hover:text-cyan-200"
                onClick={goToOnlineAssessment}
              >
                Online Assessment
              </button>
              <button
                type="button"
                className="shrink-0 whitespace-nowrap text-slate-400 transition hover:text-cyan-200"
                onClick={goToAboutMe}
              >
                About Me
              </button>
            </div>

            <div className="relative z-[200] flex shrink-0 items-center" ref={profileMenuRef}>
              {user ? (
                <>
                  <button
                    type="button"
                    className="relative z-[202] flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/80 py-1.5 pl-1.5 pr-3 text-left transition hover:border-cyan-500/40 hover:bg-slate-900 sm:gap-3 sm:pl-2 sm:pr-4"
                    onClick={() => setProfileMenuOpen((o) => !o)}
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Account menu"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/90 to-indigo-600 text-sm font-bold text-white shadow-md ring-2 ring-slate-950 sm:h-11 sm:w-11 sm:text-base"
                      aria-hidden
                    >
                      {getInitials(user.name)}
                    </span>
                    <span className="hidden max-w-[10rem] truncate text-base font-medium text-slate-200 sm:inline md:max-w-[12rem] lg:text-lg">
                      {user.name}
                    </span>
                    <span
                      className={`text-slate-500 transition sm:ml-0 ${profileMenuOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    >
                      ▾
                    </span>
                  </button>

                  {profileMenuOpen && (
                    <>
                      <div
                        className="pointer-events-auto absolute right-0 top-[calc(100%+0.5rem)] z-[203] w-[min(100vw-1.5rem,20rem)] overflow-hidden rounded-2xl border border-slate-700/90 bg-[#0c1322] shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-xl"
                        role="menu"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="border-b border-slate-800/90 px-4 pb-4 pt-4">
                          <div className="flex gap-3">
                            <div
                              className="relative h-[3.25rem] w-[3.25rem] shrink-0"
                              title={`Profile ${profilePct}% complete`}
                            >
                              <svg
                                className="absolute inset-0 -rotate-90 text-slate-700/90"
                                viewBox="0 0 52 52"
                                aria-hidden
                              >
                                <circle
                                  cx="26"
                                  cy="26"
                                  r="22"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                />
                                <circle
                                  cx="26"
                                  cy="26"
                                  r="22"
                                  fill="none"
                                  stroke="url(#profileRingGrad)"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeDasharray={`${(profilePct / 100) * 138.23} 138.23`}
                                />
                                <defs>
                                  <linearGradient id="profileRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#22d3ee" />
                                    <stop offset="100%" stopColor="#6366f1" />
                                  </linearGradient>
                                </defs>
                              </svg>
                              <span
                                className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/90 to-indigo-600 text-xs font-bold text-white shadow-inner ring-2 ring-[#0c1322]"
                                aria-hidden
                              >
                                {getInitials(user.name)}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-0.5">
                              <p className="truncate font-semibold leading-tight text-slate-50">
                                {user.name}
                              </p>
                              {user.username ? (
                                <p className="truncate text-xs text-cyan-400/85">@{user.username}</p>
                              ) : null}
                              <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-600/90 to-indigo-600/90 py-2.5 text-center text-sm font-semibold text-white shadow-md transition hover:from-cyan-500 hover:to-indigo-500"
                            onClick={goToProfileWizard}
                          >
                            Profile update
                          </button>
                        </div>
                        <div className="py-1.5">
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/[0.06] hover:text-cyan-200"
                            onClick={scrollToHistory}
                          >
                            <svg
                              className="h-5 w-5 shrink-0 text-slate-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8.25 6.75h12M8.25 12h12m-12 4.5h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                              />
                            </svg>
                            History
                          </button>
                          <div className="mx-4 my-1 border-t border-slate-800/90" />
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-rose-300/95 transition hover:bg-rose-950/35"
                            onClick={handleLogout}
                          >
                            <svg
                              className="h-5 w-5 shrink-0 text-rose-400/90"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                              />
                            </svg>
                            Log out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </div>
          </nav>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-4 pb-16 pt-8 text-center sm:px-8 sm:pb-20 sm:pt-10 md:px-12 lg:px-16 lg:pb-24 xl:px-20 xl:pb-28">
          <div className="mx-auto w-full max-w-[90rem]">
            <div className="mb-10 inline-flex items-center gap-2.5 rounded-full border border-cyan-500/35 bg-slate-950/50 px-5 py-2 text-sm font-medium text-slate-300 shadow-sm backdrop-blur-sm sm:mb-12 sm:px-6 sm:py-2.5 sm:text-base md:text-lg">
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.95)]"
                aria-hidden
              />
              <span>Interview AI</span>
            </div>

            <h1 className="text-[clamp(2.25rem,6vw+1rem,5.5rem)] font-bold leading-[1.05] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-200">
              Interview &amp; Meeting AI Copilot
            </h1>
            <p className="mx-auto mt-8 max-w-5xl text-lg leading-relaxed text-slate-400 sm:mt-10 sm:text-xl md:text-2xl md:leading-relaxed lg:mt-12 lg:max-w-6xl lg:text-[1.65rem] lg:leading-relaxed xl:text-3xl xl:leading-snug">
              Innovative dual-layer AI Copilot system that provides AI Copilot and AI Coach running
              in parallel.
            </p>
            <button
              type="button"
              onClick={goToInterviewSetup}
              className="mt-10 text-base font-medium text-cyan-400 transition hover:text-cyan-300 sm:mt-12 sm:text-lg md:text-xl"
            >
              Open mock interview setup
            </button>
            <div className="mt-12 sm:mt-14 md:mt-16">
              <button
                type="button"
                onClick={goToInterviewSetup}
                className="group relative inline-flex items-center justify-center rounded-full border-2 border-cyan-400/70 bg-slate-950/50 px-14 py-4 text-lg font-semibold text-cyan-50 shadow-[0_0_40px_rgba(34,211,238,0.25)] transition hover:border-cyan-300 hover:shadow-[0_0_56px_rgba(34,211,238,0.42)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 sm:px-16 sm:py-5 sm:text-xl md:px-20 md:py-6 md:text-2xl"
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 opacity-0 transition group-hover:opacity-100" />
                <span className="relative">Get Started</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 px-4 py-8 sm:px-8 lg:px-12 xl:px-16">
        <section
          id="online-assessment"
          className="mt-6 scroll-mt-28 md:scroll-mt-32"
          aria-labelledby="online-assessment-heading"
        >
          <h2
            id="online-assessment-heading"
            className="mb-5 text-2xl font-semibold text-slate-100 md:text-3xl"
          >
            Online assessment
          </h2>
          <Link
            to="/assessment/online"
            className="group flex flex-col items-stretch gap-6 rounded-3xl border border-cyan-900/35 bg-[#0b1020]/90 p-6 shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_20px_42px_rgba(2,6,23,0.5)] transition hover:border-cyan-500/45 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_24px_48px_rgba(2,6,23,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617] sm:p-8 md:flex-row md:items-stretch md:gap-6 lg:gap-8"
          >
            <div className="relative w-full shrink-0 overflow-hidden rounded-2xl border border-slate-700/40 bg-slate-900/50 md:w-[60%]">
              <img
                src={onlineAssessmentImg}
                alt="Illustration of people taking an online assessment"
                className="aspect-[16/10] w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-8 py-4 text-center sm:gap-10 md:w-[40%] md:py-6 lg:gap-12">
              <p className="max-w-prose text-base leading-relaxed text-slate-300 sm:text-lg sm:leading-relaxed lg:text-xl lg:leading-relaxed xl:text-2xl xl:leading-snug">
                Build fluency with <span className="text-slate-200">verbal</span>,{' '}
                <span className="text-slate-200">numerical</span>, and{' '}
                <span className="text-slate-200">reasoning</span> practice questions. Work through
                timed sets, sharpen problem-solving, and review your results on the online assessment
                page.
              </p>
              <span className="inline-flex min-h-[2.875rem] min-w-[10.5rem] items-center justify-center rounded-full border-2 border-cyan-400/60 bg-cyan-500/10 px-8 py-3 text-base font-semibold leading-none text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.2)] transition group-hover:border-cyan-300 group-hover:bg-cyan-500/20 sm:min-h-[3.125rem] sm:min-w-[11.5rem] sm:px-9 sm:py-3.5 sm:text-lg lg:min-h-[3.5rem] lg:min-w-[12.5rem] lg:px-10 lg:py-4 lg:text-xl">
                Start
              </span>
            </div>
          </Link>
        </section>

        <section id="tech-qa" className="mt-12 scroll-mt-28 md:scroll-mt-32" aria-labelledby="tech-qa-heading">
          <h2 id="tech-qa-heading" className="mb-5 text-2xl font-semibold text-slate-100 md:text-3xl">
            Tech Q&amp;A
          </h2>
          <Link
            to="/assessment/tech-qa"
            className="group block w-full rounded-3xl border border-cyan-900/35 bg-[#0b1020]/90 p-6 shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_20px_42px_rgba(2,6,23,0.5)] transition hover:border-cyan-500/45 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_24px_48px_rgba(2,6,23,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617] sm:p-8"
          >
            <div className="rounded-2xl border border-cyan-300/30 bg-[linear-gradient(150deg,rgba(30,41,59,0.8)_0%,rgba(15,23,42,0.9)_62%,rgba(2,6,23,0.95)_100%)] p-6 shadow-[0_22px_56px_rgba(2,6,23,0.65)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    AI Question &amp; Answer Sets
                  </p>
                  <h3 className="mt-2 text-3xl font-bold text-cyan-200">Tech Q&amp;A Sets</h3>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                    Generate custom 10-Q&amp;A sets on any interview topic.
                  </p>
                </div>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-400/45 bg-cyan-500/10 text-cyan-200">
                  ?
                </span>
              </div>
              <span className="mt-5 inline-flex min-h-[2.875rem] min-w-[13rem] items-center justify-center rounded-full border-2 border-cyan-400/60 bg-cyan-500/10 px-7 py-3 text-sm font-semibold uppercase tracking-wide text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.2)] transition group-hover:border-cyan-300 group-hover:bg-cyan-500/20">
                Go To Q&amp;A Generator
              </span>
            </div>
          </Link>
        </section>

        <section
          id="interview-history"
          ref={historySectionRef}
          className="mt-12 scroll-mt-28 md:mt-14 md:scroll-mt-32"
        >
          <h2 className="mb-5 text-2xl font-semibold text-slate-100 md:text-3xl">Past Session History</h2>
          {historyLoading ? (
            <p className="text-sm text-slate-400">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-400">
              No sessions yet. Complete an interview to see results here.
            </p>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-base text-slate-300">
                  Swipe/scroll to view all sessions ({totalSessions})
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollHistoryBy(-1)}
                    className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-base text-slate-300 hover:border-cyan-500/50 hover:text-cyan-200"
                    aria-label="Scroll history left"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollHistoryBy(1)}
                    className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-base text-slate-300 hover:border-cyan-500/50 hover:text-cyan-200"
                    aria-label="Scroll history right"
                  >
                    →
                  </button>
                </div>
              </div>

              <div
                ref={historyCarouselRef}
                className="flex gap-6 overflow-x-auto pb-4 [scroll-snap-type:x_mandatory] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {history.map((session, index) => {
                  const feedback = session.feedback
                  const result = session.result
                  const isOpen = expandedSession === session._id
                  const maxOverall = result?.maxScore ?? 100
                  const receivedOverall = result?.scoreReceived ?? feedback?.overallScore ?? null
                  const scores = deriveEvaluationScores(session, feedback, result)
                  const strengths = feedback?.strengths || []
                  const improvements = feedback?.improvements || []
                  const mistakes = feedback?.mistakePatterns || []
                  const tips = feedback?.nextSteps || []
                  const qaPairs = (session.questions || []).map((q, i) => {
                    const answer = (session.answers || []).find(
                      (a) => String(a?.question || '').trim() === String(q?.question || '').trim()
                    )
                    const analysis =
                      (feedback?.questionAnalysis || []).find(
                        (fqa) => String(fqa?.question || '').trim() === String(q?.question || '').trim()
                      ) || feedback?.questionAnalysis?.[i]
                    return { q, answer, analysis }
                  })
                  return (
                    <article
                      key={session._id}
                      className="min-w-[min(100%,30rem)] max-w-[30rem] snap-start rounded-3xl border border-cyan-900/30 bg-[#0b1020]/95 p-6 shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_20px_42px_rgba(2,6,23,0.76)]"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold text-slate-100">
                            {(session.interviewConfig?.topic || 'General')} Interview - Session {history.length - index}
                          </h3>
                          <p className="mt-1 text-sm text-slate-400">
                            {new Date(session.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span className="rounded-xl border border-fuchsia-400/35 bg-fuchsia-500/10 px-4 py-1.5 text-2xl font-bold text-cyan-200 shadow-[0_0_18px_rgba(217,70,239,0.35)]">
                          {receivedOverall != null ? `${receivedOverall}/${maxOverall}` : '—'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/35 p-3 text-center">
                        {[
                          { label: 'Confidence', value: scores.confidence, color: 'text-sky-300' },
                          { label: 'Technical', value: scores.technical, color: 'text-fuchsia-300' },
                          { label: 'Communication', value: scores.communication, color: 'text-cyan-300' },
                        ].map((m) => (
                          <div key={m.label} className="rounded-xl border border-slate-800/90 bg-slate-950/50 px-2 py-2.5">
                            <p className={`text-lg font-semibold ${m.color}`}>{m.value}</p>
                            <p className="text-xs text-slate-400">{m.label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedSession(isOpen ? null : session._id)}
                          className="rounded-xl border border-cyan-400/45 bg-cyan-500/10 px-5 py-2 text-sm font-medium text-cyan-200 shadow-[0_0_22px_rgba(34,211,238,0.25)] transition hover:bg-cyan-500/20"
                        >
                          {isOpen ? 'Hide Questions' : 'View Questions'}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-rose-900/80 bg-rose-950/35 px-3 py-1.5 text-sm text-rose-200 hover:bg-rose-950/60 disabled:opacity-50"
                          disabled={removingId === session._id}
                          onClick={() => removeSession(session._id)}
                        >
                          {removingId === session._id ? 'Removing…' : 'Remove'}
                        </button>
                      </div>

                      <div className="mt-4 space-y-3 border-t border-slate-800/80 pt-4 text-sm">
                        <div>
                          <p className="font-semibold text-emerald-300">Positive feedback (strengths)</p>
                          {strengths.length ? (
                            <ul className="mt-1 list-disc pl-5 text-slate-300">
                              {strengths.slice(0, 3).map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1 text-slate-500">No strengths generated yet.</p>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-rose-300">Negative feedback (areas to improve)</p>
                          {improvements.length ? (
                            <ul className="mt-1 list-disc pl-5 text-slate-300">
                              {improvements.slice(0, 3).map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1 text-slate-500">No improvement notes generated yet.</p>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-amber-300">Mistakes & improvement</p>
                          {mistakes.length ? (
                            <ul className="mt-1 list-disc pl-5 text-slate-300">
                              {mistakes.slice(0, 2).map((m, idx) => (
                                <li key={idx}>{m}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1 text-slate-500">No repeated mistake pattern detected.</p>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-cyan-300">Suggested tips / fixes</p>
                          {tips.length ? (
                            <ul className="mt-1 list-disc pl-5 text-slate-300">
                              {tips.slice(0, 2).map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1 text-slate-500">No tips generated yet.</p>
                          )}
                        </div>
                      </div>

                      {isOpen && (
                        <div className="mt-5 space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/35 p-4">
                          <p className="text-base font-semibold text-slate-100">Question / answer set for this session</p>
                          {qaPairs.length ? (
                            qaPairs.map(({ q, answer, analysis }, idx) => (
                              <div key={idx} className="rounded-xl border border-slate-800/90 bg-slate-950/60 p-3 text-sm">
                                <p className="font-medium text-slate-100">
                                  Q{idx + 1}. {q?.question || 'Question unavailable'}
                                </p>
                                <p className="mt-1.5 text-slate-300">
                                  <span className="text-slate-500">Answer: </span>
                                  {answer?.answerText || answer?.transcript || analysis?.userAnswer || 'N/A'}
                                </p>
                                {analysis?.score != null && (
                                  <p className="mt-1 text-slate-400">
                                    Score: {analysis.score}/{analysis.maxScore || 100}
                                  </p>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">No question/answer data available yet.</p>
                          )}
                        </div>
                      )}
                    </article>
                  )
                })}

              </div>

              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={goToInterviewSetup}
                  className="rounded-full border border-cyan-400/50 bg-cyan-500/10 px-8 py-3 text-sm font-semibold text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.25)] transition hover:bg-cyan-500/20"
                >
                  Start New Session
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <footer
        className="border-t border-slate-800/80 bg-[#020617] px-4 py-10 sm:px-8 lg:px-12 xl:px-16"
        role="contentinfo"
      >
        <div className="mx-auto flex w-full max-w-[90rem] flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <p className="text-sm font-medium text-slate-300">Interview AI</p>
          <p className="max-w-xl text-sm leading-relaxed text-slate-500">
            Mock interviews and online assessments to help you prepare with confidence.
          </p>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} Interview AI</p>
        </div>
      </footer>
    </main>
  )
}
