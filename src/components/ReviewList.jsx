import { useEffect, useMemo, useState } from 'react'
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

function pick(arr, seed, salt = 0) {
  if (!arr?.length) return null
  return arr[(seed + salt) % arr.length]
}

function shuffleInPlace(arr, seed) {
  const a = arr
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.abs(hashString(`${seed}|${i}|shuffle`)) % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Drop comma-chunks that duplicate or sit inside a longer bit (stops “coconut…” twice). */
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

function shortenForReview(s, maxLen = 86) {
  const t = String(s ?? '').trim().replace(/\s+/g, ' ')
  if (!t) return ''
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen - 1).trim()}…`
}

/** Sentence fragments from description + materials + category for product-specific fallback copy. */
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

function embedMid(s) {
  if (!s) return ''
  return s.charAt(0).toLowerCase() + s.slice(1)
}

function categoryHints(ctx) {
  const { categoryName, categorySlug } = ctx
  const n = categoryName.toLowerCase()
  const s = categorySlug
  return {
    food: s === 'food-drink' || n.includes('food') || n.includes('drink'),
    apparel: s === 'fashion' || n.includes('fashion'),
    beauty: s === 'beauty' || n.includes('beauty'),
    kitchen: s === 'kitchen' || n.includes('kitchen'),
    personal: s === 'personal-care' || n.includes('personal'),
    home: s === 'home' || n.includes('home') || n.includes('office'),
    kids: s === 'kids' || n.includes('kids') || n.includes('baby'),
    outdoors: s === 'outdoors' || n.includes('outdoor') || n.includes('garden'),
    tech: s === 'tech' || n.includes('tech'),
  }
}

/**
 * One listing quote max per review; only one slot per product names raw materials (avoids “Coconut shell” ×5).
 * Synthetic copy never uses the product title — reads more like real short reviews.
 */
function reviewBody(productId, productName, ctx, slotIndex, baseHash, plan) {
  const mix = hashString(`${productId}|${slotIndex}|${baseHash}|${productName}|v3`)
  const d = plan.descQuote
  const It = ['It', 'This one', 'The item'][(mix >> 1) % 3]
  const it = ['it', 'this one', 'the item'][(mix >> 5) % 3]

  const mat = plan.matNamed ? pick(ctx.materialPhrases, mix, slotIndex) : null
  const cat = ctx.categoryName
  const h = categoryHints(ctx)

  const matLines = mat
    ? [
        `Nice touch: ${mat}.`,
        `${mat} is obvious in person.`,
        `The ${mat} detail is real.`,
        `You notice the ${mat} straight away.`,
      ]
    : ['', '', '', '']
  const matCasual = mat ? pick(matLines, mix, slotIndex + 7) : ''
  const washOk = pick(['Washes fine.', 'Survives the dishwasher.', 'No weird wear yet.', ''], mix, slotIndex + 3)

  const T = 29
  const patternIdx = (slotIndex * 11 + (mix % 97)) % T

  const p = [
    () =>
      d
        ? `${It} showed up fast. ${embedMid(d)} Basically true.${matCasual ? ` ${matCasual}` : ''} I'd reorder.`
        : `${It}'s fine for ${cat.toLowerCase()}.${matCasual ? ` ${matCasual}` : ' Exactly what I needed.'}`,
    () =>
      d
        ? `Looking for ${cat.toLowerCase()} stuff. ${d} Listing nailed that bit.`
        : `Does the job.${matCasual ? ` ${matCasual}` : ' Photos were honest.'}`,
    () =>
      h.food && d
        ? `${embedMid(d)} Taste is on point.${mat ? ` ${mat} on the label matches.` : ''}`
        : h.beauty && d
          ? `Skin's happy. ${embedMid(d)} ${mat ? `No drama with ${mat}.` : ''}`
          : h.apparel && d
            ? `Cut works for me. ${embedMid(d)} ${mat ? `${mat} feels nice.` : ''}`
            : d
              ? `${It} tracks with what they wrote — ${embedMid(d)}${matCasual ? ` ${matCasual}` : ''}`
              : `No complaints in ${cat.toLowerCase()}.${matCasual ? ` ${matCasual}` : ''}`,
    () =>
      d
        ? `Almost skipped it. ${embedMid(d)} Glad I didn't.${matCasual ? ` ${matCasual}` : ''}`
        : `Strong pick from ${cat}.${matCasual ? ` ${matCasual}` : ' Glad I grabbed it.'}`,
    () =>
      h.kitchen
        ? `Counter staple now.${d ? ` ${embedMid(d)}` : ''}${mat ? ` ${mat} ${washOk}` : washOk ? ` ${washOk}` : ''}`
        : h.personal
          ? `Less plastic in the bathroom.${d ? ` ${embedMid(d)}` : ''} Mild, works.`
          : `${It} earned a drawer spot.${d ? ` ${embedMid(d)}` : ''}${matCasual ? ` ${matCasual}` : ''}`,
    () =>
      h.outdoors
        ? `Weekend trips.${d ? ` ${embedMid(d)}` : ''}${matCasual ? ` ${matCasual}` : ''}`
        : h.tech
          ? `Plug and go.${d ? ` ${embedMid(d)}` : ''} Does the job for ${cat.toLowerCase()}.`
          : `Two weeks later still fine.${d ? ` ${embedMid(d)}` : ''}${matCasual ? ` ${matCasual}` : ''}`,
    () =>
      h.kids && d
        ? `Kid-approved.${embedMid(d)} Feels safe.${mat ? ` ${mat} helps.` : ''}`
        : h.home && d
          ? `Room looks better.${embedMid(d)}${matCasual ? ` ${matCasual}` : ''}`
          : d
            ? `They claimed ${embedMid(d)} Fair enough.${matCasual ? ` ${matCasual}` : ''}`
            : `Good ${cat.toLowerCase()} buy.${matCasual ? ` ${matCasual}` : ''}`,
    () =>
      mat && d
        ? `Cared about the ${mat} angle. ${embedMid(d)} Honest.`
        : mat
          ? `${mat} drew me in.${d ? ` ${embedMid(d)}` : ''} Rest matches.`
          : d
            ? `${embedMid(d)} Sold me.${matCasual ? ` ${matCasual}` : ''}`
            : `Straightforward order.${matCasual ? ` ${matCasual}` : ' Would buy again.'}`,
    () =>
      `Compared a few listings.${d ? ` This matched ${embedMid(d)}` : ' This felt like the safest bet.'}${matCasual ? ` ${matCasual}` : ''}`,
    () =>
      `Rare review from me.${d ? ` ${embedMid(d)}` : ' Worth saying something.'}${matCasual ? ` ${matCasual}` : ''}`,
    () =>
      `Worth what I paid.${d ? ` ${embedMid(d)}` : ''}${mat ? ` ${mat} shows in person.` : ''}`,
    () =>
      `Third thing I've tried here.${d ? ` ${embedMid(d)}` : ` Happy with this one.`}`,
    () =>
      `Wanted greener without the gimmicks.${d ? ` ${embedMid(d)}` : ''} ${it} works.${matCasual ? ` ${matCasual}` : ''}`,
    () =>
      `Birthday gift.${d ? ` Sister clocked ${embedMid(d)}` : ' Went down well.'}${mat ? ` Mentioned ${mat}.` : ''}`,
    () =>
      d
        ? `Blurb said ${d.length > 80 ? `${d.slice(0, 77)}…` : d} — accurate.${matCasual ? ` ${matCasual}` : ''}`
        : `${It}'s a yes from me.${matCasual ? ` ${matCasual}` : ''}`,
    () =>
      `Packaging was light.${d ? ` ${embedMid(d)}` : ''}${matCasual ? ` ${matCasual}` : ''} Happy.`,
    () =>
      `Skeptical of “eco” sometimes.${d ? ` ${embedMid(d)}` : ''} This one's legit.${matCasual ? ` ${matCasual}` : ''}`,
    () =>
      `Mom asked where I got ${it}.${d ? ` ${embedMid(d)}` : ''}${mat ? ` ${mat} came up.` : ''}`,
    () =>
      `Arrived a day early.${matCasual ? ` ${matCasual}` : ''}${d ? ` ${embedMid(d)}` : ''}`,
    () =>
      `Not flashy but solid.${d ? ` ${embedMid(d)}` : ''}`,
    () =>
      h.kitchen && d
        ? `Meal prep easier.${embedMid(d)}${mat ? ` ${mat} cleans fast.` : ''}`
        : `Daily driver material.${matCasual ? ` ${matCasual}` : ''}`,
    () =>
      `Exceeds my low expectations.${d ? ` ${embedMid(d)}` : ''}${matCasual ? ` ${matCasual}` : ''}`,
    () =>
      `Would suggest to a friend.${d ? ` ${embedMid(d)}` : ''}${mat ? ` ${mat} is what people notice.` : ''}`,
    () =>
      `Second colour if they had it.${d ? ` ${embedMid(d)}` : ''}${matCasual ? ` ${matCasual}` : ''}`,
    () =>
      `No returns drama.${it} stayed.${matCasual ? ` ${matCasual}` : ''}`,
    () =>
      `Reads boring online, nice in person.${d ? ` ${embedMid(d)}` : ''}`,
    () =>
      `Partner noticed before I said anything.${mat ? ` ${mat}.` : ''}${d ? ` ${embedMid(d)}` : ''}`,
    () =>
      `Crowded market; this stood out.${d ? ` ${embedMid(d)}` : ''}${matCasual ? ` ${matCasual}` : ''}`,
    () =>
      `Instructions / listing clear.${matCasual ? ` ${matCasual}` : ''}${d ? ` ${embedMid(d)}` : ''}`,
  ]

  let text = p[patternIdx]()
  text = text.replace(/\s+/g, ' ').replace(/\s([?.!,])/g, '$1').trim()
  return text
}

