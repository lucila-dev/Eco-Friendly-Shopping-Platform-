import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCatalogProductName } from '../lib/catalogProductName'
import { useProfile } from '../hooks/useProfile'
import { getProductImage } from '../lib/productImageOverrides'
import { useFormatPrice } from '../hooks/useFormatPrice'

export default function AdminProducts() {
  const { format } = useFormatPrice()
  const { canManageProducts, loading: profileLoading } = useProfile()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => {
    document.title = 'Manage products · EcoShop'
    return () => { document.title = 'EcoShop · Sustainable Shopping' }
  }, [])

  useEffect(() => {
    async function fetch() {
      const [prods, cats] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name'),
      ])
      setProducts(prods.data ?? [])
      setCategories(cats.data ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Remove this product?')) return
    setDeletingId(id)
    await supabase.from('products').delete().eq('id', id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
    setDeletingId(null)
  }

  if (profileLoading || !canManageProducts) {
    return (
      <div>
        <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4">Products</h1>
        {!profileLoading && !canManageProducts && (
          <p className="text-stone-600 dark:text-stone-300">
            Access denied. Dev tools is only available to accounts on the project allowlist.
          </p>
        )}
        {profileLoading && <p className="text-stone-500 dark:text-stone-400">Loading...</p>}
      </div>
    )
  }

  const normalizedSearch = search.trim().toLowerCase()
  const filteredProducts = normalizedSearch
    ? products.filter((p) =>
      p.name?.toLowerCase().includes(normalizedSearch) ||
      p.slug?.toLowerCase().includes(normalizedSearch)
    )
    : products

  const visibleIds = filteredProducts.map((p) => p.id)
  const isAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))

  const toggleOne = (id) => {
    setSelectedIds((prev) => (
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    ))
  }

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      if (isAllVisibleSelected) {
        return prev.filter((id) => !visibleIds.includes(id))
      }
      const merged = new Set([...prev, ...visibleIds])
      return Array.from(merged)
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Remove ${selectedIds.length} selected product(s)?`)) return
    setBulkDeleting(true)
    const { error } = await supabase.from('products').delete().in('id', selectedIds)
    if (!error) {
      setProducts((prev) => prev.filter((p) => !selectedIds.includes(p.id)))
      setSelectedIds([])
    }
    setBulkDeleting(false)
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100">Products</h1>
        <Link
          to="/admin/categories"
          className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          Category images →
        </Link>
      </div>
      <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">Add, edit, or remove catalogue items.</p>
      <div className="mb-6">
        <Link
          to="/admin/products/new"
          className="inline-flex px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
        >
          Add product
        </Link>
      </div>
      <div className="mb-4">
        <label htmlFor="dev-product-search" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
          Search product to edit
        </label>
        <input
          id="dev-product-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product name or slug"
          className="w-full max-w-md px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-500 focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggleAllVisible}
          disabled={filteredProducts.length === 0}
          className="px-3 py-1.5 text-sm border border-stone-300 dark:border-stone-600 rounded-lg text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-50"
        >
          {isAllVisibleSelected ? 'Unselect all' : 'Select all'}
        </button>
        <button
          type="button"
          onClick={handleBulkDelete}
          disabled={selectedIds.length === 0 || bulkDeleting}
          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {bulkDeleting ? 'Deleting...' : `Delete selected (${selectedIds.length})`}
        </button>
      </div>
      {loading ? (
        <p className="text-stone-500 dark:text-stone-400">Loading products...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-600">
          <table className="w-full border-collapse">
            <thead className="bg-stone-100 dark:bg-stone-800/90">
              <tr>
                <th className="text-left p-3 text-stone-700 dark:text-stone-200 font-medium w-12">
                  <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label="Select all visible products"
                  />
                </th>
                <th className="text-left p-3 text-stone-700 dark:text-stone-200 font-medium">Name</th>
                <th className="text-left p-3 text-stone-700 dark:text-stone-200 font-medium">Price</th>
                <th className="text-left p-3 text-stone-700 dark:text-stone-200 font-medium">Score</th>
                <th className="text-left p-3 text-stone-700 dark:text-stone-200 font-medium">Category</th>
                <th className="text-right p-3 text-stone-700 dark:text-stone-200 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-stone-900/70">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="border-t border-stone-200 dark:border-stone-600">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleOne(p.id)}
                      aria-label={`Select ${p.name}`}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800">
                        <img
                          src={getProductImage(p)}
                          alt={formatCatalogProductName(p.name)}
                          className="h-full w-full object-cover object-center"
                          loading="lazy"
                        />
                      </div>
                      <Link
                        to={`/products/${p.slug}`}
                        className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                      >
                        {formatCatalogProductName(p.name)}
                      </Link>
                    </div>
                  </td>
                  <td className="p-3 text-stone-600 dark:text-stone-300">{format(Number(p.price))}</td>
                  <td className="p-3 text-stone-600 dark:text-stone-300">
                    {p.sustainability_score != null ? `${p.sustainability_score}/10` : 'n/a'}
                  </td>
                  <td className="p-3 text-stone-600 dark:text-stone-300">
                    {categories.find((c) => c.id === p.category_id)?.name ?? 'n/a'}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      to={`/admin/products/${p.id}`}
                      className="text-emerald-600 hover:underline text-sm mr-3"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="text-red-600 dark:text-red-400 hover:underline text-sm disabled:opacity-50"
                    >
                      {deletingId === p.id ? 'Deleting...' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && products.length === 0 && (
        <p className="text-stone-500 dark:text-stone-400 mt-4">No products yet. Add one to get started.</p>
      )}
      {!loading && products.length > 0 && filteredProducts.length === 0 && (
        <p className="text-stone-500 dark:text-stone-400 mt-4">No products match your search.</p>
      )}
    </div>
  )
}
