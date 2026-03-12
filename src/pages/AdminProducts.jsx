import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'

export default function AdminProducts() {
  const { isAdmin, loading: profileLoading } = useProfile()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

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

  if (profileLoading || !isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-stone-800 mb-6">Manage products</h1>
        {!profileLoading && !isAdmin && (
          <p className="text-stone-600">Access denied. Only administrators can manage products.</p>
        )}
        {profileLoading && <p className="text-stone-500">Loading...</p>}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Manage products</h1>
        <Link
          to="/admin/products/new"
          className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
        >
          Add product
        </Link>
      </div>
      {loading ? (
        <p className="text-stone-500">Loading products...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-stone-200 rounded-lg overflow-hidden">
            <thead className="bg-stone-100">
              <tr>
                <th className="text-left p-3 text-stone-700 font-medium">Name</th>
                <th className="text-left p-3 text-stone-700 font-medium">Price</th>
                <th className="text-left p-3 text-stone-700 font-medium">Score</th>
                <th className="text-left p-3 text-stone-700 font-medium">Category</th>
                <th className="text-right p-3 text-stone-700 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-stone-200">
                  <td className="p-3">
                    <Link to={`/products/${p.slug}`} className="text-emerald-700 hover:underline font-medium">
                      {p.name}
                    </Link>
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
    </div>
  )
}
