import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'

export default function AdminProductForm() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { canManageProducts, loading: profileLoading } = useProfile()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    image_url: '',
    category_id: '',
    sustainability_score: '',
    materials: '',
    carbon_footprint_saving_kg: '',
  })

  useEffect(() => {
    document.title = isNew ? 'Add product · EcoShop' : 'Edit product · EcoShop'
    return () => { document.title = 'EcoShop · Sustainable Shopping' }
  }, [isNew, id])

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('categories').select('id, name, slug').order('name')
      setCategories(data ?? [])
    })()
  }, [])

  useEffect(() => {
    if (!isNew && id) {
      ;(async () => {
        const { data, error: e } = await supabase.from('products').select('*').eq('id', id).single()
        if (e) {
          setError(e.message)
          setLoading(false)
          return
        }
        if (data) {
          setForm({
            name: data.name ?? '',
            slug: data.slug ?? '',
            description: data.description ?? '',
            price: data.price != null ? String(data.price) : '',
            image_url: data.image_url ?? '',
            category_id: data.category_id ?? '',
            sustainability_score: data.sustainability_score != null ? String(data.sustainability_score) : '',
            materials: data.materials ?? '',
            carbon_footprint_saving_kg: data.carbon_footprint_saving_kg != null ? String(data.carbon_footprint_saving_kg) : '',
          })
        }
        setLoading(false)
      })()
    }
  }, [isNew, id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      description: form.description.trim() || null,
      price: parseFloat(form.price) || 0,
      image_url: form.image_url.trim() || null,
      category_id: form.category_id || null,
      sustainability_score: form.sustainability_score ? parseInt(form.sustainability_score, 10) : null,
      materials: form.materials.trim() || null,
      carbon_footprint_saving_kg: form.carbon_footprint_saving_kg
        ? parseFloat(String(form.carbon_footprint_saving_kg).replace(',', '.'))
        : null,
    }

    if (isNew) {
      const { error: err } = await supabase.from('products').insert(payload)
      if (err) {
        setError(err.message)
        setSaving(false)
        return
      }
      navigate('/admin/products', { replace: true, state: { scrollToProducts: true } })
    } else {
      const { error: err } = await supabase.from('products').update(payload).eq('id', id)
      if (err) {
        setError(err.message)
        setSaving(false)
        return
      }
      navigate('/admin/products', { replace: true, state: { scrollToProducts: true } })
    }

    setSaving(false)
  }

  const handleImageUpload = async (file) => {
    if (!file) return

    setError('')
    setUploadingImage(true)

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeSlug = (form.slug || form.name || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const filePath = `products/${safeSlug || 'product'}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase
      .storage
      .from('product-images')
      .upload(filePath, file, { upsert: false })

    if (uploadError) {
      setError(`Image upload failed: ${uploadError.message}`)
      setUploadingImage(false)
      return
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(filePath)
    setForm((f) => ({ ...f, image_url: data.publicUrl }))
    setUploadingImage(false)
  }

  if (profileLoading || !canManageProducts) {
    return (
      <div>
        <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4">{isNew ? 'Add product' : 'Edit product'}</h1>
        {!profileLoading && !canManageProducts && (
          <p className="text-stone-600 dark:text-stone-300">Access denied. Dev tools is allowlist-only.</p>
        )}
      </div>
    )
  }

  if (!isNew && loading) return <p className="text-stone-500 dark:text-stone-400">Loading...</p>

  const selectedCategorySlug = categories.find((c) => c.id === form.category_id)?.slug
  const materialsFieldLabel =
    String(selectedCategorySlug ?? '').toLowerCase() === 'food-drink'
      ? 'Ingredients used'
      : 'Materials used'
  const materialsPlaceholder =
    String(selectedCategorySlug ?? '').toLowerCase() === 'food-drink'
      ? 'e.g. Oats, maple syrup, coconut oil'
      : 'e.g. Organic cotton, recycled polyester'

  return (
    <div className="max-w-2xl">
      <Link
        to="/admin/products"
        className="text-sm text-stone-500 dark:text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-4 inline-block"
      >
        ← Back to products
      </Link>
      <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4">{isNew ? 'Add product' : 'Edit product'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Name *</label>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Slug *</label>
          <input type="text" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} required placeholder="e.g. organic-cotton-tshirt" className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Price *</label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Image URL</label>
            <input type="url" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500" />
            {form.image_url && (
              <img
                src={form.image_url}
                alt="Product preview"
                className="mt-2 h-20 w-20 rounded-md object-cover border border-stone-200 dark:border-stone-600"
              />
            )}
            <div className="mt-2 p-2 rounded-md border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900/80">
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                {uploadingImage ? 'Uploading…' : 'Or upload image file'}
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                disabled={uploadingImage}
                onChange={(e) => {
                  const picked = e.target.files?.[0] ?? null
                  e.target.value = ''
                  if (picked) void handleImageUpload(picked)
                }}
                className="block w-full text-xs text-stone-600 dark:text-stone-400 file:mr-2 file:rounded file:border-0 file:bg-emerald-600 file:px-2 file:py-1 file:text-white hover:file:bg-emerald-700 disabled:opacity-50"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Category</label>
          <select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))} className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500">
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Sustainability score (1 to 10)</label>
            <input type="number" min="1" max="10" value={form.sustainability_score} onChange={(e) => setForm((f) => ({ ...f, sustainability_score: e.target.value }))} className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Carbon footprint saving (kg)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.carbon_footprint_saving_kg}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  carbon_footprint_saving_kg: e.target.value.replace(',', '.'),
                }))
              }
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{materialsFieldLabel}</label>
          <input type="text" value={form.materials} onChange={(e) => setForm((f) => ({ ...f, materials: e.target.value }))} placeholder={materialsPlaceholder} className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500" />
        </div>
        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
          {saving ? 'Saving...' : isNew ? 'Add product' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
