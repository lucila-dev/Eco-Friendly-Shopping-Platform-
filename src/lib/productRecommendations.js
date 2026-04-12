/** Deterministic hash for stable “related” picks per product slug. */
export function hashSlug(str) {
  let h = 0
  const s = String(str || '')
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Split same-category neighbours into two disjoint groups for “similar” vs “bought together”.
 * @param {Array<{id: string, slug: string}>} candidates
 * @param {string} currentSlug
 */
export function pickRelatedSlices(candidates, currentSlug, opts = {}) {
  const similarCount = opts.similarCount ?? 4
  const togetherCount = opts.togetherCount ?? 3
  const sorted = [...candidates].sort((a, b) => String(a.slug).localeCompare(String(b.slug)))
  const n = sorted.length
  if (n === 0) return { similar: [], together: [] }

  const start = hashSlug(currentSlug) % n
  const similar = []
  for (let i = 0; i < Math.min(similarCount, n); i++) {
    similar.push(sorted[(start + i) % n])
  }

  const used = new Set(similar.map((p) => p.id))
  const together = []
  let idx = start + similar.length
  let steps = 0
  while (together.length < Math.min(togetherCount, n) && steps < n * 2) {
    const p = sorted[idx % n]
    idx += 1
    steps += 1
    if (!used.has(p.id)) {
      together.push(p)
      used.add(p.id)
    }
  }

  return { similar, together }
}
