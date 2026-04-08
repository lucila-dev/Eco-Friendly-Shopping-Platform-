import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { hashString } from '../lib/productMetrics'

const REVIEW_OPENERS = [
  'Shipped faster than I expected.',
  'Took a few extra days but worth the wait.',
  'Tracking was clear the whole way.',
  'Arrived with no damage.',
  'Box was smaller than I thought—in a good way.',
  'Local depot held it briefly; still happy.',
  'Courier left it in a safe spot.',
]
const REVIEW_MIDDLES = [
  'Build quality feels solid for daily use.',
  'Materials match what the listing promised.',
  'Finish is even in person.',
  'A bit lighter than I imagined.',
  'Heavier than photos suggest—feels substantial.',
  'Sizing ran true for me.',
  'I’d size up next time.',
  'Instructions could be clearer, but usable.',
  'Setup took under ten minutes.',
  'No weird smells out of the box.',
]
const REVIEW_CLOSERS = [
  'Would buy again.',
  'Happy to support a greener option.',
  'Good value at the sale price.',
  'Full price would be a maybe.',
  'Recommended it to a friend already.',
  'Not perfect, but I’m keeping it.',
  'Returns process looks fair if needed.',
]
const REVIEW_NAMES = [
  'Emma', 'Noah', 'Sofia', 'Mason', 'Olivia', 'Luca', 'Ava', 'Ethan', 'Mia', 'Leo',
  'Chloe', 'Ben', 'Harper', 'Sam', 'Zoe', 'Ryan', 'Priya', 'Diego', 'Nina', 'Alex',
  'Jordan', 'Taylor', 'Casey', 'Riley', 'Quinn', 'Jamal', 'Yuki', 'Fatima', 'Omar', 'Elena',
]

function buildDemoReviewBody(seed) {
  const o = REVIEW_OPENERS[seed % REVIEW_OPENERS.length]
  const m = REVIEW_MIDDLES[(Math.floor(seed / 17)) % REVIEW_MIDDLES.length]
  const c = REVIEW_CLOSERS[(Math.floor(seed / 61)) % REVIEW_CLOSERS.length]
  const mode = seed % 5
  if (mode === 0) return ''
  if (mode === 1) return o
  if (mode === 2) return `${m} ${c}`
  if (mode === 3) return `${o} ${m}`
  return `${o} ${m} ${c}`
}

/** Weighted toward 4–5 stars; occasional 2–3 for realism. */
function demoRating(seed) {
  const table = [5, 5, 4, 4, 5, 4, 3, 5, 4, 5, 3, 2, 4, 5, 4, 4, 5, 3, 4, 5]
  return table[seed % table.length]
}

function buildDemoReviews(productId, productName) {
  const base = hashString(`${productId}|${productName || ''}|${productName?.length || 0}`)
  const reviewCount = 2 + (base % 11) // 2 to 12 demo reviews
  return Array.from({ length: reviewCount }).map((_, idx) => {
    const seed = hashString(`${productId}-${idx}-${productName || 'p'}-${base}`)
    const rating = demoRating(hashString(`${seed}-${idx}-${base}`))
    const dayOffset = 2 + ((seed + idx * 11) % 52)
    const body = buildDemoReviewBody(seed)
    return {
      id: `demo-${productId}-${idx}`,
      rating,
      body,
      created_at: new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000).toISOString(),
      display_name: REVIEW_NAMES[(seed * 7 + idx * 13) % REVIEW_NAMES.length],
      is_demo: true,
    }
  })
}

export default function ReviewList({ productId, productName }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReviews() {
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('id, user_id, rating, body, created_at')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
      const reviewsList = reviewData ?? []
      const userIds = [...new Set(reviewsList.map((r) => r.user_id))]
      let names = {}
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds)
        names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.display_name]))
      }
      const dbReviews = reviewsList.map((r) => ({ ...r, display_name: names[r.user_id] ?? null }))
      const merged = dbReviews.length > 0 ? dbReviews : buildDemoReviews(productId, productName)
      setReviews(merged)
      setLoading(false)
    }
    fetchReviews()
  }, [productId, productName])

  if (loading) return <p className="text-stone-500 text-sm">Loading reviews...</p>

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div className="mt-8 border-t border-stone-200 pt-6">
      <h2 className="text-lg font-semibold text-stone-800 mb-2">Reviews</h2>
      {avgRating && (
        <p className="text-stone-600 text-sm mb-4">
          Average: {avgRating} / 5 ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
        </p>
      )}
      {reviews.length === 0 ? (
        <p className="text-stone-500 text-sm">No reviews yet. Be the first to review!</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-stone-800">
                  {r.display_name ?? 'Anonymous'}
                </span>
                {r.is_demo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Verified buyer</span>}
                <span className="text-amber-500 text-sm">
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </span>
                <span className="text-stone-400 text-xs">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.body && <p className="text-stone-600 text-sm mt-1">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
