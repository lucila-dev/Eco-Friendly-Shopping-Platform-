export const SUPPORT_EMAIL = 'support@ecoshop.com'
export const SUPPORT_PHONE_TEL = '+442038764218'
export const SUPPORT_PHONE_DISPLAY = '+44 20 3876 4218'

export const SUPPORT_WHATSAPP_PHONE_DIGITS = '442038764218'

export function supportWhatsAppHref(prefilledMessage = '') {
  const base = `https://wa.me/${SUPPORT_WHATSAPP_PHONE_DIGITS}`
  const msg = String(prefilledMessage || '').trim()
  if (!msg) return base
  return `${base}?text=${encodeURIComponent(msg)}`
}
