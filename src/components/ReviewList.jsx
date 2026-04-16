import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ReviewList({ productId }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReviews() {
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('id, user_id, rating, body, created_at, reviewer_display_name')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
      const reviewsList = reviewData ?? []
      const userIds = [...new Set(reviewsList.map((r) => r.user_id).filter(Boolean))]
      let names = {}
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds)
        names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.display_name]))
      }
      const merged = reviewsList.map((r) => ({
        ...r,
        display_name: r.reviewer_display_name ?? (r.user_id ? names[r.user_id] : null) ?? null,
      }))
      setReviews(merged)
      setLoading(false)
    }
    fetchReviews()
  }, [productId])

  if (loading) return <p className="text-stone-500 text-base">Loading reviews...</p>

  const verifiedOnly = reviews.filter((r) => r.user_id != null)
  const forAverage = verifiedOnly.length > 0 ? verifiedOnly : reviews
  const avgRating = forAverage.length
    ? (forAverage.reduce((s, r) => s + r.rating, 0) / forAverage.length).toFixed(1)
    : null

  return (
    <div className="mt-8 border-t border-stone-200 dark:border-stone-700 pt-6">
      <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-2">Reviews</h2>
      {avgRating && (
        <p className="text-stone-600 dark:text-stone-400 text-base mb-4">
          Average: {avgRating} / 5 ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          {verifiedOnly.length > 0 && verifiedOnly.length < reviews.length
            ? ` · ${verifiedOnly.length} from verified buyers`
            : ''}
          )
        </p>
      )}
      {reviews.length === 0 ? (
        <p className="text-stone-500 text-base">No reviews yet. Be the first to review!</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-stone-800 dark:text-stone-200">
                  {r.display_name ?? 'Anonymous'}
                </span>
                <span className="text-amber-500 text-base">
                  {'★'.repeat(r.rating)}{'\u2606'.repeat(5 - r.rating)}
                </span>
                <span className="text-stone-400 text-base">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.body && <p className="text-stone-600 dark:text-stone-300 text-base mt-1">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