function buildSlotPlans(count, ctx, baseHash) {
  const pool = [...ctx.descBits]
  shuffleInPlace(pool, baseHash + 41)
  const matSlot = ctx.materialPhrases.length ? Math.abs(baseHash + count * 3) % count : -1
  return Array.from({ length: count }, (_, i) => {
    const raw = i < pool.length ? pool[i] : null
    const descQuote = raw ? shortenForReview(raw, 88) : null
    return {
      descQuote,
      matNamed: matSlot === i,
    }
  })
}

function syntheticRating(seed) {
  const table = [5, 5, 4, 4, 5, 4, 5, 4, 3, 5, 4, 5, 3, 4, 5]
  return table[seed % table.length]
}

const MIN_REVIEWS_SHOWN = 5

function buildFallbackReviews(productId, productName, ctx, dbReviewCount) {
  const base = hashString(`${productId}|${productName || ''}|${ctx.descBits[0] || ''}|${ctx.materialPhrases[0] || ''}`)
  const count = Math.max(0, MIN_REVIEWS_SHOWN - dbReviewCount)
  if (count === 0) return []
  const slotPlans = buildSlotPlans(count, ctx, base)
  return Array.from({ length: count }).map((_, idx) => {
    const seed = hashString(`${productId}|${productName || 'p'}|${idx}|${base}|${ctx.categorySlug}`)
    const dayOffset = 4 + ((seed + idx * 11) % 80)
    return {
      id: `fallback-${productId}-${idx}`,
      rating: syntheticRating(seed + idx * 13),
      body: reviewBody(productId, productName, ctx, idx, base, slotPlans[idx]),
      created_at: new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000).toISOString(),
      display_name: reviewerName(seed + idx * 17),
    }
  })
}

