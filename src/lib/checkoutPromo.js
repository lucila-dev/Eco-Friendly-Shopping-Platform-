export const GIFT_WRAP_FEE = 4.99

export const MAX_COMBINED_DISCOUNT_FRACTION = 0.3

export function normalizePromoCode(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

export function totalDiscountForCodes(codes, subtotal) {
  const s = Math.max(0, Number(subtotal) || 0)
  if (!codes?.length || s === 0) return 0
  const seen = new Set()
  let sum = 0
  for (const raw of codes) {
    const code = normalizePromoCode(raw)
    if (!code || seen.has(code)) continue
    seen.add(code)
    const r = evaluatePromoCode(code, s)
    if (r.ok) sum += r.discount
  }
  const uncapped = Math.min(s, Math.round(sum * 100) / 100)
  const maxCombined = Math.round(s * MAX_COMBINED_DISCOUNT_FRACTION * 100) / 100
  return Math.min(uncapped, maxCombined)
}

export function evaluatePromoCode(rawCode, subtotal) {
  const s = Math.max(0, Number(subtotal) || 0)
  const code = normalizePromoCode(rawCode)

  if (!code) {
    return { ok: false, error: 'Enter a code' }
  }

  if (code === 'ECO10') {
    const discount = Math.round(s * 0.1 * 100) / 100
    return { ok: true, discount, label: '10% off your order' }
  }
  if (code === 'GREEN5') {
    const discount = Math.min(5, s)
    return { ok: true, discount, label: '5 off your order' }
  }
  if (code === 'WELCOME15') {
    const discount = Math.round(s * 0.15 * 100) / 100
    return { ok: true, discount, label: '15% welcome discount' }
  }

  return { ok: false, error: 'Invalid or expired code' }
}

export function promoOfferSummary(code) {
  const c = normalizePromoCode(code)
  if (c === 'ECO10') return '10% off'
  if (c === 'GREEN5') return '£5 off'
  if (c === 'WELCOME15') return '15% off'
  return 'Promotion'
}

export function getPromoReceiptBreakdown(codes, subtotal) {
  const s = Math.max(0, Number(subtotal) || 0)
  const seen = new Set()
  const entries = []
  for (const raw of codes ?? []) {
    const code = normalizePromoCode(raw)
    if (!code || seen.has(code)) continue
    seen.add(code)
    const r = evaluatePromoCode(code, s)
    if (!r.ok) continue
    entries.push({
      code,
      offer: promoOfferSummary(code),
      rawDiscount: r.discount,
    })
  }
  const totalRaw = entries.reduce((a, e) => a + e.rawDiscount, 0)
  const totalApplied = totalDiscountForCodes(codes, s)
  if (entries.length === 0) return []

  const lines = []
  let allocated = 0
  entries.forEach((e, i) => {
    const isLast = i === entries.length - 1
    const amount = isLast
      ? Math.round((totalApplied - allocated) * 100) / 100
      : totalRaw <= 0
        ? 0
        : Math.round(totalApplied * (e.rawDiscount / totalRaw) * 100) / 100
    allocated += amount
    lines.push({ code: e.code, offer: e.offer, amount })
  })
  return lines
}

const PROMO_RECEIPT_START = '[PROMO]'
const PROMO_RECEIPT_END = '[/PROMO]'

export function appendPromoReceiptToShippingAddress(address, breakdown, totalSaved) {
  if (!address || !breakdown?.length || totalSaved <= 0) return address
  const payload = JSON.stringify({
    v: 1,
    lines: breakdown.map((l) => ({ code: l.code, offer: l.offer, amount: l.amount })),
    totalSaved,
  })
  return `${address}\n\n${PROMO_RECEIPT_START}${payload}${PROMO_RECEIPT_END}`
}

export function parsePromoReceiptFromShippingAddress(text) {
  if (!text || typeof text !== 'string') return null
  const i = text.indexOf(PROMO_RECEIPT_START)
  const j = text.indexOf(PROMO_RECEIPT_END)
  if (i === -1 || j === -1 || j <= i) return null
  const json = text.slice(i + PROMO_RECEIPT_START.length, j)
  try {
    const data = JSON.parse(json)
    if (data?.v !== 1 || !Array.isArray(data.lines)) return null
    return data
  } catch {
    return null
  }
}

export function shippingAddressWithoutPromoReceipt(text) {
  if (!text || typeof text !== 'string') return ''
  const i = text.indexOf(PROMO_RECEIPT_START)
  if (i === -1) return text.trim()
  return text.slice(0, i).trim()
}
