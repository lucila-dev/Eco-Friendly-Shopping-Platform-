export const FREE_SHIPPING_MIN_SUBTOTAL = 100

export const STANDARD_DELIVERY_FEE = 4.99

export function getDeliveryFee(subtotal) {
  const s = Number(subtotal) || 0
  return s >= FREE_SHIPPING_MIN_SUBTOTAL ? 0 : STANDARD_DELIVERY_FEE
}

export const DELIVERY_OPTIONS = [
  {
    id: 'standard',
    title: 'Standard',
    description: '2 to 4 business days',
  },
  {
    id: 'express',
    title: 'Express',
    description: '1 to 2 business days',
  },
  {
    id: 'next_day',
    title: 'Next day',
    description: 'Order before 2pm Mon to Fri (UK mainland)',
  },
]

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
