import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCategoryCardSrc, getCategoryImageObjectPosition } from '../lib/categoryCardImage'
import {
  clampFocusY,
  saveCategoryOverride,
  notifyCategoryHomeUpdated,
  mergeCategoryRowForHome,
} from '../lib/categoryImageLocalStorage'
import { mergeGardenOutdoorsForHome, mergeHomeOfficeForHome } from '../lib/storefrontCategoryMerge'
import { categoryCardDescription, displayNameMatchesCategorySlug } from '../lib/categoryCardCopy'

function clampFocus(n) {
  return clampFocusY(n)
}

function isMissingColumnError(error, column) {
  const msg = (error?.message ?? '').toLowerCase()
  if (!msg || !column) return false
  if (msg.includes(column.toLowerCase())) return true
  return false
}

async function persistCategoryRow(supabaseClient, catId, url, focus, flags) {
  let { supportsImageUrl, supportsFocusY } = flags
  const buildPayload = () => {
    if (supportsImageUrl && supportsFocusY) return { image_url: url, image_focus_y: focus }
    if (supportsImageUrl) return { image_url: url }
    if (supportsFocusY) return { image_focus_y: focus }
    return null
  }

  let payload = buildPayload()
  while (payload) {
    const { error } = await supabaseClient.from('categories').update(payload).eq('id', catId)
    if (!error) {
      return { error: null, supportsImageUrl, supportsFocusY }
    }
    if (isMissingColumnError(error, 'image_focus_y')) {
      supportsFocusY = false
    } else if (isMissingColumnError(error, 'image_url')) {
      supportsImageUrl = false
    } else {
      return { error, supportsImageUrl, supportsFocusY }
    }
    payload = buildPayload()
  }
  return { error: null, supportsImageUrl, supportsFocusY }
}

