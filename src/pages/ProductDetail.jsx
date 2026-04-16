import { useState, useEffect, useLayoutEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ReviewList from '../components/ReviewList'
import ReviewForm from '../components/ReviewForm'
import { showToast } from '../lib/toast'
import { getProductImage, productDetailHeroFrameClass, productDetailHeroImageClassName } from '../lib/productImageOverrides'
import { formatCatalogProductName } from '../lib/catalogProductName'
import { useFormatPrice } from '../hooks/useFormatPrice'
import ProductCard from '../components/ProductCard'
import { pickRelatedSlices } from '../lib/productRecommendations'
import {
  getSizeGuide,
  getShoeVariantTable,
  shoeCartSizeLabel,
  measurementTableForUnit,
  sizeGuideHasFootLengthUnitToggle,
  sizeGuideHasMeasurementUnitToggle,
} from '../lib/productSizeGuide'

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
  if (/coffee|tea|kombucha|chocolate|pasta|granola|honey|soup|rice|smoothie|apple|nuts|water|snack|food|drink|beverage/.test(text)) return 'Food & drink'
  if (/planter|garden|lantern|camp|outdoor/.test(text)) return 'Outdoor item'
  if (/phone|laptop|tech|charger|power bank/.test(text)) return 'Tech accessory'
  return 'Everyday essential'
}

function isFoodOrDrinkCategory(product) {
  return String(product?.category?.slug ?? '').toLowerCase() === 'food-drink'
}

function getSustainabilityReasons(product, materials) {
  const reasons = []
  const materialText = materials.join(' ').toLowerCase()
  const score = Number(product?.sustainability_score ?? 0)
  const carbon = Number(product?.carbon_footprint_saving_kg ?? 0)
  const consumable = isFoodOrDrinkCategory(product)

  if (/recycled/.test(materialText)) {
    reasons.push(
      consumable
        ? 'Packaging or materials include recycled content where it fits food safety rules.'
        : 'Contains recycled material content.',
    )
  }
  if (/organic|bamboo|hemp|cork/.test(materialText)) {
    reasons.push(
      consumable
        ? 'Ingredients or crop inputs emphasize organic or responsibly farmed sources where noted.'
        : 'Uses renewable or organically sourced materials.',
    )
  }
  if (/steel|glass|silicone|aluminum/.test(materialText)) {
    reasons.push(
      consumable
        ? 'Packaging uses materials like glass or metal that are easy to recycle instead of single-use plastic.'
        : 'Designed for repeated use with durable materials.',
    )
  }
  if (score >= 8) reasons.push('High sustainability score based on catalog assessment.')
  if (carbon > 0) {
    reasons.push(
      consumable
        ? `Estimated to save about ${carbon.toFixed(1)} kg CO2 versus more wasteful mainstream options in this category.`
        : `Estimated to save about ${carbon.toFixed(1)} kg CO2 per item versus conventional alternatives.`,
    )
  }

  if (reasons.length === 0) {
    reasons.push(
      consumable
        ? 'Selected for responsible sourcing, simpler ingredients, and lower-impact packaging.'
        : 'Selected for lower-impact materials and everyday reusability.',
    )
  }
  return reasons.slice(0, 4)
}

function ecoShopImpactClass(score) {
  const s = Number(score)
  if (!Number.isFinite(s) || s <= 0) return 'Bronze'
  if (s >= 8) return 'Gold'
  if (s >= 6) return 'Silver'
  return 'Bronze'
}

