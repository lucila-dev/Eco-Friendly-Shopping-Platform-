import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { MonitorIcon, MoonIcon, SunIcon } from '../components/Icons'

const CONFIRM_PHRASE = 'DELETE'

const themeShortcutClass =
  'flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center shadow-sm transition'

function ToggleRow({ id, label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-t border-stone-200 dark:border-stone-700 first:border-t-0 first:pt-0 first:pb-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-stone-700 dark:text-stone-200 cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900 ${
          checked ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white dark:bg-stone-200 shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default function Settings() {
  const { user, deleteAccount } = useAuth()
  const { theme, setTheme, resolvedTheme, reducedMotion, setReducedMotion, comfortableText, setComfortableText } =
    useTheme()
  const navigate = useNavigate()
  const [confirmText, setConfirmText] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Settings – EcoShop'
    return () => {
      document.title = 'EcoShop – Sustainable Shopping'
    }
  }, [])

  const email = user?.email ?? ''
  const canSubmit =
    confirmText.trim() === CONFIRM_PHRASE && deletePassword.length > 0 && !busy && Boolean(email)

  const handleDelete = async () => {
    if (!canSubmit) return
    setError('')
    setBusy(true)
    try {
      const { error: err } = await deleteAccount({ email, password: deletePassword })
      if (err) {
        setError(err.message || 'Something went wrong.')
        setBusy(false)
        return
      }
      navigate('/', { replace: true })
    } catch (e) {
      setError(e?.message || 'Something went wrong.')
      setBusy(false)
    }
  }

  const themeOptions = [
    { value: 'light', label: 'Light', Icon: SunIcon },
    { value: 'dark', label: 'Dark', Icon: MoonIcon },
    { value: 'system', label: 'System', Icon: MonitorIcon },
  ]

  return (
    <div className="w-full max-w-3xl mx-auto pb-8">
      <header className="text-center mb-8 sm:mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">Settings</h1>
        <p className="mt-3 text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
          Adjust how EcoShop looks and behaves. Account deletion is permanent—use it only if you want to remove your
          login and stored activity.
        </p>
      </header>

      <section className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" aria-hidden />
        <div className="p-6 sm:p-8 lg:p-10">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Appearance</h2>
            <p className="text-stone-600 dark:text-stone-400 text-sm mt-2">Theme applies on this browser only and is saved locally.</p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Color theme">
              {themeOptions.map(({ value, label, Icon }) => {
                const selected = theme === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTheme(value)}
                    className={`${themeShortcutClass} ${
                      selected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 ring-2 ring-emerald-500/30 text-stone-900 dark:text-stone-100'
                        : 'border-emerald-100 dark:border-stone-600 bg-white dark:bg-stone-800/80 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200'
                    }`}
                  >
                    <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-semibold">{label}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-3">
              Active:{' '}
              <span className="font-medium text-stone-800 dark:text-stone-200 capitalize">{resolvedTheme}</span>
              {theme === 'system' ? ' (matches your device)' : ''}.
            </p>
          </div>

          <div className="mt-10 pt-8 border-t border-stone-200 dark:border-stone-700">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">Accessibility</h2>
            <p className="text-stone-600 dark:text-stone-400 text-sm">Tweaks that make the site easier to use.</p>
            <div className="mt-4">
              <ToggleRow
                id="pref-reduce-motion"
                label="Reduce motion"
                description="Shortens animations and transitions."
                checked={reducedMotion}
                onChange={setReducedMotion}
              />
              <ToggleRow
                id="pref-comfortable-text"
                label="Larger default text"
                description="Slightly increases base font size for reading."
                checked={comfortableText}
                onChange={setComfortableText}
              />
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-stone-200 dark:border-stone-700">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">Account</h2>
            <p className="text-stone-600 dark:text-stone-400 text-sm mt-2">
              Signed in as <span className="font-medium text-stone-900 dark:text-stone-100">{email || '—'}</span>
            </p>
            <p className="text-stone-600 dark:text-stone-400 text-sm mt-2">
              To update your name or photo, open{' '}
              <Link to="/profile" className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline">
                Profile
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 lg:p-10">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-300">Delete account</h2>
          <p className="text-stone-700 dark:text-stone-300 text-sm mt-3 leading-relaxed">
            This removes your Supabase Auth user. With your schema, related rows (profile, cart, orders, reviews) should
            cascade delete. You cannot undo this.
          </p>

          <div className="mt-6 rounded-xl border border-stone-200 dark:border-stone-700 bg-white/80 dark:bg-stone-900/90 p-4 text-sm text-stone-600 dark:text-stone-300 space-y-3">
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">In-app deletion uses an Edge Function (included in this repo)</p>
              <p className="mt-1.5">
                One-time setup: install the{' '}
                <a
                  href="https://supabase.com/docs/guides/cli"
                  className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Supabase CLI
                </a>
                , then from the project folder run{' '}
                <code className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-1 py-0.5 rounded">supabase link</code>,{' '}
                <code className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-1 py-0.5 rounded">supabase secrets set SERVICE_ROLE_KEY=…</code>{' '}
                (paste the <strong>service_role</strong> JWT from Dashboard → Project Settings → API; names starting with{' '}
                <code className="text-xs bg-stone-100 dark:bg-stone-800 px-1 rounded">SUPABASE_</code> are not allowed), then{' '}
                <code className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-1 py-0.5 rounded">supabase functions deploy delete-account</code>
                . Code lives in <code className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-1 rounded">supabase/functions/delete-account/</code>.
              </p>
            </div>
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">Or delete manually in the dashboard</p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 mt-1.5">
                <li>
                  Open{' '}
                  <a
                    href="https://supabase.com/dashboard"
                    className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    supabase.com/dashboard
                  </a>{' '}
                  → your project → Authentication → Users.
                </li>
                <li>Find the user → menu → Delete user.</li>
              </ol>
            </div>
            <p className="text-stone-500 dark:text-stone-500 pt-1">
              Never put the service role key in the frontend or in chat—only in CLI secrets or server environment.
            </p>
          </div>

          <div className="mt-6 space-y-4 max-w-lg">
            <div>
              <label htmlFor="delete-password" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                Confirm with your password
              </label>
              <input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-4 py-3 text-base border border-stone-300 dark:border-stone-600 rounded-xl bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-red-400 focus:border-red-400"
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="delete-confirm" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                Type <span className="font-mono bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 px-1 rounded">{CONFIRM_PHRASE}</span> to confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                autoComplete="off"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-4 py-3 text-base border border-stone-300 dark:border-stone-600 rounded-xl bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-red-400 focus:border-red-400"
                placeholder={CONFIRM_PHRASE}
                disabled={busy}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-700 dark:text-red-400 text-sm mt-4 max-w-2xl leading-relaxed" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleDelete}
            disabled={!canSubmit}
            className="mt-6 w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 text-white text-base font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
      </section>
    </div>
  )
}
