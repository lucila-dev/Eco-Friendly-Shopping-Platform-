import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DISPLAY_CURRENCIES } from '../lib/shopMoney'

const THEME_KEY = 'ecoshop-theme'
const LARGE_TEXT_KEY = 'ecoshop-large-text'
const REGION_KEY = 'ecoshop-region'
const CURRENCY_KEY = 'ecoshop-display-currency'

function readStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* ignore */
  }
  return 'system'
}

function readStoredBool(key) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function readStoredRegion() {
  try {
    const v = localStorage.getItem(REGION_KEY)
    if (v && /^[A-Z]{2}$/i.test(v)) return v.toUpperCase()
  } catch {
    /* ignore */
  }
  return 'GB'
}

function readStoredCurrency() {
  try {
    const v = localStorage.getItem(CURRENCY_KEY)
    if (v && DISPLAY_CURRENCIES.includes(v)) return v
  } catch {
    /* ignore */
  }
  return 'GBP'
}

function isDarkMediaQuery() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyDarkClass(pref) {
  const dark = pref === 'dark' || (pref === 'system' && isDarkMediaQuery())
  document.documentElement.classList.toggle('dark', dark)
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme)
  const [systemPrefersDark, setSystemPrefersDark] = useState(isDarkMediaQuery)
  const [comfortableText, setComfortableTextState] = useState(() => readStoredBool(LARGE_TEXT_KEY))
  const [region, setRegionState] = useState(readStoredRegion)
  const [displayCurrency, setDisplayCurrencyState] = useState(readStoredCurrency)

  useEffect(() => {
    applyDarkClass(theme)
  }, [theme, systemPrefersDark])

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemPrefersDark(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('ecoshop-comfortable-text', comfortableText)
    try {
      localStorage.setItem(LARGE_TEXT_KEY, comfortableText ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [comfortableText])

  useEffect(() => {
    try {
      localStorage.setItem(REGION_KEY, region)
    } catch {
      /* ignore */
    }
  }, [region])

  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_KEY, displayCurrency)
    } catch {
      /* ignore */
    }
  }, [displayCurrency])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* ignore */
    }
    applyDarkClass(next)
  }, [])

  const setComfortableText = useCallback((value) => {
    setComfortableTextState(Boolean(value))
  }, [])

  const setRegion = useCallback((value) => {
    const v = String(value || '').toUpperCase()
    if (/^[A-Z]{2}$/.test(v)) setRegionState(v)
  }, [])

  const setDisplayCurrency = useCallback((value) => {
    const v = String(value || '').toUpperCase()
    if (DISPLAY_CURRENCIES.includes(v)) setDisplayCurrencyState(v)
  }, [])

  const resolvedTheme = useMemo(() => {
    if (theme === 'dark') return 'dark'
    if (theme === 'light') return 'light'
    return systemPrefersDark ? 'dark' : 'light'
  }, [theme, systemPrefersDark])

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      comfortableText,
      setComfortableText,
      region,
      setRegion,
      displayCurrency,
      setDisplayCurrency,
    }),
    [
      theme,
      resolvedTheme,
      setTheme,
      comfortableText,
      setComfortableText,
      region,
      setRegion,
      displayCurrency,
      setDisplayCurrency,
    ],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
