import { useEffect, useRef, useState } from 'react'

/** Pixels from top: always show header */
const TOP_REVEAL_PX = 16
/** Ignore tiny scroll noise */
const DELTA_MIN = 6
/** Only hide after user has scrolled a bit */
const HIDE_AFTER_SCROLL_PX = 56

/**
 * Hides the top chrome on scroll down, shows on scroll up (mobile-first pattern; works on all widths).
 * @param {boolean} disabled When true (e.g. auth screens), the bar stays visible.
 */
export function useHeaderScrollHide(disabled = false) {
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    if (disabled) {
      setHidden(false)
    }
  }, [disabled])

  useEffect(() => {
    if (disabled) return
    lastY.current = window.scrollY
    const onScroll = () => {
      const y = Math.max(0, window.scrollY)
      const prev = lastY.current
      lastY.current = y
      const delta = y - prev

      if (y <= TOP_REVEAL_PX) {
        setHidden(false)
        return
      }
      if (delta > DELTA_MIN && y > HIDE_AFTER_SCROLL_PX) {
        setHidden(true)
        return
      }
      if (delta < -DELTA_MIN) {
        setHidden(false)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [disabled])

  return { headerHidden: hidden, setHeaderHidden: setHidden }
}
