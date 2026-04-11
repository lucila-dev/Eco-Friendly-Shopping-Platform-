import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../hooks/useCart'
import { FREE_SHIPPING_MIN_SUBTOTAL, getDeliveryFee, STANDARD_DELIVERY_FEE } from '../lib/shipping'

export default function Checkout() {
  const { user } = useAuth()
  const { items, total, refetch } = useCart()
  const navigate = useNavigate()
  const [paymentMethod, setPaymentMethod] = useState('loyalty')
  const [loyaltyCredits, setLoyaltyCredits] = useState(0)
  const [loadingCredits, setLoadingCredits] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [form, setForm] = useState({
    shipping_name: '',
    shipping_email: user?.email ?? '',
    shipping_address_line_1: '',
    shipping_address_line_2: '',
    shipping_city: '',
    shipping_postcode: '',
    card_number: '',
    card_expiry: '',
    card_cvc: '',
  })

  useEffect(() => {
    async function fetchCredits() {
      if (!user) return
      const { data, error } = await supabase
        .from('profiles')
        .select('loyalty_credits')
        .eq('id', user.id)
        .maybeSingle()
      if (error && error.message?.includes('loyalty_credits')) {
        setLoyaltyCredits(1000)
      } else {
        setLoyaltyCredits(Number(data?.loyalty_credits ?? 1000))
      }
      setLoadingCredits(false)
    }
    fetchCredits()
  }, [user?.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (items.length === 0) {
      setError('Your cart is empty.')
      return
    }
    if (!acceptTerms) {
      setError('Please accept the terms to continue.')
      return
    }
    setSubmitting(true)

    const cartWithProducts = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        size,
        quantity,
        products ( price, carbon_footprint_saving_kg )
      `)
      .eq('user_id', user.id)

    if (cartWithProducts.error) {
      setError(cartWithProducts.error.message)
      setSubmitting(false)
      return
    }

    const rows = cartWithProducts.data ?? []
    const subtotal = rows.reduce((sum, r) => sum + r.quantity * (r.products?.price ?? 0), 0)
    const deliveryFee = getDeliveryFee(subtotal)
    const totalAmount = subtotal + deliveryFee

    if (paymentMethod === 'loyalty' && loyaltyCredits < totalAmount) {
      setError('Not enough loyalty credits for this checkout.')
      setSubmitting(false)
      return
    }

    const orderPayload = {
      user_id: user.id,
      status: 'completed',
      total_amount: totalAmount,
      shipping_name: form.shipping_name,
      shipping_address: [
        form.shipping_address_line_1,
        form.shipping_address_line_2,
        `${form.shipping_city} ${form.shipping_postcode}`.trim(),
      ].filter(Boolean).join(', '),
      shipping_email: form.shipping_email,
    }

    let orderRes = await supabase
      .from('orders')
      .insert({ ...orderPayload, shipping_amount: deliveryFee })
      .select('id')
      .single()

    if (orderRes.error && /shipping_amount|column|schema cache/i.test(orderRes.error.message ?? '')) {
      orderRes = await supabase.from('orders').insert(orderPayload).select('id').single()
    }

    const { data: order, error: orderError } = orderRes

    if (orderError) {
      setError(orderError.message)
      setSubmitting(false)
      return
    }

    const orderItems = rows.map((r) => ({
      order_id: order.id,
      product_id: r.product_id,
      selected_size: r.size || null,
      quantity: r.quantity,
      price_at_order: Number(r.products?.price ?? 0),
      carbon_saving_kg: Number(r.products?.carbon_footprint_saving_kg ?? 0) * r.quantity,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id)
      setError(itemsError.message)
      setSubmitting(false)
      return
    }

    if (paymentMethod === 'loyalty') {
      const newBalance = Math.max(0, Number(loyaltyCredits) - Number(totalAmount))
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ loyalty_credits: newBalance })
        .eq('id', user.id)
      if (!creditError) {
        setLoyaltyCredits(newBalance)
      }
    }

    await supabase.from('cart_items').delete().eq('user_id', user.id)
    window.dispatchEvent(new Event('ecoshop-cart-updated'))
    await refetch()
    setSubmitting(false)
    navigate(`/order-confirmation/${order.id}`, { replace: true })
  }

  if (items.length === 0 && !submitting) {
    return (
      <div>
        <h1 className="text-xl font-bold text-stone-800 mb-3">Checkout</h1>
        <p className="text-stone-600">Your cart is empty. Add items before checkout.</p>
      </div>
    )
  }

  const deliveryFee = getDeliveryFee(total)
  const finalTotal = total + deliveryFee

  return (
    <div className="max-w-lg rounded-2xl border border-emerald-200 bg-white/90 p-4 sm:p-5 shadow-sm">
      <h1 className="text-xl font-bold text-stone-800 mb-4">Checkout</h1>
      <p className="text-stone-600 text-sm mb-4">
        Checkout – loyalty credits use your account balance. Card fields below are for display only; no card is charged.
      </p>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 mb-5 text-sm">
        <p className="text-stone-700">Subtotal: £{total.toFixed(2)}</p>
        <p className="text-stone-700">
          Delivery:{' '}
          {deliveryFee === 0 ? (
            <>
              <span className="line-through text-stone-500 tabular-nums">£{STANDARD_DELIVERY_FEE.toFixed(2)}</span>{' '}
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Free</span>
              <span className="text-stone-600"> (orders £{FREE_SHIPPING_MIN_SUBTOTAL}+)</span>
            </>
          ) : (
            `£${deliveryFee.toFixed(2)}`
          )}
        </p>
        <p className="text-stone-800 font-semibold mt-1">Total to pay: £{finalTotal.toFixed(2)}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h2 className="font-semibold text-stone-800 mb-3">Payment details</h2>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 mb-3">
            <p className="text-sm text-stone-600 mb-2">Payment method</p>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="radio"
                  name="payment_method"
                  value="loyalty"
                  checked={paymentMethod === 'loyalty'}
                  onChange={() => setPaymentMethod('loyalty')}
                />
                Loyalty credits
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="radio"
                  name="payment_method"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                Card
              </label>
            </div>
            <p className="text-xs text-stone-500 mt-2">
              Available credits: {loadingCredits ? 'Loading...' : loyaltyCredits.toFixed(2)} | Charged at checkout: {finalTotal.toFixed(2)}
            </p>
          </div>
          {paymentMethod === 'card' && (
            <div className="space-y-3">
            <div>
              <label htmlFor="card_number" className="block text-sm font-medium text-stone-700 mb-1">Card number</label>
              <input
                id="card_number"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                value={form.card_number}
                onChange={(e) => setForm((f) => ({ ...f, card_number: e.target.value.replace(/\D/g, '').slice(0, 16) }))}
                placeholder="1234 5678 9012 3456"
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="card_expiry" className="block text-sm font-medium text-stone-700 mb-1">Expiry (MM/YY)</label>
                <input
                  id="card_expiry"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  value={form.card_expiry}
                  onChange={(e) => setForm((f) => ({ ...f, card_expiry: e.target.value }))}
                  placeholder="MM/YY"
                  maxLength={5}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="card_cvc" className="block text-sm font-medium text-stone-700 mb-1">CVC</label>
                <input
                  id="card_cvc"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  value={form.card_cvc}
                  onChange={(e) => setForm((f) => ({ ...f, card_cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="123"
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            </div>
          )}
        </div>
        <div>
          <h2 className="font-semibold text-stone-800 mb-3">Shipping address</h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="shipping_name" className="block text-sm font-medium text-stone-700 mb-1">Full name</label>
              <input
                id="shipping_name"
                type="text"
                value={form.shipping_name}
                onChange={(e) => setForm((f) => ({ ...f, shipping_name: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="shipping_email" className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                id="shipping_email"
                type="email"
                value={form.shipping_email}
                onChange={(e) => setForm((f) => ({ ...f, shipping_email: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="shipping_address_line_1" className="block text-sm font-medium text-stone-700 mb-1">Address line 1</label>
              <input
                id="shipping_address_line_1"
                type="text"
                value={form.shipping_address_line_1}
                onChange={(e) => setForm((f) => ({ ...f, shipping_address_line_1: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="shipping_address_line_2" className="block text-sm font-medium text-stone-700 mb-1">Address line 2 (optional)</label>
              <input
                id="shipping_address_line_2"
                type="text"
                value={form.shipping_address_line_2}
                onChange={(e) => setForm((f) => ({ ...f, shipping_address_line_2: e.target.value }))}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="shipping_city" className="block text-sm font-medium text-stone-700 mb-1">City</label>
                <input
                  id="shipping_city"
                  type="text"
                  value={form.shipping_city}
                  onChange={(e) => setForm((f) => ({ ...f, shipping_city: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="shipping_postcode" className="block text-sm font-medium text-stone-700 mb-1">Postcode</label>
                <input
                  id="shipping_postcode"
                  type="text"
                  value={form.shipping_postcode}
                  onChange={(e) => setForm((f) => ({ ...f, shipping_postcode: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm text-stone-700">
          <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5" />
          <span>I agree to the delivery, returns, and privacy policies.</span>
        </label>
        <p className="text-stone-700 font-medium">Total: £{finalTotal.toFixed(2)}</p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 text-sm bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? 'Placing order...' : 'Place order'}
        </button>
      </form>
    </div>
  )
}
