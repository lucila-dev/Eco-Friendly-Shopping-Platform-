import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const MANAGEMENT_ROLES = ['owner', 'developer', 'admin']

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, role')
        .eq('id', user.id)
        .maybeSingle()

      if (error && error.message?.includes('role')) {
        const { data: fallback } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .maybeSingle()
        setProfile(fallback ? { ...fallback, role: 'user' } : null)
      } else {
        setProfile(data ?? null)
      }

      setLoading(false)
    }

    fetchProfile()
  }, [user?.id])

  const role = profile?.role || 'user'
  const canManageProducts = MANAGEMENT_ROLES.includes(role)

  return {
    profile,
    role,
    loading,
    canManageProducts,
    isAdmin: canManageProducts,
  }
}
