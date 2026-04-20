import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { supabase, deleteCurrentAuthUser, mapSupabaseAuthError } from '../lib/supabase'
import { getAuthSiteUrl } from '../lib/authSiteUrl'
import { isEmailConfirmed } from '../lib/authEmail'

const AuthContext = createContext(null)

function readRecoveryFromHash() {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return false
  return new URLSearchParams(hash).get('type') === 'recovery'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  /** True when user arrived from password-reset email (must set new password). */
  const [passwordRecoveryRequired, setPasswordRecoveryRequired] = useState(() =>
    typeof window !== 'undefined' ? readRecoveryFromHash() : false,
  )

  const clearPasswordRecovery = useCallback(() => {
    setPasswordRecoveryRequired(false)
  }, [])

  // Run before paint so we catch #...type=recovery before Supabase may strip the hash.
  useLayoutEffect(() => {
    if (readRecoveryFromHash()) {
      setPasswordRecoveryRequired(true)
    }
  }, [])

  // PKCE: reset link may be /login?code=... instead of hash (depends on project / flow).
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.location.pathname.endsWith('/login')) return
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) return
    let cancelled = false
    supabase.auth.exchangeCodeForSession(window.location.href).then(({ error }) => {
      if (cancelled || error) return
      // Recovery vs OAuth: do not set recovery here — only PASSWORD_RECOVERY does that.
      window.history.replaceState({}, '', window.location.pathname)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      })
      .catch((e) => {
        console.warn('[EcoShop] getSession failed:', e)
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryRequired(true)
      }
      if (event === 'SIGNED_OUT') {
        setPasswordRecoveryRequired(false)
      }
      if (event === 'USER_UPDATED') {
        setPasswordRecoveryRequired(false)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const signUp = async (email, password, metadata = {}) => {
    try {
      const origin = getAuthSiteUrl()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          ...(origin ? { emailRedirectTo: `${origin}/login` } : {}),
        },
      })
      return { data, error: error ? mapSupabaseAuthError(error) : null }
    } catch (e) {
      return { data: null, error: mapSupabaseAuthError(e) }
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      return { data, error: error ? mapSupabaseAuthError(error) : null }
    } catch (e) {
      return { data: null, error: mapSupabaseAuthError(e) }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const deleteAccount = async (credentials) => deleteCurrentAuthUser(credentials)

  const resetPassword = async (email) => {
    try {
      const origin = getAuthSiteUrl() || (typeof window !== 'undefined' ? window.location.origin : '')
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: origin ? `${origin}/login` : undefined,
      })
      return { data, error: error ? mapSupabaseAuthError(error) : null }
    } catch (e) {
      return { data: null, error: mapSupabaseAuthError(e) }
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    resetPassword,
    /** True when the user has a normal session (not password-recovery-only). */
    isAuthenticated: !!user && !passwordRecoveryRequired,
    /** False until the user confirms their email (Supabase: Confirm email + link clicked). */
    emailConfirmed: isEmailConfirmed(user),
    passwordRecoveryRequired,
    clearPasswordRecovery,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
