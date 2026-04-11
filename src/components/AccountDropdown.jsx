import { useEffect, useRef, useState } from 'react'
import AccountHubPanel from './AccountHubPanel'

const btnClass =
  'inline-flex items-center gap-1 text-sm sm:text-[0.9375rem] font-medium text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 px-1.5 py-1.5 rounded-lg hover:bg-stone-100/80 dark:hover:bg-stone-800/70 transition-colors'

/**
 * Full account hub (same as /account) inside a header dropdown panel.
 */
export default function AccountDropdown() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        className={`${btnClass} ${open ? 'text-emerald-800 dark:text-emerald-300 bg-stone-100/90 dark:bg-stone-800/80' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        Account
        <svg className="w-4 h-4 opacity-80 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-40 mt-2 w-[min(calc(100vw-1rem),36rem)] sm:w-[min(calc(100vw-2rem),40rem)] lg:w-[42rem] left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-0 rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 shadow-xl ring-1 ring-stone-900/5 dark:ring-white/10 max-h-[min(85vh,42rem)] overflow-y-auto overscroll-contain p-4 sm:p-6"
          role="dialog"
          aria-label="Your account"
        >
          <AccountHubPanel heading="h2" onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}
