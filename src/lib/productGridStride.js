/** Products grid: 1 col (default), 2 cols (sm), 4 cols (lg). ~6 rows per “page”. */
export function productGridStrideForWidth(width) {
  if (width >= 1024) return 24
  if (width >= 640) return 12
  return 6
}

export function productGridStrideViewport() {
  if (typeof window === 'undefined') return 24
  return productGridStrideForWidth(window.innerWidth)
}
