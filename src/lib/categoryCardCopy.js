export function categoryCardDescription(cat) {
  const name = cat?.name?.trim() ?? ''
  const description = cat?.description?.trim() ?? ''
  if (!description) return ''
  if (name.length >= 2 && description.toLowerCase().startsWith(name.toLowerCase())) {
    const rest = description.slice(name.length).replace(/^[\s,—–-]+/, '').trim()
    return rest || description
  }
  return description
}

export function displayNameMatchesCategorySlug(name, slug) {
  const s = String(slug ?? '').toLowerCase().trim()
  if (!s) return true
  const raw = String(name ?? '').toLowerCase().trim()
  if (raw === s) return true
  const fromName = raw
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return fromName === s
}
