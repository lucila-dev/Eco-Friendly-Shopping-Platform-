import { createClient } from '@supabase/supabase-js'

function normalizeEnv(v) {
  if (v == null) return ''
  let s = String(v).trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim()
  }
  return s
}

const rawUrl = normalizeEnv(import.meta.env.VITE_SUPABASE_URL)
const rawKey = normalizeEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const supabaseUrl = rawUrl.replace(/\/$/, '')
export const supabaseAnonKey = rawKey

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const clientUrl = supabaseUrl || 'https://missing-env-placeholder.supabase.co'
const clientKey = supabaseAnonKey || 'sb-publishable-placeholder-not-a-real-key'

export const supabase = createClient(clientUrl, clientKey)

/** Maps low-level fetch/parse failures to actionable copy; keeps real auth errors as-is. */
export function mapSupabaseAuthError(err) {
  if (!err) return err
  if (!isSupabaseConfigured) {
    return new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from Supabase → Project Settings → API. For local dev: put them in .env and restart npm run dev. For Vercel: Project → Settings → Environment Variables (Production) → Redeploy.',
    )
  }
  const msg = String(err.message || err)
  const looksLikeNetworkOrBadResponse =
    /unexpected end of json input/i.test(msg) ||
    /failed to execute ['"]json['"] on ['"]response['"]/i.test(msg) ||
    /failed to fetch/i.test(msg) ||
    /networkerror|load failed|aborted/i.test(msg)
  if (looksLikeNetworkOrBadResponse) {
    const devSuffix = import.meta.env.DEV ? ` (${msg})` : ''
    return new Error(
      `Could not get a valid response from Supabase.${devSuffix} Confirm VITE_SUPABASE_URL is your Project URL (…supabase.co), VITE_SUPABASE_ANON_KEY is the anon public key, and both are set for the environment you are running (Vercel: add to Production + redeploy after changes).`,
    )
  }
  return err
}

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
    }
    if (res.status === 404) {
      message += ' Account delete needs the delete-account function in supabase/functions.'
    }
    return { error: new Error(message) }
  }

  try {
    localStorage.removeItem(`ecoshop-wishlist-${userId}`)
    localStorage.removeItem(`ecoshop_profile_avatar_${userId}`)
  } catch {
  }

  await supabase.auth.signOut({ scope: 'local' })
  return { error: null }
}
