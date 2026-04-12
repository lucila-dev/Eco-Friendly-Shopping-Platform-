import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'
import { useWishlist } from '../hooks/useWishlist'

export default function Wishlist() {
  const { ids } = useWishlist()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Wishlist · EcoShop'
    return () => { document.title = 'EcoShop · Sustainable Shopping' }
  }, [])

  useEffect(() => {
    async function fetchWishlist() {
      if (ids.length === 0) {
        setProducts([])
        setLoading(false)
        return
      }
      setLoading(true)
      const { data } = await supabase
        .from('products')
        .select('id, name, slug, price, image_url, sustainability_score, materials, carbon_footprint_saving_kg, category:categories(slug)')
        .in('id', ids)
      const ordered = ids.map((id) => (data ?? []).find((p) => p.id === id)).filter(Boolean)
      setProducts(ordered)
      setLoading(false)
    }
    fetchWishlist()
  }, [ids])

  if (loading) return <p className="text-stone-500 dark:text-stone-400">Loading wishlist...</p>

  return (
    <div>
      <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-4">Your wishlist</h1>
      {products.length === 0 ? (
        <p className="text-stone-600 dark:text-stone-300">
          No saved items yet. <Link to="/products" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">Browse products</Link>
        </p>
      ) : (
        <div className="ecoshop-product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      )}
    </div>
  )
}