export default function AdminCategoryImagesPanel() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [savingId, setSavingId] = useState(null)
  const [uploadingId, setUploadingId] = useState(null)
  const [dbSupportsImageUrl, setDbSupportsImageUrl] = useState(true)
  const [dbSupportsFocusY, setDbSupportsFocusY] = useState(true)

  useEffect(() => {
    async function load() {
      const full = await supabase
        .from('categories')
        .select('id, name, slug, description, image_url, image_focus_y')
        .order('name')
      if (!full.error) {
        setDbSupportsImageUrl(true)
        setDbSupportsFocusY(true)
        setCategories(
          mergeGardenOutdoorsForHome(
            mergeHomeOfficeForHome(
              (full.data ?? []).map((c) =>
                mergeCategoryRowForHome({
                  ...c,
                  image_focus_y: clampFocus(c.image_focus_y ?? 50),
                }),
              ),
            ),
          ),
        )
        setLoading(false)
        return
      }
      if (import.meta.env.DEV) {
        console.warn('[EcoShop] category panel full select failed:', full.error.message)
      }

      const withUrl = await supabase
        .from('categories')
        .select('id, name, slug, description, image_url')
        .order('name')
      if (!withUrl.error) {
        setDbSupportsImageUrl(true)
        setDbSupportsFocusY(false)
        setCategories(
          mergeGardenOutdoorsForHome(
            mergeHomeOfficeForHome(
              (withUrl.data ?? []).map((c) =>
                mergeCategoryRowForHome({
                  ...c,
                  image_focus_y: 50,
                }),
              ),
            ),
          ),
        )
        setLoading(false)
        return
      }

      setDbSupportsImageUrl(false)
      setDbSupportsFocusY(false)
      const basic = await supabase.from('categories').select('id, name, slug, description').order('name')
      setCategories(
        mergeGardenOutdoorsForHome(
          mergeHomeOfficeForHome(
            (basic.data ?? []).map((c) =>
              mergeCategoryRowForHome({
                ...c,
                image_url: null,
                image_focus_y: 50,
              }),
            ),
          ),
        ),
      )
      setLoading(false)
    }
    load()
  }, [])

  const setCatField = (id, field, value) => {
    setCategories((rows) =>
      rows.map((c) => (c.id === id ? { ...c, [field]: field === 'image_focus_y' ? clampFocus(value) : value } : c)),
    )
  }

  const saveCategory = async (cat) => {
    setMessage({ type: '', text: '' })
    setSavingId(cat.id)
    const focus = clampFocus(cat.image_focus_y)
    const url = (cat.image_url || '').trim() || null

    saveCategoryOverride(cat.id, { image_url: url || '', image_focus_y: focus })
    notifyCategoryHomeUpdated()

    const { error, supportsImageUrl, supportsFocusY } = await persistCategoryRow(
      supabase,
      cat.id,
      url,
      focus,
      { supportsImageUrl: dbSupportsImageUrl, supportsFocusY: dbSupportsFocusY },
    )
    setDbSupportsImageUrl(supportsImageUrl)
    setDbSupportsFocusY(supportsFocusY)

    setSavingId(null)
    if (error) {
      setMessage({ type: 'err', text: error.message })
      return
    }
    setCategories((rows) =>
      rows.map((c) =>
        c.id === cat.id ? { ...c, image_url: url || '', image_focus_y: focus } : c,
      ),
    )
    setMessage({ type: '', text: '' })
  }

  const uploadFile = async (cat, file) => {
    if (!file) return
    setMessage({ type: '', text: '' })
    setUploadingId(cat.id)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `categories/${cat.slug}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('product-images').upload(path, file, { upsert: false })
    if (!upErr) {
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      const publicUrl = data.publicUrl
      setCatField(cat.id, 'image_url', publicUrl)
      setUploadingId(null)
      await saveCategory({ ...cat, image_url: publicUrl })
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result
      if (typeof dataUrl === 'string') {
        setCatField(cat.id, 'image_url', dataUrl)
        setUploadingId(null)
        await saveCategory({ ...cat, image_url: dataUrl })
        return
      }
      setUploadingId(null)
    }
    reader.onerror = () => {
      setUploadingId(null)
      setMessage({ type: 'err', text: `Upload failed: ${upErr.message}` })
    }
    reader.readAsDataURL(file)
  }

  const nudgeFocus = (cat, delta) => {
    setCatField(cat.id, 'image_focus_y', clampFocus((cat.image_focus_y ?? 50) + delta))
  }

  if (loading) {
    return <p className="text-stone-500 dark:text-stone-400 text-sm py-2">Loading categories…</p>
  }

  return (
    <div className="space-y-4">
      {message.text && message.type === 'err' && (
        <p className="px-3 py-2 rounded-lg text-sm bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
          {message.text}
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {categories.map((cat) => {
          const src = getCategoryCardSrc(cat)
          const pos = getCategoryImageObjectPosition(cat.image_focus_y)
          const subtitle = categoryCardDescription(cat)
          const showSlugHint = !subtitle && !displayNameMatchesCategorySlug(cat.name, cat.slug)
          return (
            <div
              key={cat.id}
              className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 bg-white dark:bg-stone-800/80 p-4 shadow-sm dark:shadow-none space-y-3"
            >
              <div>
                <h3 className="font-semibold text-stone-800 dark:text-stone-100">{cat.name}</h3>
                {subtitle && <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2">{subtitle}</p>}
                {showSlugHint && (
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    URL key:{' '}
                    <code className="font-mono text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-900 px-1 rounded">
                      {cat.slug}
                    </code>
                  </p>
                )}
              </div>

              <div className="aspect-[16/10] w-full max-w-md rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-900 border border-stone-200 dark:border-stone-600">
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover transition-[object-position] duration-75"
                  style={{ objectPosition: pos }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">Image URL</label>
                <input
                  type="url"
                  value={cat.image_url ?? ''}
                  onChange={(e) => setCatField(cat.id, 'image_url', e.target.value)}
                  placeholder="https://…"
                  className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  id={`dev-cat-file-${cat.id}`}
                  onChange={(e) => {
                    uploadFile(cat, e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById(`dev-cat-file-${cat.id}`)?.click()}
                  disabled={uploadingId === cat.id}
                  className="px-3 py-1.5 text-sm bg-stone-100 dark:bg-stone-700 text-stone-800 dark:text-stone-100 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-50"
                >
                  {uploadingId === cat.id ? 'Reading…' : 'Upload file'}
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-stone-700 dark:text-stone-300">Vertical framing</span>
                  <span className="text-xs tabular-nums text-stone-600 dark:text-stone-400">
                    {clampFocus(cat.image_focus_y)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => nudgeFocus(cat, -5)}
                    className="px-2 py-1.5 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200"
                    aria-label="Show higher part"
                  >
                    ↑
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={clampFocus(cat.image_focus_y)}
                    onChange={(e) => setCatField(cat.id, 'image_focus_y', e.target.value)}
                    className="flex-1 min-w-0 accent-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => nudgeFocus(cat, 5)}
                    className="px-2 py-1.5 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200"
                    aria-label="Show lower part"
                  >
                    ↓
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => saveCategory(cat)}
                disabled={savingId === cat.id}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingId === cat.id ? 'Saving…' : 'Save category'}
              </button>
            </div>
          )
        })}
      </div>

      {categories.length === 0 && (
        <p className="text-stone-500 dark:text-stone-400 text-sm">No categories in the database.</p>
      )}
    </div>
  )
}
