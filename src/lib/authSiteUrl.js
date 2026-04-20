/**
 * Base URL for Supabase auth email links (confirm signup, password reset).
 *
 * Prefer the **current page origin** in the browser so links match the URL you’re actually using
 * (production Vercel, preview, or localhost). A mis-set VITE_SITE_URL no longer overrides that.
 *
 * Optional: set VITE_SITE_URL only for rare non-browser use; it is used when `window` is missing.
 */
export function getAuthSiteUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }
  const v = import.meta.env.VITE_SITE_URL
  const trimmed = v != null ? String(v).trim().replace(/\/$/, '') : ''
  return trimmed || ''
}
