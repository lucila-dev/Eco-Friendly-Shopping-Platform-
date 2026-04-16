import { getCatalogReviewPresentation } from './catalogReviewPresentation'

/**
 * Attach `review_avg` and `review_count` from `reviews`, with synthetic padding on the
 * listing only when a product has zero rows (e.g. before seed runs).
 */
export async function enrichProductsWithReviewStats(supabase, products) {
  const rows = Array.isArray(products) ? products : []
  const ids = rows.map((p) => p.id).filter(Boolean)
  if (ids.length === 0) return rows

  const { data: revRows, error } = await supabase.from('reviews').select('product_id, rating').in('product_id', ids)
  if (error) {
    console.warn('[EcoShop] review stats:', error)
    return rows.map((p) => {
      const { review_avg, review_count } = getCatalogReviewPresentation(p, null, 0)
      return { ...p, review_avg, review_count }
    })
  }

  const reviewMap = new Map()
  for (const r of revRows ?? []) {
    const cur = reviewMap.get(r.product_id) ?? { sum: 0, count: 0 }
    cur.sum += Number(r.rating) || 0
    cur.count += 1
    reviewMap.set(r.product_id, cur)
  }

  return rows.map((p) => {
    const s = reviewMap.get(p.id)
    const dbAvg = s ? s.sum / s.count : null
    const dbCount = s ? s.count : 0
    const { review_avg, review_count } = getCatalogReviewPresentation(p, dbAvg, dbCount)
    return { ...p, review_avg, review_count }
  })
}
