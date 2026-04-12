import { useEffect, useMemo, useState } from 'react'
import { useFormatPrice } from '../hooks/useFormatPrice'
import { FREE_SHIPPING_MIN_SUBTOTAL } from '../lib/shipping'

const ROTATION_MS = 5500
const FADE_MS = 320

/**
 * Rotating promo strip (home page only): discount, free delivery threshold, cut-off for next-day.
 */
export default function HomeAnnouncementBar() {
  const { format } = useFormatPrice()

  const messages = useMemo(
    () => [
      <>
        10% off with code <span className="font-mono font-semibold text-emerald-100">ECO10</span> at checkout
      </>,
      <>Free delivery on orders over {format(FREE_SHIPPING_MIN_SUBTOTAL)}</>,
      <>Order before 2pm Mon–Fri for next working day delivery</>,
    ],
    [format],
  )

  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length)
        setVisible(true)
      }, FADE_MS)
    }, ROTATION_MS)
    return () => clearInterval(id)
  }, [messages.length])

  return (
    <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 dark:from-emerald-950 dark:via-emerald-900 dark:to-emerald-950 text-white dark:text-emerald-50 text-center text-[0.8125rem] sm:text-sm py-2.5 px-4 border-b border-emerald-600/50 dark:border-emerald-800/90 shadow-sm">
      <p
        className={`max-w-7xl mx-auto font-medium transition-opacity duration-300 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        aria-live="polite"
      >
        {messages[index]}
      </p>
    </div>
  )
}
