import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import AccountHubPanel from './AccountHubPanel'

const btnClass =
  'inline-flex items-center gap-1 text-base sm:text-[1.0625rem] font-medium text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 px-2 py-2 rounded-lg hover:bg-stone-100/80 dark:hover:bg-stone-800/70 transition-colors'

const MOBILE_MAX = 639

export default function AccountDropdown() {
  const [open, setOpen] = useState(false)
  const [fixedPanelTop, setFixedPanelTop] = useState(undefined)
  const wrapRef = useRef(null)

  useLayoutEffect(() => {
    if (!open) {
      setFixedPanelTop(undefined)
      return
    }
    const updateTop = () => {
      if (typeof window === 'undefined' || window.innerWidth > MOBILE_MAX) {
        setFixedPanelTop(undefined)
        return
      }
      const btn = wrapRef.current?.querySelector('button')
      if (!btn) return
      setFixedPanelTop(btn.getBoundingClientRect().bottom + 8)
    }
    updateTop()
    window.addEventListener('scroll', updateTop, true)
    window.addEventListener('resize', updateTop)
    return () => {
      window.removeEventListener('scroll', updateTop, true)
      window.removeEventListener('resize', updateTop)
    }
  }, [open])

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
          className="z-[100] rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 shadow-xl ring-1 ring-stone-900/5 dark:ring-white/10 max-h-[min(85vh,42rem)] overflow-y-auto overscroll-contain p-4 sm:p-6 max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:w-auto sm:absolute sm:mt-2 sm:right-0 sm:left-auto sm:w-[min(calc(100vw-2rem),40rem)] lg:w-[42rem]"
          style={fixedPanelTop != null ? { top: fixedPanelTop } : undefined}
          role="dialog"
          aria-label="Your account"
        >
          <AccountHubPanel heading="h2" onNavigate={() => setOpen(false)} inlineDevTools />
        </div>
      )}
    </div>
  )
}
