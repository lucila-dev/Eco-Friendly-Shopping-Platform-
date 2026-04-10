import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ReviewList from '../components/ReviewList'
import ReviewForm from '../components/ReviewForm'
import { getProductImage } from '../lib/productImageOverrides'

function parseMaterialTags(materials) {
  if (!materials) return []
  return materials
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, 4)
}

function getProductUseLabel(product) {
  const text = `${product?.name || ''} ${product?.category?.name || ''}`.toLowerCase()
  if (/shirt|jacket|hoodie|dress|sneaker|sock|onesie/.test(text)) return 'Apparel'
  if (/bottle|mug|utensil|cutlery|straw|kitchen|container|lunch/.test(text)) return 'Kitchen essential'
  if (/shampoo|conditioner|tooth|soap|deodorant|balm|mascara|skincare/.test(text)) return 'Personal care'
  if (/notebook|pen|planner|office|desk/.test(text)) return 'Office supply'
  if (/planter|garden|lantern|camp|outdoor/.test(text)) return 'Outdoor item'
  if (/phone|laptop|tech|charger|power bank/.test(text)) return 'Tech accessory'
  return 'Everyday essential'
}

function getSustainabilityReasons(product, materials) {
  const reasons = []
  const materialText = materials.join(' ').toLowerCase()
  const score = Number(product?.sustainability_score ?? 0)
  const carbon = Number(product?.carbon_footprint_saving_kg ?? 0)

  if (/recycled/.test(materialText)) reasons.push('Contains recycled material content.')
  if (/organic|bamboo|hemp|cork/.test(materialText)) reasons.push('Uses renewable or organically sourced materials.')
  if (/steel|glass|silicone|aluminum/.test(materialText)) reasons.push('Designed for repeated use with durable materials.')
  if (score >= 8) reasons.push('High sustainability score based on catalog assessment.')
  if (carbon > 0) reasons.push(`Estimated to save about ${carbon.toFixed(1)} kg CO2 per item versus conventional alternatives.`)

  if (reasons.length === 0) {
    reasons.push('Selected for lower-impact materials and everyday reusability.')
  }
  return reasons.slice(0, 4)
}

function getCertifications(product, materials) {
  const text = `${product?.name || ''} ${materials.join(' ')}`.toLowerCase()
  const certs = []
  if (/organic/.test(text)) certs.push('Organic Content')
  if (/recycled/.test(text)) certs.push('Recycled Content')
  if (/cotton|textile|fabric/.test(text)) certs.push('Textile Standard')
  if (/bamboo|wood|paper/.test(text)) certs.push('Responsible Sourcing')
  if (/vegan|plant/.test(text)) certs.push('Vegan Friendly')
  if (certs.length === 0) certs.push('Eco Reviewed')
  return certs.slice(0, 3)
}

function getSizeGuide(product) {
  const text = `${product?.name || ''} ${product?.category?.name || ''}`.toLowerCase()
  if (!/shirt|jacket|hoodie|dress|pant|trouser|sweater|tee|fashion|onesie|sock/.test(text)) return null

  const isBottom = /pant|trouser|short|legging/.test(text)
  const isDress = /dress/.test(text)

  if (isBottom) {
    return {
      title: 'Size and Fit',
      description: 'Choose your usual size. If you are between sizes, we suggest sizing up for comfort.',
      columns: ['Size', 'Waist (cm)', 'Hip (cm)', 'Inseam (cm)'],
      rows: [
        ['XS', '60-67', '84-91', '72'],
        ['S', '68-75', '92-99', '74'],
        ['M', '76-83', '100-107', '76'],
        ['L', '84-91', '108-115', '78'],
        ['XL', '92-100', '116-124', '79'],
        ['XXL', '101-110', '125-134', '80'],
      ],
      options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    }
  }

  if (isDress) {
    return {
      title: 'Size and Fit',
      description: 'Regular fit. For a looser silhouette, choose one size up.',
      columns: ['Size', 'Bust (cm)', 'Waist (cm)', 'Length (cm)'],
      rows: [
        ['XS', '76-83', '58-64', '92'],
        ['S', '84-91', '65-71', '95'],
        ['M', '92-99', '72-79', '98'],
        ['L', '100-107', '80-87', '101'],
        ['XL', '108-116', '88-96', '103'],
        ['XXL', '117-126', '97-106', '105'],
      ],
      options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    }
  }

  return {
    title: 'Size and Fit',
    description: 'Standard fit. Check measurements below to pick your best size.',
    columns: ['Size', 'Chest (cm)', 'Shoulder (cm)', 'Length (cm)'],
    rows: [
      ['XS', '80-87', '40', '64'],
      ['S', '88-95', '42', '67'],
      ['M', '96-103', '45', '70'],
      ['L', '104-111', '48', '73'],
      ['XL', '112-120', '51', '76'],
      ['XXL', '121-130', '54', '79'],
    ],
    options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  }
}

