/** Same currency as product prices; free delivery from this subtotal upward. */
export const FREE_SHIPPING_MIN_SUBTOTAL = 100

/** Standard delivery when subtotal is below {@link FREE_SHIPPING_MIN_SUBTOTAL}. */
export const STANDARD_DELIVERY_FEE = 4.99

/**
 * @param {number} subtotal
 * @returns {number} 0 when free shipping applies, otherwise {@link STANDARD_DELIVERY_FEE}
 */
export function getDeliveryFee(subtotal) {
  const s = Number(subtotal) || 0
  return s >= FREE_SHIPPING_MIN_SUBTOTAL ? 0 : STANDARD_DELIVERY_FEE
}

/** @typedef {'standard' | 'express' | 'next_day'} DeliveryMethodId */

export const DELIVERY_OPTIONS = [
  {
    id: 'standard',
    title: 'Standard',
    description: '2–4 business days',
  },
  {
    id: 'express',
    title: 'Express',
    description: '1–2 business days',
  },
  {
    id: 'next_day',
    title: 'Next day',
    description: 'Order before 2pm Mon–Fri (UK mainland)',
  },
]

/**
 * Delivery fee for checkout, based on merchandise subtotal (after discounts) and speed.
 * When standard delivery would be free, faster options still charge a service fee.
 * @param {number} subtotal
 * @param {DeliveryMethodId} method
 */
export function getDeliveryFeeForMethod(subtotal, method) {
  const standard = getDeliveryFee(subtotal)
  if (method === 'standard') return standard
  if (method === 'express') {
    if (standard === 0) return 4.99
    return Math.round((standard + 3) * 100) / 100
  }
  if (method === 'next_day') {
    if (standard === 0) return 8.99
    return Math.round((standard + 5) * 100) / 100
  }
  return standard
}
