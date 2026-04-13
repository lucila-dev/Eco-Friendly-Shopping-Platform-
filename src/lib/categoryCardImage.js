import { getCategoryImage } from './productImageOverrides'

export function getCategoryCardSrc(cat) {
  const url = String(cat?.image_url ?? '').trim()
  if (url) return url
  return getCategoryImage(cat?.slug ?? '')
}

export function getCategoryImageObjectPosition(focusY) {
  const y = Math.min(100, Math.max(0, Number(focusY) || 50))
  return `center ${y}%`
}
