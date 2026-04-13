import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, deleteCurrentAuthUser, mapSupabaseAuthError } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const signUp = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
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
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
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
    isAuthenticated: !!user,
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
