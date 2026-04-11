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
