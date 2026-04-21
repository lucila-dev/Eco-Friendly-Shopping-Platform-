import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProductSearchField from './ProductSearchField'

const DEBOUNCE_MS = 280
const MAX_SUGGESTIONS = 8

function tokenizeForSearch(s) {
  return s
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[%_\\]/g, '').trim())
    .filter((w) => w.length > 0)
}

function highlightProductName(name, rawQuery) {
  const terms = tokenizeForSearch(rawQuery)
  if (!terms.length) return name
  const lower = name.toLowerCase()
  const ranges = []
  for (const t of terms) {
    let start = 0
    while ((start = lower.indexOf(t, start)) !== -1) {
      ranges.push([start, start + t.length])
      start += t.length
    }
  }
  if (ranges.length === 0) return name
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (!last || r[0] > last[1]) merged.push([r[0], r[1]])
    else last[1] = Math.max(last[1], r[1])
  }
  const out = []
  let pos = 0
  merged.forEach(([a, b], i) => {
    if (a > pos) out.push(name.slice(pos, a))
    out.push(
      <mark
        key={`${a}-${b}-${i}`}
        className="rounded bg-emerald-300/60 px-0.5 font-semibold text-emerald-950 dark:bg-emerald-600/50 dark:text-emerald-50"
      >
        {name.slice(a, b)}
      </mark>,
    )
    pos = b
  })
  if (pos < name.length) out.push(name.slice(pos))
  return out
}

export default function HomeHeroProductSearch() {
  const navigate = useNavigate()
  const listBoxId = useId()
  const wrapRef = useRef(null)
  const blurTimerRef = useRef(null)
  const requestIdRef = useRef(0)

  const [query, setQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    const words = tokenizeForSearch(debouncedQ)
    if (words.length === 0) {
      setSuggestions([])
      setLoading(false)
      return
    }
    const id = ++requestIdRef.current
    setLoading(true)
    ;(async () => {
      let q = supabase.from('products').select('id,name,slug').limit(MAX_SUGGESTIONS)
      for (const w of words) {
        q = q.ilike('name', `%${w}%`)
      }
      const { data, error } = await q.order('name', { ascending: true })
      if (requestIdRef.current !== id) return
      setLoading(false)
      if (error) {
        if (import.meta.env.DEV) console.warn('[EcoShop] home search suggestions:', error.message)
        setSuggestions([])
        return
      }
      setSuggestions(data ?? [])
    })()
  }, [debouncedQ])

  useEffect(() => {
    setHighlight(-1)
  }, [suggestions, debouncedQ])

  useEffect(() => {
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setPanelOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [])

  const debouncedWords = tokenizeForSearch(debouncedQ)
  const querySynced = query.trim() === debouncedQ
  const awaitingDebounced = query.trim().length > 0 && query.trim() !== debouncedQ
  const showPanel =
    panelOpen &&
    query.trim().length > 0 &&
    (awaitingDebounced ||
      loading ||
      suggestions.length > 0 ||
      (querySynced && !loading && debouncedWords.length > 0))

  const clearBlurTimer = () => {
    if (blurTimerRef.current != null) {
      window.clearTimeout(blurTimerRef.current)
      blurTimerRef.current = null
    }
  }

  const goToProduct = (slug) => {
    clearBlurTimer()
    setPanelOpen(false)
    navigate(`/products/${slug}`)
  }

  const runSearch = () => {
    clearBlurTimer()
    setPanelOpen(false)
    const q = query.trim()
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products')
  }

  return (
    <form
      ref={wrapRef}
      className="relative z-20 w-full max-w-lg mx-auto mb-6"
      onSubmit={(e) => {
        e.preventDefault()
        if (highlight >= 0 && suggestions[highlight]) {
          goToProduct(suggestions[highlight].slug)
          return
        }
        runSearch()
      }}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
        <ProductSearchField
          id="home-product-search"
          variant="glass"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            clearBlurTimer()
            setPanelOpen(true)
          }}
          onBlur={() => {
            blurTimerRef.current = window.setTimeout(() => setPanelOpen(false), 160)
          }}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listBoxId}
          aria-autocomplete="list"
          aria-activedescendant={highlight >= 0 ? `${listBoxId}-opt-${highlight}` : undefined}
          onKeyDown={(e) => {
            if (!showPanel || awaitingDebounced || suggestions.length === 0) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setHighlight((h) => (h < suggestions.length - 1 ? h + 1 : 0))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setHighlight((h) => (h > 0 ? h - 1 : suggestions.length - 1))
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setPanelOpen(false)
            }
          }}
          className="min-w-0 flex-1"
          placeholder="Search products by name…"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl border border-white/50 bg-white/30 px-5 py-3 text-base font-semibold text-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-md transition hover:bg-white/45 dark:border-white/15 dark:bg-stone-950/40 dark:text-emerald-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:hover:bg-stone-950/55"
        >
          Search
        </button>
      </div>

      {showPanel && (
        <div
          id={listBoxId}
          role="listbox"
          aria-label="Product suggestions"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-[min(18rem,45vh)] overflow-y-auto overscroll-contain rounded-xl border border-white/45 bg-white/45 py-1.5 shadow-lg shadow-emerald-950/10 ring-1 ring-emerald-900/5 backdrop-blur-md dark:border-white/10 dark:bg-stone-950/55 dark:ring-white/10 sm:left-0 sm:right-auto sm:w-[min(100%,28rem)]"
        >
          {(loading || awaitingDebounced) && (
            <p className="px-4 py-3 text-left text-base text-emerald-900/70 dark:text-emerald-100/70">Searching…</p>
          )}
          {!loading &&
            !awaitingDebounced &&
            suggestions.map((row, i) => (
              <div
                key={row.id}
                id={`${listBoxId}-opt-${i}`}
                role="option"
                aria-selected={highlight === i}
                className={`cursor-pointer px-4 py-2.5 text-left text-base text-emerald-950 dark:text-emerald-50 ${
                  highlight === i ? 'bg-emerald-600/20 dark:bg-emerald-500/20' : 'hover:bg-white/50 dark:hover:bg-stone-800/60'
                }`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  goToProduct(row.slug)
                }}
              >
                {highlightProductName(row.name, query)}
              </div>
            ))}
          {!loading && querySynced && debouncedWords.length > 0 && suggestions.length === 0 && (
            <p className="px-4 py-3 text-left text-base text-emerald-900/75 dark:text-emerald-100/75">
              No matching products. Press Search to browse with this query.
            </p>
          )}
        </div>
      )}
    </form>
  )
}
