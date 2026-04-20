import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

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
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [error, setError] = useState('')
  const [forgotMode, setForgotMode] = useState(false)
  const [success, setSuccess] = useState('')
  const { signIn, resetPassword, passwordRecoveryRequired, clearPasswordRecovery } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = passwordRecoveryRequired
      ? 'Set new password · EcoShop'
      : forgotMode
        ? 'Reset password · EcoShop'
        : 'Sign in · EcoShop'
    return () => { document.title = 'EcoShop · Sustainable Shopping' }
  }, [forgotMode, passwordRecoveryRequired])

  useEffect(() => {
    if (passwordRecoveryRequired) setForgotMode(false)
  }, [passwordRecoveryRequired])

  const handleRecoverySubmit = async () => {
    setError('')
    setSuccess('')
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== newPassword2) {
      setError('Passwords do not match.')
      return
    }
    const { error: err } = await supabase.auth.updateUser({ password: newPassword })
    if (err) {
      setError(err.message)
      return
    }
    clearPasswordRecovery()
    setNewPassword('')
    setNewPassword2('')
    navigate('/', { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (passwordRecoveryRequired) {
      await handleRecoverySubmit()
      return
    }
    if (forgotMode) {
      const { error: err } = await resetPassword(email)
      if (err) {
        setError(err.message)
        return
      }
      setSuccess('Check your email for a link to reset your password.')
      return
    }
    const { data, error: err } = await signIn(email, password)
    if (err) {
      setError(err.message)
      return
    }
    const signedInUser = data?.user ?? data?.session?.user
    if (signedInUser && !signedInUser.email_confirmed_at) {
      navigate('/verify-email', { replace: true })
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="w-full flex items-center justify-center">
      <div className="w-full max-w-lg mx-auto rounded-2xl border border-stone-200 dark:border-emerald-800/50 bg-white dark:bg-stone-900/95 px-6 sm:px-10 py-8 sm:py-10 shadow-lg dark:shadow-xl dark:shadow-black/30">
        <div className="mb-6 sm:mb-8 flex flex-col items-center text-center">
          <img src="/favicon-96x96.png" alt="" className="mb-3 h-12 w-12 sm:h-14 sm:w-14" />
          <h1 className="text-3xl sm:text-4xl font-bold leading-snug text-stone-900 dark:text-stone-50">
            {passwordRecoveryRequired ? 'Set a new password' : forgotMode ? 'Reset Password' : 'Welcome Back'}
          </h1>
          <p className="mt-2 text-base sm:text-lg text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
            {passwordRecoveryRequired
              ? 'Choose a new password for your account.'
              : forgotMode
                ? 'Enter your email and we will send you a reset link'
                : 'Sign in to continue your sustainable shopping journey'}
          </p>
        </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {passwordRecoveryRequired ? (
          <>
            <div>
              <label htmlFor="new-password" className="mb-1 block text-base font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-300">
                New password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400 dark:text-stone-500">
                  <LockIcon />
                </span>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800/90 py-2.5 sm:py-3 pl-10 pr-3 text-base sm:text-lg text-stone-800 dark:text-stone-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 focus:bg-white dark:focus:bg-stone-950 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                  placeholder="New password"
                />
              </div>
            </div>
            <div>
              <label htmlFor="new-password2" className="mb-1 block text-base font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-300">
                Confirm new password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400 dark:text-stone-500">
                  <LockIcon />
                </span>
                <input
                  id="new-password2"
                  type="password"
                  value={newPassword2}
                  onChange={(e) => setNewPassword2(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800/90 py-2.5 sm:py-3 pl-10 pr-3 text-base sm:text-lg text-stone-800 dark:text-stone-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 focus:bg-white dark:focus:bg-stone-950 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </>
        ) : (
          <>
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
            {!forgotMode && (
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
                    placeholder="Enter your password"
                  />
                </div>
              </div>
            )}
          </>
        )}
        {error && <p className="text-red-600 dark:text-red-400 text-base sm:text-lg">{error}</p>}
        {success && <p className="text-emerald-600 dark:text-emerald-400 text-base sm:text-lg">{success}</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 sm:py-3.5 text-base sm:text-lg font-semibold text-white transition hover:bg-emerald-700 shadow-md"
        >
          {passwordRecoveryRequired ? 'Update password' : forgotMode ? 'Send Reset Link' : 'Sign In'}
        </button>
      </form>
      {!passwordRecoveryRequired && !forgotMode && (
        <p className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setForgotMode(true)}
            className="text-base sm:text-lg font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Forgot password?
          </button>
        </p>
      )}
      {!passwordRecoveryRequired && forgotMode && (
        <p className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setForgotMode(false)}
            className="text-base sm:text-lg text-stone-600 dark:text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            Back to sign in
          </button>
        </p>
      )}
      {!passwordRecoveryRequired && (
      <p className="mt-6 text-center text-base sm:text-lg text-stone-500 dark:text-stone-400">
        Don’t have an account?{' '}
        <Link to="/signup" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
          Create Account
        </Link>
      </p>
      )}
      </div>
    </div>
  )
}
