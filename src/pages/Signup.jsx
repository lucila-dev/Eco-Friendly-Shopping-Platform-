import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PersonIcon } from '../components/Icons'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { signUp } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Create account – EcoShop'
    return () => { document.title = 'EcoShop – Sustainable Shopping' }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const { error: err } = await signUp(email, password, { full_name: name })
    if (err) {
      setError(err.message)
      return
    }
    setSuccess('Account created. Check your email to confirm, or sign in below.')
    setTimeout(() => navigate('/login', { replace: true }), 2000)
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-center gap-2 mb-6">
        <PersonIcon className="w-8 h-8 text-emerald-600" aria-hidden />
        <h1 className="text-2xl font-bold text-stone-800">Create account</h1>
      </div>
      <p className="text-stone-600 text-sm mb-6">
        Create an account with a secure password to save your cart and track your green impact.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Your name"
          />
        </div>
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
          <p className="text-stone-500 text-xs mt-1">At least 6 characters</p>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-emerald-600 text-sm">{success}</p>}
        <button
          type="submit"
          className="w-full py-2.5 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
        >
          <PersonIcon className="w-5 h-5" />
          Create account
        </button>
      </form>
      <p className="mt-6 text-stone-600 text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-600 font-medium hover:underline">
          Sign in
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
