const OVERRIDES = [
  { match: /backpack/i, url: 'https://images.unsplash.com/photo-1622560480654-d96214fdc887?w=1200' },
  { match: /onesie/i, url: 'https://images.unsplash.com/photo-1519340333755-c6e9f6b88a45?w=1200' },
  { match: /jacket/i, url: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=1200' },
  { match: /tee|t-?shirt|shirt/i, url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200' },
  { match: /sneakers/i, url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200' },
  { match: /straw/i, url: 'https://images.unsplash.com/photo-1588165171080-c89acfa5ee83?w=1200' },
  { match: /utensils|cutlery/i, url: 'https://images.unsplash.com/photo-1594489572280-6f0112d438f9?w=1200' },
  { match: /cable ties|cable organizer/i, url: 'https://images.unsplash.com/photo-1580894908361-967195033215?w=1200' },
  { match: /notebook|planner|pen|sticky notes/i, url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200' },
  { match: /compost|seed pots|planter|plant labels|coir|herb grow/i, url: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200' },
  { match: /toothpaste/i, url: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=1200' },
  { match: /toothbrush/i, url: 'https://images.unsplash.com/photo-1559591935-c6c23a6f3bce?w=1200' },
  { match: /phone case|laptop sleeve|power bank/i, url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200' },
  { match: /vase/i, url: 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=1200' },
  { match: /lip balm|mascara|blush|makeup/i, url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200' },
]

export const CATEGORY_DEFAULTS = {
  fashion: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200',
  home: 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=1200',
  'personal-care': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200',
  kitchen: 'https://images.unsplash.com/photo-1594489572280-6f0112d438f9?w=1200',
  beauty: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200',
  outdoors: 'https://images.unsplash.com/photo-1501554728187-ce583db33af7?w=1200',
  kids: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=1200',
  'food-drink': 'https://images.unsplash.com/photo-1497534546561-136052443605?w=1200',
  tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200',
  garden: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200',
}

const CATEGORY_FALLBACK =
  'https://images.unsplash.com/photo-1473341308940-3f45f58a8327?w=1200'

/** Cover image for category cards on Home (by category slug). */
export function getCategoryImage(slug = '') {
  const s = String(slug ?? '').toLowerCase().trim()
  if (!s) return CATEGORY_FALLBACK
  if (CATEGORY_DEFAULTS[s]) return CATEGORY_DEFAULTS[s]
  const parts = s.split('-').filter(Boolean)
  if (parts.length >= 2) {
    const two = `${parts[0]}-${parts[1]}`
    if (CATEGORY_DEFAULTS[two]) return CATEGORY_DEFAULTS[two]
  }
  if (parts[0] && CATEGORY_DEFAULTS[parts[0]]) return CATEGORY_DEFAULTS[parts[0]]
  return CATEGORY_FALLBACK
}

function hasStoredImageUrl(image_url) {
  const t = String(image_url || '').trim()
  return t.length > 0 && (/^https?:\/\//i.test(t) || t.startsWith('//'))
}

export function getProductImage(input = {}) {
  const name = String(input?.name ?? '')
  const slug = String(input?.slug ?? '')
  const image_url = input?.image_url

  if (hasStoredImageUrl(image_url)) {
    const t = String(image_url).trim()
    return t.startsWith('//') ? `https:${t}` : t
  }

  const key = `${name} ${slug}`
  const hit = OVERRIDES.find((rule) => rule.match.test(key))
  if (hit?.url) return hit.url

  const isGenerated = /-(core|plus|premium)-\d+$/i.test(slug)
  if (isGenerated) {
    const categoryPrefix = slug.split('-').slice(0, 2).join('-')
    if (CATEGORY_DEFAULTS[categoryPrefix]) return CATEGORY_DEFAULTS[categoryPrefix]
    const firstSegment = slug.split('-')[0]
    if (CATEGORY_DEFAULTS[firstSegment]) return CATEGORY_DEFAULTS[firstSegment]
  }

  const categoryPrefix = slug.split('-').slice(0, 2).join('-')
  if (CATEGORY_DEFAULTS[categoryPrefix]) return CATEGORY_DEFAULTS[categoryPrefix]
  const firstSegment = slug.split('-')[0]
  if (CATEGORY_DEFAULTS[firstSegment]) return CATEGORY_DEFAULTS[firstSegment]

  const fallback = image_url != null ? String(image_url).trim() : ''
  return fallback || '/placeholder.svg'
}
