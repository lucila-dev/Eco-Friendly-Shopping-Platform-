import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function ReviewForm({ productId, canReview, onSubmitted }) {
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()

  if (!user) return null
  if (!canReview) {
    return (
      <div className="mt-4 p-4 bg-stone-50 rounded-lg">
        <h3 className="font-medium text-stone-800 mb-1">Write a review</h3>
        <p className="text-sm text-stone-600">You can review this product after you buy it.</p>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: err } = await supabase.from('reviews').upsert(
      { product_id: productId, user_id: user.id, rating, body },
      { onConflict: 'product_id,user_id' }
    )
    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }
    setBody('')
    setRating(5)
    onSubmitted?.()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 bg-stone-50 rounded-lg">
      <h3 className="font-medium text-stone-800 mb-2">Write a review</h3>
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-xl ${n <= rating ? 'text-amber-500' : 'text-stone-300'}`}
            aria-label={`${n} stars`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Your review (optional)"
        rows={3}
        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
      />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit review'}
      </button>
    </form>
  )
}
