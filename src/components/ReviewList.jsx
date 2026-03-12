import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ReviewList({ productId }) {
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
      setReviews(reviewsList.map((r) => ({ ...r, display_name: names[r.user_id] ?? null })))
      setLoading(false)
    }
    fetchReviews()
  }, [productId])

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
