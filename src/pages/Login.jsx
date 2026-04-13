import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function MailIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
      <polyline points="3,7 12,13 21,7" />
    </svg>
  )
}

function LockIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" ry="2" />
      <path d="M8 11V8a4 4 0 118 0v3" />
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [forgotMode, setForgotMode] = useState(false)
  const [success, setSuccess] = useState('')
  const { signIn, resetPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  useEffect(() => {
    document.title = forgotMode ? 'Reset password · EcoShop' : 'Sign in · EcoShop'
    return () => { document.title = 'EcoShop · Sustainable Shopping' }
  }, [forgotMode])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (forgotMode) {
      const { error: err } = await resetPassword(email)
      if (err) {
        setError(err.message)
        return
      }
      setSuccess('Check your email for a link to reset your password.')
      return
    }
    const { error: err } = await signIn(email, password)
    if (err) {
      setError(err.message)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-[calc(100vh-7rem)] w-full flex items-center justify-center px-4 py-4 sm:py-6">
      <div className="w-full max-w-sm mx-auto rounded-xl border border-stone-200 dark:border-emerald-800/50 bg-white dark:bg-stone-900/95 px-5 py-6 shadow-md dark:shadow-lg dark:shadow-black/25">
        <div className="mb-4 flex flex-col items-center text-center">
          <img src="/favicon-96x96.png" alt="" className="mb-2 h-10 w-10 sm:h-11 sm:w-11" />
          <h1 className="text-2xl sm:text-3xl font-bold leading-snug text-stone-900 dark:text-stone-50">
            {forgotMode ? 'Reset Password' : 'Welcome Back'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-[18rem]">
            {forgotMode
              ? 'Enter your email and we will send you a reset link'
              : 'Sign in to continue your sustainable shopping journey'}
          </p>
        </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-300">
            Email
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400 dark:text-stone-500">
              <MailIcon />
            </span>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800/90 py-2 pl-10 pr-3 text-sm text-stone-800 dark:text-stone-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:bg-white dark:focus:bg-stone-950 placeholder:text-stone-400 dark:placeholder:text-stone-500"
              placeholder="Enter your email"
            />
          </div>
        </div>
        {!forgotMode && (
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-300">
              Password
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400 dark:text-stone-500">
                <LockIcon />
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800/90 py-2 pl-10 pr-3 text-sm text-stone-800 dark:text-stone-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:bg-white dark:focus:bg-stone-950 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                placeholder="Enter your password"
              />
            </div>
          </div>
        )}
        {error && <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm">{error}</p>}
        {success && <p className="text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">{success}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 shadow-sm"
        >
          {forgotMode ? 'Send Reset Link' : 'Sign In'}
        </button>
      </form>
      {!forgotMode && (
        <p className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setForgotMode(true)}
            className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Forgot password?
          </button>
        </p>
      )}
      {forgotMode && (
        <p className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setForgotMode(false)}
            className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            Back to sign in
          </button>
        </p>
      )}
      <p className="mt-4 text-center text-xs sm:text-sm text-stone-500 dark:text-stone-400">
        Don’t have an account?{' '}
        <Link to="/signup" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
          Create Account
        </Link>
      </p>
      </div>
    </div>
  )
}
