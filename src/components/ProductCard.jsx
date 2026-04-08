import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getProductImage } from '../lib/productImageOverrides'
import { getProductMetrics } from '../lib/productMetrics'
import { useAuth } from '../contexts/AuthContext'
import { useWishlist } from '../hooks/useWishlist'

export default function ProductCard({ product }) {
  const { name, slug, price, image_url, materials } = product
  const { displayScore, displayCarbon, discountPercent, originalPrice, loyaltyPoints } = getProductMetrics(product)
  const displayImage = getProductImage({ name, slug, image_url })
  const { user } = useAuth()
  const { isWishlisted, toggle } = useWishlist()
  const [adding, setAdding] = useState(false)

  const addFromCard = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    setAdding(true)
    const { data: existing } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle()
    const qty = (existing?.quantity ?? 0) + 1
    await supabase.from('cart_items').upsert(
      { user_id: user.id, product_id: product.id, quantity: qty },
      { onConflict: 'user_id,product_id' }
    )
    window.dispatchEvent(new Event('ecoshop-cart-updated'))
    setAdding(false)
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <Link to={`/products/${slug}`} className="block">
      <div className="h-44 bg-stone-100 relative overflow-hidden">
        <img
          src={displayImage}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-medium">
          {displayScore}/10 green
        </span>
        {discountPercent > 0 && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-semibold">
            -{discountPercent}%
          </span>
        )}
      </div>
      <div className="p-4">
        <h2 className="font-semibold text-stone-800 line-clamp-2">{name}</h2>
        <p className="text-xs text-stone-500 mt-1 line-clamp-1">{materials || 'Eco-friendly materials'}</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-emerald-700 font-medium">${Number(price).toFixed(2)}</p>
          {discountPercent > 0 && (
            <p className="text-xs text-stone-400 line-through">${originalPrice.toFixed(2)}</p>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-stone-600">
          <span>CO2 saved: {displayCarbon}kg</span>
          <span className="text-emerald-700 font-medium">+{loyaltyPoints} pts</span>
        </div>
      </div>
      </Link>
      <div className="px-4 pb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={addFromCard}
          disabled={!user || adding}
          className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {!user ? 'Login to add' : adding ? 'Adding...' : 'Add to cart'}
        </button>
        <button
          type="button"
          onClick={() => toggle(product.id)}
          className={`px-3 py-2 rounded-lg text-sm border ${
            isWishlisted(product.id)
              ? 'bg-pink-50 border-pink-300 text-pink-700'
              : 'bg-white border-stone-300 text-stone-600'
          }`}
          aria-label="Toggle wishlist"
        >
          {isWishlisted(product.id) ? '♥' : '♡'}
        </button>
      </div>
    </div>
  )
}
