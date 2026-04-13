import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getProductImage } from '../lib/productImageOverrides'
import { formatCatalogProductName } from '../lib/catalogProductName'
import { getProductMetrics } from '../lib/productMetrics'
import { useAuth } from '../contexts/AuthContext'
import { useWishlist } from '../hooks/useWishlist'
import { useFormatPrice } from '../hooks/useFormatPrice'

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
  const navigate = useNavigate()
  const location = useLocation()
  const requiresSize = /shirt|jacket|hoodie|dress|pant|trouser|sweater|tee|fashion|onesie|sock/i.test(`${name || ''}`)

  const addFromCard = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    if (requiresSize) {
      navigate(`/products/${slug}`)
      return
    }
    setAdding(true)
    const { data: existing } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .eq('size', '')
      .maybeSingle()
    const qty = (existing?.quantity ?? 0) + 1
    await supabase.from('cart_items').upsert(
      { user_id: user.id, product_id: product.id, size: '', quantity: qty },
      { onConflict: 'user_id,product_id,size' }
    )
    window.dispatchEvent(new Event('ecoshop-cart-updated'))
    setAdding(false)
  }

  const onWishlistClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: location.pathname } } })
      return
    }
    toggle(product.id)
  }

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
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-bold tracking-wide">
            {displayScore}/10 green
          </span>
          {discountPercent > 0 && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold">
              -{discountPercent}%
            </span>
          )}
        </div>
        <div className="p-3">
          <h2 className="font-semibold text-sm text-stone-900 dark:text-stone-100 line-clamp-2 transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-400 leading-snug">{displayName}</h2>
          <p className="text-sm text-stone-700 dark:text-stone-300 mt-1.5 line-clamp-1 leading-normal">{materials || (isFoodDrink ? 'Eco-friendly ingredients' : 'Eco-friendly materials')}</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <p className="text-emerald-700 dark:text-emerald-400 font-bold text-lg tabular-nums">{format(Number(price))}</p>
            {discountPercent > 0 && (
              <p className="text-sm text-stone-500 dark:text-stone-400 line-through tabular-nums">{format(originalPrice)}</p>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-sm font-medium text-stone-700 dark:text-stone-300 gap-2 tabular-nums">
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
          className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
        >
          {!user ? 'Login to add' : requiresSize ? 'Select size' : adding ? 'Adding...' : 'Add to cart'}
        </button>
        <button
          type="button"
          onClick={onWishlistClick}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
            isWishlisted(product.id)
              ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-300'
              : 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300'
          }`}
          aria-label={isAuthenticated ? 'Toggle wishlist' : 'Login to use wishlist'}
          title={isAuthenticated ? 'Toggle wishlist' : 'Login to use wishlist'}
        >
          {isWishlisted(product.id) ? '♥' : '♡'}
        </button>
      </div>
    </div>
  )
}
