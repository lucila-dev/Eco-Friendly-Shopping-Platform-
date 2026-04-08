import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import SustainabilityBadge from '../components/SustainabilityBadge'
import ReviewList from '../components/ReviewList'
import ReviewForm from '../components/ReviewForm'
import { getProductImage } from '../lib/productImageOverrides'

function getProductFacts(product) {
  const name = (product?.name || '').toLowerCase()
  const materials = product?.materials || 'Eco-conscious mixed materials'
  const facts = [
    { label: 'Materials', value: materials },
    { label: 'Delivery', value: 'Dispatch in 24 hours. Standard 2-4 days, express 1-2 days.' },
    { label: 'Returns', value: '30-day returns for unused items in original condition.' },
  ]

  if (/balm|mascara|cleanser|lotion|deodorant|shampoo|conditioner|beauty|personal/i.test(name)) {
    facts.push({ label: 'Ingredients', value: 'Plant-based extracts, low-impact preservatives, fragrance-free options.' })
    facts.push({ label: 'Shelf life', value: '12 months after opening. Store in a cool, dry place.' })
  } else if (/wrap|food|snack|kitchen|produce/i.test(name)) {
    facts.push({ label: 'Food contact guidance', value: 'Clean before first use. Avoid direct high heat exposure.' })
    facts.push({ label: 'Shelf life', value: 'Reusable for 6-12 months depending on care and usage.' })
  } else if (/bottle|container|vase|planter|utensil|straw/i.test(name)) {
    facts.push({ label: 'Care', value: 'Hand wash recommended. Dishwasher safe on top rack if applicable.' })
    facts.push({ label: 'Expected lifespan', value: '2+ years with regular use and proper care.' })
  } else {
    facts.push({ label: 'Product use', value: 'Designed for frequent everyday use with long-life durability.' })
  }

  return facts
}

export default function ProductDetail() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviewVersion, setReviewVersion] = useState(0)
  const [canReview, setCanReview] = useState(false)
  const [openSections, setOpenSections] = useState({
    overview: true,
    materials: false,
    delivery: false,
    sustainability: false,
  })
  const { isAuthenticated } = useAuth()
  const { user } = useAuth()

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

  useEffect(() => {
    async function checkPurchased() {
      if (!user || !product?.id) {
        setCanReview(false)
        return
      }
      const { data } = await supabase
        .from('order_items')
        .select('id, orders!inner(user_id)')
        .eq('product_id', product.id)
        .eq('orders.user_id', user.id)
        .limit(1)
      setCanReview((data?.length ?? 0) > 0)
    }
    checkPurchased()
  }, [user?.id, product?.id])

  if (loading) return <p className="text-stone-500">Loading...</p>
  if (!product) return <p className="text-stone-600">Product not found. <Link to="/products" className="text-emerald-600 hover:underline">Back to products</Link></p>
  const displayImage = getProductImage(product)
  const facts = getProductFacts(product)
  const materialsFact = facts.find((f) => f.label === 'Materials')
  const ingredientFact = facts.find((f) => f.label === 'Ingredients')
  const shelfLifeFact = facts.find((f) => f.label === 'Shelf life')
  const deliveryFact = facts.find((f) => f.label === 'Delivery')
  const returnsFact = facts.find((f) => f.label === 'Returns')

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="max-w-4xl">
      <Link to="/products" className="text-sm text-stone-500 hover:text-emerald-600 mb-4 inline-block">
        ← Back to products
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-xl overflow-hidden bg-stone-100">
          <img
            src={displayImage}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{product.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <p className="text-2xl text-emerald-700 font-semibold">${Number(product.price).toFixed(2)}</p>
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">In stock</span>
            <span className="text-xs px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">Eco verified</span>
          </div>

          <div className="mt-5 space-y-3">
            <Accordion
              title="Overview"
              open={openSections.overview}
              onToggle={() => toggleSection('overview')}
            >
              <p className="text-stone-700 text-base leading-7">{product.description || 'No description provided yet.'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="rounded-lg border border-stone-200 bg-white p-3">
                  <p className="text-sm font-semibold text-stone-700">Product type</p>
                  <p className="text-base text-stone-800 mt-1">Everyday sustainable essential</p>
                </div>
                <div className="rounded-lg border border-stone-200 bg-white p-3">
                  <p className="text-sm font-semibold text-stone-700">Best for</p>
                  <p className="text-base text-stone-800 mt-1">Low-impact daily use and waste reduction</p>
                </div>
              </div>
            </Accordion>

            <Accordion
              title="Materials and care"
              open={openSections.materials}
              onToggle={() => toggleSection('materials')}
            >
              <div className="space-y-3">
                <div className="rounded-lg border border-stone-200 bg-white p-3">
                  <p className="text-sm font-semibold text-stone-700">Materials</p>
                  <p className="text-base text-stone-800 mt-1">{materialsFact?.value || product.materials || 'Not specified'}</p>
                </div>
                {ingredientFact && (
                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <p className="text-sm font-semibold text-stone-700">Ingredients</p>
                    <p className="text-base text-stone-800 mt-1">{ingredientFact.value}</p>
                  </div>
                )}
                <div className="rounded-lg border border-stone-200 bg-white p-3">
                  <p className="text-sm font-semibold text-stone-700">Care instructions</p>
                  <p className="text-base text-stone-800 mt-1">
                    Keep clean and dry after use. Follow product-specific cleaning instructions for best lifespan.
                  </p>
                </div>
                {shelfLifeFact && (
                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <p className="text-sm font-semibold text-stone-700">Shelf life</p>
                    <p className="text-base text-stone-800 mt-1">{shelfLifeFact.value}</p>
                  </div>
                )}
              </div>
            </Accordion>

            <Accordion
              title="Delivery and returns"
              open={openSections.delivery}
              onToggle={() => toggleSection('delivery')}
            >
              <div className="space-y-3">
                <div className="rounded-lg border border-stone-200 bg-white p-3">
                  <p className="text-sm font-semibold text-stone-700">Delivery options</p>
                  <p className="text-base text-stone-800 mt-1">{deliveryFact?.value || 'Dispatch in 24 hours. Standard 2-4 days.'}</p>
                </div>
                <div className="rounded-lg border border-stone-200 bg-white p-3">
                  <p className="text-sm font-semibold text-stone-700">Returns</p>
                  <p className="text-base text-stone-800 mt-1">{returnsFact?.value || '30-day returns for eligible items.'}</p>
                </div>
                <div className="rounded-lg border border-stone-200 bg-white p-3">
                  <p className="text-sm font-semibold text-stone-700">Order tracking</p>
                  <p className="text-base text-stone-800 mt-1">Track order status in your dashboard: preparing, dispatched, out for delivery, delivered.</p>
                </div>
              </div>
            </Accordion>

            <Accordion
              title="Sustainability details"
              open={openSections.sustainability}
              onToggle={() => toggleSection('sustainability')}
            >
              <SustainabilityBadge product={product} />
            </Accordion>
          </div>
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
        <ReviewList productId={product.id} productName={product.name} key={`${product.id}-${reviewVersion}`} />
        <ReviewForm productId={product.id} canReview={canReview} onSubmitted={() => setReviewVersion((v) => v + 1)} />
      </div>
    </div>
  )
}

function Accordion({ title, open, onToggle, children }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-50"
      >
        <span className="text-base font-semibold text-stone-800">{title}</span>
        <span className={`text-stone-600 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </section>
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
    if (!error) {
      window.dispatchEvent(new Event('ecoshop-cart-updated'))
      setDone(true)
    }
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