export default function ReviewList({
  productId,
  productName,
  productDescription,
  materials,
  categoryName,
  categorySlug,
}) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  const reviewContext = useMemo(
    () => buildProductReviewContext(productDescription, materials, categoryName, categorySlug),
    [productDescription, materials, categoryName, categorySlug],
  )

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
      const fallbacks = buildFallbackReviews(productId, productName, reviewContext, dbReviews.length)
      const merged = [...dbReviews, ...fallbacks].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      setReviews(merged)
      setLoading(false)
    }
    fetchReviews()
  }, [productId, productName, reviewContext])

  if (loading) return <p className="text-stone-500 text-base">Loading reviews...</p>

  const verifiedOnly = reviews.filter((r) => !String(r.id).startsWith('fallback-'))
  const forAverage = verifiedOnly.length > 0 ? verifiedOnly : reviews
  const avgRating = forAverage.length
    ? (forAverage.reduce((s, r) => s + r.rating, 0) / forAverage.length).toFixed(1)
    : null

  return (
    <div className="mt-8 border-t border-stone-200 pt-6">
      <h2 className="text-lg font-semibold text-stone-800 mb-2">Reviews</h2>
      {avgRating && (
        <p className="text-stone-600 text-base mb-4">
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
            <li key={r.id} className="border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-stone-800">
                  {r.display_name ?? 'Anonymous'}
                </span>
                <span className="text-amber-500 text-base">
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </span>
                <span className="text-stone-400 text-base">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.body && <p className="text-stone-600 text-base mt-1">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
