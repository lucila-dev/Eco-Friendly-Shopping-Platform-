import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getProductImage } from '../lib/productImageOverrides'
import { formatCatalogProductName } from '../lib/catalogProductName'
import { getProductMetrics } from '../lib/productMetrics'
import { getSizeGuide } from '../lib/productSizeGuide'
import { showToast } from '../lib/toast'
import { useAuth } from '../contexts/AuthContext'
import { useWishlist } from '../hooks/useWishlist'
import { useFormatPrice } from '../hooks/useFormatPrice'

async function upsertCartItem({ userId, productId, normalizedSize }) {
  let existingQuery = supabase
    .from('cart_items')
    .select('quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
  if (normalizedSize) existingQuery = existingQuery.eq('size', normalizedSize)
  else existingQuery = existingQuery.eq('size', '')
  const { data: existing } = await existingQuery.maybeSingle()
  const qty = (existing?.quantity ?? 0) + 1
  return supabase.from('cart_items').upsert(
    { user_id: userId, product_id: productId, size: normalizedSize, quantity: qty },
    { onConflict: 'user_id,product_id,size' },
  )
}

export default function ProductCard({ product }) {
  const { name, slug, price, image_url, materials, category } = product
  const isFoodDrink = String(category?.slug ?? '').toLowerCase() === 'food-drink'
  const displayName = formatCatalogProductName(name)
  const { displayScore, displayCarbon, discountPercent, originalPrice, loyaltyPoints } = getProductMetrics(product)
  const displayImage = getProductImage({ name, slug, image_url })
  const { user } = useAuth()
  const { format } = useFormatPrice()
  const { isWishlisted, toggle, isAuthenticated } = useWishlist()
  const [adding, setAdding] = useState(false)
  const [sizePickerOpen, setSizePickerOpen] = useState(false)
  const [pendingSize, setPendingSize] = useState('')
  const navigate = useNavigate()
  const sizeGuide = getSizeGuide(product)
  const requiresSize = Boolean(sizeGuide)

  const addFromCard = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    if (requiresSize) {
      setPendingSize('')
      setSizePickerOpen(true)
      return
    }
    setAdding(true)
    const { error } = await upsertCartItem({ userId: user.id, productId: product.id, normalizedSize: '' })
    setAdding(false)
    if (!error) {
      window.dispatchEvent(new Event('ecoshop-cart-updated'))
      showToast('Added to cart')
    } else {
      showToast('Could not add to cart. Try again.')
    }
  }

  const confirmAddWithSize = async () => {
    const size = pendingSize
    if (!user || !size) return
    setSizePickerOpen(false)
    setPendingSize('')
    setAdding(true)
    const { error } = await upsertCartItem({ userId: user.id, productId: product.id, normalizedSize: size })
    setAdding(false)
    if (!error) {
      window.dispatchEvent(new Event('ecoshop-cart-updated'))
      showToast('Added to cart')
    } else {
      showToast('Could not add to cart. Try again.')
    }
  }

  const closePicker = (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    setSizePickerOpen(false)
    setPendingSize('')
  }

  const onWishlistClick = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    toggle(product.id)
  }

  const sizeModal =
    sizePickerOpen && sizeGuide && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ecoshop-size-picker-title"
          >
            <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close size picker" onClick={closePicker} />
            <div
              className="relative z-10 w-full max-w-md rounded-t-2xl border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-600 dark:bg-stone-800 sm:rounded-2xl"
              onClick={(ev) => ev.stopPropagation()}
            >
              <h2 id="ecoshop-size-picker-title" className="text-base font-semibold text-stone-900 dark:text-stone-100 pr-8">
                Choose size
              </h2>
              <p className="mt-1 text-base text-stone-600 dark:text-stone-400 line-clamp-2">{displayName}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {sizeGuide.options.map((opt) => {
                  const selected = pendingSize === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={adding}
                      onClick={() => setPendingSize(opt)}
                      className={`rounded-lg border px-2 py-2.5 text-base font-semibold disabled:opacity-50 ${
                        selected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/40 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-100'
                          : 'border-stone-300 bg-white text-stone-800 hover:border-emerald-500 hover:bg-emerald-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
              {pendingSize ? (
                <p className="mt-3 text-center text-base text-stone-600 dark:text-stone-400">
                  Size <span className="font-semibold text-stone-800 dark:text-stone-200">{pendingSize}</span> selected — confirm to add.
                </p>
              ) : (
                <p className="mt-3 text-center text-base text-stone-500 dark:text-stone-500">Tap a size, then confirm.</p>
              )}
              <button
                type="button"
                onClick={confirmAddWithSize}
                disabled={!pendingSize || adding}
                className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
              >
                {adding ? 'Adding...' : 'Confirm & add to cart'}
              </button>
              <button
                type="button"
                onClick={closePicker}
                className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700/50"
              >
                Cancel
              </button>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800/90 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300">
      <Link to={`/products/${slug}`} className="block group">
        <div className="relative aspect-square w-full overflow-hidden bg-stone-100 dark:bg-stone-900">
          <img
            src={displayImage}
            alt={displayName}
            loading="lazy"
            className="h-full w-full object-cover object-center"
          />
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-base font-bold tracking-wide">
            {displayScore}/10 green
          </span>
          {discountPercent > 0 && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-base font-bold">
              -{discountPercent}%
            </span>
          )}
        </div>
        <div className="p-3">
          <h2 className="font-semibold text-base text-stone-900 dark:text-stone-100 line-clamp-2 transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-400 leading-snug">{displayName}</h2>
          <p className="text-base text-stone-700 dark:text-stone-300 mt-1.5 line-clamp-1 leading-normal">{materials || (isFoodDrink ? 'Eco-friendly ingredients' : 'Eco-friendly materials')}</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <p className="text-emerald-700 dark:text-emerald-400 font-bold text-xl tabular-nums">{format(Number(price))}</p>
            {discountPercent > 0 && (
              <p className="text-base text-stone-500 dark:text-stone-400 line-through tabular-nums">{format(originalPrice)}</p>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-base font-medium text-stone-700 dark:text-stone-300 gap-2 tabular-nums">
            <span>CO₂ saved: {displayCarbon} kg</span>
            <span className="text-emerald-700 dark:text-emerald-400">+{loyaltyPoints} pts</span>
          </div>
        </div>
      </Link>
      <div className="px-3 pb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={addFromCard}
          disabled={!user || adding}
          className="flex-1 px-3 py-2.5 rounded-lg bg-emerald-600 text-white text-base font-semibold hover:bg-emerald-700 disabled:opacity-50"
        >
          {!user ? 'Login to add' : requiresSize ? 'Select size' : adding ? 'Adding...' : 'Add to cart'}
        </button>
        <button
          type="button"
          onClick={onWishlistClick}
          className={`px-3 py-2.5 rounded-lg text-base font-semibold border ${
            isWishlisted(product.id)
              ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-300'
              : 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300'
          }`}
          aria-label={isAuthenticated ? 'Toggle wishlist' : 'Login to use wishlist'}
          title={isAuthenticated ? 'Toggle wishlist' : 'Login to use wishlist'}
        >
          {isWishlisted(product.id) ? '\u2665' : '\u2661'}
        </button>
      </div>
      {sizeModal}
    </div>
  )
}
