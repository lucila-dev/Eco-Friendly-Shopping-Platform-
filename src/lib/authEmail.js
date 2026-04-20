/** True if Supabase has recorded a confirmed email for this user (required for protected areas). */
export function isEmailConfirmed(user) {
  if (!user) return false
  return Boolean(user.email_confirmed_at)
}
