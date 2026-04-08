import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { augmentOrdersWithPresentationHistory } from '../lib/presentationOrders'

function getShipmentStatus(createdAt) {
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  const hours = Math.max(0, (now - created) / (1000 * 60 * 60))
  if (hours < 6) return { label: 'Preparing', detail: 'Order confirmed and being packed.' }
  if (hours < 24) return { label: 'Dispatched', detail: 'Parcel has left our warehouse.' }
  if (hours < 48) return { label: 'Out for delivery', detail: 'Courier is delivering your order today.' }
  return { label: 'Delivered', detail: `Delivered on ${new Date(created + (48 * 60 * 60 * 1000)).toLocaleDateString()}` }
}

export default function Orders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [orderItems, setOrderItems] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Track orders – EcoShop'
    return () => { document.title = 'EcoShop – Sustainable Shopping' }
  }, [])

  useEffect(() => {
    async function fetchOrders() {
      if (!user) return
      const { data } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      const realOrders = data ?? []
      const { data: catalogRows } = await supabase
        .from('products')
        .select('name, slug, image_url, price')
        .limit(48)
      const { displayOrders, syntheticItemsByOrderId } = augmentOrdersWithPresentationHistory(
        user.id,
        realOrders,
        catalogRows ?? [],
      )
      setOrders(displayOrders)

      let grouped = {}
      if (realOrders.length > 0) {
        const ids = realOrders.map((o) => o.id)
        const { data: items } = await supabase
          .from('order_items')
          .select('order_id, quantity, price_at_order, products(name, slug, image_url)')
          .in('order_id', ids)
        grouped = (items ?? []).reduce((acc, row) => {
          if (!acc[row.order_id]) acc[row.order_id] = []
          acc[row.order_id].push(row)
          return acc
        }, {})
      }
      setOrderItems({ ...grouped, ...syntheticItemsByOrderId })
      setLoading(false)
    }
    fetchOrders()
  }, [user?.id])

  if (loading) return <p className="text-stone-500">Loading orders...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Track your orders</h1>
      {orders.length === 0 ? (
        <p className="text-stone-500">No orders yet. <Link className="text-emerald-600 hover:underline" to="/products">Start shopping</Link>.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-mono text-sm text-stone-600">{order.id.slice(0, 8)}...</p>
                  <p className="text-sm text-stone-500">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-emerald-700">${Number(order.total_amount).toFixed(2)}</p>
                  <p className="text-xs uppercase tracking-wide text-stone-500">{order.status}</p>
                </div>
              </div>

              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 mb-3">
                <p className="text-sm font-semibold text-emerald-800">{getShipmentStatus(order.created_at).label}</p>
                <p className="text-xs text-emerald-700">{getShipmentStatus(order.created_at).detail}</p>
              </div>

              <div className="space-y-2">
                {(orderItems[order.id] ?? []).map((item, idx) => (
                  <div key={`${order.id}-${idx}`} className="flex items-center justify-between border border-stone-200 rounded-md px-2 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={item.products?.image_url || '/placeholder.svg'}
                        alt={item.products?.name || 'Product'}
                        className="w-9 h-9 rounded object-cover border border-stone-200"
                      />
                      <Link to={`/products/${item.products?.slug}`} className="text-sm text-stone-700 truncate hover:text-emerald-700 hover:underline">
                        {item.products?.name || 'Product'}
                      </Link>
                    </div>
                    <p className="text-xs text-stone-500">x{item.quantity} · ${Number(item.price_at_order).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
