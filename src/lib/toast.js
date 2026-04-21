/** Shows a short bottom toast (see ToastHost in main.jsx). Uses document so it works from any module. */
export function showToast(message) {
  if (typeof document === 'undefined') return
  document.dispatchEvent(
    new CustomEvent('ecoshop-toast', {
      bubbles: true,
      detail: { message: String(message), t: Date.now() },
    }),
  )
}
