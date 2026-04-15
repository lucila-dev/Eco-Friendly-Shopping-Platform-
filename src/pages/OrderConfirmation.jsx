import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useFormatPrice } from '../hooks/useFormatPrice'
import { parsePromoReceiptFromShippingAddress } from '../lib/checkoutPromo'

export default function OrderConfirmation() {
  const { format } = useFormatPrice()
  const { id } = useParams()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [lineItems, setLineItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Order confirmation · EcoShop'
    return () => {
      document.title = 'EcoShop · Sustainable Shopping'
    }
  }, [])

  useEffect(() => {
    async function fetchOrder() {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, shipping_address, shipping_amount')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single()
      if (error || !data) {
        setOrder(null)
        setLineItems([])
        setLoading(false)
        return
      }
      setOrder(data)

      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, price_at_order, products ( name )')
        .eq('order_id', id)
        .order('created_at', { ascending: true })

      setLineItems(items ?? [])
      setLoading(false)
    }
    if (user && id) fetchOrder()
    else setLoading(false)
  }, [id, user?.id])

  const promoReceipt = useMemo(
    () => (order?.shipping_address ? parsePromoReceiptFromShippingAddress(order.shipping_address) : null),
    [order?.shipping_address],
  )

  const merchandiseSubtotal = useMemo(
    () => lineItems.reduce((sum, row) => sum + Number(row.quantity || 0) * Number(row.price_at_order || 0), 0),
    [lineItems],
  )

  const shippingFee = order?.shipping_amount != null ? Number(order.shipping_amount) : null

  if (loading) return <p className="text-stone-500 dark:text-stone-400">Loading...</p>
  if (!order) return <p className="text-stone-600 dark:text-stone-400">Order not found.</p>

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2 text-center">Thank you for your order</h1>
      <p className="text-stone-600 dark:text-stone-400 text-base mb-6 text-center">
        Order <span className="font-mono text-stone-800 dark:text-stone-200">{order.id.slice(0, 8)}…</span> ·{' '}
        {order.created_at
          ? new Date(order.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
          : ''}
      </p>

      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900/95 p-4 sm:p-5 shadow-sm text-left text-base">
        <p className="text-base font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-3">Receipt</p>

        {lineItems.length > 0 ? (
          <ul className="space-y-2 border-b border-emerald-100 dark:border-emerald-900/80 pb-3 mb-3">
            {lineItems.map((row, idx) => {
              const line = Number(row.quantity || 0) * Number(row.price_at_order || 0)
              return (
                <li key={idx} className="flex justify-between gap-3 text-stone-800 dark:text-stone-200">
                  <span className="min-w-0">
                    {row.products?.name ?? 'Item'} <span className="text-stone-500">×{row.quantity}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{format(line)}</span>
                </li>
              )
            })}
          </ul>
        ) : null}

        <div className="space-y-2 text-stone-700 dark:text-stone-300">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{format(merchandiseSubtotal)}</span>
          </div>

          {promoReceipt?.lines?.length > 0 && (
            <div className="rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/80 px-3 py-2 space-y-2">
              <ul className="space-y-2">
                {promoReceipt.lines.map((line) => (
                  <li key={line.code} className="flex justify-between gap-3 text-base sm:text-lg">
                    <span className="min-w-0 text-emerald-900 dark:text-emerald-100">
                      <span className="font-medium text-stone-800 dark:text-stone-200">Discount</span>{' '}
                      <span className="text-emerald-800 dark:text-emerald-300">({line.offer})</span>
                      <span className="text-stone-500 dark:text-stone-400 font-mono text-base sm:text-lg ml-1">
                        {line.code}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold text-emerald-800 dark:text-emerald-300">
                      −{format(line.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              {promoReceipt.totalSaved != null && (
                <p className="text-base text-emerald-800/90 dark:text-emerald-400/90 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                  Total saved: {format(promoReceipt.totalSaved)}
                </p>
              )}
            </div>
          )}

          {shippingFee != null && (
            <div className="flex justify-between">
              <span>Delivery</span>
              <span className="tabular-nums">{shippingFee === 0 ? 'Free' : format(shippingFee)}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-bold text-stone-900 dark:text-stone-50 pt-2 border-t border-emerald-100 dark:border-emerald-900/80">
            <span>Total paid</span>
            <span className="tabular-nums">{format(Number(order.total_amount))}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-base">
        <Link to="/orders" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          Track order
        </Link>
        <span className="mx-2 text-stone-400">|</span>
        <Link to="/products" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
