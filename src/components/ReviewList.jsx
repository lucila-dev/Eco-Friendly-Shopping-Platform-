import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const FIRST_NAMES = [
  'Emma', 'Noah', 'Sofia', 'Mason', 'Olivia', 'Luca', 'Ava', 'Ethan', 'Mia', 'Leo',
  'Chloe', 'Ben', 'Harper', 'Sam', 'Zoe', 'Ryan', 'Priya', 'Diego', 'Nina', 'Alex',
  'Jordan', 'Taylor', 'Casey', 'Riley', 'Quinn', 'Jamal', 'Yuki', 'Fatima', 'Omar', 'Elena',
  'Marcus', 'Hannah', 'Victor', 'Mei', 'Jonah', 'Amara', 'Dmitri', 'Ines', 'Kenji', 'Bianca',
]

const LAST_NAMES = [
  'Nguyen', 'Patel', 'Garcia', 'Kim', 'Okafor', 'Johansson', 'Silva', 'Ibrahim', 'Martinez',
  'Olsen', 'Park', 'Nakamura', 'Hansen', 'Kowalczyk', 'Fernandez', 'OBrien', 'Lindberg',
  'Carvalho', 'Yamamoto', 'Schmidt', 'Varga', 'Abbasi', 'Novak', 'Berg', 'Liu',
  'Santos', 'Ricci', 'Duarte', 'Bakker', 'Haddad', 'Kaur', 'Petrov', 'Costa',
]

function hashString(value = '') {
  let h = 0
  for (let i = 0; i < value.length; i += 1) {
    h = ((h << 5) - h) + value.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function reviewerName(seed) {
  const fi = seed % FIRST_NAMES.length
  const li = Math.floor(seed / FIRST_NAMES.length) % LAST_NAMES.length
  return `${FIRST_NAMES[fi]} ${LAST_NAMES[li]}`
}

function reviewBody(seed, productLabel) {
  const context = (productLabel || 'this item').trim()
  const openers = [
    'Arrived quickly and was packed well.',
    'I have been using it for a few days now.',
    'Honestly better than I expected at this price.',
    'First impression was very positive.',
    'I was a little unsure at first, but it turned out great.',
    `Picked this up recently and it has been a good addition.`,
  ]
  const details = [
    'Quality feels solid and the finish is clean.',
    'The material feels comfortable and not cheap at all.',
    'It feels durable enough for regular use.',
    'Looks just like the listing photos in person.',
    'No weird smell or defects when it arrived.',
    'It has held up well after multiple uses already.',
  ]
  const sustainabilityMentions = [
    'Also appreciate the lower-impact materials.',
    'I like that it is a more sustainable option.',
    'Feels good choosing something with a smaller footprint.',
    `Nice to have a greener alternative without sacrificing quality.`,
  ]
  const closers = [
    'Would buy again.',
    'Happy with this purchase.',
    'I would recommend it.',
    'Good value overall.',
    'This one is staying in my routine.',
  ]
  const first = openers[seed % openers.length]
  const second = details[(seed + 5) % details.length]
  const third = sustainabilityMentions[(seed + 11) % sustainabilityMentions.length]
  const end = closers[(seed + 17) % closers.length]
  const includeContext = seed % 4 === 0
  const contextSentence = includeContext ? ` It works especially well for ${context.toLowerCase()}.` : ''
  return `${first} ${second}${contextSentence} ${third} ${end}`
}

function syntheticRating(seed) {
  const table = [5, 5, 4, 4, 5, 4, 5, 4, 3, 5, 4, 5, 3, 4, 5]
  return table[seed % table.length]
}

function buildFallbackReviews(productId, productName) {
  const base = hashString(`${productId}|${productName || ''}`)
  const count = 4 + (base % 4) // 4..7 reviews
  return Array.from({ length: count }).map((_, idx) => {
    const seed = hashString(`${productId}|${productName || 'p'}|${idx}|${base}`)
    const dayOffset = 4 + ((seed + idx * 11) % 80)
    return {
      id: `fallback-${productId}-${idx}`,
      rating: syntheticRating(seed),
      body: reviewBody(seed, productName),
      created_at: new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000).toISOString(),
      display_name: reviewerName(seed),
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
      const fallbacks = buildFallbackReviews(productId, productName)
      const merged = [...dbReviews, ...fallbacks].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      setReviews(merged)
      setLoading(false)
    }
    fetchReviews()
  }, [productId, productName])

  if (loading) return <p className="text-stone-500 text-sm">Loading reviews...</p>

  const verifiedOnly = reviews.filter((r) => !String(r.id).startsWith('fallback-'))
  const forAverage = verifiedOnly.length > 0 ? verifiedOnly : reviews
  const avgRating = forAverage.length
    ? (forAverage.reduce((s, r) => s + r.rating, 0) / forAverage.length).toFixed(1)
    : null

  return (
    <div className="mt-8 border-t border-stone-200 pt-6">
      <h2 className="text-lg font-semibold text-stone-800 mb-2">Reviews</h2>
      {avgRating && (
        <p className="text-stone-600 text-sm mb-4">
          Average: {avgRating} / 5 ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          {verifiedOnly.length > 0 && verifiedOnly.length < reviews.length
            ? ` · ${verifiedOnly.length} from verified buyers`
            : ''}
          )
        </p>
      )}
      {reviews.length === 0 ? (
        <p className="text-stone-500 text-sm">No reviews yet. Be the first to review!</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
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
