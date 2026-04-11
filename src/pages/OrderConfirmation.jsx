import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function OrderConfirmation() {
  const { id } = useParams()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Order confirmation – EcoShop'
    return () => { document.title = 'EcoShop – Sustainable Shopping' }
  }, [])

  useEffect(() => {
    async function fetchOrder() {
      const { data } = await supabase
        .from('orders')
        .select('id, total_amount, created_at')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single()
      setOrder(data)
      setLoading(false)
    }
    if (user && id) fetchOrder()
    else setLoading(false)
  }, [id, user?.id])

  if (loading) return <p className="text-stone-500">Loading...</p>
  if (!order) return <p className="text-stone-600">Order not found.</p>

  return (
    <div className="max-w-lg mx-auto text-center">
      <h1 className="text-xl font-bold text-stone-800 mb-2">Thank you for your order</h1>
      <p className="text-stone-600 text-sm mb-3">
        Order <span className="font-mono text-stone-800">{order.id.slice(0, 8)}...</span> has been placed.
      </p>
      <p className="text-emerald-700 text-sm font-medium mb-5">Total: £{Number(order.total_amount).toFixed(2)}</p>
      <Link to="/orders" className="text-emerald-600 hover:underline">Track order</Link>
      <span className="mx-2 text-stone-400">|</span>
      <Link to="/products" className="text-emerald-600 hover:underline">Continue shopping</Link>
    </div>
  )
}
