export const DISPLAY_CURRENCIES = ['GBP', 'USD', 'EUR']

export const RATES_FROM_GBP = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.17,
}

export const REGION_OPTIONS = [
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IE', label: 'Ireland' },
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'BE', label: 'Belgium' },
  { value: 'AT', label: 'Austria' },
  { value: 'PT', label: 'Portugal' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'DK', label: 'Denmark' },
  { value: 'FI', label: 'Finland' },
  { value: 'PL', label: 'Poland' },
  { value: 'IN', label: 'India' },
  { value: 'JP', label: 'Japan' },
]

const REGION_LOCALE = {
  GB: 'en-GB',
  IE: 'en-IE',
  US: 'en-US',
  CA: 'en-CA',
  AU: 'en-AU',
  NZ: 'en-NZ',
  FR: 'fr-FR',
  DE: 'de-DE',
  ES: 'es-ES',
  IT: 'it-IT',
  NL: 'nl-NL',
  BE: 'nl-BE',
  AT: 'de-AT',
  PT: 'pt-PT',
  SE: 'sv-SE',
  NO: 'nb-NO',
  DK: 'da-DK',
  FI: 'fi-FI',
  PL: 'pl-PL',
  IN: 'en-IN',
  JP: 'ja-JP',
}

export function getLocaleForRegion(region) {
  const r = String(region || '').toUpperCase()
  return REGION_LOCALE[r] || 'en-GB'
}

export function convertGbpToDisplay(amountGbp, currency) {
  const c = String(currency || 'GBP').toUpperCase()
  const rate = RATES_FROM_GBP[c] ?? 1
  return (Number(amountGbp) || 0) * rate
}

export function usdToGbpApprox(usd) {
  return (Number(usd) || 0) / RATES_FROM_GBP.USD
}

export function formatGbpAs(amountGbp, currency, locale) {
  const c = String(currency || 'GBP').toUpperCase()
  const loc = locale || getLocaleForRegion('GB')
  const num = c === 'GBP' ? Number(amountGbp) || 0 : convertGbpToDisplay(amountGbp, c)
  try {
    return new Intl.NumberFormat(loc, { style: 'currency', currency: c }).format(num)
  } catch {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(amountGbp) || 0)
  }
}
