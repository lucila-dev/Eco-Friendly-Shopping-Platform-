import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../hooks/useCart'
import {
  DELIVERY_OPTIONS,
  FREE_SHIPPING_MIN_SUBTOTAL,
  getDeliveryFee,
  getDeliveryFeeForMethod,
  STANDARD_DELIVERY_FEE,
} from '../lib/shipping'
import {
  appendPromoReceiptToShippingAddress,
  evaluatePromoCode,
  getPromoReceiptBreakdown,
  GIFT_WRAP_FEE,
  normalizePromoCode,
  promoOfferSummary,
  totalDiscountForCodes,
} from '../lib/checkoutPromo'
import { useFormatPrice } from '../hooks/useFormatPrice'
import { gbpToLoyaltyPoints, loyaltyCreditsToMoney } from '../lib/loyaltyValue'
import { usdToGbpApprox } from '../lib/shopMoney'
import {
  PaymentApplePayMark,
  PaymentCardBrandsMark,
  PaymentLoyaltyIcon,
  PaymentPayPalMark,
} from '../components/Icons'
import { layoutContentWidthClass } from '../lib/layoutContent'
import { showToast } from '../lib/toast'

const inputClass =
  'w-full px-3 py-2.5 text-base border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500'

function formatCreditsBalance(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

const PAYMENT_OPTIONS = [
  { id: 'loyalty', title: 'Loyalty credits', description: 'Pay with your EcoShop balance', Mark: PaymentLoyaltyIcon },
  { id: 'card', title: 'Credit or debit card', description: 'Visa, Mastercard, American Express', Mark: PaymentCardBrandsMark },
  { id: 'apple_pay', title: 'Apple Pay', description: 'Fast checkout on supported devices', Mark: PaymentApplePayMark },
  { id: 'paypal', title: 'PayPal', description: 'Pay with your PayPal account', Mark: PaymentPayPalMark },
]

export default function Checkout() {
  const { format } = useFormatPrice()
  const { user } = useAuth()
  const { items, total, refetch } = useCart()
  const navigate = useNavigate()
  const [paymentMethod, setPaymentMethod] = useState('loyalty')
  const [loyaltyCredits, setLoyaltyCredits] = useState(0)
  const [loadingCredits, setLoadingCredits] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [appliedPromoCodes, setAppliedPromoCodes] = useState([])
  const [promoMessage, setPromoMessage] = useState(null)
  const [deliveryMethod, setDeliveryMethod] = useState('standard')
  const [giftWrap, setGiftWrap] = useState(false)
  const [isGift, setIsGift] = useState(false)
  const [giftMessage, setGiftMessage] = useState('')
  /** When the textarea has text, user must tap Save so the note is clearly “accepted” before placing the order. */
  const [giftMessageAcknowledged, setGiftMessageAcknowledged] = useState(false)
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
    document.title = 'Checkout | EcoShop'
    return () => {
      document.title = 'EcoShop | Sustainable Shopping'
    }
  }, [])

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

  useEffect(() => {
    if (!isGift) setGiftMessageAcknowledged(false)
  }, [isGift])

  const discountAmount = useMemo(
    () => totalDiscountForCodes(appliedPromoCodes, total),
    [appliedPromoCodes, total],
  )

  const discountedSubtotal = Math.max(0, total - discountAmount)
  const deliveryFee = getDeliveryFeeForMethod(discountedSubtotal, deliveryMethod)
  const giftWrapFee = giftWrap ? GIFT_WRAP_FEE : 0
  const finalTotal = discountedSubtotal + deliveryFee + giftWrapFee

  const loyaltyWorthGbp = useMemo(
    () => usdToGbpApprox(loyaltyCreditsToMoney(loyaltyCredits)),
    [loyaltyCredits],
  )

  const loyaltyPointsForOrder = useMemo(() => gbpToLoyaltyPoints(finalTotal), [finalTotal])

  const applyPromo = () => {
    setPromoMessage(null)
    const normalized = normalizePromoCode(promoInput)
    if (!normalized) {
      setPromoMessage({ type: 'error', text: 'Enter a code' })
      return
    }
    if (appliedPromoCodes.includes(normalized)) {
      setPromoMessage({ type: 'error', text: 'That code is already applied.' })
      return
    }
    const r = evaluatePromoCode(normalized, total)
    if (!r.ok) {
      setPromoMessage({ type: 'error', text: r.error })
      return
    }
    setAppliedPromoCodes((prev) => [...prev, normalized])
    setPromoInput('')
    setPromoMessage({ type: 'ok', text: `${r.label} added.` })
  }

  const removePromoCode = (code) => {
    setAppliedPromoCodes((prev) => prev.filter((c) => c !== code))
    setPromoMessage(null)
  }

  const buildTotalsFromRows = (rows) => {
    const subtotal = rows.reduce((sum, r) => sum + r.quantity * (r.products?.price ?? 0), 0)
    const disc = totalDiscountForCodes(appliedPromoCodes, subtotal)
    const afterDisc = Math.max(0, subtotal - disc)
    const del = getDeliveryFeeForMethod(afterDisc, deliveryMethod)
    const wrap = giftWrap ? GIFT_WRAP_FEE : 0
    return { subtotal, discountAmount: disc, deliveryFee: del, giftWrapFee: wrap, totalAmount: afterDisc + del + wrap }
  }

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
    if (isGift && giftMessage.trim() && !giftMessageAcknowledged) {
      setError('Tap “Save message” to include your gift note with this order.')
      return
    }
    if (paymentMethod === 'card') {
      const digits = form.card_number.replace(/\D/g, '')
      if (digits.length < 12) {
        setError('Enter a valid card number.')
        return
      }
      if (!form.card_expiry?.trim() || !form.card_cvc?.trim()) {
        setError('Enter card expiry and CVC.')
        return
      }
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
    const { totalAmount, deliveryFee: delFee, discountAmount: discAmt } = buildTotalsFromRows(rows)

    const subtotalForPromo = rows.reduce((s, r) => s + r.quantity * (r.products?.price ?? 0), 0)
    for (const code of appliedPromoCodes) {
      if (!evaluatePromoCode(code, subtotalForPromo).ok) {
        setError('A promo code is not valid for your current cart.')
        setSubmitting(false)
        return
      }
    }

    const loyaltyPointsCost = paymentMethod === 'loyalty' ? gbpToLoyaltyPoints(totalAmount) : 0
    if (paymentMethod === 'loyalty' && loyaltyCredits < loyaltyPointsCost) {
      setError('Not enough loyalty credits for this checkout.')
      setSubmitting(false)
      return
    }

    const deliveryTitle = DELIVERY_OPTIONS.find((o) => o.id === deliveryMethod)?.title ?? deliveryMethod
    const giftNote = [
      `Delivery: ${deliveryTitle}`,
      isGift && 'Gift order',
      giftWrap && 'Gift wrap',
      giftMessage.trim() && `Message: ${giftMessage.trim()}`,
    ]
      .filter(Boolean)
      .join(' · ')
    const addressLines = [
      form.shipping_address_line_1,
      form.shipping_address_line_2,
      `${form.shipping_city} ${form.shipping_postcode}`.trim(),
    ].filter(Boolean)
    if (giftNote) {
      addressLines.push(`Notes: ${giftNote}`)
    }

    let shippingAddressText = addressLines.join(', ')
    if (appliedPromoCodes.length > 0 && discAmt > 0) {
      const breakdown = getPromoReceiptBreakdown(appliedPromoCodes, subtotalForPromo)
      shippingAddressText = appendPromoReceiptToShippingAddress(shippingAddressText, breakdown, discAmt)
    }

    const orderPayload = {
      user_id: user.id,
      status: 'completed',
      total_amount: totalAmount,
      shipping_name: form.shipping_name,
      shipping_address: shippingAddressText,
      shipping_email: form.shipping_email,
    }

    let orderRes = await supabase
      .from('orders')
      .insert({ ...orderPayload, shipping_amount: delFee })
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
      const newBalance = Math.max(0, Number(loyaltyCredits) - loyaltyPointsCost)
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
      <div className={`${layoutContentWidthClass} text-center py-8`}>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 dark:text-stone-100 mb-3">Checkout</h1>
        <p className="text-stone-600 dark:text-stone-400">Your cart is empty. Add items before checkout.</p>
      </div>
    )
  }

  return (
    <div className={`${layoutContentWidthClass} pb-10`}>
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-stone-800 dark:text-stone-100 mb-2">Checkout</h1>
      <p className="text-stone-600 dark:text-stone-400 text-base sm:text-lg mb-6 max-w-2xl leading-relaxed">
        Choose delivery speed, apply any discount codes, then pick a payment method.
      </p>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start"
      >
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white/95 dark:bg-stone-900/95 p-4 sm:p-6 shadow-sm lg:hidden">
          <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">Order summary</h2>
          <OrderSummaryLines
            items={items}
            format={format}
            total={total}
            discountAmount={discountAmount}
            deliveryFee={deliveryFee}
            deliveryMethod={deliveryMethod}
            giftWrapFee={giftWrapFee}
            finalTotal={finalTotal}
            promoInput={promoInput}
            setPromoInput={setPromoInput}
            appliedPromoCodes={appliedPromoCodes}
            applyPromo={applyPromo}
            removePromoCode={removePromoCode}
            promoMessage={promoMessage}
          />
        </div>

        <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-1">
          <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white/95 dark:bg-stone-900/95 p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">Shipping address</h2>
            <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
              <div className="sm:col-span-2">
                <label htmlFor="shipping_name" className="block text-base font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Full name
                </label>
                <input
                  id="shipping_name"
                  type="text"
                  value={form.shipping_name}
                  onChange={(e) => setForm((f) => ({ ...f, shipping_name: e.target.value }))}
                  required
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="shipping_email" className="block text-base font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Email
                </label>
                <input
                  id="shipping_email"
                  type="email"
                  value={form.shipping_email}
                  onChange={(e) => setForm((f) => ({ ...f, shipping_email: e.target.value }))}
                  required
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="shipping_address_line_1" className="block text-base font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Address line 1
                </label>
                <input
                  id="shipping_address_line_1"
                  type="text"
                  value={form.shipping_address_line_1}
                  onChange={(e) => setForm((f) => ({ ...f, shipping_address_line_1: e.target.value }))}
                  required
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="shipping_address_line_2" className="block text-base font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Address line 2 (optional)
                </label>
                <input
                  id="shipping_address_line_2"
                  type="text"
                  value={form.shipping_address_line_2}
                  onChange={(e) => setForm((f) => ({ ...f, shipping_address_line_2: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="shipping_city" className="block text-base font-medium text-stone-700 dark:text-stone-300 mb-1">
                  City
                </label>
                <input
                  id="shipping_city"
                  type="text"
                  value={form.shipping_city}
                  onChange={(e) => setForm((f) => ({ ...f, shipping_city: e.target.value }))}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="shipping_postcode" className="block text-base font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Postcode
                </label>
                <input
                  id="shipping_postcode"
                  type="text"
                  value={form.shipping_postcode}
                  onChange={(e) => setForm((f) => ({ ...f, shipping_postcode: e.target.value }))}
                  required
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white/95 dark:bg-stone-900/95 p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-1">Delivery option</h2>
            <p className="text-base text-stone-500 dark:text-stone-400 mb-4">
              Faster options include a courier surcharge. Free standard shipping still applies on orders{' '}
              {format(FREE_SHIPPING_MIN_SUBTOTAL)}+.
            </p>
            <fieldset>
              <legend className="sr-only">Delivery speed</legend>
              <div className="grid sm:grid-cols-3 gap-3">
                {DELIVERY_OPTIONS.map((opt) => {
                  const optionFee = getDeliveryFeeForMethod(discountedSubtotal, opt.id)
                  const isSelected = deliveryMethod === opt.id
                  return (
                    <label
                      key={opt.id}
                      className={`relative flex cursor-pointer flex-col rounded-xl border-2 p-3 sm:p-4 transition-colors ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 dark:border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-stone-200 dark:border-stone-600 bg-stone-50/50 dark:bg-stone-800/40 hover:border-emerald-300 dark:hover:border-emerald-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery_method"
                        value={opt.id}
                        checked={isSelected}
                        onChange={() => setDeliveryMethod(opt.id)}
                        className="sr-only"
                      />
                      <span className="text-base font-semibold text-stone-800 dark:text-stone-100">{opt.title}</span>
                      <span className="mt-0.5 text-base text-stone-500 dark:text-stone-400 leading-snug">{opt.description}</span>
                      <span className="mt-2 text-base font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
                        {opt.id === 'standard' && optionFee === 0 ? (
                          <>Free · orders {format(FREE_SHIPPING_MIN_SUBTOTAL)}+</>
                        ) : (
                          format(optionFee)
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </section>

          <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white/95 dark:bg-stone-900/95 p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-1">Gift options</h2>
            <p className="text-base text-stone-500 dark:text-stone-400 mb-4">Optional. We use plastic free, recycled wrap.</p>
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGift}
                  onChange={(e) => setIsGift(e.target.checked)}
                  className="mt-1 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-base text-stone-700 dark:text-stone-300">
                  <span className="font-medium text-stone-800 dark:text-stone-100">This is a gift</span>
                  <span className="block text-stone-500 dark:text-stone-400 mt-0.5">Hide prices on the packing slip.</span>
                </span>
              </label>
              {isGift && (
                <div>
                  <label htmlFor="gift_message" className="block text-base font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Gift message (optional)
                  </label>
                  <textarea
                    id="gift_message"
                    rows={3}
                    value={giftMessage}
                    onChange={(e) => {
                      setGiftMessage(e.target.value)
                      setGiftMessageAcknowledged(false)
                    }}
                    placeholder="Add a short message for the recipient"
                    className={`${inputClass} resize-y min-h-[5rem]`}
                    maxLength={500}
                  />
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <p className="text-base text-stone-500">{giftMessage.length}/500</p>
                    {giftMessage.trim().length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setGiftMessageAcknowledged(true)
                            showToast('Gift message saved — it will be included when you place your order.')
                          }}
                          disabled={giftMessageAcknowledged}
                          className="rounded-lg border-2 border-emerald-600 bg-emerald-600 px-4 py-2 text-base font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-stone-300 disabled:bg-stone-200 disabled:text-stone-500 dark:disabled:border-stone-600 dark:disabled:bg-stone-800 dark:disabled:text-stone-400"
                        >
                          Save message
                        </button>
                        {giftMessageAcknowledged && (
                          <span className="text-base font-medium text-emerald-700 dark:text-emerald-400">
                            Saved for this order
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-base text-stone-500 dark:text-stone-400">
                        Leave blank for no printed message. If you type a note, use Save message before placing your order.
                      </p>
                    )}
                  </div>
                </div>
              )}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={giftWrap}
                  onChange={(e) => setGiftWrap(e.target.checked)}
                  className="mt-1 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-base text-stone-700 dark:text-stone-300">
                  <span className="font-medium text-stone-800 dark:text-stone-100">Add sustainable gift wrap</span>
                  <span className="block text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                    {format(GIFT_WRAP_FEE)}: recycled paper, twine, and a gift tag.
                  </span>
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-6 lg:col-start-2 lg:row-start-1 lg:self-start lg:sticky lg:top-24">
          <div className="hidden lg:block rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white/95 dark:bg-stone-900/95 p-4 sm:p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">Order summary</h2>
            <OrderSummaryLines
              items={items}
              format={format}
              total={total}
              discountAmount={discountAmount}
              deliveryFee={deliveryFee}
              deliveryMethod={deliveryMethod}
              giftWrapFee={giftWrapFee}
              finalTotal={finalTotal}
              promoInput={promoInput}
              setPromoInput={setPromoInput}
              appliedPromoCodes={appliedPromoCodes}
              applyPromo={applyPromo}
              removePromoCode={removePromoCode}
              promoMessage={promoMessage}
            />
          </div>

          <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white/95 dark:bg-stone-900/95 p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">Payment</h2>
            <fieldset className="space-y-3">
              <legend className="sr-only">Payment method</legend>
              <div className="grid sm:grid-cols-2 gap-3 lg:grid-cols-1 xl:grid-cols-2">
                {PAYMENT_OPTIONS.map((opt) => {
                  const Mark = opt.Mark
                  return (
                    <label
                      key={opt.id}
                      className={`relative flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 sm:p-4 transition-colors ${
                        paymentMethod === opt.id
                          ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 dark:border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-stone-200 dark:border-stone-600 bg-stone-50/50 dark:bg-stone-800/40 hover:border-emerald-300 dark:hover:border-emerald-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value={opt.id}
                        checked={paymentMethod === opt.id}
                        onChange={() => setPaymentMethod(opt.id)}
                        className="sr-only"
                      />
                      <span
                        className={`shrink-0 flex items-center justify-center rounded-lg border bg-white dark:bg-stone-900 p-1.5 shadow-sm ${
                          opt.id === 'loyalty'
                            ? 'border-emerald-200 dark:border-emerald-800'
                            : 'border-stone-200 dark:border-stone-600'
                        }`}
                        aria-hidden
                      >
                        {opt.id === 'loyalty' ? (
                          <Mark className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Mark />
                        )}
                      </span>
                      <span className="block min-w-0 flex-1 pt-0.5">
                        <span className="block text-base font-semibold text-stone-800 dark:text-stone-100">{opt.title}</span>
                        <span className="block text-base text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">{opt.description}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {paymentMethod === 'loyalty' && (
              <p className="mt-4 text-base text-stone-600 dark:text-stone-400 tabular-nums">
                Available credits:{' '}
                {loadingCredits ? (
                  'Loading...'
                ) : (
                  <>
                    {formatCreditsBalance(loyaltyCredits)}{' '}
                    <span className="text-stone-500 dark:text-stone-400">
                      (≈ {format(loyaltyWorthGbp)})
                    </span>
                  </>
                )}{' '}
                · This order:{' '}
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {loyaltyPointsForOrder.toLocaleString()} pts
                </span>{' '}
                <span className="text-stone-500 dark:text-stone-400">(≈ {format(finalTotal)})</span>
              </p>
            )}

            {paymentMethod === 'card' && (
              <div className="mt-4 space-y-3 pt-2 border-t border-stone-200 dark:border-stone-700">
                <div>
                  <label htmlFor="card_number" className="block text-base font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Card number
                  </label>
                  <input
                    id="card_number"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={form.card_number}
                    onChange={(e) => setForm((f) => ({ ...f, card_number: e.target.value.replace(/\D/g, '').slice(0, 19) }))}
                    placeholder="1234 5678 9012 3456"
                    required
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="card_expiry" className="block text-base font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Expiry (MM/YY)
                    </label>
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
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="card_cvc" className="block text-base font-medium text-stone-700 dark:text-stone-300 mb-1">
                      CVC
                    </label>
                    <input
                      id="card_cvc"
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={form.card_cvc}
                      onChange={(e) => setForm((f) => ({ ...f, card_cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      placeholder="123"
                      required
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          <label className="flex items-start gap-3 text-base text-stone-700 dark:text-stone-300 cursor-pointer rounded-xl border border-transparent px-1 py-0.5">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>I agree to the delivery, returns, and privacy policies.</span>
          </label>

          {error && <p className="text-red-600 dark:text-red-400 text-base">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 text-base bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-md"
          >
            {submitting ? 'Placing order...' : `Place order · ${format(finalTotal)}`}
          </button>
        </aside>
      </form>
    </div>
  )
}

function OrderSummaryLines({
  items,
  format,
  total,
  discountAmount,
  deliveryFee,
  deliveryMethod,
  giftWrapFee,
  finalTotal,
  promoInput,
  setPromoInput,
  appliedPromoCodes,
  applyPromo,
  removePromoCode,
  promoMessage,
}) {
  const merchandiseAfterDiscount = Math.max(0, total - discountAmount)
  const standardWouldBeFree = getDeliveryFee(merchandiseAfterDiscount) === 0
  const deliveryOptionTitle = DELIVERY_OPTIONS.find((o) => o.id === deliveryMethod)?.title ?? 'Delivery'
  return (
    <>
      <ul className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
        {items.map((row) => {
          const line = (row.quantity || 0) * (row.products?.price ?? 0)
          return (
            <li key={row.id} className="flex justify-between gap-3 text-base text-stone-700 dark:text-stone-300">
              <span className="min-w-0 truncate">
                {row.products?.name ?? 'Item'} <span className="text-stone-500">×{row.quantity}</span>
              </span>
              <span className="shrink-0 tabular-nums">{format(line)}</span>
            </li>
          )
        })}
      </ul>

      <div className="border-t border-emerald-100 dark:border-emerald-900/80 pt-4 space-y-3">
        <p className="text-base font-medium text-stone-600 dark:text-stone-400 uppercase tracking-wide">Discount codes</p>
        {appliedPromoCodes.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {appliedPromoCodes.map((code) => (
              <li key={code}>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-700 bg-emerald-50/90 dark:bg-emerald-950/50 pl-2.5 pr-1 py-0.5 text-base font-mono font-medium text-emerald-900 dark:text-emerald-100">
                  {code}
                  <button
                    type="button"
                    onClick={() => removePromoCode(code)}
                    className="rounded-full p-0.5 hover:bg-emerald-200/80 dark:hover:bg-emerald-800/80 text-emerald-800 dark:text-emerald-200"
                    aria-label={`Remove ${code}`}
                  >
                    <span aria-hidden className="text-base leading-none px-0.5">
                      ×
                    </span>
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            placeholder="Enter code"
            className="flex-1 min-w-0 px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-base text-stone-900 dark:text-stone-100"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyPromo()
              }
            }}
          />
          <button
            type="button"
            onClick={applyPromo}
            className="shrink-0 px-4 py-2 text-base font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Apply
          </button>
        </div>
        {promoMessage && (
          <p className={`text-base ${promoMessage.type === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {promoMessage.text}
          </p>
        )}
      </div>

      <div className="border-t border-emerald-100 dark:border-emerald-900/80 pt-4 mt-4 space-y-2 text-base">
        <div className="flex justify-between text-stone-700 dark:text-stone-300">
          <span>Subtotal</span>
          <span className="tabular-nums">{format(total)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between gap-2 text-emerald-700 dark:text-emerald-400">
            <span className="min-w-0">
              <span className="font-medium text-stone-800 dark:text-stone-200">Discount</span>
              {appliedPromoCodes.length > 0 && (
                <span className="text-emerald-700 dark:text-emerald-400">
                  {' '}
                  (
                  {appliedPromoCodes.map((c, i) => (
                    <span key={c}>
                      {i > 0 ? ' + ' : ''}
                      {promoOfferSummary(c)}
                    </span>
                  ))}
                  )
                </span>
              )}
            </span>
            <span className="shrink-0 tabular-nums font-semibold">−{format(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between gap-2 text-stone-700 dark:text-stone-300">
          <span className="min-w-0">
            <span className="font-medium">Delivery</span>
            <span className="text-stone-500 dark:text-stone-400 text-base font-normal block sm:inline sm:ml-1">
              ({deliveryOptionTitle})
            </span>
          </span>
          <span className="shrink-0 tabular-nums text-right">
            {deliveryFee === 0 && deliveryMethod === 'standard' && standardWouldBeFree ? (
              <>
                <span className="line-through text-stone-400 mr-1">{format(STANDARD_DELIVERY_FEE)}</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Free</span>
                <span className="block text-[0.65rem] text-stone-500 font-normal">Orders {format(FREE_SHIPPING_MIN_SUBTOTAL)}+</span>
              </>
            ) : deliveryFee === 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Free</span>
            ) : (
              format(deliveryFee)
            )}
          </span>
        </div>
        {giftWrapFee > 0 && (
          <div className="flex justify-between text-stone-700 dark:text-stone-300">
            <span>Gift wrap</span>
            <span className="tabular-nums">{format(giftWrapFee)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-stone-900 dark:text-stone-50 pt-2 border-t border-emerald-100 dark:border-emerald-900/80">
          <span>Total</span>
          <span className="tabular-nums">{format(finalTotal)}</span>
        </div>
      </div>
    </>
  )
}
