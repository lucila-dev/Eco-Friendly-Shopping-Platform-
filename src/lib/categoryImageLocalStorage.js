const STORAGE_KEY = 'ecoshop_category_home_v1'

export function clampFocusY(n) {
  const x = Number(n)
  if (Number.isNaN(x)) return 50
  return Math.min(100, Math.max(0, Math.round(x)))
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const p = JSON.parse(raw)
    return p && typeof p === 'object' ? p : {}
  } catch {
    return {}
  }
}

/** Persist home-page category image + framing in the browser (no SQL required). */
export function saveCategoryOverride(categoryId, { image_url, image_focus_y }) {
  const all = readAll()
  all[categoryId] = {
    image_url: image_url == null || image_url === '' ? '' : String(image_url).trim(),
    image_focus_y: clampFocusY(image_focus_y),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function notifyCategoryHomeUpdated() {
  window.dispatchEvent(new CustomEvent('ecoshop_category_home'))
}

/** Merge API category row with saved browser overrides (overrides win when set). */
export function mergeCategoryRowForHome(cat) {
  if (!cat?.id) return cat
  const o = readAll()[cat.id]
  if (!o) return cat
  const url = (o.image_url || '').trim()
  return {
    ...cat,
    image_url: url || cat.image_url,
    image_focus_y: o.image_focus_y != null ? clampFocusY(o.image_focus_y) : cat.image_focus_y,
  }
}
