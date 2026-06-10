import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const { login, signUp } = useAuth()
  const navigate = useNavigate()

  const submitHandler = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const u = isSignup
        ? await signUp(form)
        : await login({ email: form.email, password: form.password })
      navigate('/dashboard')
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Authentication failed'
      setError(msg)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070f22] px-4 py-8 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(59,130,246,0.2),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(147,51,234,0.16),transparent_32%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-[760px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.25),rgba(2,6,23,0))]" />

      <section className="relative z-10 w-full max-w-xl rounded-[30px] border border-slate-300/45 bg-[linear-gradient(170deg,rgba(30,64,175,0.5)_0%,rgba(15,23,42,0.78)_45%,rgba(15,23,42,0.92)_100%)] p-8 shadow-[0_20px_70px_rgba(2,6,23,0.85),inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-md sm:p-10">
        <h1 className="mb-8 flex items-center justify-center gap-3 text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/40 bg-cyan-500/20">
            <svg
              aria-hidden
              className="h-5 w-5 text-cyan-200"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 3v4" />
              <path d="M8 7V6a4 4 0 1 1 8 0v1" />
              <rect height="8" rx="3" width="8" x="8" y="7" />
              <path d="M6 12a6 6 0 0 0 12 0" />
              <path d="M12 19v2" />
            </svg>
          </span>
          AI Voice Interview Prep
        </h1>

        <form className="space-y-4" onSubmit={submitHandler}>
          {isSignup && (
            <input
              className="w-full rounded-2xl border border-cyan-400/40 bg-slate-900/45 px-4 py-3 text-base text-slate-100 placeholder:text-slate-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1),0_6px_16px_rgba(15,23,42,0.7)] outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/35"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          )}
          <input
            className="w-full rounded-2xl border border-cyan-400/40 bg-slate-900/45 px-4 py-3 text-base text-slate-100 placeholder:text-slate-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1),0_6px_16px_rgba(15,23,42,0.7)] outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/35"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="w-full rounded-2xl border border-cyan-400/40 bg-slate-900/45 px-4 py-3 text-base text-slate-100 placeholder:text-slate-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1),0_6px_16px_rgba(15,23,42,0.7)] outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/35"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            className="mt-2 w-full rounded-2xl border border-cyan-300/40 bg-[linear-gradient(90deg,#143f9b_0%,#1e40af_45%,#0b2a72_100%)] px-4 py-3 text-3xl font-bold text-white shadow-[0_8px_30px_rgba(29,78,216,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:brightness-110"
            type="submit"
          >
            {isSignup ? 'Create account' : 'Login'}
          </button>
        </form>

        <p className="mt-7 text-center text-2xl text-slate-300/90">
          {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
          <button
            className="text-cyan-300 transition hover:text-cyan-200"
            onClick={() => setIsSignup((prev) => !prev)}
            type="button"
          >
            {isSignup ? 'Login' : 'Sign up'}
          </button>
        </p>

        <p className="mt-6 text-center text-lg text-slate-400/90">
          Secure Login | &copy; AI Voice Interview Prep 2024
        </p>
      </section>
    </main>
  )
}
