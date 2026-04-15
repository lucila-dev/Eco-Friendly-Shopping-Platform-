import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'
import {
  categoryIdsForProductFilter,
  categoriesForProductListPills,
} from '../lib/storefrontCategoryMerge'
import { productGridStrideForWidth, productGridStrideViewport } from '../lib/productGridStride'

function usePageTitle(title) {
  useEffect(() => {
    document.title = title
    return () => { document.title = 'EcoShop · Sustainable Shopping' }
  }, [title])
}

const MAX_ROWS = 1000

export default function ProductList() {
  usePageTitle('Products · EcoShop')
  const [searchParams, setSearchParams] = useSearchParams()
  const categorySlug = searchParams.get('category') || ''
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [priceMin, setPriceMin] = useState(searchParams.get('priceMin') || '')
  const [priceMax, setPriceMax] = useState(searchParams.get('priceMax') || '')
  const [scoreMin, setScoreMin] = useState(searchParams.get('scoreMin') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')
  const [loading, setLoading] = useState(true)
  const [totalMatching, setTotalMatching] = useState(null)
  const [gridStride, setGridStride] = useState(() => productGridStrideViewport())
  const [visibleCount, setVisibleCount] = useState(() => productGridStrideViewport())

  useEffect(() => {
    const onResize = () => setGridStride(productGridStrideForWidth(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    async function fetchCategories() {
      setCategoriesLoading(true)
      const { data } = await supabase.from('categories').select('id, name, slug').order('name')
      setCategories(data ?? [])
      setCategoriesLoading(false)
    }
    fetchCategories()
  }, [])

  useEffect(() => {
    setSearch(searchParams.get('q') || '')
    setPriceMin(searchParams.get('priceMin') || '')
    setPriceMax(searchParams.get('priceMax') || '')
    setScoreMin(searchParams.get('scoreMin') || '')
    setSortBy(searchParams.get('sort') || 'newest')
  }, [
    searchParams.get('q'),
    searchParams.get('priceMin'),
    searchParams.get('priceMax'),
    searchParams.get('scoreMin'),
    searchParams.get('sort'),
    searchParams.get('category'),
  ])

  const resolvedCategoryIds = useMemo(() => {
    if (!categorySlug) return null
    if (categoriesLoading) return undefined
    if (categories.length === 0) return null
    return categoryIdsForProductFilter(categorySlug, categories)
  }, [categorySlug, categories, categoriesLoading])

  useEffect(() => {
    async function fetchProducts() {
      if (resolvedCategoryIds === undefined) {
        setLoading(true)
        setProducts([])
        setTotalMatching(null)
        setVisibleCount(0)
        return
      }

      setLoading(true)
      let query = supabase
        .from('products')
        .select('id, name, slug, price, image_url, sustainability_score, materials, carbon_footprint_saving_kg, category:categories(slug, name)', { count: 'exact' })
        .range(0, MAX_ROWS - 1)

      if (sortBy === 'price-asc') query = query.order('price', { ascending: true })
      else if (sortBy === 'price-desc') query = query.order('price', { ascending: false })
      else if (sortBy === 'score-desc') query = query.order('sustainability_score', { ascending: false })
      else query = query.order('created_at', { ascending: false })

      if (resolvedCategoryIds?.length === 1) {
        query = query.eq('category_id', resolvedCategoryIds[0])
      } else if (resolvedCategoryIds && resolvedCategoryIds.length > 1) {
        query = query.in('category_id', resolvedCategoryIds)
      }
      if (search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`)
      }
      if (priceMin !== '') {
        const n = parseFloat(priceMin)
        if (!Number.isNaN(n)) query = query.gte('price', n)
      }
      if (priceMax !== '') {
        const n = parseFloat(priceMax)
        if (!Number.isNaN(n)) query = query.lte('price', n)
      }
      if (scoreMin !== '') {
        const n = parseInt(scoreMin, 10)
        if (!Number.isNaN(n)) query = query.gte('sustainability_score', n)
      }

      const { data, error, count } = await query
      if (error) {
        console.error(error)
        setLoading(false)
        return
      }
      const rows = data ?? []
      setProducts(rows)
      setTotalMatching(typeof count === 'number' ? count : null)
      const stride = productGridStrideForWidth(typeof window !== 'undefined' ? window.innerWidth : 1024)
      setVisibleCount(Math.min(stride, rows.length))
      setLoading(false)
    }
    fetchProducts()
  }, [resolvedCategoryIds, search, priceMin, priceMax, scoreMin, sortBy])

  const applyFilters = () => {
    const next = new URLSearchParams(searchParams)
    if (search.trim()) next.set('q', search.trim())
    else next.delete('q')
    if (priceMin !== '') next.set('priceMin', priceMin)
    else next.delete('priceMin')
    if (priceMax !== '') next.set('priceMax', priceMax)
    else next.delete('priceMax')
    if (scoreMin !== '') next.set('scoreMin', scoreMin)
    else next.delete('scoreMin')
    if (sortBy && sortBy !== 'newest') next.set('sort', sortBy)
    else next.delete('sort')
    setSearchParams(next, { replace: true })
  }

  const categoryPills = categoriesForProductListPills(categories)
  const pillIdsSignature = (slug) => {
    const ids = categoryIdsForProductFilter(slug, categories)
    return ids?.length ? [...ids].sort().join(',') : ''
  }
  const activePillSignature =
    resolvedCategoryIds != null && resolvedCategoryIds.length > 0
      ? [...resolvedCategoryIds].sort().join(',')
      : ''

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">Products</h1>
        {!loading && totalMatching != null && (
          <p className="text-base font-medium text-stone-700 dark:text-stone-300 tabular-nums">
            {visibleCount < products.length
              ? `Showing ${Math.min(visibleCount, products.length)} of ${products.length}`
              : totalMatching > MAX_ROWS
                ? `Showing ${products.length} of ${totalMatching} products`
                : `${totalMatching} product${totalMatching === 1 ? '' : 's'}`}
          </p>
        )}
      </div>

      <div className="max-w-6xl rounded-xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-white to-emerald-50 dark:from-stone-900 dark:to-emerald-950/40 p-3 sm:p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full min-w-[12rem] max-w-md flex-1">
            <label htmlFor="search" className="block text-base font-semibold text-stone-800 dark:text-stone-200 mb-1.5">Search by name</label>
            <input
              id="search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              placeholder="e.g. cotton, bamboo"
              className="w-full px-3 py-2 text-base leading-normal border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label htmlFor="priceMin" className="block text-base font-semibold text-stone-800 dark:text-stone-200 mb-1.5">Min (GBP)</label>
              <input
                id="priceMin"
                type="number"
                min="0"
                step="0.01"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="0"
                className="w-28 px-2.5 py-2 text-base border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="priceMax" className="block text-base font-semibold text-stone-800 dark:text-stone-200 mb-1.5">Max (GBP)</label>
              <input
                id="priceMax"
                type="number"
                min="0"
                step="0.01"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="Any"
                className="w-28 px-2.5 py-2 text-base border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="scoreMin" className="block text-base font-semibold text-stone-800 dark:text-stone-200 mb-1.5">Min score</label>
              <input
                id="scoreMin"
                type="number"
                min="1"
                max="10"
                value={scoreMin}
                onChange={(e) => setScoreMin(e.target.value)}
                placeholder="1 to 10"
                title="Minimum sustainability score (1 to 10)"
                className="w-24 px-2.5 py-2 text-base border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="sortBy" className="block text-base font-semibold text-stone-800 dark:text-stone-200 mb-1.5">Sort</label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 text-base focus:ring-2 focus:ring-emerald-500 min-h-[2.75rem]"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="score-desc">Sustainability: high first</option>
              </select>
            </div>
            <button
              type="button"
              onClick={applyFilters}
              className="px-5 py-2.5 text-base font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Apply filters
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 mb-5">
        <button
          type="button"
          onClick={() => setSearchParams({})}
          className={`px-4 py-2 rounded-lg text-base font-semibold ${!categorySlug ? 'bg-emerald-600 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200'}`}
        >
          All
        </button>
        {categoryPills.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), category: cat.slug })}
            className={`px-4 py-2 rounded-lg text-base font-semibold ${pillIdsSignature(cat.slug) === activePillSignature && activePillSignature ? 'bg-emerald-600 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="ecoshop-product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {products.slice(0, visibleCount).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {!loading && products.length > visibleCount && (
        <div className="flex justify-center mt-6 sm:mt-8">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => Math.min(c + gridStride, products.length))}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-base font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm border border-emerald-700/30 transition-colors"
          >
            Show more
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      )}
      {loading && <p className="text-center text-stone-600 dark:text-stone-400 text-base font-medium py-6">Loading...</p>}
      {!loading && products.length === 0 && (
        <p className="text-stone-700 dark:text-stone-300 text-base py-6 leading-relaxed max-w-prose">No products found. Try different filters or search.</p>
      )}
    </div>
  )
}
