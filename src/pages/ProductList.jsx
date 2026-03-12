import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'

function usePageTitle(title) {
  useEffect(() => {
    document.title = title
    return () => { document.title = 'EcoShop – Sustainable Shopping' }
  }, [title])
}

const PAGE_SIZE = 12

export default function ProductList() {
  usePageTitle('Products – EcoShop')
  const [searchParams, setSearchParams] = useSearchParams()
  const categorySlug = searchParams.get('category') || ''
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [priceMin, setPriceMin] = useState(searchParams.get('priceMin') || '')
  const [priceMax, setPriceMax] = useState(searchParams.get('priceMax') || '')
  const [scoreMin, setScoreMin] = useState(searchParams.get('scoreMin') || '')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('id, name, slug').order('name')
      setCategories(data ?? [])
    }
    fetchCategories()
  }, [])

  useEffect(() => {
    if (!categorySlug || categories.length === 0) {
      setSelectedCategoryId(null)
      return
    }
    const cat = categories.find((c) => c.slug === categorySlug)
    setSelectedCategoryId(cat?.id ?? null)
  }, [categorySlug, categories])

  useEffect(() => {
    setPage(0)
    setProducts([])
    setHasMore(true)
  }, [selectedCategoryId, search, priceMin, priceMax, scoreMin])

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)
      let query = supabase
        .from('products')
        .select('id, name, slug, price, image_url, sustainability_score', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (selectedCategoryId) {
        query = query.eq('category_id', selectedCategoryId)
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

      const { data, error } = await query
      if (error) {
        console.error(error)
        setLoading(false)
        return
      }
      setProducts((prev) => (page === 0 ? (data ?? []) : [...prev, ...(data ?? [])]))
      setHasMore((data?.length ?? 0) === PAGE_SIZE)
      setLoading(false)
    }
    fetchProducts()
  }, [selectedCategoryId, search, priceMin, priceMax, scoreMin, page])

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
    setSearchParams(next, { replace: true })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Products</h1>

      {/* Search */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="search" className="block text-sm font-medium text-stone-700 mb-1">Search by name</label>
          <input
            id="search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="e.g. cotton, bamboo"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label htmlFor="priceMin" className="block text-sm font-medium text-stone-700 mb-1">Min price ($)</label>
            <input
              id="priceMin"
              type="number"
              min="0"
              step="0.01"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="0"
              className="w-24 px-2 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="priceMax" className="block text-sm font-medium text-stone-700 mb-1">Max price ($)</label>
            <input
              id="priceMax"
              type="number"
              min="0"
              step="0.01"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="Any"
              className="w-24 px-2 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="scoreMin" className="block text-sm font-medium text-stone-700 mb-1">Min sustainability (1–10)</label>
            <input
              id="scoreMin"
              type="number"
              min="1"
              max="10"
              value={scoreMin}
              onChange={(e) => setScoreMin(e.target.value)}
              placeholder="Any"
              className="w-20 px-2 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={applyFilters}
            className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
          >
            Apply filters
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setSearchParams({})}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!selectedCategoryId ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'}`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), category: cat.slug })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${selectedCategoryId === cat.id ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {loading && <p className="text-center text-stone-500 py-4">Loading...</p>}
      {!loading && hasMore && products.length > 0 && (
        <div className="text-center py-6">
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300"
          >
            Load more
          </button>
        </div>
      )}
      {!loading && products.length === 0 && (
        <p className="text-stone-500 py-8">No products found. Try different filters or search.</p>
      )}
    </div>
  )
}
