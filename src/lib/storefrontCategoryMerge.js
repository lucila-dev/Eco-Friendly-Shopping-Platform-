export const OUTDOOR_CANONICAL_SLUG = 'outdoors'
export const OUTDOOR_GROUP_SLUGS = new Set(['garden', 'outdoors'])

export const HOME_CANONICAL_SLUG = 'home'
export const HOME_GROUP_SLUGS = new Set(['home', 'office'])

export function categoryIdsForProductFilter(slug, categories) {
  if (!slug?.trim()) return null
  const s = slug.trim().toLowerCase()
  if (HOME_GROUP_SLUGS.has(s)) {
    const ids = categories.filter((c) => HOME_GROUP_SLUGS.has(c.slug)).map((c) => c.id)
    if (ids.length) return ids
    return null
  }
  if (OUTDOOR_GROUP_SLUGS.has(s)) {
    const ids = categories.filter((c) => OUTDOOR_GROUP_SLUGS.has(c.slug)).map((c) => c.id)
    if (ids.length) return ids
    const canonical = categories.find((c) => c.slug === OUTDOOR_CANONICAL_SLUG)
    return canonical ? [canonical.id] : null
  }
  const cat = categories.find((c) => c.slug === s)
  return cat ? [cat.id] : null
}

export function mergeGardenOutdoorsForHome(list) {
  const garden = list.find((c) => c.slug === 'garden')
  const outdoor = list.find((c) => c.slug === 'outdoors')
  const rest = list.filter((c) => c.slug !== 'garden' && c.slug !== 'outdoors')
  if (garden && outdoor) {
    const preferOutdoorImage = Boolean((outdoor.image_url || '').trim())
    const image_url = preferOutdoorImage ? outdoor.image_url : (garden.image_url || outdoor.image_url)
    const image_focus_y = preferOutdoorImage
      ? (outdoor.image_focus_y ?? garden.image_focus_y ?? 50)
      : (garden.image_focus_y ?? outdoor.image_focus_y ?? 50)
    return [
      ...rest,
      {
        ...outdoor,
        name: 'Garden & Outdoors',
        slug: OUTDOOR_CANONICAL_SLUG,
        description: [outdoor.description, garden.description].filter(Boolean).join('. ') || outdoor.description,
        image_url,
        image_focus_y,
      },
    ]
  }
  if (!garden && outdoor) {
    return [...rest, { ...outdoor, name: 'Garden & Outdoors', slug: OUTDOOR_CANONICAL_SLUG }]
  }
  return list
}

export function mergeHomeOfficeForHome(list) {
  const home = list.find((c) => c.slug === 'home')
  const office = list.find((c) => c.slug === 'office')
  const rest = list.filter((c) => c.slug !== 'home' && c.slug !== 'office')
  if (home && office) {
    const preferHomeImage = Boolean((home.image_url || '').trim())
    const image_url = preferHomeImage ? home.image_url : (office.image_url || home.image_url)
    const image_focus_y = preferHomeImage
      ? (home.image_focus_y ?? office.image_focus_y ?? 50)
      : (office.image_focus_y ?? home.image_focus_y ?? 50)
    return [
      ...rest,
      {
        ...home,
        name: 'Home & Office',
        slug: HOME_CANONICAL_SLUG,
        description: [home.description, office.description].filter(Boolean).join('. ') || home.description,
        image_url,
        image_focus_y,
      },
    ]
  }
  if (!home && office) {
    return [...rest, { ...office, name: 'Home & Office', slug: HOME_CANONICAL_SLUG }]
  }
  if (home && !office && home.name === 'Home') {
    return [...rest, { ...home, name: 'Home & Office' }]
  }
  return list
}

export function categoriesForProductListPills(categories) {
  const hasGarden = categories.some((c) => c.slug === 'garden')
  let list = hasGarden ? categories.filter((c) => c.slug !== 'garden') : categories
  const hasOffice = list.some((c) => c.slug === 'office')
  if (hasOffice) {
    list = list.filter((c) => c.slug !== 'office')
  }
  return list.map((c) => {
    if (c.slug === 'outdoors') return { ...c, name: 'Garden & Outdoors' }
    if (c.slug === 'home' && hasOffice) return { ...c, name: 'Home & Office' }
    return c
  })
}
