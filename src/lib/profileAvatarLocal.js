const key = (userId) => `ecoshop_profile_avatar_${userId}`

export function getProfileAvatarLocal(userId) {
  if (!userId) return null
  try {
    const v = localStorage.getItem(key(userId))
    const t = (v || '').trim()
    return t || null
  } catch {
    return null
  }
}

export function setProfileAvatarLocal(userId, url) {
  if (!userId) return
  try {
    const t = (url || '').trim()
    if (!t) localStorage.removeItem(key(userId))
    else localStorage.setItem(key(userId), t)
  } catch {
  }
}

export function notifyProfileAvatarUpdated() {
  window.dispatchEvent(new CustomEvent('ecoshop_profile_avatar'))
}
