export function showToast(message) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('ecoshop-toast', { detail: { message: String(message) } }))
}