function getCertificationDisplay(product, materials) {
  const raw = `${product?.name || ''} ${product?.description || ''} ${(materials || []).join(' ')}`.toLowerCase()
  const impactClass = ecoShopImpactClass(product?.sustainability_score)

  const core = [
    'EcoShop Earth Quality Mark',
    `EcoShop Impact Programme, ${impactClass} Class`,
  ]

  const standards = []
  if (/\bgots\b|global organic textile/.test(raw)) standards.push('GOTS organic textile')
  if (/\bfsc\b|fsc[\s-]*certified|fsc®/.test(raw)) standards.push('FSC® chain of custody')
  if (/\bfairtrade\b|fair trade|fair-trade/.test(raw)) standards.push('Fairtrade sourcing')
  if (/oeko-tex|oeko tex|standard 100 by oeko/.test(raw)) standards.push('OEKO-TEX® Standard 100')
  if (/usda organic/.test(raw)) standards.push('USDA Organic')
  if (/energy star|energystar/.test(raw)) standards.push('ENERGY STAR®')
  if (/bluesign/.test(raw)) standards.push('bluesign® approved')
  if (/cradle to cradle|cradle2cradle|c2c certified/.test(raw)) standards.push('Cradle to Cradle Certified®')
  if (/b corp|b corporation|bcorp/.test(raw)) standards.push('B Corp Certified')

  const hints = []
  if (/recycled|post-consumer|pcr|rpet|ocean-bound/.test(raw)) hints.push('Recycled content profile')
  const hasNamedOrganic = standards.some((s) => s.includes('GOTS') || s.includes('USDA'))
  if ((/organic\b|bio-based/.test(raw)) && !hasNamedOrganic) hints.push('Organic & bio-based inputs')
  if (/\bvegan\b|plant-based|plant based|cruelty-free/.test(raw) && !/\bhoney\b/.test(raw)) {
    hints.push('Vegan formulation')
  }
  if (/compostable|home[\s-]*compost|industrially compostable|biodegradable/.test(raw)) {
    hints.push('End-of-life: compostable options')
  }

  const rest = [...standards, ...hints]
  const chips = [...core, ...rest].filter((x, i, a) => a.indexOf(x) === i).slice(0, 4)

  return { chips }
}

