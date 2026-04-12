import { useMemo } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { formatGbpAs, getLocaleForRegion } from '../lib/shopMoney'

/** Format stored GBP prices (and fees in GBP) for the user’s region + display currency. */
export function useFormatPrice() {
  const { region, displayCurrency } = useTheme()
  const locale = useMemo(() => getLocaleForRegion(region), [region])

  return useMemo(
    () => ({
      locale,
      displayCurrency,
      /** @param {number} amountGbp */
      format: (amountGbp) => formatGbpAs(amountGbp, displayCurrency, locale),
    }),
    [displayCurrency, locale],
  )
}
