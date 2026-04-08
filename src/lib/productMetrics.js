export function hashString(value = '') {
  let h = 0
  for (let i = 0; i < value.length; i += 1) {
    h = ((h << 5) - h) + value.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function getProductMetrics(product) {
  const key = `${product?.id || ''}-${product?.slug || ''}-${product?.name || ''}`
  const hash = hashString(key)

  const baseScore = Number(product?.sustainability_score ?? 6)
  const scoreOffset = (hash % 5) - 2 // -2 to +2
  const displayScore = Math.min(10, Math.max(1, baseScore + scoreOffset))

  const baseCarbon = Number(product?.carbon_footprint_saving_kg ?? 1.2)
  const carbonOffset = ((hash % 13) * 0.18) + 0.2 // 0.2 to ~2.36
  const displayCarbon = Math.max(0.2, Number((baseCarbon + carbonOffset).toFixed(1)))

  const discountPercent = (hash % 5 === 0) ? (10 + (hash % 3) * 5) : 0
  const price = Number(product?.price ?? 0)
  const originalPrice = discountPercent > 0
    ? Number((price / (1 - discountPercent / 100)).toFixed(2))
    : price
  const loyaltyPoints = Math.max(5, Math.round(price) + (hash % 12))

  return { displayScore, displayCarbon, discountPercent, originalPrice, loyaltyPoints }
}
