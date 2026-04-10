import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

/**
 * Deletes the current user via Edge Function `delete-account` (uses service role on the server).
 * Deploy: `supabase functions deploy delete-account` after `supabase secrets set SERVICE_ROLE_KEY=...` (service_role JWT; SUPABASE_* is reserved).
 *
 * @param {{ email: string, password: string }} credentials – re-check password for a fresh session.
 */
export async function deleteCurrentAuthUser({ email, password }) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: new Error('Supabase is not configured.') }
  }
  if (!email?.trim() || !password) {
    return { error: new Error('Enter your password to confirm account deletion.') }
  }

  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (signErr) {
    return { error: new Error('Password incorrect. Try again or reset your password from the login page.') }
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()
  if (sessionError) return { error: sessionError }
  if (!session?.access_token || !session.user?.id) {
    return { error: new Error('You must be signed in to delete your account.') }
  }

  const userId = session.user.id

  const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })

  if (!res.ok) {
    let message = `Could not delete account (HTTP ${res.status}).`
    try {
      const j = await res.json()
      if (j?.error) message = typeof j.error === 'string' ? j.error : JSON.stringify(j.error)
      else if (j?.msg) message = j.msg
      else if (j?.error_description) message = j.error_description
      else if (typeof j?.message === 'string') message = j.message
    } catch {
      /* keep default */
    }
    if (res.status === 404) {
      message +=
        ' The delete-account Edge Function is not deployed. From your machine: install the Supabase CLI, run `supabase link`, `supabase secrets set SERVICE_ROLE_KEY=…` (service_role JWT), then `supabase functions deploy delete-account`. See supabase/functions/delete-account/index.ts.'
    }
    return { error: new Error(message) }
  }

  try {
    localStorage.removeItem(`ecoshop-wishlist-${userId}`)
    localStorage.removeItem(`ecoshop_profile_avatar_${userId}`)
  } catch {
    /* ignore */
  }

  await supabase.auth.signOut({ scope: 'local' })
  return { error: null }
}
