import { createClient } from '@supabase/supabase-js'

/** Strip whitespace and accidental quotes from Vercel/dashboard pastes. */
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

/** True when real project URL + anon key are set (e.g. Vercel env vars). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * Supabase v2+ throws if `createClient` gets an empty URL, which would crash the whole app
 * before React mounts (white screen) when env vars are missing on the host.
 * Placeholders keep the shell loadable; all real calls still fail until env is set.
 */
const clientUrl = supabaseUrl || 'https://missing-env-placeholder.supabase.co'
const clientKey = supabaseAnonKey || 'sb-publishable-placeholder-not-a-real-key'

export const supabase = createClient(clientUrl, clientKey)

/** Turn low-level fetch/parse failures into actionable copy for hosted builds. */
export function mapSupabaseAuthError(err) {
  if (!err) return err
  const msg = String(err.message || err)
  if (/unexpected end of json input/i.test(msg) || /failed to execute ['"]json['"] on ['"]response['"]/i.test(msg)) {
    return new Error(
      'Could not reach Supabase (empty or invalid response). In Vercel → Environment Variables, set VITE_SUPABASE_URL to your Project URL from Supabase → Settings → API (exactly https://YOUR-REF.supabase.co, no /rest path), paste the anon public key for VITE_SUPABASE_ANON_KEY, save, then Redeploy. Remove any spaces or quote marks around values.'
    )
  }
  return err
}

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
