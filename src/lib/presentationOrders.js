import { hashString } from './productMetrics'
import { getProductImage } from './productImageOverrides'

/**
 * Demo orders are disabled (0). Padding used to invent fake purchase history and mismatched prices;
 * only real `orders` rows should appear for the signed-in user.
 */
export const PRESENTATION_TARGET_ORDER_COUNT = 0

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

function parseMemberSince(memberSince) {
  if (memberSince == null || memberSince === '') return null
  const d = new Date(memberSince)
  return Number.isFinite(d.getTime()) ? d.getTime() : null
}

/** Real rows from DB may predate a re-seeded account — never show earlier than signup. */
function clampRealOrderDatesForDisplay(orders, joinMs) {
  if (joinMs == null) return orders
  const nowMs = Date.now()
  return orders.map((o, i) => {
    const c = new Date(o.created_at).getTime()
    if (!Number.isFinite(c) || c >= joinMs) return o
    const spread = 3600000 + (hashString(String(o.id || i)) % (86400000 * 12))
    const bumped = joinMs + spread
    const capped = Math.min(bumped, nowMs - (i + 1) * 2000)
    const ms = Math.max(joinMs + 60000, capped)
    return { ...o, created_at: new Date(ms).toISOString() }
  })
}

/**
 * @param {string|null|undefined} memberSince - auth user `created_at` (ISO); synthetic history stays after this.
 * @param {{ minimumSyntheticOrders?: number }} [options] - If set (e.g. track page), always generate at least this many demo orders in addition to all real ones.
 * @returns {{ displayOrders: object[], syntheticItemsByOrderId: Record<string, object[]>, carbonByOrderIdSynthetic: Record<string, number> }}
 */
export function augmentOrdersWithPresentationHistory(userId, realOrders = [], catalog = [], memberSince = null, options = {}) {
  const { minimumSyntheticOrders = null } = options
  const joinMs = parseMemberSince(memberSince)
  const realRaw = realOrders ?? []
  const padToTarget = Math.max(0, PRESENTATION_TARGET_ORDER_COUNT - realRaw.length)
  const needed =
    minimumSyntheticOrders != null
      ? Math.max(padToTarget, minimumSyntheticOrders)
      : padToTarget
  /*
   * Only clamp real order dates when we are padding with synthetic demo orders.
   * Otherwise (normal app: real DB orders only), keep created_at as stored — e.g. SQL-seeded
   * history spread over months must not be collapsed to “just after signup”.
   */
  const real = needed > 0 ? clampRealOrderDatesForDisplay(realRaw, joinMs) : realRaw
  if (needed === 0) {
    return {
      displayOrders: [...real].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      syntheticItemsByOrderId: {},
      carbonByOrderIdSynthetic: {},
    }
  }

  const base = hashString(userId)
  const now = new Date()
  const nowMs = now.getTime()
  const syntheticOrders = []
  const syntheticItemsByOrderId = {}
  const carbonByOrderIdSynthetic = {}

  for (let idx = 0; idx < needed; idx += 1) {
    let date
    if (joinMs != null && joinMs <= nowMs) {
      const minAfterJoin = joinMs + 60 * 60 * 1000
      const maxBeforeNow = nowMs - 60 * 1000
      let lo = minAfterJoin
      let hi = maxBeforeNow
      if (hi <= lo) {
        hi = nowMs - 1000
        lo = Math.max(joinMs + 30000, hi - Math.max(needed * 120000, 3600000))
      }
      const span = hi - lo
      const u = needed === 1 ? 0.5 : (needed - 1 - idx) / (needed - 1)
      const jitterMin = ((base + idx * 11) % 47) - 23
      date = new Date(lo + u * span + jitterMin * 60 * 1000)
      if (date.getTime() < minAfterJoin) date = new Date(minAfterJoin + idx * 45000)
      if (date.getTime() > maxBeforeNow) date = new Date(maxBeforeNow - idx * 45000)
    } else {
      const monthOffset = needed - idx
      date = new Date(now.getFullYear(), now.getMonth() - monthOffset, 4 + ((base + idx * 7) % 20))
    }
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
      shipping_amount: 0,
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