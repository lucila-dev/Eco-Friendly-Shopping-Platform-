import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'

export default function AdminProducts() {
  const { canManageProducts, loading: profileLoading, role } = useProfile()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => {
    document.title = 'Manage products – EcoShop'
    return () => { document.title = 'EcoShop – Sustainable Shopping' }
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
        <h1 className="text-2xl font-bold text-stone-800 mb-6">Developer Product Management</h1>
        {!profileLoading && !canManageProducts && (
          <p className="text-stone-600">Access denied. Only owners/developers/admins can manage products.</p>
        )}
        {profileLoading && <p className="text-stone-500">Loading...</p>}
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
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-stone-800">Developer Product Management</h1>
        <Link
          to="/admin/products/new"
          className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
        >
          Add product
        </Link>
      </div>
      <p className="text-sm text-stone-500 mb-6">Current role: {role}</p>
      <div className="mb-4">
        <label htmlFor="dev-product-search" className="block text-sm font-medium text-stone-700 mb-1">
          Search product to edit
        </label>
        <input
          id="dev-product-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product name or slug"
          className="w-full max-w-md px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggleAllVisible}
          disabled={filteredProducts.length === 0}
          className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-100 disabled:opacity-50"
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
        <p className="text-stone-500">Loading products...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-stone-200 rounded-lg overflow-hidden">
            <thead className="bg-stone-100">
              <tr>
                <th className="text-left p-3 text-stone-700 font-medium w-12">
                  <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label="Select all visible products"
                  />
                </th>
                <th className="text-left p-3 text-stone-700 font-medium">Name</th>
                <th className="text-left p-3 text-stone-700 font-medium">Price</th>
                <th className="text-left p-3 text-stone-700 font-medium">Score</th>
                <th className="text-left p-3 text-stone-700 font-medium">Category</th>
                <th className="text-right p-3 text-stone-700 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id} className="border-t border-stone-200">
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
                      <img
                        src={p.image_url || '/placeholder.svg'}
                        alt={p.name}
                        className="w-10 h-10 rounded-md object-cover border border-stone-200"
                      />
                      <Link to={`/products/${p.slug}`} className="text-emerald-700 hover:underline font-medium">
                        {p.name}
                      </Link>
                    </div>
                  </td>
                  <td className="p-3 text-stone-600">${Number(p.price).toFixed(2)}</td>
                  <td className="p-3 text-stone-600">{p.sustainability_score ?? '–'}/10</td>
                  <td className="p-3 text-stone-600">
                    {categories.find((c) => c.id === p.category_id)?.name ?? '–'}
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
                      className="text-red-600 hover:underline text-sm disabled:opacity-50"
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
      {!loading && products.length === 0 && <p className="text-stone-500 mt-4">No products yet. Add one to get started.</p>}
      {!loading && products.length > 0 && filteredProducts.length === 0 && (
        <p className="text-stone-500 mt-4">No products match your search.</p>
      )}
    </div>
  )
}
