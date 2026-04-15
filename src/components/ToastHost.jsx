import { useEffect, useState, useRef } from 'react'

const DISMISS_MS = 3200

export default function ToastHost() {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef(null)

  useEffect(() => {
    function onToast(e) {
      const msg = e?.detail?.message
      if (!msg) return
      if (hideTimer.current) clearTimeout(hideTimer.current)
      setMessage(msg)
      setVisible(true)
      hideTimer.current = window.setTimeout(() => {
        setVisible(false)
        hideTimer.current = null
      }, DISMISS_MS)
    }
    window.addEventListener('ecoshop-toast', onToast)
    return () => {
      window.removeEventListener('ecoshop-toast', onToast)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  if (!visible && !message) return null

  return (
    <div
      className={`pointer-events-none fixed bottom-6 left-1/2 z-[100] flex w-[min(92vw,24rem)] -translate-x-1/2 justify-center transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto rounded-xl border border-emerald-200/90 bg-white px-5 py-3.5 text-center text-base font-medium text-stone-800 shadow-lg dark:border-emerald-800/80 dark:bg-stone-800 dark:text-stone-100">
        {message}
      </div>
    </div>
  )
}
