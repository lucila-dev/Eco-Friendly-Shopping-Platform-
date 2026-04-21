import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'

const DISMISS_MS = 4000
const FADE_MS = 280

export default function ToastHost() {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)
  const [toastKey, setToastKey] = useState(0)
  const hideTimer = useRef(null)
  const clearMsgTimer = useRef(null)

  useEffect(() => {
    function onToast(e) {
      const msg = e?.detail?.message
      if (msg == null || String(msg).trim() === '') return
      if (hideTimer.current) clearTimeout(hideTimer.current)
      if (clearMsgTimer.current) clearTimeout(clearMsgTimer.current)
      setToastKey((k) => k + 1)
      setMessage(String(msg))
      setVisible(true)
      hideTimer.current = window.setTimeout(() => {
        setVisible(false)
        hideTimer.current = null
        clearMsgTimer.current = window.setTimeout(() => {
          setMessage('')
          clearMsgTimer.current = null
        }, FADE_MS)
      }, DISMISS_MS)
    }
    document.addEventListener('ecoshop-toast', onToast)
    return () => {
      document.removeEventListener('ecoshop-toast', onToast)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      if (clearMsgTimer.current) clearTimeout(clearMsgTimer.current)
    }
  }, [])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      key={toastKey}
      className={`pointer-events-none fixed bottom-6 left-1/2 z-[99999] flex w-[min(92vw,24rem)] -translate-x-1/2 justify-center transition-opacity duration-300 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ isolation: 'isolate' }}
      role="status"
      aria-live="polite"
    >
      {message ? (
        <div className="pointer-events-auto rounded-xl border border-emerald-200/90 bg-white px-5 py-3.5 text-center text-base font-medium text-stone-800 shadow-xl dark:border-emerald-800/80 dark:bg-stone-800 dark:text-stone-100">
          {message}
        </div>
      ) : null}
    </div>,
    document.body,
  )
}
