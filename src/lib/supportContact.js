/** Public support contact (About page, Dashboard, mailto links). */
export const SUPPORT_EMAIL = 'support@ecoshop.com'
/** E.164 for tel: and wa.me style links */
export const SUPPORT_PHONE_TEL = '+442038764218'
/** Human readable UK London number */
export const SUPPORT_PHONE_DISPLAY = '+44 20 3876 4218'

/** Digits only, for https://wa.me/ — same line as phone */
export const SUPPORT_WHATSAPP_PHONE_DIGITS = '442038764218'

/** Opens WhatsApp chat (web or app) with optional prefilled message. */
export function supportWhatsAppHref(prefilledMessage = '') {
  const base = `https://wa.me/${SUPPORT_WHATSAPP_PHONE_DIGITS}`
  const msg = String(prefilledMessage || '').trim()
  if (!msg) return base
  return `${base}?text=${encodeURIComponent(msg)}`
}
