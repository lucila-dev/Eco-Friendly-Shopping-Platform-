import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'
import ProductSearchField from '../components/ProductSearchField'
import {
  categoryIdsForProductFilter,
  categoriesForProductListPills,
} from '../lib/storefrontCategoryMerge'
import { productGridStrideForWidth, productGridStrideViewport } from '../lib/productGridStride'
import { enrichProductsWithReviewStats } from '../lib/productReviewStats'

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
  const qFromUrl = searchParams.get('q') || ''
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [priceMin, setPriceMin] = useState(searchParams.get('priceMin') || '')
  const [priceMax, setPriceMax] = useState(searchParams.get('priceMax') || '')
  const [scoreMin, setScoreMin] = useState(searchParams.get('scoreMin') || '')
  const [minReviewStars, setMinReviewStars] = useState(searchParams.get('minReviewStars') || '')
  const [sortBy, setSortBy] = useState(() => {
    const s = searchParams.get('sort') || ''
    return s === 'rating-desc' ? 'newest' : s || 'newest'
  })
  const [loading, setLoading] = useState(true)
  const [totalMatching, setTotalMatching] = useState(null)
  const [gridStride, setGridStride] = useState(() => productGridStrideViewport())
  const [visibleCount, setVisibleCount] = useState(() => productGridStrideViewport())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterDraft, setFilterDraft] = useState(null)
  const [searchInput, setSearchInput] = useState(qFromUrl)
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (searchParams.get('q')?.trim()) n += 1
    if (searchParams.get('priceMin')) n += 1
    if (searchParams.get('priceMax')) n += 1
    if (searchParams.get('scoreMin')) n += 1
    if (searchParams.get('minReviewStars')) n += 1
    const sort = searchParams.get('sort') || ''
    if (sort && sort !== 'rating-desc') n += 1
    return n
  }, [searchParams])

  const openFilters = () => {
    const rawSort = searchParams.get('sort') || ''
    setFilterDraft({
      search: searchParams.get('q') || '',
      priceMin: searchParams.get('priceMin') || '',
      priceMax: searchParams.get('priceMax') || '',
      scoreMin: searchParams.get('scoreMin') || '',
      minReviewStars: searchParams.get('minReviewStars') || '',
      sort: rawSort === 'rating-desc' ? 'newest' : rawSort || 'newest',
    })
    setFiltersOpen(true)
  }

  const applyFiltersFromPanel = () => {
    if (!filterDraft) return
    const next = new URLSearchParams()
    const d = filterDraft
    if (d.search.trim()) next.set('q', d.search.trim())
    if (d.priceMin !== '') next.set('priceMin', d.priceMin)
    if (d.priceMax !== '') next.set('priceMax', d.priceMax)
    if (d.scoreMin !== '') next.set('scoreMin', d.scoreMin)
    if (d.minReviewStars !== '') next.set('minReviewStars', d.minReviewStars)
    if (d.sort && d.sort !== 'newest') next.set('sort', d.sort)
    const cat = searchParams.get('category')
    if (cat) next.set('category', cat)
    setSearchParams(next, { replace: true })
    setFiltersOpen(false)
  }

  const clearAllFilters = () => {
    setSearchParams({}, { replace: true })
    setFiltersOpen(false)
  }

  useEffect(() => {
    if (!filtersOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setFiltersOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtersOpen])

  useEffect(() => {
    if (!filtersOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [filtersOpen])

  useEffect(() => {
    const onResize = () => setGridStride(productGridStrideForWidth(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (searchParams.get('sort') !== 'rating-desc') return
    const next = new URLSearchParams(searchParams)
    next.delete('sort')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    setSearchInput(qFromUrl)
  }, [qFromUrl])

  useEffect(() => {
    const trimmed = searchInput.trim()
    const urlTrimmed = (searchParamsRef.current.get('q') || '').trim()
    if (trimmed === urlTrimmed) return
    const id = window.setTimeout(() => {
      const next = new URLSearchParams(searchParamsRef.current)
      if (trimmed) next.set('q', trimmed)
      else next.delete('q')
      setSearchParams(next, { replace: true })
    }, 320)
    return () => window.clearTimeout(id)
  }, [searchInput, setSearchParams])

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
    setMinReviewStars(searchParams.get('minReviewStars') || '')
    const rawSort = searchParams.get('sort') || ''
    setSortBy(rawSort === 'rating-desc' ? 'newest' : rawSort || 'newest')
  }, [
    searchParams.get('q'),
    searchParams.get('priceMin'),
    searchParams.get('priceMax'),
    searchParams.get('scoreMin'),
    searchParams.get('minReviewStars'),
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
        .select('id, name, slug, price, image_url, description, sustainability_score, materials, carbon_footprint_saving_kg, category:categories(slug, name)', { count: 'exact' })
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
      let rows = await enrichProductsWithReviewStats(supabase, data ?? [])
      const minStars = parseInt(minReviewStars, 10)
      const hasStarFilter = !Number.isNaN(minStars) && minStars >= 1 && minStars <= 5
      if (hasStarFilter) {
        rows = rows.filter((p) => p.review_avg != null && p.review_avg >= minStars)
      }
      setProducts(rows)
      setTotalMatching(hasStarFilter ? rows.length : typeof count === 'number' ? count : rows.length)
      const stride = productGridStrideForWidth(typeof window !== 'undefined' ? window.innerWidth : 1024)
      setVisibleCount(Math.min(stride, rows.length))
      setLoading(false)
    }
    fetchProducts()
  }, [resolvedCategoryIds, search, priceMin, priceMax, scoreMin, minReviewStars, sortBy])

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
      <div className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">Products</h1>
            {!loading && totalMatching != null && (
              <p className="text-base font-medium text-stone-700 dark:text-stone-300 tabular-nums mt-1">
                {visibleCount < products.length
                  ? `Showing ${Math.min(visibleCount, products.length)} of ${products.length}`
                  : totalMatching > MAX_ROWS
                    ? `Showing ${products.length} of ${totalMatching} products`
                    : `${totalMatching} product${totalMatching === 1 ? '' : 's'}`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={openFilters}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border-2 border-emerald-600 bg-white px-4 py-2.5 text-base font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50 dark:border-emerald-500 dark:bg-stone-800 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-bold text-white tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="mb-5">
        <ProductSearchField
          id="products-page-search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            const trimmed = searchInput.trim()
            const next = new URLSearchParams(searchParamsRef.current)
            if (trimmed) next.set('q', trimmed)
            else next.delete('q')
            setSearchParams(next, { replace: true })
          }}
          placeholder="Search by product name…"
        />
      </div>

      <div className="flex flex-wrap gap-2.5 mb-5">
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(searchParams)
            next.delete('category')
            setSearchParams(next, { replace: true })
          }}
          className={`px-4 py-2 rounded-lg text-base font-semibold ${!categorySlug ? 'bg-emerald-600 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200'}`}
        >
          All
        </button>
        {categoryPills.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.set('category', cat.slug)
              setSearchParams(next, { replace: true })
            }}
            className={`px-4 py-2 rounded-lg text-base font-semibold ${pillIdsSignature(cat.slug) === activePillSignature && activePillSignature ? 'bg-emerald-600 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {filtersOpen && filterDraft && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/50 dark:bg-black/60"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-filters-title"
            className="relative flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-600 dark:bg-stone-900 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 dark:border-stone-700 sm:px-5 sm:py-4">
              <h2 id="product-filters-title" className="text-lg font-bold text-stone-900 dark:text-stone-100 sm:text-xl">
                Filters
              </h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 space-y-5">
              <div>
                <label htmlFor="filter-search" className="block text-base font-semibold text-stone-800 dark:text-stone-200 mb-1.5">
                  Search by name
                </label>
                <input
                  id="filter-search"
                  type="search"
                  value={filterDraft.search}
                  onChange={(e) => setFilterDraft((d) => ({ ...d, search: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && applyFiltersFromPanel()}
                  placeholder="e.g. cotton, bamboo"
                  className="w-full px-3 py-2 text-base leading-normal border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="filter-price-min" className="block text-sm font-semibold text-stone-800 dark:text-stone-200 mb-1.5">Min (GBP)</label>
                  <input
                    id="filter-price-min"
                    type="number"
                    min="0"
                    step="0.01"
                    value={filterDraft.priceMin}
                    onChange={(e) => setFilterDraft((d) => ({ ...d, priceMin: e.target.value }))}
                    placeholder="0"
                    className="w-full px-2.5 py-2 text-base border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label htmlFor="filter-price-max" className="block text-sm font-semibold text-stone-800 dark:text-stone-200 mb-1.5">Max (GBP)</label>
                  <input
                    id="filter-price-max"
                    type="number"
                    min="0"
                    step="0.01"
                    value={filterDraft.priceMax}
                    onChange={(e) => setFilterDraft((d) => ({ ...d, priceMax: e.target.value }))}
                    placeholder="Any"
                    className="w-full px-2.5 py-2 text-base border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="filter-score-min" className="block text-sm font-semibold text-stone-800 dark:text-stone-200 mb-1.5">Min sustainability score</label>
                <input
                  id="filter-score-min"
                  type="number"
                  min="1"
                  max="10"
                  value={filterDraft.scoreMin}
                  onChange={(e) => setFilterDraft((d) => ({ ...d, scoreMin: e.target.value }))}
                  placeholder="1 to 10"
                  title="Minimum sustainability score (1 to 10)"
                  className="w-full max-w-[12rem] px-2.5 py-2 text-base border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="filter-review-stars" className="block text-sm font-semibold text-stone-800 dark:text-stone-200 mb-1.5">
                  Minimum review stars
                </label>
                <select
                  id="filter-review-stars"
                  value={filterDraft.minReviewStars}
                  onChange={(e) => setFilterDraft((d) => ({ ...d, minReviewStars: e.target.value }))}
                  title="Show products with at least this many stars (1–5)"
                  className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 text-base focus:ring-2 focus:ring-emerald-500 min-h-[2.75rem]"
                >
                  <option value="">Any rating</option>
                  <option value="1">1+ stars</option>
                  <option value="2">2+ stars</option>
                  <option value="3">3+ stars</option>
                  <option value="4">4+ stars</option>
                  <option value="5">5 stars only</option>
                </select>
              </div>
              <div>
                <label htmlFor="filter-sort" className="block text-sm font-semibold text-stone-800 dark:text-stone-200 mb-1.5">Sort</label>
                <select
                  id="filter-sort"
                  value={filterDraft.sort}
                  onChange={(e) => setFilterDraft((d) => ({ ...d, sort: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 text-base focus:ring-2 focus:ring-emerald-500 min-h-[2.75rem]"
                >
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="score-desc">Sustainability: high first</option>
                </select>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-stone-200 px-4 py-3 dark:border-stone-700 sm:px-5 sm:py-4">
              <button
                type="button"
                onClick={clearAllFilters}
                className="rounded-lg px-4 py-2.5 text-base font-semibold text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={applyFiltersFromPanel}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-base font-semibold text-white hover:bg-emerald-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ecoshop-product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
