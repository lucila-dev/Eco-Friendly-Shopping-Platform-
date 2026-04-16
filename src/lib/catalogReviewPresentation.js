/**
 * Listing stats: prefer real `reviews` rows; when a product has none yet, use the same
 * deterministic synthetic averages as before so cards are not empty on fresh DBs.
 */

const MIN_REVIEWS_SHOWN = 5

function hashString(value = '') {
  let h = 0
  for (let i = 0; i < value.length; i += 1) {
    h = ((h << 5) - h) + value.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function syntheticRating(seed) {
  const table = [5, 5, 4, 4, 5, 4, 5, 4, 3, 5, 4, 5, 3, 4, 5]
  return table[seed % table.length]
}

function dedupeDescBits(bits) {
  const out = []
  const lower = bits.map((b) => b.toLowerCase())
  for (let i = 0; i < bits.length; i += 1) {
    let skip = false
    for (let j = 0; j < bits.length; j += 1) {
      if (i === j) continue
      if (lower[i] === lower[j] && i > j) {
        skip = true
        break
      }
      if (lower[j].includes(lower[i]) && lower[j].length > lower[i].length + 8) {
        skip = true
        break
      }
    }
    if (!skip) out.push(bits[i])
  }
  return out
}

function buildProductReviewContext(description, materials, categoryName, categorySlug) {
  const materialPhrases = String(materials ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter((s) => s.length > 2)
    .slice(0, 8)

  const text = String(description ?? '').trim().replace(/\s+/g, ' ')
  let descBits = []
  if (text.length > 14) {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 14)
    if (sentences.length) descBits = sentences.slice(0, 5)
    else descBits = [text.length > 220 ? `${text.slice(0, 217).trim()}…` : text]
    const commaChunks = text
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 12 && s.length < 140)
    for (const c of commaChunks) {
      if (!descBits.includes(c)) descBits.push(c)
    }
    descBits = dedupeDescBits(descBits).slice(0, 8)
  }

  return {
    materialPhrases,
    descBits,
    categoryName: (categoryName || '').trim() || 'this shop',
    categorySlug: String(categorySlug || '').toLowerCase(),
  }
}

function buildFallbackReviewRatingsOnly(productId, productName, ctx, dbReviewCount) {
  const base = hashString(`${productId}|${productName || ''}|${ctx.descBits[0] || ''}|${ctx.materialPhrases[0] || ''}`)
  const count = Math.max(0, MIN_REVIEWS_SHOWN - dbReviewCount)
  return Array.from({ length: count }, (_, idx) => {
    const seed = hashString(`${productId}|${productName || 'p'}|${idx}|${base}|${ctx.categorySlug}`)
    return syntheticRating(seed + idx * 13)
  })
}

/**
 * @param {object} product — needs id, name, description?, materials?, category?
 * @param {number|null} dbAvg — mean rating from DB rows only
 * @param {number} dbCount — number of DB review rows
 * @returns {{ review_avg: number|null, review_count: number }}
 */
export function getCatalogReviewPresentation(product, dbAvg, dbCount) {
  const n = Number(dbCount) || 0
  const avg = dbAvg != null && !Number.isNaN(Number(dbAvg)) ? Number(dbAvg) : null

  if (n === 0) {
    const ctx = buildProductReviewContext(
      product.description,
      product.materials,
      product.category?.name,
      product.category?.slug,
    )
    const ratings = buildFallbackReviewRatingsOnly(product.id, product.name, ctx, 0)
    if (!ratings.length) return { review_avg: null, review_count: 0 }
    const sAvg = ratings.reduce((a, b) => a + b, 0) / ratings.length
    return { review_avg: sAvg, review_count: ratings.length }
  }

  if (n < MIN_REVIEWS_SHOWN) {
    return { review_avg: avg, review_count: MIN_REVIEWS_SHOWN }
  }

  return { review_avg: avg, review_count: n }
}
