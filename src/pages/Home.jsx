import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCategoryCardSrc, getCategoryImageObjectPosition } from '../lib/categoryCardImage'
import { mergeCategoryRowForHome } from '../lib/categoryImageLocalStorage'
import { mergeGardenOutdoorsForHome } from '../lib/storefrontCategoryMerge'
import { categoryCardDescription } from '../lib/categoryCardCopy'
import { LeafIcon, TruckIcon, PackageIcon, RecycleIcon, CheckCircleIcon, ArrowUpIcon } from '../components/Icons'

const COMMITMENTS = [
  {
    title: 'Responsible materials',
    description: 'Products made from recycled, organic, and fair trade certified materials.',
    Icon: LeafIcon,
  },
  {
    title: 'Carbon Footprint Reduction',
    description: 'Every product shows estimated carbon footprint savings compared to traditional alternatives.',
    Icon: ArrowUpIcon,
  },
  {
    title: 'Waste Reduction',
    description: 'Products designed for longevity and made from recycled materials to minimize waste.',
    Icon: RecycleIcon,
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
  home: ['Kitchenware', 'Bedding', 'Decor'],
  'personal-care': ['Skincare', 'Haircare', 'Oral Care'],
  kitchen: ['Containers', 'Utensils', 'Drinkware'],
  beauty: ['Makeup', 'Lip Care', 'Face Care'],
  outdoors: ['Gardening', 'Camping', 'Sports'],
  kids: ['Baby Care', 'Toys', 'Clothing'],
  office: ['Notebooks', 'Pens', 'Desk Tools'],
  tech: ['Solar Chargers', 'LED Lights', 'Accessories'],
}

export default function Home() {
  const [categories, setCategories] = useState([])
  const [localVersion, setLocalVersion] = useState(0)

  useEffect(() => {
    document.title = 'EcoShop – Sustainable Shopping'
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

  const displayCategories = useMemo(() => {
    const withLocal = categories.map((c) => mergeCategoryRowForHome(c))
    return mergeGardenOutdoorsForHome(withLocal)
  }, [categories, localVersion])

  return (
    <div>
      {/* Hero */}
      <section className="relative rounded-2xl overflow-hidden mb-8 sm:mb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-emerald-50/90 to-teal-50/80 dark:from-emerald-950/80 dark:via-stone-900 dark:to-emerald-950/60" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200')] bg-cover bg-center opacity-20 mix-blend-multiply dark:opacity-10 dark:mix-blend-soft-light" />
        <div className="relative max-w-2xl mx-auto text-center px-4 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-950 dark:text-emerald-100 mb-3 leading-tight">
            Shop Sustainably, Live Better
          </h1>
          <p className="text-emerald-950/90 dark:text-emerald-100/85 text-base sm:text-lg mb-5 max-w-xl mx-auto leading-relaxed">
            Discover eco-friendly products that make a difference. Every purchase helps reduce your carbon footprint.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center justify-center px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 sm:mb-10">
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4">
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Free delivery on orders £100+</p>
          <p className="text-sm text-stone-700 dark:text-stone-300 mt-1 leading-relaxed">Automatic at checkout.</p>
        </div>
        <div className="rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/35 p-4">
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Tracked orders</p>
          <p className="text-sm text-stone-700 dark:text-stone-300 mt-1 leading-relaxed">Live status in your dashboard.</p>
        </div>
        <div className="rounded-lg border border-lime-200 dark:border-lime-800 bg-lime-50 dark:bg-lime-950/30 p-4">
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">30-day returns</p>
          <p className="text-sm text-stone-700 dark:text-stone-300 mt-1 leading-relaxed">Simple and transparent policy.</p>
        </div>
      </section>

      {/* Our Environmental Commitment */}
      <section className="mb-8 sm:mb-10">
        <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 text-center mb-2">
          Our Environmental Commitment
        </h2>
        <p className="text-stone-700 dark:text-stone-300 text-sm sm:text-base text-center max-w-xl mx-auto mb-6 leading-relaxed">
          We're dedicated to reducing environmental impact through every aspect of our platform.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {COMMITMENTS.map(({ title, description, Icon }) => (
            <div
              key={title}
              className="rounded-xl border border-emerald-100 dark:border-emerald-800/80 bg-white dark:bg-stone-900 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-600 transition-all"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm sm:text-base leading-snug">{title}</h3>
              </div>
              <p className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section>
        <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 mb-1.5">Shop by category</h2>
        <p className="text-stone-700 dark:text-stone-300 text-sm sm:text-base mb-5 max-w-2xl leading-relaxed">
          Choose a category to find eco-friendly products quickly.
        </p>
        <div className="ecoshop-product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div className="p-3 sm:p-4">
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm sm:text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{cat.name}</h3>
                  {cardSubtitle && (
                    <p className="text-stone-700 dark:text-stone-300 text-sm mt-1.5 line-clamp-2 leading-relaxed">{cardSubtitle}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(CATEGORY_ITEM_TAGS[cat.slug] ?? ['Eco Picks']).map((item) => (
                      <span
                        key={`${cat.slug}-${item}`}
                        className="inline-flex items-center rounded-md bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200"
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
          <p className="text-stone-500 dark:text-stone-400">No categories yet. <Link to="/products" className="text-emerald-600 dark:text-emerald-400 hover:underline">Browse all products</Link>.</p>
        )}
      </section>
    </div>
  )
}
