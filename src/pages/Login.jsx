import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PersonIcon } from '../components/Icons'

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
    document.title = forgotMode ? 'Reset password – EcoShop' : 'Sign in – EcoShop'
    return () => { document.title = 'EcoShop – Sustainable Shopping' }
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
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-center gap-2 mb-6">
        <PersonIcon className="w-8 h-8 text-emerald-600" aria-hidden />
        <h1 className="text-2xl font-bold text-stone-800">
          {forgotMode ? 'Reset password' : 'Sign in'}
        </h1>
      </div>
      <p className="text-stone-600 text-sm mb-6">
        {forgotMode
          ? 'Enter your email and we’ll send you a link to reset your password.'
          : 'Sign in to your account to access your cart and dashboard.'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="you@example.com"
          />
        </div>
        {!forgotMode && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="••••••••"
            />
          </div>
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-emerald-600 text-sm">{success}</p>}
        <button
          type="submit"
          className="w-full py-2.5 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
        >
          <PersonIcon className="w-5 h-5" />
          {forgotMode ? 'Send reset link' : 'Sign in'}
        </button>
      </form>
      {!forgotMode && (
        <p className="mt-4">
          <button
            type="button"
            onClick={() => setForgotMode(true)}
            className="text-emerald-600 hover:underline text-sm"
          >
            Forgot password?
          </button>
        </p>
      )}
      {forgotMode && (
        <p className="mt-4">
          <button
            type="button"
            onClick={() => setForgotMode(false)}
            className="text-stone-600 hover:text-emerald-600 text-sm"
          >
            Back to sign in
          </button>
        </p>
      )}
      <p className="mt-6 text-stone-600 text-sm">
        Don’t have an account?{' '}
        <Link to="/signup" className="text-emerald-600 font-medium hover:underline">
          Create account
        </Link>
      </p>
      <p className="mt-4">
        <Link to="/" className="text-stone-500 hover:text-emerald-600 text-sm">
          Back to home
        </Link>
      </p>
    </div>
  )
}
