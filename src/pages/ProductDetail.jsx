import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import SustainabilityBadge from '../components/SustainabilityBadge'
import ReviewList from '../components/ReviewList'
import ReviewForm from '../components/ReviewForm'

export default function ProductDetail() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviewVersion, setReviewVersion] = useState(0)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    document.title = product ? `${product.name} – EcoShop` : 'EcoShop – Sustainable Shopping'
    return () => { document.title = 'EcoShop – Sustainable Shopping' }
  }, [product?.name])

  useEffect(() => {
    async function fetchProduct() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .single()
      if (error) {
        setProduct(null)
      } else {
        setProduct(data)
      }
      setLoading(false)
    }
    fetchProduct()
  }, [slug])

  if (loading) return <p className="text-stone-500">Loading...</p>
  if (!product) return <p className="text-stone-600">Product not found. <Link to="/products" className="text-emerald-600 hover:underline">Back to products</Link></p>

  return (
    <div className="max-w-4xl">
      <Link to="/products" className="text-sm text-stone-500 hover:text-emerald-600 mb-4 inline-block">
        ← Back to products
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-xl overflow-hidden bg-stone-100">
          <img
            src={product.image_url || '/placeholder.svg'}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{product.name}</h1>
          <p className="text-xl text-emerald-700 font-medium mt-2">${Number(product.price).toFixed(2)}</p>
          <p className="text-stone-600 mt-4">{product.description}</p>
          <SustainabilityBadge product={product} />
          {isAuthenticated && (
            <AddToCartButton product={product} />
          )}
          {!isAuthenticated && (
            <p className="mt-4 text-stone-500 text-sm">
              <Link to="/login" className="text-emerald-600 hover:underline">Sign in</Link> to add to cart.
            </p>
          )}
        </div>
      </div>
      <div className="mt-8">
        <ReviewList productId={product.id} key={`${product.id}-${reviewVersion}`} />
        <ReviewForm productId={product.id} onSubmitted={() => setReviewVersion((v) => v + 1)} />
      </div>
    </div>
  )
}

function AddToCartButton({ product }) {
  const [adding, setAdding] = useState(false)
  const [done, setDone] = useState(false)
  const { user } = useAuth()

  const handleAdd = async () => {
    if (!user) return
    setAdding(true)
    setDone(false)
    const { data: existing } = await supabase.from('cart_items').select('quantity').eq('user_id', user.id).eq('product_id', product.id).maybeSingle()
    const newQty = (existing?.quantity ?? 0) + 1
    const { error } = await supabase.from('cart_items').upsert(
      { user_id: user.id, product_id: product.id, quantity: newQty },
      { onConflict: 'user_id,product_id' }
    )
    setAdding(false)
    if (!error) setDone(true)
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleAdd}
        disabled={adding}
        className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
      >
        {adding ? 'Adding...' : done ? 'Added to cart' : 'Add to cart'}
      </button>
      {done && (
        <Link to="/cart" className="ml-3 text-emerald-600 hover:underline text-sm">
          View cart
        </Link>
      )}
    </div>
  )
}
