export function formatCatalogProductName(name) {
  return String(name ?? '').replace(/\s+(Core|Plus|Premium)$/i, '').trim()
}
