import { useEffect, useMemo, useState } from 'react'
import { useFormatPrice } from '../hooks/useFormatPrice'
import { FREE_SHIPPING_MIN_SUBTOTAL } from '../lib/shipping'
import { layoutContentWidthClass } from '../lib/layoutContent'

const ROTATION_MS = 5500
const FADE_MS = 320

export default function HomeAnnouncementBar() {
  const { format } = useFormatPrice()

  const messages = useMemo(
    () => [
      <>
        10% off with code <span className="font-mono font-semibold text-emerald-100">ECO10</span> at checkout
      </>,
      <>Free delivery on orders over {format(FREE_SHIPPING_MIN_SUBTOTAL)}</>,
      <>Order before 2pm Mon to Fri for next working day delivery</>,
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
    <div className="border-b border-emerald-600/50 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 px-4 py-2.5 text-center text-base text-white shadow-sm dark:border-emerald-800/90 dark:from-emerald-950 dark:via-emerald-900 dark:to-emerald-950 dark:text-emerald-50 sm:text-lg">
      <div
        className={`${layoutContentWidthClass} flex items-center justify-center max-sm:min-h-[3.75rem]`}
      >
        <p
          className={`w-full text-balance font-medium leading-snug transition-opacity duration-300 ease-out sm:leading-normal ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
          aria-live="polite"
        >
          {messages[index]}
        </p>
      </div>
    </div>
  )
}
