/**
 * Canonical public URL for Supabase auth email links (confirm signup, password reset).
 * Set VITE_SITE_URL in production so links match your deployed origin and Supabase redirect allowlist.
 */
export function getAuthSiteUrl() {
  const v = import.meta.env.VITE_SITE_URL
  const trimmed = v != null ? String(v).trim().replace(/\/$/, '') : ''
  if (trimmed) return trimmed
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}
