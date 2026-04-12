/**
 * Strip legacy tier suffixes from auto-generated catalog titles (older seeds appended "Core", "Plus", "Premium").
 */
export function formatCatalogProductName(name) {
  return String(name ?? '').replace(/\s+(Core|Plus|Premium)$/i, '').trim()
}
