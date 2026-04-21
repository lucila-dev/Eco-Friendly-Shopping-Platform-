import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCategoryCardSrc, getCategoryImageObjectPosition } from '../lib/categoryCardImage'
import { mergeCategoryRowForHome } from '../lib/categoryImageLocalStorage'
import { mergeGardenOutdoorsForHome, mergeHomeOfficeForHome } from '../lib/storefrontCategoryMerge'
import { categoryCardDescription } from '../lib/categoryCardCopy'
import { MaterialsIcon, TruckIcon, PackageIcon, WasteReductionIcon, CheckCircleIcon, CarbonReductionIcon } from '../components/Icons'
import ProductCard from '../components/ProductCard'
import HomeHeroProductSearch from '../components/HomeHeroProductSearch'
import { FREE_SHIPPING_MIN_SUBTOTAL } from '../lib/shipping'
import { useFormatPrice } from '../hooks/useFormatPrice'

const COMMITMENTS = [
  {
    title: 'Responsible materials',
    description: 'Products made from recycled, organic, and fair trade certified materials.',
    Icon: MaterialsIcon,
  },
  {
    title: 'Carbon Footprint Reduction',
    description: 'Every product shows estimated carbon footprint savings compared to traditional alternatives.',
    Icon: CarbonReductionIcon,
  },
  {
    title: 'Waste Reduction',
    description: 'Products designed for longevity and made from recycled materials to minimize waste.',
    Icon: WasteReductionIcon,
  },
  {
    title: 'Green Shipping',
    description: 'Optimized logistics and carbon-neutral delivery options to reduce transportation emissions.',
    Icon: TruckIcon,
  },
  {
    title: 'Low-waste packaging',
    description: 'Minimal, recyclable, and biodegradable packaging materials.',
    Icon: PackageIcon,
  },
  {
    title: 'Conscious Curation',
    description: 'Every product is carefully vetted for sustainability credentials and environmental impact.',
    Icon: CheckCircleIcon,
  },
]

const CATEGORY_ITEM_TAGS = {
  fashion: ['T-Shirts', 'Pants', 'Dresses'],
  home: ['Kitchenware', 'Bedding', 'Office'],
  'personal-care': ['Skincare', 'Haircare', 'Oral Care'],
  kitchen: ['Containers', 'Utensils', 'Drinkware'],
  beauty: ['Makeup', 'Lip Care', 'Face Care'],
  outdoors: ['Gardening', 'Camping', 'Sports'],
  kids: ['Baby Care', 'Toys', 'Clothing'],
  'food-drink': ['Pantry', 'Beverages', 'Snacks'],
  tech: ['Solar Chargers', 'LED Lights', 'Accessories'],
}

const FEATURED_PRODUCT_LIMIT = 12
/** Ignore tiny scroll offsets so the left fade/button never appear at the true start. */
const FEATURED_SCROLL_EDGE_SLACK = 16