export default function ProductDetail() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviewVersion, setReviewVersion] = useState(0)
  const [canReview, setCanReview] = useState(false)
  const [selectedSize, setSelectedSize] = useState('')
  const [showSizeMeasurements, setShowSizeMeasurements] = useState(false)
  const [openInfo, setOpenInfo] = useState({
    materials: false,
    certifications: false,
    why: false,
    impact: false,
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
        .select('*, category:categories(id, name, slug)')
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

  const materials = useMemo(() => parseMaterialTags(product?.materials), [product?.materials])
  const sustainabilityReasons = useMemo(() => getSustainabilityReasons(product, materials), [product, materials])
  const certifications = useMemo(() => getCertifications(product, materials), [product, materials])
  const productUse = useMemo(() => getProductUseLabel(product), [product])
  const sizeGuide = useMemo(() => getSizeGuide(product), [product])

  if (loading) return <p className="text-stone-500 dark:text-stone-400 text-lg py-4">Loading...</p>
  if (!product) return <p className="text-stone-600">Product not found. <Link to="/products" className="text-emerald-600 hover:underline">Back to products</Link></p>

  const displayImage = getProductImage(product)
  const score100 = Math.round((Number(product.sustainability_score ?? 0) / 10) * 100)
  const carbonSaving = Number(product.carbon_footprint_saving_kg ?? 0)
  const categoryLink = product?.category?.slug ? `/products?category=${product.category.slug}` : '/products'
  const toggleInfo = (key) => setOpenInfo((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="w-full py-4 sm:py-5">
      <div className="grid w-full max-w-none grid-cols-1 items-stretch gap-x-4 gap-y-4 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-4">
        <Link
          to={categoryLink}
          className="col-span-full block text-lg text-stone-600 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400"
        >
          ← Back to Category
        </Link>

        <div className="flex h-full min-h-0 w-full min-w-0 flex-col self-stretch max-lg:items-center lg:min-h-0">
          {/* object-cover fills the frame (no letterboxing); crops edges if aspect ratio differs. */}
          <div className="aspect-square w-full max-w-[30rem] shrink-0 overflow-hidden rounded-xl border border-emerald-100 bg-stone-100 lg:aspect-auto lg:h-full lg:min-h-0 lg:w-full lg:max-w-none lg:flex-1">
            <img
              src={displayImage}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>

        <div className="min-h-0 min-w-0 w-full space-y-2 sm:space-y-3 self-stretch">
          <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-4 py-1.5 text-base font-semibold text-emerald-700 dark:text-emerald-300">
            Sustainability Score: {score100}/100
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-bold text-stone-800 dark:text-stone-100 leading-tight">{product.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <p className="text-4xl sm:text-5xl text-emerald-700 dark:text-emerald-400 font-bold">${Number(product.price).toFixed(2)}</p>
            <span className="text-base px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">In stock</span>
            <span className="text-base px-3 py-1.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-medium">{productUse}</span>
          </div>
          <p className="text-stone-700 dark:text-stone-300 text-lg sm:text-xl leading-relaxed">{product.description || 'No description provided yet.'}</p>

          {sizeGuide && (
            <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-100/35 dark:bg-emerald-950/30 p-4 sm:p-5">
              <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-lg">{sizeGuide.title}</h3>
              <p className="mt-1 text-base text-stone-600 dark:text-stone-400 leading-relaxed">{sizeGuide.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sizeGuide.options.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-md border px-4 py-2 text-base font-medium ${
                      selectedSize === size
                        ? 'border-emerald-500 bg-emerald-100 text-emerald-700'
                        : 'border-stone-300 bg-emerald-50 text-stone-700 hover:border-emerald-300'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowSizeMeasurements((v) => !v)}
                  className="inline-flex items-center rounded-md border border-stone-300/80 dark:border-stone-600 bg-emerald-100/40 dark:bg-emerald-900/30 px-4 py-2 text-base font-medium text-stone-700 dark:text-stone-200 hover:border-emerald-400"
                >
                  {showSizeMeasurements ? 'Hide measurements' : 'View measurements'}
                </button>
              </div>
              <div className={`${showSizeMeasurements ? 'mt-4' : 'mt-0'} overflow-x-auto`}>
                {showSizeMeasurements && (
                  <table className="min-w-full text-base">
                    <thead>
                      <tr className="text-left text-stone-600 border-b border-stone-200">
                        {sizeGuide.columns.map((col) => (
                          <th key={col} className="py-2 pr-4 font-semibold">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sizeGuide.rows.map((row) => (
                        <tr key={row[0]} className="border-b border-stone-100 text-stone-700">
                          {row.map((cell, idx) => (
                            <td key={`${row[0]}-${idx}`} className="py-2 pr-4">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          <AddToCartButton
            product={product}
            isAuthenticated={isAuthenticated}
            requiresSize={Boolean(sizeGuide)}
            selectedSize={selectedSize}
          />
          <InfoAccordion
            title="Materials Used"
            open={openInfo.materials}
            onToggle={() => toggleInfo('materials')}
            className="border-purple-200 bg-purple-50/50"
            titleClassName="text-purple-800"
          >
            <div className="flex flex-wrap gap-1.5">
              {(materials.length > 0 ? materials : ['Not specified']).map((m) => (
                <span key={m} className="inline-flex items-center rounded-md bg-purple-100 dark:bg-purple-950/50 px-3 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-300">{m}</span>
              ))}
            </div>
          </InfoAccordion>
          <InfoAccordion
            title="Why This Product is Sustainable"
            open={openInfo.why}
            onToggle={() => toggleInfo('why')}
            className="border-emerald-300 bg-emerald-50/50"
            titleClassName="text-emerald-800"
          >
            <ul className="mt-2 space-y-2">
              {sustainabilityReasons.map((reason) => (
                <li key={reason} className="text-base sm:text-lg text-stone-700 dark:text-stone-300 leading-relaxed">✓ {reason}</li>
              ))}
            </ul>
          </InfoAccordion>
          <InfoAccordion
            title="Environmental Impact"
            open={openInfo.impact}
            onToggle={() => toggleInfo('impact')}
            className="border-sky-300 bg-sky-50/50"
            titleClassName="text-sky-800"
          >
            <div className="mt-3">
              <div className="flex items-center justify-between text-base text-stone-600 dark:text-stone-400">
                <span>Sustainability Score</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-lg">{score100}/100</span>
              </div>
              <div className="mt-1.5 h-3 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${score100}%` }} />
              </div>
            </div>
            <div className="mt-2 rounded-md border border-sky-200/70 bg-sky-100/35 p-3">
              <p className="text-base font-semibold text-sky-900 dark:text-sky-200">Carbon Footprint Savings</p>
              <p className="text-lg text-stone-700 dark:text-stone-300 mt-2 leading-relaxed">
                This product saves approximately <span className="font-semibold text-emerald-700">{carbonSaving.toFixed(1)} kg CO2</span> compared to traditional alternatives.
              </p>
            </div>
          </InfoAccordion>
          <InfoAccordion
            title="Certifications"
            open={openInfo.certifications}
            onToggle={() => toggleInfo('certifications')}
            className="border-amber-300 bg-amber-50/60"
            titleClassName="text-amber-800"
          >
            <div className="flex flex-wrap gap-1.5">
              {certifications.map((cert) => (
                <span key={cert} className="inline-flex items-center rounded-md border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-950/40 px-3 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-200">
                  {cert}
                </span>
              ))}
            </div>
          </InfoAccordion>
        </div>
      </div>
      <div className="mt-4 sm:mt-5 border-t border-emerald-200/50 pt-4 sm:pt-5">
        <ReviewList productId={product.id} productName={product.name} key={`${product.id}-${reviewVersion}`} />
        <ReviewForm productId={product.id} canReview={canReview} onSubmitted={() => setReviewVersion((v) => v + 1)} />
      </div>
    </div>
  )
}

function InfoAccordion({ title, open, onToggle, className = '', titleClassName = '', children }) {
  return (
    <section className={`rounded-xl border px-4 py-3 sm:px-5 sm:py-4 ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left py-1 gap-3"
        aria-expanded={open}
      >
        <h3 className={`font-semibold text-lg sm:text-xl ${titleClassName}`}>{title}</h3>
        <span className={`text-stone-600 dark:text-stone-400 text-xl leading-none shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  )
}
function AddToCartButton({ product, isAuthenticated, requiresSize = false, selectedSize = '' }) {
  const [adding, setAdding] = useState(false)
  const [done, setDone] = useState(false)
  const [qty, setQty] = useState(1)
  const { user } = useAuth()

  const handleAdd = async () => {
    if (!user) return
    if (requiresSize && !selectedSize) return
    setAdding(true)
    setDone(false)
    const normalizedSize = requiresSize ? selectedSize : ''
    let existingQuery = supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
    if (normalizedSize) existingQuery = existingQuery.eq('size', normalizedSize)
    else existingQuery = existingQuery.eq('size', '')
    const { data: existing } = await existingQuery.maybeSingle()
    const newQty = (existing?.quantity ?? 0) + qty
    const { error } = await supabase.from('cart_items').upsert(
      { user_id: user.id, product_id: product.id, size: normalizedSize, quantity: newQty },
      { onConflict: 'user_id,product_id,size' }
    )
    setAdding(false)
    if (!error) {
      window.dispatchEvent(new Event('ecoshop-cart-updated'))
      setDone(true)
    }
  }

  return (
    <div className="pt-1">
      <div className="flex gap-2">
        <div className="flex items-center rounded-lg border border-stone-300 bg-white">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-3 py-2.5 text-stone-700 hover:bg-stone-50 text-base"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className="w-10 text-center text-base font-medium text-stone-700">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(9, q + 1))}
            className="px-3 py-2.5 text-stone-700 hover:bg-stone-50 text-base"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || (requiresSize && !selectedSize)}
            className="flex-1 px-6 py-3 bg-emerald-600 text-white text-base font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {adding ? 'Adding...' : done ? 'Added to Cart' : 'Add to Cart'}
          </button>
        ) : (
          <Link to="/login" className="flex-1 px-6 py-3 bg-emerald-600 text-white text-center text-base font-semibold rounded-lg hover:bg-emerald-700">
            Sign In to Add
          </Link>
        )}
      </div>
      {done && isAuthenticated && (
        <Link to="/cart" className="inline-block mt-2 text-emerald-600 hover:underline text-base">
          View cart
        </Link>
      )}
      {requiresSize && !selectedSize && (
        <p className="mt-2 text-base text-stone-600 dark:text-stone-400">Choose a size to add this item to cart.</p>
      )}
    </div>
  )
}
