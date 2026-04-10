import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const MANAGEMENT_ROLES = ['owner', 'developer', 'admin']

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [canManageProducts, setCanManageProducts] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfile(null)
        setCanManageProducts(false)
        setLoading(false)
        return
      }

      const [profileRes, devRes] = await Promise.all([
        supabase.from('profiles').select('display_name, role').eq('id', user.id).maybeSingle(),
        supabase.from('dev_tools_allowlist').select('user_id').eq('user_id', user.id).maybeSingle(),
      ])

      const { data, error } = profileRes
      let nextProfile = null
      if (error && error.message?.includes('role')) {
        const { data: fallback } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .maybeSingle()
        nextProfile = fallback ? { ...fallback, role: 'user' } : null
        setProfile(nextProfile)
      } else {
        nextProfile = data ?? null
        setProfile(nextProfile)
      }

      const onAllowlist = !devRes.error && devRes.data != null
      const roleElevated = MANAGEMENT_ROLES.includes(nextProfile?.role || 'user')
      setCanManageProducts(onAllowlist || roleElevated)

      setLoading(false)
    }

    fetchProfile()
  }, [user?.id])

  const role = profile?.role || 'user'

  return {
    profile,
    role,
    loading,
    canManageProducts,
    isAdmin: canManageProducts,
  }
}
