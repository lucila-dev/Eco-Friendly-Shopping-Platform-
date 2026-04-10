import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const THEME_KEY = 'ecoshop-theme'
const REDUCED_MOTION_KEY = 'ecoshop-reduced-motion'
const LARGE_TEXT_KEY = 'ecoshop-large-text'

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
  const [reducedMotion, setReducedMotionState] = useState(() => readStoredBool(REDUCED_MOTION_KEY))
  const [comfortableText, setComfortableTextState] = useState(() => readStoredBool(LARGE_TEXT_KEY))

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
    document.documentElement.classList.toggle('ecoshop-reduce-motion', reducedMotion)
    try {
      localStorage.setItem(REDUCED_MOTION_KEY, reducedMotion ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [reducedMotion])

  useEffect(() => {
    document.documentElement.classList.toggle('ecoshop-comfortable-text', comfortableText)
    try {
      localStorage.setItem(LARGE_TEXT_KEY, comfortableText ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [comfortableText])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* ignore */
    }
    applyDarkClass(next)
  }, [])

  const setReducedMotion = useCallback((value) => {
    setReducedMotionState(Boolean(value))
  }, [])

  const setComfortableText = useCallback((value) => {
    setComfortableTextState(Boolean(value))
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
      reducedMotion,
      setReducedMotion,
      comfortableText,
      setComfortableText,
    }),
    [theme, resolvedTheme, setTheme, reducedMotion, setReducedMotion, comfortableText, setComfortableText],
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
