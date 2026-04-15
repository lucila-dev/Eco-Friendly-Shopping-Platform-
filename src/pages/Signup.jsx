import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

/** Returns an error message if the password does not meet the policy shown on the form. */
function signupPasswordError(password) {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.'
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must include a number.'
  return null
}

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { signUp } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Create account · EcoShop'
    return () => { document.title = 'EcoShop · Sustainable Shopping' }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const pwErr = signupPasswordError(password)
    if (pwErr) {
      setError(pwErr)
      return
    }
    const { error: err } = await signUp(email, password, { full_name: username })
    if (err) {
      setError(err.message)
      return
    }
    setSuccess('Account created. Check your email to confirm, or sign in below.')
    setTimeout(() => navigate('/login', { replace: true }), 2000)
  }

  return (
    <div className="min-h-[calc(100vh-7rem)] w-full flex items-center justify-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-lg mx-auto rounded-2xl border border-stone-200 dark:border-emerald-800/50 bg-white dark:bg-stone-900/95 px-6 sm:px-10 py-8 sm:py-10 shadow-lg dark:shadow-xl dark:shadow-black/30">
        <div className="mb-6 sm:mb-8 flex flex-col items-center text-center">
          <img src="/favicon-96x96.png" alt="" className="mb-3 h-12 w-12 sm:h-14 sm:w-14" />
          <h1 className="text-3xl sm:text-4xl font-bold leading-snug text-stone-900 dark:text-stone-50">
            Create Your Account
          </h1>
          <p className="mt-2 text-base sm:text-lg text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
            Join us in making sustainable shopping choices
          </p>
        </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-base font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-300">
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
              className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800/90 py-2.5 sm:py-3 pl-10 pr-3 text-base sm:text-lg text-stone-800 dark:text-stone-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 focus:bg-white dark:focus:bg-stone-950 placeholder:text-stone-400 dark:placeholder:text-stone-500"
              placeholder="Enter your email"
            />
          </div>
        </div>
        <div>
          <label htmlFor="username" className="mb-1 block text-base font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-300">
            Username
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400 dark:text-stone-500">
              <MailIcon />
            </span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800/90 py-2.5 sm:py-3 pl-10 pr-3 text-base sm:text-lg text-stone-800 dark:text-stone-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 focus:bg-white dark:focus:bg-stone-950 placeholder:text-stone-400 dark:placeholder:text-stone-500"
              placeholder="Choose a username"
            />
          </div>
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-base font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-300">
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
              className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800/90 py-2.5 sm:py-3 pl-10 pr-3 text-base sm:text-lg text-stone-800 dark:text-stone-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 focus:bg-white dark:focus:bg-stone-950 placeholder:text-stone-400 dark:placeholder:text-stone-500"
              placeholder="Create a password"
            />
          </div>
          <p className="mt-1 text-sm sm:text-base leading-snug text-stone-500 dark:text-stone-400">
            Must be at least 8 characters with uppercase, lowercase, and numbers
          </p>
        </div>
        {error && <p className="text-red-600 dark:text-red-400 text-base sm:text-lg">{error}</p>}
        {success && <p className="text-emerald-600 dark:text-emerald-400 text-base sm:text-lg">{success}</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 sm:py-3.5 text-base sm:text-lg font-semibold text-white transition hover:bg-emerald-700 shadow-md"
        >
          Create Account
        </button>
      </form>
      <p className="mt-6 text-center text-base sm:text-lg text-stone-500 dark:text-stone-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
          Log In
        </Link>
      </p>
      </div>
    </div>
  )
}
