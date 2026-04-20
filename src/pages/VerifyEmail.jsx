import { useState, useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getAuthSiteUrl } from '../lib/authSiteUrl'
import { isEmailConfirmed } from '../lib/authEmail'
import { showToast } from '../lib/toast'

export default function VerifyEmail() {
  const { user, loading, signOut } = useAuth()
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Confirm your email · EcoShop'
    return () => {
      document.title = 'EcoShop · Sustainable Shopping'
    }
  }, [])

  if (!loading && user && isEmailConfirmed(user)) {
    return <Navigate to="/" replace />
  }

  if (!loading && !user) {
    return <Navigate to="/login" replace />
  }

  const handleResend = async () => {
    if (!user?.email) return
    setError('')
    setSending(true)
    const origin = getAuthSiteUrl()
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: origin ? { emailRedirectTo: `${origin}/login` } : undefined,
    })
    setSending(false)
    if (err) {
      setError(err.message)
      return
    }
    showToast('Confirmation email sent. Check your inbox.')
  }

  return (
    <div className="w-full flex items-center justify-center">
      <div className="w-full max-w-lg mx-auto rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-stone-900/95 px-6 sm:px-10 py-8 sm:py-10 shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-50">Confirm your email</h1>
          <p className="mt-3 text-base sm:text-lg text-stone-600 dark:text-stone-400 leading-relaxed">
            We sent a link to <span className="font-semibold text-stone-800 dark:text-stone-200">{user?.email}</span>.
            Open it to activate your account before using the cart, checkout, and your profile.
          </p>
        </div>
        {error && <p className="text-red-600 dark:text-red-400 text-base mb-4">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            disabled={sending}
            onClick={handleResend}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Resend confirmation email'}
          </button>
          <button
            type="button"
            onClick={async () => {
              await signOut()
              navigate('/login', { replace: true })
            }}
            className="rounded-xl border border-stone-300 dark:border-stone-600 px-5 py-3 text-base font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Sign out
          </button>
        </div>
        <p className="mt-8 text-center text-base text-stone-500 dark:text-stone-400">
          <Link to="/products" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
            Continue browsing products
          </Link>
        </p>
      </div>
    </div>
  )
}