export default function Home() {
  const { format } = useFormatPrice()
  const [categories, setCategories] = useState([])
  const [localVersion, setLocalVersion] = useState(0)
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [featuredLoading, setFeaturedLoading] = useState(true)
  const [featuredCanScrollLeft, setFeaturedCanScrollLeft] = useState(false)
  const [featuredCanScrollRight, setFeaturedCanScrollRight] = useState(false)
  const featuredScrollRef = useRef(null)

  const updateFeaturedScrollState = useCallback(() => {
    const el = featuredScrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const maxScroll = Math.max(0, scrollWidth - clientWidth)
    setFeaturedCanScrollLeft(scrollLeft > FEATURED_SCROLL_EDGE_SLACK)
    setFeaturedCanScrollRight(scrollLeft < maxScroll - FEATURED_SCROLL_EDGE_SLACK)
  }, [])

  const scrollFeaturedRow = useCallback(
    (direction) => {
      const el = featuredScrollRef.current
      if (!el) return
      const step = Math.min(el.clientWidth * 0.75, 320)
      el.scrollBy({ left: direction === 'prev' ? -step : step, behavior: 'smooth' })
    },
    [],
  )

  useEffect(() => {
    document.title = 'EcoShop · Sustainable Shopping'
  }, [])

  useEffect(() => {
    function onLocalCategoryUpdate() {
      setLocalVersion((v) => v + 1)
    }
    window.addEventListener('ecoshop_category_home', onLocalCategoryUpdate)
    return () => window.removeEventListener('ecoshop_category_home', onLocalCategoryUpdate)
  }, [])

  useEffect(() => {
    async function fetchCategories() {
      const full = await supabase
        .from('categories')
        .select('id, name, slug, description, image_url, image_focus_y')
        .order('name')
      if (!full.error) {
        setCategories(full.data ?? [])
        return
      }
      if (import.meta.env.DEV) {
        console.warn('[EcoShop] categories select (with image columns) failed; retrying basic columns:', full.error.message)
      }
      const basic = await supabase
        .from('categories')
        .select('id, name, slug, description')
        .order('name')
      setCategories((basic.data ?? []).map((c) => ({ ...c, image_url: null, image_focus_y: 50 })))
    }
    fetchCategories()
  }, [])

  useEffect(() => {
    async function fetchFeatured() {
      setFeaturedLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select(
          'id, name, slug, price, image_url, sustainability_score, materials, carbon_footprint_saving_kg, category:categories(slug, name)',
        )
        .order('sustainability_score', { ascending: false, nullsFirst: false })
        .order('carbon_footprint_saving_kg', { ascending: false, nullsFirst: false })
        .limit(FEATURED_PRODUCT_LIMIT)
      if (error && import.meta.env.DEV) {
        console.warn('[EcoShop] home featured products:', error.message)
      }
      setFeaturedProducts(data ?? [])
      setFeaturedLoading(false)
    }
    fetchFeatured()
  }, [])

  useEffect(() => {
    if (featuredLoading || featuredProducts.length === 0) return
    const el = featuredScrollRef.current
    if (!el) return

    const sync = () => updateFeaturedScrollState()
    /** Hard left edge on load so a tiny layout offset never shows the “previous” overlay on the first card. */
    el.scrollLeft = 0
    sync()
    const raf = requestAnimationFrame(sync)

    el.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null
    ro?.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      ro?.disconnect()
    }
  }, [featuredLoading, featuredProducts, updateFeaturedScrollState])

  const displayCategories = useMemo(() => {
    const withLocal = categories.map((c) => mergeCategoryRowForHome(c))
    return mergeGardenOutdoorsForHome(mergeHomeOfficeForHome(withLocal))
  }, [categories, localVersion])

  return (
    <div>
      <section className="relative mb-8 sm:mb-10 min-h-[20rem] sm:min-h-[26rem] md:min-h-[30rem] rounded-2xl">
        {/* Clip backgrounds only so the search suggestions can extend outside the hero card */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          {/* Image under the scrim so dark mode stays visible (avoids 10% opacity + soft-light on the photo) */}
          <div
            className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1600')] bg-cover bg-center"
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/90 via-emerald-50/86 to-teal-50/84 dark:from-emerald-950/68 dark:via-stone-900/62 dark:to-emerald-950/58" />
        </div>
        <div className="relative z-10 flex min-h-[20rem] sm:min-h-[26rem] md:min-h-[30rem] flex-col items-center justify-center px-4 py-12 text-center sm:py-14 md:py-16 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-emerald-950 dark:text-emerald-100 mb-5 leading-tight">
            Shop Sustainably, Live Better
          </h1>
          <p className="text-emerald-950/90 dark:text-emerald-100/85 text-lg sm:text-xl md:text-2xl mb-6 max-w-xl mx-auto leading-relaxed">
            Discover eco-friendly products that make a difference. Every purchase helps reduce your carbon footprint.
          </p>
          <HomeHeroProductSearch />
          <Link
            to="/products"
            className="inline-flex items-center justify-center px-8 py-3.5 text-base sm:text-lg font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
          >
            Shop Now
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 sm:mb-10">
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-5 sm:p-6">
          <p className="text-base font-semibold text-stone-900 dark:text-stone-100">
            Free delivery on orders {format(FREE_SHIPPING_MIN_SUBTOTAL)}+
          </p>
          <p className="text-base text-stone-700 dark:text-stone-300 mt-2 leading-relaxed">Automatic at checkout.</p>
        </div>
        <div className="rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/35 p-5 sm:p-6">
          <p className="text-base font-semibold text-stone-900 dark:text-stone-100">Tracked orders</p>
          <p className="text-base text-stone-700 dark:text-stone-300 mt-2 leading-relaxed">Live status in your dashboard.</p>
        </div>
        <div className="rounded-lg border border-lime-200 dark:border-lime-800 bg-lime-50 dark:bg-lime-950/30 p-5 sm:p-6">
          <p className="text-base font-semibold text-stone-900 dark:text-stone-100">30-day returns</p>
          <p className="text-base text-stone-700 dark:text-stone-300 mt-2 leading-relaxed">Simple and transparent policy.</p>
        </div>
      </section>

      <section className="mb-8 sm:mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 text-center mb-3">
          Our Environmental Commitment
        </h2>
        <p className="text-stone-700 dark:text-stone-300 text-base sm:text-lg text-center max-w-xl mx-auto mb-8 leading-relaxed">
          We're dedicated to reducing environmental impact through every aspect of our platform.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {COMMITMENTS.map(({ title, description, Icon }) => (
            <div
              key={title}
              className="rounded-xl border border-emerald-100 dark:border-emerald-800/80 bg-white dark:bg-stone-900 p-5 sm:p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-base sm:text-lg leading-snug">{title}</h3>
              </div>
              <p className="text-stone-700 dark:text-stone-300 text-base leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-2">
        <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">Shop by category</h2>
        <p className="text-stone-700 dark:text-stone-300 text-base sm:text-lg mb-6 max-w-xl leading-relaxed">
          Choose a category to find eco-friendly products quickly.
        </p>
        <div className="ecoshop-product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4">
          {displayCategories.map((cat) => {
            const cardSubtitle = categoryCardDescription(cat)
            return (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className="block rounded-xl border border-emerald-100 dark:border-emerald-800/70 bg-white dark:bg-stone-900 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 group"
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-stone-200 dark:bg-stone-800">
                  <img
                    src={getCategoryCardSrc(cat)}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-[object-position] duration-300"
                    style={{ objectPosition: getCategoryImageObjectPosition(cat.image_focus_y) }}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-base sm:text-lg group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{cat.name}</h3>
                  {cardSubtitle && (
                    <p className="text-stone-700 dark:text-stone-300 text-base mt-2 line-clamp-2 leading-relaxed">{cardSubtitle}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(CATEGORY_ITEM_TAGS[cat.slug] ?? ['Eco Picks']).map((item) => (
                      <span
                        key={`${cat.slug}-${item}`}
                        className="inline-flex items-center rounded-md bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-1 text-base font-semibold text-emerald-800 dark:text-emerald-200"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        {displayCategories.length === 0 && (
          <p className="text-stone-500 dark:text-stone-400 text-base">No categories yet. <Link to="/products" className="text-emerald-600 dark:text-emerald-400 hover:underline">Browse all products</Link>.</p>
        )}
      </section>

      {(featuredLoading || featuredProducts.length > 0) && (
        <section className="mb-8 sm:mb-10 mt-12 sm:mt-16 pt-2 sm:pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100">Recommended picks</h2>
            <Link
              to="/products?sort=score-desc"
              className="shrink-0 inline-flex items-center justify-center text-base font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 underline-offset-2 hover:underline"
            >
              View all products
            </Link>
          </div>
          {featuredLoading ? (
            <p className="text-stone-500 dark:text-stone-400 text-base py-8 text-center">Loading recommendations…</p>
          ) : (
            <div className="relative min-w-0 rounded-2xl border border-stone-200/60 dark:border-stone-600/45 bg-white/80 dark:bg-stone-900/40 py-3 sm:py-4 shadow-sm">
              <div
                ref={featuredScrollRef}
                className={`flex gap-4 overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory pb-1 pt-0.5 [scrollbar-width:thin] transition-[padding] duration-200 ease-out ${
                  featuredCanScrollLeft ? 'pl-12 scroll-pl-12' : 'pl-3 scroll-pl-3'
                } ${featuredCanScrollRight ? 'pr-12 scroll-pr-12' : 'pr-3 scroll-pr-3'}`}
              >
                {featuredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex min-h-0 w-[min(17.5rem,calc(100vw-3.5rem))] shrink-0 snap-start flex-col self-stretch sm:w-[17.5rem]"
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
              {featuredCanScrollLeft && (
                <button
                  type="button"
                  onClick={() => scrollFeaturedRow('prev')}
                  className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200/90 bg-white text-stone-800 shadow-md transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/80 dark:hover:text-emerald-200"
                  aria-label="See previous recommended products"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {featuredCanScrollRight && (
                <button
                  type="button"
                  onClick={() => scrollFeaturedRow('next')}
                  className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200/90 bg-white text-stone-800 shadow-md transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/80 dark:hover:text-emerald-200"
                  aria-label="See more recommended products"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </section>
      )}

      <section
        className="relative w-screen max-w-[100vw] left-1/2 -translate-x-1/2 mt-10 sm:mt-12 bg-emerald-600 dark:bg-emerald-700 text-white py-10 sm:py-14 px-4 sm:px-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
        aria-labelledby="impact-heading"
      >
        <div className="max-w-3xl mx-auto text-center px-2">
          <h2 id="impact-heading" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">
            Together We&apos;re Making a Difference
          </h2>
          <p className="text-base sm:text-lg text-emerald-50/95 max-w-xl mx-auto leading-relaxed mb-10 sm:mb-12">
            Join thousands of eco-conscious shoppers reducing their carbon footprint
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
            <div>
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold tabular-nums text-white">12,500+</p>
              <p className="text-base sm:text-lg text-emerald-100/90 mt-2 font-medium">Products Sold</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold tabular-nums text-white">25 tons</p>
              <p className="text-base sm:text-lg text-emerald-100/90 mt-2 font-medium">
                CO<span className="text-[0.75em]">₂</span> Saved
              </p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold tabular-nums text-white">8,300+</p>
              <p className="text-base sm:text-lg text-emerald-100/90 mt-2 font-medium">Happy Customers</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
