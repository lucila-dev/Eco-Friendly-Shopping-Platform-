import { getCategoryImage } from './productImageOverrides'

/** Image URL for Home category cards: custom upload/URL first, then default by slug. */
export function getCategoryCardSrc(cat) {
  const url = String(cat?.image_url ?? '').trim()
  if (url) return url
  return getCategoryImage(cat?.slug ?? '')
}

/** CSS object-position vertical anchor: 0 = top of photo, 100 = bottom. */
export function getCategoryImageObjectPosition(focusY) {
  const y = Math.min(100, Math.max(0, Number(focusY) || 50))
  return `center ${y}%`
}
