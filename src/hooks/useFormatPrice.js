import { useMemo } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { formatGbpAs, getLocaleForRegion } from '../lib/shopMoney'

export function useFormatPrice() {
  const { region, displayCurrency } = useTheme()
  const locale = useMemo(() => getLocaleForRegion(region), [region])

  return useMemo(
    () => ({
      locale,
      displayCurrency,
      format: (amountGbp) => formatGbpAs(amountGbp, displayCurrency, locale),
    }),
    [displayCurrency, locale],
  )
}
