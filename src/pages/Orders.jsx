import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getProductImage } from '../lib/productImageOverrides'
import { augmentOrdersWithPresentationHistory } from '../lib/presentationOrders'
import OrderTrackingTimeline from '../components/OrderTrackingTimeline'

const PRODUCT_ID_CHUNK = 120

/** PostgREST can return one-to-many embeds as a single object; always work with an array. */
function asLineItemList(raw) {
  if (raw == null) return []
  return Array.isArray(raw) ? raw : [raw]
}

function normalizeSampleLineItems(orderId, lines) {
  return (lines ?? []).map((line, idx) => ({
    id: `sample-${orderId}-${idx}`,
    order_id: orderId,
    product_id: null,
    quantity: line.quantity,
    price_at_order: line.price_at_order,
    selected_size: line.selected_size ?? null,
    products: line.products ?? null,
  }))
}

/**
 * Load line items without embedding `products` — nested selects can collapse rows.
 * Uses `*` so a missing migration column (e.g. selected_size) does not zero out the whole query.
 */
async function fetchLineItemsByOrder(orderIds) {
  if (orderIds.length === 0) return {}

  const perOrder = await Promise.all(
    orderIds.map(async (orderId) => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
      if (error) {
        console.error('[Orders] order_items for', orderId, error)
        return { orderId, rows: [] }
      }
      return { orderId, rows: data ?? [] }
    }),
  )

  const flat = perOrder.flatMap((p) => p.rows)
  const productIds = [...new Set(flat.map((r) => r.product_id).filter(Boolean))]
  const productMap = {}

  for (let i = 0; i < productIds.length; i += PRODUCT_ID_CHUNK) {
    const chunk = productIds.slice(i, i + PRODUCT_ID_CHUNK)
    const { data: prows, error: perr } = await supabase
      .from('products')
      .select('id, name, slug, image_url')
      .in('id', chunk)
    if (perr) {
      console.error('[Orders] products batch', perr)
      continue
    }
    for (const p of prows ?? []) {
      productMap[p.id] = p
    }
  }

  const byOrder = {}
  for (const { orderId, rows } of perOrder) {
    byOrder[orderId] = rows.map((row) => ({
      ...row,
      products: productMap[row.product_id] ?? null,
    }))
  }
  return byOrder
}

export default function Orders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Track orders – EcoShop'
    return () => { document.title = 'EcoShop – Sustainable Shopping' }
  }, [])

  useEffect(() => {
    const uid = user?.id
    const memberSince = user?.created_at

    if (!uid) {
      setOrders([])
      setLoading(false)
      return
    }

    setLoading(true)
    let cancelled = false

    async function fetchOrders() {
      const [ordersRes, catalogRes] = await Promise.all([
        supabase.from('orders').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('products').select('name, slug, image_url, price').limit(200),
      ])
      if (cancelled) return

      if (ordersRes.error) {
        console.error(ordersRes.error)
        setOrders([])
        setLoading(false)
        return
      }
      const realList = ordersRes.data ?? []
      const { displayOrders, syntheticItemsByOrderId } = augmentOrdersWithPresentationHistory(
        uid,
        realList,
        catalogRes.data ?? [],
        memberSince,
      )
      const realIds = realList.map((o) => o.id)
      const byOrder = await fetchLineItemsByOrder(realIds)
      if (cancelled) return

      const merged = displayOrders.map((o) => {
        const sampleLines = syntheticItemsByOrderId[o.id]
        if (sampleLines?.length) {
          return { ...o, order_items: normalizeSampleLineItems(o.id, sampleLines) }
        }
        return { ...o, order_items: byOrder[o.id] ?? [] }
      })

      setOrders(merged)
      setLoading(false)
    }

    fetchOrders()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.created_at])

  if (loading) return <p className="text-stone-500 dark:text-stone-400">Loading orders...</p>

  return (
    <div>
      <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-4">Track your orders</h1>
      {orders.length === 0 ? (
        <p className="text-stone-600 dark:text-stone-400">No orders yet. <Link className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline" to="/products">Start shopping</Link>.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const items = asLineItemList(order.order_items)
            const subtotal = items.reduce((s, i) => s + i.quantity * Number(i.price_at_order), 0)
            const total = Number(order.total_amount)
            const recordedShip = order.shipping_amount
            const hasRecordedShip = recordedShip != null && recordedShip !== '' && !Number.isNaN(Number(recordedShip))
            const shipping = hasRecordedShip
              ? Number(recordedShip)
              : items.length > 0 && total > subtotal + 0.01
                ? Math.max(0, Number((total - subtotal).toFixed(2)))
                : 0
            const expected = subtotal + shipping
            const mismatch = items.length > 0 && Math.abs(expected - total) > 0.05

            return (
            <li key={order.id} className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-mono text-sm text-stone-700 dark:text-stone-300">{order.id.slice(0, 8)}...</p>
                  <p className="text-sm text-stone-600 dark:text-stone-400">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">${total.toFixed(2)}</p>
                  <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">{order.status}</p>
                </div>
              </div>

              <div className="mb-3">
                <OrderTrackingTimeline order={order} />
              </div>

              <div className="space-y-2">
                {items.length === 0 && (
                  <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No products are listed for this order. That can happen if checkout was interrupted. New checkouts roll back the order if line items fail to save.
                  </p>
                )}
                {items.map((item) => {
                  const unit = Number(item.price_at_order)
                  const lineTotal = item.quantity * unit
                  return (
                  <div key={item.id} className="flex items-center justify-between border border-stone-200 dark:border-stone-700 rounded-md px-2 py-2 bg-stone-50/50 dark:bg-stone-950/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800">
                        <img
                          src={getProductImage({
                            name: item.products?.name,
                            slug: item.products?.slug,
                            image_url: item.products?.image_url,
                          })}
                          alt={item.products?.name || 'Product'}
                          className="h-full w-full object-cover object-center"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = '/placeholder.svg'
                          }}
                        />
                      </div>
                      <Link to={`/products/${item.products?.slug}`} className="text-sm text-stone-800 dark:text-stone-200 truncate hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline">
                        {item.products?.name || 'Product'}
                      </Link>
                      {item.selected_size && (
                        <span className="text-xs text-stone-600 dark:text-stone-400">Size {item.selected_size}</span>
                      )}
                    </div>
                    <div className="text-xs text-stone-600 dark:text-stone-400 shrink-0 text-right tabular-nums">
                      <span className="block text-stone-500 dark:text-stone-500">×{item.quantity} @ ${unit.toFixed(2)}</span>
                      <span className="font-medium text-stone-800 dark:text-stone-200">${lineTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  )
                })}
              </div>
              {items.length > 0 && (
                  <div className="border-t border-stone-200 dark:border-stone-700 pt-3 mt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-stone-700 dark:text-stone-300">
                      <span>Subtotal (items)</span>
                      <span className="tabular-nums">${subtotal.toFixed(2)}</span>
                    </div>
                    {shipping > 0 && (
                      <div className="flex justify-between text-stone-600">
                        <span>{hasRecordedShip ? 'Delivery' : 'Delivery & other (inferred)'}</span>
                        <span className="tabular-nums">${shipping.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-stone-900 dark:text-stone-100 pt-1 border-t border-stone-100 dark:border-stone-700">
                      <span>Order total</span>
                      <span className="tabular-nums">${total.toFixed(2)}</span>
                    </div>
                    {mismatch && (
                      <p className="text-xs text-amber-800 pt-1">
                        Line totals plus delivery do not match this order total (missing lines, older data, or price updates). The order total is what was stored at checkout.
                      </p>
                    )}
                  </div>
              )}
            </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
