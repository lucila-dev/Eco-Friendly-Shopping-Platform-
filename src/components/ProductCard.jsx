import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getProductImage, productCatalogImageClassName } from '../lib/productImageOverrides'
import { formatCatalogProductName } from '../lib/catalogProductName'
import { getProductMetrics } from '../lib/productMetrics'
import {
  getSizeGuide,
  getShoeVariantTable,
  shoeCartSizeLabel,
  measurementTableForUnit,
  sizeGuideHasFootLengthUnitToggle,
  sizeGuideHasMeasurementUnitToggle,
} from '../lib/productSizeGuide'
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
  const reviewAvg = product.review_avg != null ? Number(product.review_avg) : null
  const reviewCount = Number(product.review_count) || 0
  const reviewStarsRounded = reviewAvg != null ? Math.max(0, Math.min(5, Math.round(reviewAvg))) : 0
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
  const [shoeVariant, setShoeVariant] = useState('mens')
  /** null | 'menu' | 'mens' | 'womens' — shoe size modal step */
  const [shoePickerStep, setShoePickerStep] = useState(null)
  const [shoeModalShowChart, setShoeModalShowChart] = useState(false)
  const [shoeModalMeasureUnit, setShoeModalMeasureUnit] = useState('cm')
  /** After user taps "Use this size" (shoes + apparel) before Confirm & add. */
  const [modalSizeCommitted, setModalSizeCommitted] = useState(false)
  const navigate = useNavigate()
  const sizeGuide = getSizeGuide(product)
  const requiresSize = Boolean(sizeGuide)
  const displayGuide = sizeGuide?.isShoe ? getShoeVariantTable(sizeGuide, shoeVariant) : sizeGuide

  useEffect(() => {
    if (sizeGuide?.isShoe && sizeGuide.defaultVariant) {
      setShoeVariant(sizeGuide.defaultVariant)
    } else {
      setShoeVariant('mens')
    }
  }, [product?.id, sizeGuide?.isShoe, sizeGuide?.defaultVariant])

  useEffect(() => {
    setPendingSize('')
    setModalSizeCommitted(false)
    setShoeModalMeasureUnit('cm')
    setShoeModalShowChart(false)
  }, [shoeVariant, product?.id])

  const addFromCard = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    if (requiresSize) {
      setPendingSize('')
      setModalSizeCommitted(false)
      setShoePickerStep(sizeGuide?.isShoe ? 'menu' : null)
      setShoeModalShowChart(false)
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
    const normalizedSize = sizeGuide.isShoe ? shoeCartSizeLabel(shoeVariant, size) : size
    setSizePickerOpen(false)
    setPendingSize('')
    setShoePickerStep(null)
    setModalSizeCommitted(false)
    setAdding(true)
    const { error } = await upsertCartItem({ userId: user.id, productId: product.id, normalizedSize })
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
    setShoePickerStep(null)
    setModalSizeCommitted(false)
    setShoeModalShowChart(false)
  }

  const onWishlistClick = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    toggle(product.id)
  }

  const cardShoeVariantActive =
    shoePickerStep === 'mens' || shoePickerStep === 'womens' ? shoePickerStep : null
  const cardPickerGuide =
    sizeGuide?.isShoe && cardShoeVariantActive
      ? getShoeVariantTable(sizeGuide, cardShoeVariantActive)
      : displayGuide
  const cardSizeOptions = cardPickerGuide?.options ?? []
  const modalMeasurementTable =
    cardPickerGuide?.rows?.length ? measurementTableForUnit(cardPickerGuide, shoeModalMeasureUnit) : null

  const sizeModal =
    sizePickerOpen && sizeGuide && (sizeGuide.isShoe || displayGuide) && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ecoshop-size-picker-title"
          >
            <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close size picker" onClick={closePicker} />
            <div
              className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-600 dark:bg-stone-800 sm:rounded-2xl"
              onClick={(ev) => ev.stopPropagation()}
            >
              <h2 id="ecoshop-size-picker-title" className="text-base font-semibold text-stone-900 dark:text-stone-100 pr-8">
                {sizeGuide.isShoe && cardShoeVariantActive
                  ? cardShoeVariantActive === 'mens'
                    ? "Men's UK sizes"
                    : "Women's UK sizes"
                  : sizeGuide.title?.trim() || 'Choose your size'}
              </h2>
              <p className="mt-1 text-base text-stone-600 dark:text-stone-400 line-clamp-2">{displayName}</p>
              {!sizeGuide.isShoe && sizeGuide.description?.trim() ? (
                <p className="mt-2 text-base text-stone-600 dark:text-stone-400 leading-relaxed line-clamp-3">{sizeGuide.description.trim()}</p>
              ) : null}
              {sizeGuide.isShoe && shoePickerStep === 'menu' ? (
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShoeVariant('mens')
                      setShoePickerStep('mens')
                      setPendingSize('')
                      setModalSizeCommitted(false)
                      setShoeModalShowChart(false)
                    }}
                    className="w-full rounded-lg border border-stone-300 bg-white py-3 text-base font-semibold text-stone-800 hover:border-emerald-500 hover:bg-emerald-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                  >
                    Men&apos;s UK sizes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShoeVariant('womens')
                      setShoePickerStep('womens')
                      setPendingSize('')
                      setModalSizeCommitted(false)
                      setShoeModalShowChart(false)
                    }}
                    className="w-full rounded-lg border border-stone-300 bg-white py-3 text-base font-semibold text-stone-800 hover:border-emerald-500 hover:bg-emerald-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                  >
                    Women&apos;s UK sizes
                  </button>
                </div>
              ) : null}
              {sizeGuide.isShoe && cardShoeVariantActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setShoePickerStep('menu')
                    setPendingSize('')
                    setModalSizeCommitted(false)
                    setShoeModalShowChart(false)
                  }}
                  className="mt-3 text-base font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  ← Change men&apos;s / women&apos;s
                </button>
              ) : null}
              {(!sizeGuide.isShoe || cardShoeVariantActive) && (
                <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 ${sizeGuide.isShoe ? 'mt-3' : 'mt-4'}`}>
                  {cardSizeOptions.map((opt) => {
                    const selected = pendingSize === opt
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={adding}
                        onClick={() => {
                          setPendingSize(opt)
                          setModalSizeCommitted(false)
                        }}
                        className={`flex h-12 w-full min-w-0 items-center justify-center rounded-lg border px-1 text-sm sm:text-base font-semibold tabular-nums leading-tight disabled:opacity-50 ${
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
              )}
              {cardPickerGuide && sizeGuideHasMeasurementUnitToggle(cardPickerGuide) && (!sizeGuide.isShoe || cardShoeVariantActive) ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShoeModalShowChart((v) => !v)}
                    className="w-full rounded-lg border border-stone-300/80 dark:border-stone-600 bg-emerald-100/40 dark:bg-emerald-900/30 px-3 py-2 text-base font-medium text-stone-700 dark:text-stone-200 hover:border-emerald-400"
                  >
                    {shoeModalShowChart ? 'Hide measurement chart' : 'Measurement chart'}
                  </button>
                  {shoeModalShowChart && modalMeasurementTable ? (
                    <div className="mt-3 overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-600 p-3 dark:bg-stone-900/40">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-base font-medium text-stone-700 dark:text-stone-300">
                          {sizeGuideHasFootLengthUnitToggle(cardPickerGuide) ? 'Foot length' : 'Measurements'}
                        </span>
                        <div className="flex rounded-lg border border-stone-300 dark:border-stone-600 p-0.5 bg-stone-100/90 dark:bg-stone-800/90 gap-0.5">
                          <button
                            type="button"
                            onClick={() => setShoeModalMeasureUnit('cm')}
                            className={`rounded-md px-3 py-1.5 text-base font-semibold transition-colors ${
                              shoeModalMeasureUnit === 'cm'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700/80'
                            }`}
                          >
                            cm
                          </button>
                          <button
                            type="button"
                            onClick={() => setShoeModalMeasureUnit('in')}
                            className={`rounded-md px-3 py-1.5 text-base font-semibold transition-colors ${
                              shoeModalMeasureUnit === 'in'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700/80'
                            }`}
                          >
                            in
                          </button>
                        </div>
                      </div>
                      <table className="min-w-full text-sm sm:text-base">
                        <thead>
                          <tr className="text-left text-stone-600 border-b border-stone-200 dark:border-stone-700">
                            {modalMeasurementTable.columns.map((col) => (
                              <th key={col} className="py-2 pr-3 font-semibold">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {modalMeasurementTable.rows.map((row) => (
                            <tr key={row.join('|')} className="border-b border-stone-100 dark:border-stone-800 text-stone-700 dark:text-stone-300">
                              {row.map((cell, idx) => (
                                <td key={`${row.join('|')}-${idx}`} className="py-2 pr-3">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {!(sizeGuide.isShoe && shoePickerStep === 'menu') &&
                (pendingSize ? (
                  <p className="mt-3 text-center text-base text-stone-600 dark:text-stone-400">
                    {((sizeGuide.isShoe && cardShoeVariantActive) || !sizeGuide.isShoe) && !modalSizeCommitted ? (
                      <>
                        Size{' '}
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {sizeGuide.isShoe ? shoeCartSizeLabel(shoeVariant, pendingSize) : pendingSize}
                        </span>{' '}
                        highlighted — tap &quot;Use this size&quot;, then add to cart.
                      </>
                    ) : (
                      <>
                        Size{' '}
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {sizeGuide.isShoe ? shoeCartSizeLabel(shoeVariant, pendingSize) : pendingSize}
                        </span>{' '}
                        {modalSizeCommitted ? 'confirmed — add to cart below.' : 'selected — confirm to add.'}
                      </>
                    )}
                  </p>
                ) : !sizeGuide.isShoe || cardShoeVariantActive ? (
                  <p className="mt-3 text-center text-base text-stone-500 dark:text-stone-500">
                    Tap a size, then use this size to confirm.
                  </p>
                ) : null)}
              {pendingSize && (cardShoeVariantActive || !sizeGuide.isShoe) ? (
                <button
                  type="button"
                  disabled={modalSizeCommitted || adding}
                  onClick={() => setModalSizeCommitted(true)}
                  className="mt-3 w-full rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-3 text-base font-semibold text-emerald-800 hover:bg-emerald-100 disabled:pointer-events-none disabled:opacity-60 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
                >
                  {modalSizeCommitted ? 'Size confirmed' : 'Use this size'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={confirmAddWithSize}
                disabled={
                  !pendingSize ||
                  adding ||
                  (sizeGuide.isShoe && shoePickerStep === 'menu') ||
                  (sizeGuide.isShoe && cardShoeVariantActive && !modalSizeCommitted) ||
                  (!sizeGuide.isShoe && !modalSizeCommitted)
                }
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
        <div className="relative aspect-[1/1] w-full min-h-0 overflow-hidden bg-stone-100 dark:bg-stone-900">
          <img
            src={displayImage}
            alt={displayName}
            loading="lazy"
            decoding="async"
            className={productCatalogImageClassName}
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
          <div
            className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm"
            aria-label={
              reviewCount > 0
                ? `Average rating ${reviewAvg.toFixed(1)} out of 5 from ${reviewCount} reviews`
                : 'No reviews yet'
            }
          >
            {reviewCount > 0 ? (
              <>
                <span className="text-amber-500 dark:text-amber-400 tracking-tight" aria-hidden>
                  {'★'.repeat(reviewStarsRounded)}
                  {'\u2606'.repeat(5 - reviewStarsRounded)}
                </span>
                <span className="text-stone-600 dark:text-stone-400 tabular-nums font-medium">
                  {reviewAvg.toFixed(1)}
                  <span className="text-stone-500 dark:text-stone-500 font-normal"> / 5</span>
                  <span className="text-stone-500 dark:text-stone-500 font-normal">
                    {' '}
                    ({reviewCount})
                  </span>
                </span>
              </>
            ) : (
              <span className="text-stone-500 dark:text-stone-500">No reviews yet</span>
            )}
          </div>
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