export default function ProductDetail() {
  const { format } = useFormatPrice()
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviewVersion, setReviewVersion] = useState(0)
  const [canReview, setCanReview] = useState(false)
  const [selectedSize, setSelectedSize] = useState('')
  const [shoeVariant, setShoeVariant] = useState('mens')
  /** Shoes: 'mens' | 'womens' size picker popup, or null when closed. */
  const [shoePickerModal, setShoePickerModal] = useState(null)
  /** UK size highlighted in shoe modal before user confirms. */
  const [shoeModalPendingSize, setShoeModalPendingSize] = useState('')
  /** Apparel (sweaters, etc.): size picker popup without gender split. */
  const [apparelSizeModalOpen, setApparelSizeModalOpen] = useState(false)
  const [apparelModalPendingSize, setApparelModalPendingSize] = useState('')
  const [sizeMeasurementsModalOpen, setSizeMeasurementsModalOpen] = useState(false)
  const [measurementUnit, setMeasurementUnit] = useState('cm')
  const [openInfo, setOpenInfo] = useState({
    materials: false,
    certifications: false,
    why: false,
    impact: false,
  })
  const [relatedSimilar, setRelatedSimilar] = useState([])
  const [relatedTogether, setRelatedTogether] = useState([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const { isAuthenticated } = useAuth()
  const { user } = useAuth()

  const displayName = formatCatalogProductName(product?.name ?? '')

  useEffect(() => {
    document.title = product ? `${displayName || product.name} · EcoShop` : 'EcoShop · Sustainable Shopping'
    return () => { document.title = 'EcoShop · Sustainable Shopping' }
  }, [product?.name, displayName])

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

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

  useEffect(() => {
    if (!product?.category_id || !product?.id) {
      setRelatedSimilar([])
      setRelatedTogether([])
      return
    }
    let cancelled = false
    setRelatedLoading(true)
    async function fetchRelated() {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, price, image_url, sustainability_score, materials, carbon_footprint_saving_kg, category:categories(slug, name)')
        .eq('category_id', product.category_id)
        .neq('id', product.id)
        .limit(80)
      if (cancelled) return
      if (error || !data?.length) {
        setRelatedSimilar([])
        setRelatedTogether([])
        setRelatedLoading(false)
        return
      }
      const { similar, together } = pickRelatedSlices(data, product.slug, {
        similarCount: 4,
        togetherCount: 3,
      })
      setRelatedSimilar(similar)
      setRelatedTogether(together)
      setRelatedLoading(false)
    }
    fetchRelated()
    return () => {
      cancelled = true
    }
  }, [product?.id, product?.category_id, product?.slug])

  const materials = useMemo(() => parseMaterialTags(product?.materials), [product?.materials])
  const sustainabilityReasons = useMemo(() => getSustainabilityReasons(product, materials), [product, materials])
  const certificationChips = useMemo(() => getCertificationDisplay(product, materials).chips, [product, materials])
  const productUse = useMemo(() => getProductUseLabel(product), [product])
  const sizeGuide = useMemo(() => getSizeGuide(product), [product])

  useEffect(() => {
    setSelectedSize('')
    setSizeMeasurementsModalOpen(false)
    setShoePickerModal(null)
    setApparelSizeModalOpen(false)
    setApparelModalPendingSize('')
    if (sizeGuide?.isShoe && sizeGuide.defaultVariant) {
      setShoeVariant(sizeGuide.defaultVariant)
    } else {
      setShoeVariant('mens')
    }
  }, [product?.id, sizeGuide?.isShoe, sizeGuide?.defaultVariant])

  useEffect(() => {
    setMeasurementUnit('cm')
  }, [product?.id, shoeVariant])

  useEffect(() => {
    if (!shoePickerModal) {
      setShoeModalPendingSize('')
      return
    }
    if (selectedSize && shoeVariant === shoePickerModal) {
      setShoeModalPendingSize(selectedSize)
    } else {
      setShoeModalPendingSize('')
    }
  }, [shoePickerModal, selectedSize, shoeVariant])

  useEffect(() => {
    if (!apparelSizeModalOpen) {
      setApparelModalPendingSize('')
      return
    }
    if (selectedSize) setApparelModalPendingSize(selectedSize)
    else setApparelModalPendingSize('')
  }, [apparelSizeModalOpen, selectedSize])

  useEffect(() => {
    if (!shoePickerModal && !apparelSizeModalOpen && !sizeMeasurementsModalOpen) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (shoePickerModal) setShoePickerModal(null)
      else if (apparelSizeModalOpen) setApparelSizeModalOpen(false)
      else if (sizeMeasurementsModalOpen) setSizeMeasurementsModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shoePickerModal, apparelSizeModalOpen, sizeMeasurementsModalOpen])

  const displayGuide = sizeGuide?.isShoe ? getShoeVariantTable(sizeGuide, shoeVariant) : sizeGuide
  const measurementTable = useMemo(
    () => (displayGuide ? measurementTableForUnit(displayGuide, measurementUnit) : null),
    [displayGuide, measurementUnit],
  )
  const sizeForCart =
    sizeGuide?.isShoe && selectedSize
      ? shoeCartSizeLabel(shoeVariant, selectedSize)
      : sizeGuide?.isShoe
        ? ''
        : selectedSize

  const shoeModalGuide =
    shoePickerModal && sizeGuide?.isShoe ? getShoeVariantTable(sizeGuide, shoePickerModal) : null

  const apparelModalGuide =
    apparelSizeModalOpen && sizeGuide && !sizeGuide.isShoe ? sizeGuide : null

  if (loading) return <p className="text-stone-500 dark:text-stone-400 text-base py-3">Loading...</p>
  if (!product) return <p className="text-stone-600">Product not found. <Link to="/products" className="text-emerald-600 hover:underline">Back to products</Link></p>

  const displayImage = getProductImage(product)
  const score100 = Math.round((Number(product.sustainability_score ?? 0) / 10) * 100)
  const carbonSaving = Number(product.carbon_footprint_saving_kg ?? 0)
  const categoryLink = product?.category?.slug ? `/products?category=${product.category.slug}` : '/products'
  const toggleInfo = (key) => setOpenInfo((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="w-full py-3 sm:py-4">
      <Link
        to={categoryLink}
        className="mb-3 sm:mb-4 inline-block text-base text-stone-600 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400"
      >
        ← Back to Category
      </Link>
      <div className="grid w-full max-w-none grid-cols-1 items-start gap-x-4 gap-y-4 lg:grid-cols-[minmax(35rem,auto)_minmax(0,1fr)] lg:items-start lg:gap-x-2 lg:gap-y-0 xl:gap-x-3">
        <div className="flex w-full justify-center self-start overflow-x-auto lg:justify-end">
          <div className={productDetailHeroFrameClass}>
            <img
              src={displayImage}
              alt={displayName}
              loading="lazy"
              className={productDetailHeroImageClassName}
              decoding="async"
            />
          </div>
        </div>

        <div className="min-h-0 min-w-0 w-full self-start space-y-2 sm:space-y-3 lg:min-h-0">
          <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 text-base font-semibold text-emerald-700 dark:text-emerald-300">
            Sustainability Score: {score100}/100
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 dark:text-stone-100 leading-tight">{displayName}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-2xl sm:text-3xl text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">{format(Number(product.price))}</p>
            <span className="text-base px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">In stock</span>
            <span className="text-base px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-medium">{productUse}</span>
          </div>
          {product.description?.trim() ? (
            <p className="text-stone-700 dark:text-stone-300 text-base sm:text-lg leading-relaxed">{product.description.trim()}</p>
          ) : null}

          {sizeGuide && displayGuide && (
            <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-100/35 dark:bg-emerald-950/30 p-3 sm:p-4">
              {sizeGuide.isShoe ? (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setShoePickerModal('mens')}
                      className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-3 text-base font-semibold text-stone-800 shadow-sm hover:border-emerald-500 hover:bg-emerald-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/40"
                    >
                      Men&apos;s UK sizes
                    </button>
                    <button
                      type="button"
                      onClick={() => setShoePickerModal('womens')}
                      className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-3 text-base font-semibold text-stone-800 shadow-sm hover:border-emerald-500 hover:bg-emerald-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/40"
                    >
                      Women&apos;s UK sizes
                    </button>
                  </div>
                  {selectedSize ? (
                    <p className="mt-3 text-base text-stone-700 dark:text-stone-300">
                      Selected:{' '}
                      <span className="font-semibold text-stone-900 dark:text-stone-100">{sizeForCart}</span>
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setApparelSizeModalOpen(true)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-base font-semibold text-stone-800 shadow-sm hover:border-emerald-500 hover:bg-emerald-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/40"
                  >
                    Choose your size
                  </button>
                  {selectedSize ? (
                    <p className="mt-3 text-base text-stone-700 dark:text-stone-300">
                      Selected:{' '}
                      <span className="font-semibold text-stone-900 dark:text-stone-100">{selectedSize}</span>
                    </p>
                  ) : null}
                </>
              )}
            </div>
          )}

          <AddToCartButton
            product={product}
            isAuthenticated={isAuthenticated}
            requiresSize={Boolean(sizeGuide)}
            selectedSize={sizeForCart}
            isShoe={Boolean(sizeGuide?.isShoe)}
          />
          <InfoAccordion
            title={isFoodOrDrinkCategory(product) ? 'Ingredients Used' : 'Materials Used'}
            open={openInfo.materials}
            onToggle={() => toggleInfo('materials')}
            className="border-purple-200 bg-purple-50/50"
            titleClassName="text-purple-800"
          >
            <div className="flex flex-wrap gap-1.5">
              {(materials.length > 0 ? materials : ['Not specified']).map((m) => (
                <span key={m} className="inline-flex items-center rounded-md bg-purple-100 dark:bg-purple-950/50 px-3 py-1.5 text-base font-medium text-purple-700 dark:text-purple-300">{m}</span>
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
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-base">{score100}/100</span>
              </div>
              <div className="mt-1.5 h-3 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${score100}%` }} />
              </div>
            </div>
            <div className="mt-2 rounded-md border border-sky-200/70 bg-sky-100/35 p-3">
              <p className="text-base font-semibold text-sky-900 dark:text-sky-200">Carbon Footprint Savings</p>
              <p className="text-base text-stone-700 dark:text-stone-300 mt-1.5 leading-relaxed">
                This product saves approximately <span className="font-semibold text-emerald-700">{carbonSaving.toFixed(1)} kg CO2</span> compared to traditional alternatives.
              </p>
            </div>
          </InfoAccordion>
          <InfoAccordion
            title="Certifications & standards"
            open={openInfo.certifications}
            onToggle={() => toggleInfo('certifications')}
            className="border-amber-300 bg-amber-50/60"
            titleClassName="text-amber-800"
          >
            <div className="flex flex-wrap gap-1.5">
              {certificationChips.map((cert) => (
                <span
                  key={cert}
                  className="inline-flex items-center rounded-md border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-950/40 px-3 py-1.5 text-base font-medium text-amber-800 dark:text-amber-200"
                >
                  {cert}
                </span>
              ))}
            </div>
          </InfoAccordion>
        </div>
      </div>

      {shoePickerModal &&
        shoeModalGuide &&
        sizeGuide?.isShoe &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ecoshop-shoe-size-modal-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close size picker"
              onClick={() => setShoePickerModal(null)}
            />
            <div
              className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl border border-stone-200 bg-white shadow-xl dark:border-stone-600 dark:bg-stone-800 sm:max-h-[85vh] sm:rounded-2xl"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="shrink-0 border-b border-stone-200 px-5 pb-4 pt-5 dark:border-stone-600">
                <h2
                  id="ecoshop-shoe-size-modal-title"
                  className="pr-8 text-lg font-semibold text-stone-900 dark:text-stone-100"
                >
                  {shoePickerModal === 'mens' ? "Men's UK sizes" : "Women's UK sizes"}
                </h2>
                <p className="mt-1 text-base text-stone-600 dark:text-stone-400">{displayName}</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setShoeVariant(shoePickerModal)
                    setSizeMeasurementsModalOpen(true)
                    setShoePickerModal(null)
                  }}
                  className="mb-4 w-full rounded-lg border border-stone-300/80 dark:border-stone-600 bg-emerald-100/40 dark:bg-emerald-900/30 px-3 py-2 text-base font-medium text-stone-700 dark:text-stone-200 hover:border-emerald-400"
                >
                  Measurement chart
                </button>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {shoeModalGuide.options.map((size) => {
                    const isSel = shoeModalPendingSize === size
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setShoeModalPendingSize(size)}
                        className={`flex h-12 w-full min-w-0 items-center justify-center rounded-md border px-1 text-sm font-medium tabular-nums leading-tight ${
                          isSel
                            ? 'border-emerald-500 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200'
                            : 'border-stone-300 bg-emerald-50 text-stone-700 hover:border-emerald-300 dark:border-stone-600 dark:bg-emerald-950/30 dark:text-stone-200 dark:hover:border-emerald-500'
                        }`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
                {shoeModalPendingSize ? (
                  <p className="mt-4 text-center text-base text-stone-600 dark:text-stone-400">
                    UK {shoeModalPendingSize} selected — confirm below or tap another size.
                  </p>
                ) : (
                  <p className="mt-4 text-center text-base text-stone-500 dark:text-stone-500">
                    Tap a size, then use this size to confirm.
                  </p>
                )}
              </div>
              <div className="shrink-0 space-y-2 border-t border-stone-200 px-5 py-4 dark:border-stone-600">
                <button
                  type="button"
                  disabled={!shoeModalPendingSize}
                  onClick={() => {
                    if (!shoeModalPendingSize) return
                    setShoeVariant(shoePickerModal)
                    setSelectedSize(shoeModalPendingSize)
                    setShoePickerModal(null)
                  }}
                  className="w-full rounded-lg bg-emerald-600 px-3 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50"
                >
                  Use this size
                </button>
                <button
                  type="button"
                  onClick={() => setShoePickerModal(null)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-3 text-base font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700/50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {apparelModalGuide &&
        sizeGuide &&
        !sizeGuide.isShoe &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ecoshop-apparel-size-modal-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close size picker"
              onClick={() => setApparelSizeModalOpen(false)}
            />
            <div
              className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl border border-stone-200 bg-white shadow-xl dark:border-stone-600 dark:bg-stone-800 sm:max-h-[85vh] sm:rounded-2xl"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="shrink-0 border-b border-stone-200 px-5 pb-4 pt-5 dark:border-stone-600">
                <h2
                  id="ecoshop-apparel-size-modal-title"
                  className="pr-8 text-lg font-semibold text-stone-900 dark:text-stone-100"
                >
                  {sizeGuide.title?.trim() || 'Choose your size'}
                </h2>
                <p className="mt-1 text-base text-stone-600 dark:text-stone-400">{displayName}</p>
                {sizeGuide.description?.trim() ? (
                  <p className="mt-2 text-base text-stone-600 dark:text-stone-400 leading-relaxed">{sizeGuide.description}</p>
                ) : null}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setSizeMeasurementsModalOpen(true)
                    setApparelSizeModalOpen(false)
                  }}
                  className="mb-4 w-full rounded-lg border border-stone-300/80 dark:border-stone-600 bg-emerald-100/40 dark:bg-emerald-900/30 px-3 py-2 text-base font-medium text-stone-700 dark:text-stone-200 hover:border-emerald-400"
                >
                  Measurement chart
                </button>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {apparelModalGuide.options.map((size) => {
                    const isSel = apparelModalPendingSize === size
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setApparelModalPendingSize(size)}
                        className={`flex h-12 w-full min-w-0 items-center justify-center rounded-md border px-1 text-sm font-medium tabular-nums leading-tight ${
                          isSel
                            ? 'border-emerald-500 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200'
                            : 'border-stone-300 bg-emerald-50 text-stone-700 hover:border-emerald-300 dark:border-stone-600 dark:bg-emerald-950/30 dark:text-stone-200 dark:hover:border-emerald-500'
                        }`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
                {apparelModalPendingSize ? (
                  <p className="mt-4 text-center text-base text-stone-600 dark:text-stone-400">
                    Size {apparelModalPendingSize} selected — confirm below or tap another size.
                  </p>
                ) : (
                  <p className="mt-4 text-center text-base text-stone-500 dark:text-stone-500">
                    Tap a size, then use this size to confirm.
                  </p>
                )}
              </div>
              <div className="shrink-0 space-y-2 border-t border-stone-200 px-5 py-4 dark:border-stone-600">
                <button
                  type="button"
                  disabled={!apparelModalPendingSize}
                  onClick={() => {
                    if (!apparelModalPendingSize) return
                    setSelectedSize(apparelModalPendingSize)
                    setApparelSizeModalOpen(false)
                  }}
                  className="w-full rounded-lg bg-emerald-600 px-3 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50"
                >
                  Use this size
                </button>
                <button
                  type="button"
                  onClick={() => setApparelSizeModalOpen(false)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-3 text-base font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700/50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {sizeMeasurementsModalOpen &&
        sizeGuide &&
        displayGuide &&
        measurementTable &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ecoshop-measurements-modal-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close measurements"
              onClick={() => setSizeMeasurementsModalOpen(false)}
            />
            <div
              className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-t-2xl border border-stone-200 bg-white shadow-xl dark:border-stone-600 dark:bg-stone-800 sm:max-h-[85vh] sm:rounded-2xl"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="shrink-0 border-b border-stone-200 px-5 pb-4 pt-5 dark:border-stone-600">
                <h2
                  id="ecoshop-measurements-modal-title"
                  className="pr-10 text-lg font-semibold text-stone-900 dark:text-stone-100"
                >
                  {sizeGuide.isShoe ? 'Measurements' : sizeGuide.title?.trim() || 'Measurements'}
                </h2>
                <p className="mt-1 text-base text-stone-600 dark:text-stone-400">{displayName}</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto px-5 py-4">
                {sizeGuideHasMeasurementUnitToggle(displayGuide) ? (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-base font-medium text-stone-700 dark:text-stone-300">
                      {sizeGuideHasFootLengthUnitToggle(displayGuide) ? 'Foot length' : 'Measurements'}
                    </span>
                    <div className="flex rounded-lg border border-stone-300 dark:border-stone-600 bg-stone-100/90 p-0.5 dark:bg-stone-800/90 gap-0.5">
                      <button
                        type="button"
                        onClick={() => setMeasurementUnit('cm')}
                        className={`rounded-md px-3 py-1.5 text-base font-semibold transition-colors ${
                          measurementUnit === 'cm'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700/80'
                        }`}
                      >
                        cm
                      </button>
                      <button
                        type="button"
                        onClick={() => setMeasurementUnit('in')}
                        className={`rounded-md px-3 py-1.5 text-base font-semibold transition-colors ${
                          measurementUnit === 'in'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700/80'
                        }`}
                      >
                        in
                      </button>
                    </div>
                  </div>
                ) : null}
                <table className="min-w-full text-base">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-stone-600 dark:border-stone-700">
                      {measurementTable.columns.map((col) => (
                        <th key={col} className="py-2 pr-4 font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {measurementTable.rows.map((row) => (
                      <tr
                        key={row.join('|')}
                        className="border-b border-stone-100 text-stone-700 dark:border-stone-800 dark:text-stone-300"
                      >
                        {row.map((cell, idx) => (
                          <td key={`${row.join('|')}-${idx}`} className="py-2 pr-4">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="shrink-0 border-t border-stone-200 px-5 py-4 dark:border-stone-600">
                <button
                  type="button"
                  onClick={() => setSizeMeasurementsModalOpen(false)}
                  className="w-full rounded-lg bg-emerald-600 px-3 py-3 text-base font-semibold text-white hover:bg-emerald-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <div className="mt-3 sm:mt-4 border-t border-emerald-200/50 pt-3 sm:pt-4">
        <ReviewList productId={product.id} key={`${product.id}-${reviewVersion}`} />
        <ReviewForm productId={product.id} canReview={canReview} onSubmitted={() => setReviewVersion((v) => v + 1)} />
      </div>

      {(relatedLoading || relatedSimilar.length > 0 || relatedTogether.length > 0) && (
        <div className="mt-10 sm:mt-12 space-y-10 sm:space-y-12 border-t border-stone-200 dark:border-stone-700 pt-8 sm:pt-10">
          {relatedLoading && (
            <p className="text-base text-stone-500 dark:text-stone-400">Loading recommendations…</p>
          )}

          {!relatedLoading && relatedSimilar.length > 0 && (
            <section className="w-full" aria-labelledby="related-similar-heading">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-4 sm:mb-5">
                <div>
                  <h2 id="related-similar-heading" className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                    You may also like
                  </h2>
                  <p className="text-base text-stone-600 dark:text-stone-400 mt-1 max-w-2xl leading-relaxed">
                    Similar items from {product.category?.name || 'this category'}.
                  </p>
                </div>
                <Link
                  to={categoryLink}
                  className="text-base font-semibold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
                >
                  View all in category →
                </Link>
              </div>
              <div className="ecoshop-product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {relatedSimilar.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {!relatedLoading && relatedTogether.length > 0 && (
            <section className="w-full" aria-labelledby="related-together-heading">
              <div className="mb-4 sm:mb-5">
                <h2 id="related-together-heading" className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                  Frequently bought together
                </h2>
                <p className="text-base text-stone-600 dark:text-stone-400 mt-1 max-w-2xl leading-relaxed">
                  Popular pairings shoppers add alongside products like this one (same category).
                </p>
              </div>
              <div className="ecoshop-product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-4xl">
                {relatedTogether.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function InfoAccordion({ title, open, onToggle, className = '', titleClassName = '', children }) {
  return (
    <section className={`rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left py-1 gap-3"
        aria-expanded={open}
      >
        <h3 className={`font-semibold text-base sm:text-lg ${titleClassName}`}>{title}</h3>
        <span className={`text-stone-600 dark:text-stone-400 text-lg leading-none shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  )
}
function AddToCartButton({
  product,
  isAuthenticated,
  requiresSize = false,
  selectedSize = '',
  isShoe = false,
}) {
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
      showToast('Added to cart')
    }
  }

  return (
    <div className="pt-1">
      <div className="flex gap-2">
        <div className="flex items-center rounded-lg border border-stone-300 bg-white">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-2.5 py-2 text-stone-700 hover:bg-stone-50 text-base"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className="w-9 text-center text-base font-medium text-stone-700">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(9, q + 1))}
            className="px-2.5 py-2 text-stone-700 hover:bg-stone-50 text-base"
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
            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-base font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {adding ? 'Adding...' : done ? 'Added to Cart' : 'Add to Cart'}
          </button>
        ) : (
          <Link to="/login" className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-center text-base font-semibold rounded-lg hover:bg-emerald-700">
            Sign In to Add
          </Link>
        )}
      </div>
      {done && isAuthenticated && (
        <Link to="/cart" className="inline-block mt-2 text-emerald-600 hover:underline text-base">
          View cart
        </Link>
      )}
      {requiresSize && !selectedSize && !isShoe && (
        <p className="mt-2 text-base text-stone-600 dark:text-stone-400">Choose a size to add this item to cart.</p>
      )}
    </div>
  )
}
