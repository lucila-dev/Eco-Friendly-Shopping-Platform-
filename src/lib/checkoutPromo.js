/** Gift wrap add-on (included in order total when selected). */
export const GIFT_WRAP_FEE = 4.99

/** Maximum total discount when stacking multiple codes (share of merchandise subtotal). */
export const MAX_COMBINED_DISCOUNT_FRACTION = 0.3

/** Normalized promo key for comparison and storage. */
export function normalizePromoCode(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

/**
 * Sum discounts from multiple codes (each evaluated against the full merchandise subtotal).
 * Total discount is capped at the subtotal, then capped at {@link MAX_COMBINED_DISCOUNT_FRACTION} of subtotal.
 * Duplicate codes in the list are ignored.
 * @param {string[]} codes
 * @param {number} subtotal
 */
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

/**
 * Promo codes — evaluated client-side; re-run when cart subtotal changes.
 * @param {string} rawCode
 * @param {number} subtotal merchandise subtotal before delivery / wrap / discount
 * @returns {{ ok: true, discount: number, label: string } | { ok: false, error: string }}
 */
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

/** Short offer text for receipts (e.g. ECO10 → "10% off"). */
export function promoOfferSummary(code) {
  const c = normalizePromoCode(code)
  if (c === 'ECO10') return '10% off'
  if (c === 'GREEN5') return '£5 off'
  if (c === 'WELCOME15') return '15% off'
  return 'Promotion'
}

/**
 * Per-code lines for receipts: offer label + allocated amount after the 30% combined cap.
 * @returns {{ code: string, offer: string, amount: number }[]}
 */
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

/**
 * Appends a machine-readable promo receipt blob for {@link parsePromoReceiptFromShippingAddress}.
 */
export function appendPromoReceiptToShippingAddress(address, breakdown, totalSaved) {
  if (!address || !breakdown?.length || totalSaved <= 0) return address
  const payload = JSON.stringify({
    v: 1,
    lines: breakdown.map((l) => ({ code: l.code, offer: l.offer, amount: l.amount })),
    totalSaved,
  })
  return `${address}\n\n${PROMO_RECEIPT_START}${payload}${PROMO_RECEIPT_END}`
}

/** @returns {{ v: number, lines: { code: string, offer: string, amount: number }[], totalSaved: number } | null} */
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

/** Street/city part of shipping_address without the embedded promo blob. */
export function shippingAddressWithoutPromoReceipt(text) {
  if (!text || typeof text !== 'string') return ''
  const i = text.indexOf(PROMO_RECEIPT_START)
  if (i === -1) return text.trim()
  return text.slice(0, i).trim()
}
