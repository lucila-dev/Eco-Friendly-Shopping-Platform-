import { hashString } from './productMetrics'
import { getProductImage } from './productImageOverrides'

/** Pad order history / charts when a user has few real orders (client-side only; not stored in DB). */
export const PRESENTATION_TARGET_ORDER_COUNT = 9

const FALLBACK_CATALOG = [
  { name: 'Organic Cotton T-Shirt', slug: 'organic-cotton-tshirt', price: 24.99, image_url: '' },
  { name: 'Bamboo Cutlery Set', slug: 'bamboo-cutlery-set', price: 18.5, image_url: '' },
  { name: 'Solid Shampoo Bar', slug: 'solid-shampoo-bar', price: 14.99, image_url: '' },
  { name: 'Reusable Beeswax Wraps', slug: 'beeswax-wraps', price: 22, image_url: '' },
  { name: 'Refillable Deodorant', slug: 'refillable-deodorant', price: 19.99, image_url: '' },
  { name: 'Recycled Ocean Plastic Jacket', slug: 'recycled-ocean-plastic-jacket', price: 89.99, image_url: '' },
]

export function buildSyntheticOrderId(userId, idx) {
  let buf = ''
  for (let k = 0; k < 16; k += 1) {
    buf += (hashString(`${userId}|${idx}|${k}`) % 256).toString(16).padStart(2, '0')
  }
  return `${buf.slice(0, 8)}-${buf.slice(8, 12)}-${buf.slice(12, 16)}-${buf.slice(16, 20)}-${buf.slice(20)}`
}

function pickProducts(catalog, orderIdx, lineCount, base) {
  const pool = catalog.length ? catalog : FALLBACK_CATALOG
  const items = []
  for (let i = 0; i < lineCount; i += 1) {
    const j = (base + orderIdx * 7 + i * 11) % pool.length
    items.push(pool[j])
  }
  return items
}

/**
 * @returns {{ displayOrders: object[], syntheticItemsByOrderId: Record<string, object[]>, carbonByOrderIdSynthetic: Record<string, number> }}
 */
export function augmentOrdersWithPresentationHistory(userId, realOrders = [], catalog = []) {
  const real = realOrders ?? []
  const needed = Math.max(0, PRESENTATION_TARGET_ORDER_COUNT - real.length)
  if (needed === 0) {
    return { displayOrders: real, syntheticItemsByOrderId: {}, carbonByOrderIdSynthetic: {} }
  }

  const base = hashString(userId)
  const now = new Date()
  const syntheticOrders = []
  const syntheticItemsByOrderId = {}
  const carbonByOrderIdSynthetic = {}

  for (let idx = 0; idx < needed; idx += 1) {
    const monthOffset = needed - idx
    const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, 4 + ((base + idx * 7) % 20))
    const total = 24 + ((base + idx * 17) % 95) + ((base + idx) % 100) / 100
    const totalFixed = Number(total.toFixed(2))
    const orderId = buildSyntheticOrderId(userId, idx)
    const lineCount = 1 + ((base + idx) % 3)
    const picks = pickProducts(catalog, idx, lineCount, base)

    const lineData = picks.map((p, li) => {
      const qty = 1 + ((base + idx + li) % 2)
      const jitter = 0.88 + (((base + idx + li) % 12) / 100)
      const rawUnit = Math.max(5.5, Number(p.price ?? 15) * jitter)
      return { p, li, qty, rawUnit }
    })

    let subtotal = lineData.reduce((s, row) => s + row.rawUnit * row.qty, 0)
    const scale = subtotal > 0 ? totalFixed / subtotal : 1

    let carbonSum = 0
    const lines = lineData.map(({ p, li, qty, rawUnit }) => {
      const unit = Number((rawUnit * scale).toFixed(2))
      const carbonUnit = Number((0.35 + ((hashString(`${orderId}|${li}`) % 28) / 10)).toFixed(2))
      carbonSum += carbonUnit * qty
      const img = getProductImage({ name: p.name, slug: p.slug, image_url: p.image_url })
      return {
        order_id: orderId,
        quantity: qty,
        price_at_order: unit,
        products: { name: p.name, slug: p.slug, image_url: img },
      }
    })

    let sumLines = lines.reduce((s, l) => s + l.price_at_order * l.quantity, 0)
    const diff = totalFixed - sumLines
    if (lines.length && Math.abs(diff) >= 0.001) {
      const last = lines[lines.length - 1]
      last.price_at_order = Number((last.price_at_order + diff / last.quantity).toFixed(2))
      sumLines = lines.reduce((s, l) => s + l.price_at_order * l.quantity, 0)
    }

    syntheticOrders.push({
      id: orderId,
      total_amount: Number(sumLines.toFixed(2)),
      status: 'delivered',
      created_at: date.toISOString(),
    })
    syntheticItemsByOrderId[orderId] = lines
    carbonByOrderIdSynthetic[orderId] = Number(carbonSum.toFixed(1))
  }

  const displayOrders = [...real, ...syntheticOrders].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  )

  return { displayOrders, syntheticItemsByOrderId, carbonByOrderIdSynthetic }
}