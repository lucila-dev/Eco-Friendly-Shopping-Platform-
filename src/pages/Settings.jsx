import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { MonitorIcon, MoonIcon, SunIcon } from '../components/Icons'
import { DISPLAY_CURRENCIES, REGION_OPTIONS } from '../lib/shopMoney'

const CONFIRM_PHRASE = 'DELETE'

const themeShortcutClass =
  'flex flex-col items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-center shadow-sm transition min-h-[5.5rem]'

function ToggleRow({ id, label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2">
      <div className="min-w-0">
        <label htmlFor={id} className="text-base font-medium text-stone-800 dark:text-stone-100 cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1.5 leading-relaxed max-w-xl">{description}</p>
        )}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900 ${
          checked ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white dark:bg-stone-200 shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

const selectClass =
  'w-full max-w-md px-4 py-3.5 text-base border border-stone-300 dark:border-stone-600 rounded-xl bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'

export default function Settings() {
  const { user, deleteAccount } = useAuth()
  const {
    theme,
    setTheme,
    resolvedTheme,
    comfortableText,
    setComfortableText,
    region,
    setRegion,
    displayCurrency,
    setDisplayCurrency,
  } = useTheme()
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
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pb-16 pt-2">
      <header className="mb-10">
        <p className="mb-3">
          <Link
            to="/account"
            className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            ← Your account
          </Link>
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
          Settings
        </h1>
        <p className="mt-3 text-base text-stone-600 dark:text-stone-400 leading-relaxed max-w-lg">
          Region, how prices are shown, and display options. Saved on this device only.
        </p>
      </header>

      <div className="rounded-3xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" aria-hidden />
        <div className="p-8 sm:p-10 space-y-12">
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Country / region</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 leading-relaxed max-w-lg">
                Used for number and date formatting. Does not change shipping or tax (demo shop).
              </p>
            </div>
            <select
              id="settings-region"
              className={selectClass}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              aria-label="Country or region"
            >
              {REGION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-4 pt-2 border-t border-stone-200 dark:border-stone-700">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Currency</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 leading-relaxed max-w-lg">
                Prices are stored in GBP. Other currencies use indicative rates for display only; checkout totals stay
                in GBP.
              </p>
            </div>
            <select
              id="settings-currency"
              className={selectClass}
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value)}
              aria-label="Display currency"
            >
              {DISPLAY_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'GBP' ? 'British pound (GBP)' : c === 'USD' ? 'US dollar (USD)' : 'Euro (EUR)'}
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-6 pt-2 border-t border-stone-200 dark:border-stone-700">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Appearance</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">Theme applies in this browser only.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="radiogroup" aria-label="Color theme">
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
                        : 'border-stone-200 dark:border-stone-600 bg-stone-50/80 dark:bg-stone-800/50 hover:border-emerald-300 dark:hover:border-emerald-700 text-stone-700 dark:text-stone-200'
                    }`}
                  >
                    <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-semibold">{label}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Active:{' '}
              <span className="font-medium text-stone-800 dark:text-stone-200 capitalize">{resolvedTheme}</span>
              {theme === 'system' ? ' (follows your device)' : ''}.
            </p>

            <ToggleRow
              id="pref-comfortable-text"
              label="Larger text"
              description="Slightly increases text size across the shop for readability."
              checked={comfortableText}
              onChange={setComfortableText}
            />
          </section>

          <section className="pt-2 border-t border-stone-200 dark:border-stone-700">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Signed in as <span className="font-medium text-stone-900 dark:text-stone-100">{email || '—'}</span>.{' '}
              <Link to="/profile" className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline">
                Edit profile
              </Link>
            </p>
          </section>
        </div>
      </div>

      <details className="mt-10 rounded-2xl border border-red-200/80 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 overflow-hidden group">
        <summary className="px-6 py-4 sm:px-8 cursor-pointer text-sm font-semibold text-red-900 dark:text-red-300 list-none flex items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <span>Delete account</span>
          <svg
            className="w-5 h-5 shrink-0 text-stone-400 transition-transform group-open:rotate-180"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <div className="px-6 sm:px-8 pb-8 pt-2 border-t border-red-100 dark:border-red-900/30">
          <p className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed max-w-lg">
            Permanently remove your account, orders history, wishlist, and reviews. This cannot be undone.
          </p>
          <div className="mt-6 space-y-4 max-w-md">
            <div>
              <label htmlFor="delete-password" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                Your password
              </label>
              <input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-4 py-3.5 text-base border border-stone-300 dark:border-stone-600 rounded-xl bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-red-400 focus:border-red-400"
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="delete-confirm" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                Type <span className="font-mono bg-stone-100 dark:bg-stone-800 px-1 rounded">{CONFIRM_PHRASE}</span> to
                confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                autoComplete="off"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-4 py-3.5 text-base border border-stone-300 dark:border-stone-600 rounded-xl bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-red-400 focus:border-red-400"
                placeholder={CONFIRM_PHRASE}
                disabled={busy}
              />
            </div>
          </div>
          {error && (
            <p className="text-red-700 dark:text-red-400 text-sm mt-4" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canSubmit}
            className="mt-6 px-6 py-3.5 rounded-xl bg-red-600 text-white text-base font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
      </details>
    </div>
  )
}
