import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { augmentOrdersWithPresentationHistory } from '../lib/presentationOrders'
import { formatCatalogProductName } from '../lib/catalogProductName'
import { getProductMetrics } from '../lib/productMetrics'
import { useFormatPrice } from '../hooks/useFormatPrice'
import { SUPPORT_EMAIL } from '../lib/supportContact'
import { PackageIcon, ImpactChartIcon } from '../components/Icons'
import co2SavedIcon from '../assets/co2-saved-icon.png'

const LEADERBOARD_MIN_KG = 0.01
const ORDER_ITEMS_CARBON_CHUNK = 120
/** Illustrative kg CO₂ per £ order total when lines exist but sum to 0 (missing product / legacy data). */
const ESTIMATED_CARBON_KG_PER_GBP_SPENT = 0.012

function normalizeEmbedProduct(raw) {
  if (raw == null) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

/**
 * Prefer stored line carbon; then DB product footprint × qty; then catalog-style display carbon (same as product cards).
 */
function effectiveOrderLineCarbonKg(item) {
  const fromLine = Number(item.carbon_saving_kg) || 0
  if (fromLine > 0) return fromLine
  const qty = Number(item.quantity) || 1
  const prod = normalizeEmbedProduct(item.products)
  const perUnitDb = Number(prod?.carbon_footprint_saving_kg ?? 0) || 0
  if (perUnitDb > 0) return perUnitDb * qty
  if (prod && (prod.id || prod.slug || prod.name)) {
    const { displayCarbon } = getProductMetrics(prod)
    return displayCarbon * qty
  }
  return 0
}

/** Shared shell so all stat cards share one row height (grid stretch + h-full). */
const DASHBOARD_SUMMARY_CARD_CLASS =
  'rounded-xl border border-stone-200/90 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 sm:p-5 shadow-sm flex flex-col gap-1.5 min-h-[9.5rem] h-full'

/**
 * Illustrative equivalents from the user's total kg CO2 saved on orders (order_items carbon, with product fallback).
 * Ratios: tree-equivalent index = 50x kg CO2, water = 15 L per kg CO2, waste = 2 kg diverted per kg CO2.
 */
function environmentalEquivalentsFromCo2Kg(totalCarbonKg) {
  const co2 = Math.max(0, Number(totalCarbonKg) || 0)
  return {
    treesEquivalent: Math.round(co2 * 50),
    waterLiters: Math.round(co2 * 15),
    wasteDivertedKg: Math.round(co2 * 2),
  }
}

/** ~0.4 kg CO₂ per km — rough average passenger car (illustrative). */
function kmDrivingEquivalentFromCo2Kg(totalCarbonKg) {
  const kg = Math.max(0, Number(totalCarbonKg) || 0)
  if (kg <= 0) return 0
  return Math.round(kg / 0.4)
}

function ecoLevelFromCarbonKg(totalCarbonKg) {
  const kg = Math.max(0, Number(totalCarbonKg) || 0)
  if (kg < 5) return { label: 'Starter', hint: 'Your first sustainable picks add up fast.' }
  if (kg < 15) return { label: 'Bronze', hint: 'Nice work — keep choosing lower-impact products.' }
  if (kg < 55) return { label: 'Silver', hint: 'Keep shopping sustainably!' }
  if (kg < 120) return { label: 'Gold', hint: 'Outstanding impact' }
  return { label: 'Emerald', hint: 'Champion tier — thank you for going the extra mile.' }
}

function SummaryMedalIcon({ className = 'w-7 h-7' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="6" fill="#fbbf24" stroke="#d97706" strokeWidth="1.25" />
      <path d="M8.5 14.5L7 22l5-3 5 3-1.5-7.5" fill="none" stroke="#d97706" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const LEADERBOARD_RPC_LIMIT = 50
const LEADERBOARD_SHOW = 12

/** PostgREST usually returns an array; normalize edge shapes. */
function normalizeLeaderboardRpcRows(data) {
  if (data == null) return []
  if (Array.isArray(data)) return data
  if (typeof data === 'object' && data.user_id != null) return [data]
  return []
}

/** Demo rows if the leaderboard RPC is unavailable (migration not applied). */
const COMMUNITY_LEADERBOARD_FALLBACK = [
  { name: 'Zoe A.', score: 24.8 },
  { name: 'Noah M.', score: 21.3 },
  { name: 'Maya P.', score: 18.6 },
  { name: 'Sam K.', score: 15.2 },
  { name: 'Ava L.', score: 12.9 },
  { name: 'Jordan T.', score: 10.1 },
]

/** Names for illustrative “community” rows below real shoppers (same for every viewer). */
const LEADERBOARD_FILLER_NAMES = [
  'Zoe A.',
  'Noah M.',
  'Maya P.',
  'Sam K.',
  'Ava L.',
  'Jordan T.',
  'Riley C.',
  'Quinn S.',
  'Casey M.',
  'Alex R.',
  'Devon K.',
  'Skyler L.',
]

/** Target kg for fillers; each is capped below the lowest real score so rankings stay honest. */
const FILLER_SCORE_TEMPLATE = [18.2, 15.8, 13.4, 11.9, 10.3, 8.9, 7.6, 6.4, 5.5, 4.8, 4.0, 3.2]

function buildFallbackDemoBoard(userCarbonKg) {
  const userScore = Math.max(0, Number(userCarbonKg) || 0)
  const others = COMMUNITY_LEADERBOARD_FALLBACK.map(({ name, score }) => ({
    name,
    score,
    isYou: false,
    userId: null,
  }))
  const you = { name: 'You', score: Number(userScore.toFixed(2)), isYou: true, userId: null }
  return [you, ...others]
    .sort((a, b) => {
      const d = b.score - a.score
      if (d !== 0) return d
      return (b.isYou ? 1 : 0) - (a.isYou ? 1 : 0)
    })
    .slice(0, LEADERBOARD_SHOW)
}

/**
 * @param {string} uid
 * @param {number} myCarbonKg - client total (matches “Your green impact”)
 * @param {Array<{ user_id: string, display_label: string, total_kg: number }>|null|undefined} rpcRows
 * @param {string} [myDisplayName]
 */
function mergeLeaderboardFromRpc(uid, myCarbonKg, rpcRows, myDisplayName) {
  const uidStr = uid ? String(uid) : ''
  const myScore = Math.max(0, Number(myCarbonKg) || 0)
  const myName = (myDisplayName && String(myDisplayName).trim()) || 'You'
  /** @type {Map<string, { name: string, score: number, isYou: boolean, userId: string }>} */
  const byId = new Map()

  for (const row of rpcRows ?? []) {
    const id = row?.user_id != null ? String(row.user_id) : ''
    if (!id) continue
    const isSelf = id === uidStr
    const label = isSelf ? myName : (row.display_label || 'EcoShop member')
    const score = isSelf ? myScore : Math.max(0, Number(row.total_kg) || 0)
    byId.set(id, { name: label, score: Number(score.toFixed(2)), isYou: isSelf, userId: id })
  }

  if (uidStr && myScore >= LEADERBOARD_MIN_KG && !byId.has(uidStr)) {
    byId.set(uidStr, { name: myName, score: Number(myScore.toFixed(2)), isYou: true, userId: uidStr })
  }

  let list = [...byId.values()].filter((r) => r.isYou || r.score >= LEADERBOARD_MIN_KG)
  list.sort((a, b) => {
    const d = b.score - a.score
    if (d !== 0) return d
    return (a.isYou ? 1 : 0) - (b.isYou ? 1 : 0)
  })
  return list
}

/** Pad with illustrative shoppers so the board looks populated; all filler scores stay below real totals. */
function padLeaderboardWithFakeShoppers(realRows, targetCount = LEADERBOARD_SHOW) {
  const sorted = [...realRows].sort((a, b) => {
    const d = b.score - a.score
    if (d !== 0) return d
    return (a.isYou ? 1 : 0) - (b.isYou ? 1 : 0)
  })
  if (sorted.length >= targetCount) return sorted.slice(0, targetCount)

  const minReal = sorted.length > 0 ? Math.min(...sorted.map((r) => r.score)) : null
  const need = targetCount - sorted.length
  const fillers = []

  for (let i = 0; i < need; i += 1) {
    const name = LEADERBOARD_FILLER_NAMES[i % LEADERBOARD_FILLER_NAMES.length]
    const templateScore = FILLER_SCORE_TEMPLATE[i] ?? Math.max(0.5, 2.8 - i * 0.25)
    const cap = minReal != null ? minReal - 0.2 - i * 0.22 : null
    const score = cap != null ? Math.min(templateScore, Math.max(LEADERBOARD_MIN_KG * 0.5, cap)) : templateScore
    fillers.push({
      name,
      score: Number(score.toFixed(2)),
      isYou: false,
      userId: `filler-${i}`,
    })
  }

  return [...sorted, ...fillers]
    .sort((a, b) => {
      const d = b.score - a.score
      if (d !== 0) return d
      if (a.isYou !== b.isYou) return (a.isYou ? 1 : 0) - (b.isYou ? 1 : 0)
      return String(a.userId ?? '').localeCompare(String(b.userId ?? ''))
    })
    .slice(0, targetCount)
}

function localYmd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfWeekMonday(d) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = date.getDay()
  const offset = (dow + 6) % 7
  date.setDate(date.getDate() - offset)
  return date
}

/** Flat zero series so the CO₂ chart still renders when there are no orders yet. */
function buildPlaceholderImpactSeries(granularity) {
  const now = new Date()
  if (granularity === 'day') {
    const points = []
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const key = localYmd(d)
      const [yy, mm, dd] = key.split('-').map(Number)
      const label = new Date(yy, mm - 1, dd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      points.push({ label, value: 0, key })
    }
    return points
  }
  if (granularity === 'week') {
    const points = []
    const monday = startOfWeekMonday(now)
    for (let i = 7; i >= 0; i -= 1) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - i * 7)
      const key = localYmd(d)
      const [yy, mm, dd] = key.split('-').map(Number)
      const wStart = new Date(yy, mm - 1, dd)
      const wEnd = new Date(wStart)
      wEnd.setDate(wEnd.getDate() + 6)
      const opts = { month: 'short', day: 'numeric' }
      const label = `${wStart.toLocaleDateString(undefined, opts)} to ${wEnd.toLocaleDateString(undefined, opts)}`
      points.push({ label, value: 0, key })
    }
    return points
  }
  if (granularity === 'month') {
    const points = []
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
      points.push({ label, value: 0, key })
    }
    return points
  }
  const y0 = now.getFullYear()
  return [0, 1, 2].map((j) => {
    const y = String(y0 - (2 - j))
    return { label: y, value: 0, key: y }
  })
}

function buildImpactSeries(displayOrders, carbonByOrderId, granularity) {
  const list = displayOrders ?? []
  if (!list.length) return buildPlaceholderImpactSeries(granularity)

  const sums = {}
  for (const o of list) {
    const d = new Date(o.created_at)
    if (Number.isNaN(d.getTime())) continue
    let key
    if (granularity === 'day') key = localYmd(d)
    else if (granularity === 'week') key = localYmd(startOfWeekMonday(d))
    else if (granularity === 'month') key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    else key = String(d.getFullYear())

    const add = Number(carbonByOrderId[o.id] ?? 0) || 0
    sums[key] = (sums[key] || 0) + add
  }

  const times = list.map((o) => new Date(o.created_at).getTime()).filter((t) => Number.isFinite(t))
  const minD = new Date(Math.min(...times))
  const maxD = new Date(Math.max(...times))

  const keys = []
  if (granularity === 'day') {
    const cur = new Date(minD.getFullYear(), minD.getMonth(), minD.getDate())
    const end = new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate())
    while (cur <= end) {
      keys.push(localYmd(cur))
      cur.setDate(cur.getDate() + 1)
    }
  } else if (granularity === 'week') {
    const start = startOfWeekMonday(minD)
    const end = startOfWeekMonday(maxD)
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const endCur = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    while (cur <= endCur) {
      keys.push(localYmd(cur))
      cur.setDate(cur.getDate() + 7)
    }
  } else if (granularity === 'month') {
    const cur = new Date(minD.getFullYear(), minD.getMonth(), 1)
    const end = new Date(maxD.getFullYear(), maxD.getMonth(), 1)
    while (cur <= end) {
      keys.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`)
      cur.setMonth(cur.getMonth() + 1)
    }
  } else {
    for (let y = minD.getFullYear(); y <= maxD.getFullYear(); y += 1) {
      keys.push(String(y))
    }
  }

  return keys.map((key) => {
    const value = Number((sums[key] || 0).toFixed(1))
    let label
    if (granularity === 'day') {
      const [yy, mm, dd] = key.split('-').map(Number)
      label = new Date(yy, mm - 1, dd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } else if (granularity === 'week') {
      const [yy, mm, dd] = key.split('-').map(Number)
      const wStart = new Date(yy, mm - 1, dd)
      const wEnd = new Date(wStart)
      wEnd.setDate(wEnd.getDate() + 6)
      const opts = { month: 'short', day: 'numeric' }
      label = `${wStart.toLocaleDateString(undefined, opts)} to ${wEnd.toLocaleDateString(undefined, opts)}`
    } else if (granularity === 'month') {
      const [yy, mm] = key.split('-').map(Number)
      label = new Date(yy, mm - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
    } else {
      label = key
    }
    return { label, value, key }
  })
}

function niceYMax(value) {
  if (!Number.isFinite(value) || value <= 0) return 1
  const exp = Math.floor(Math.log10(value))
  const fraction = value / 10 ** exp
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return niceFraction * 10 ** exp
}

function Co2LineChart({ data, periodDescription }) {
  const width = 920
  const height = 320
  const padL = 56
  const padR = 20
  const padT = 24
  const padB = 46
  const innerW = width - padL - padR
  const innerH = height - padT - padB
  const maxVal = Math.max(...data.map((d) => d.value), 0.001)
  const yMax = niceYMax(maxVal * 1.05)
  const yTicks = 4
  const tickValues = Array.from({ length: yTicks }, (_, i) => (yMax * i) / (yTicks - 1))

  const xLabelEvery = data.length > 24 ? Math.ceil(data.length / 12) : data.length > 16 ? 2 : 1
  const valueLabelEvery = data.length > 18 ? Math.ceil(data.length / 14) : 1

  const points = data.map((d, i) => {
    const x = data.length <= 1 ? padL + innerW / 2 : padL + (i / (data.length - 1)) * innerW
    const y = padT + innerH - (d.value / yMax) * innerH
    return { x, y, ...d }
  })

  const pathD = points.length
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    : ''

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto max-h-96 min-h-[240px]"
      role="img"
      aria-label={`Line chart of CO₂ saved ${periodDescription}`}
    >
      <defs>
        <linearGradient id="ecoLineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <text x={6} y={16} className="fill-stone-500 dark:fill-stone-400 text-[12px] font-semibold">kg CO₂</text>
      {tickValues.map((t, i) => {
        const y = padT + innerH - (t / yMax) * innerH
        return (
          <g key={`y-${i}`}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} className="stroke-stone-200 dark:stroke-stone-600" strokeDasharray="4 3" strokeWidth="1" />
            <text x={padL - 10} y={y + 4} textAnchor="end" className="fill-stone-500 dark:fill-stone-400 text-[11px] tabular-nums">
              {t.toFixed(1)}
            </text>
          </g>
        )
      })}
      <line x1={padL} y1={padT + innerH} x2={width - padR} y2={padT + innerH} className="stroke-stone-300 dark:stroke-stone-600" strokeWidth="1" />
      <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} className="stroke-stone-300 dark:stroke-stone-600" strokeWidth="1" />
      {pathD && (
        <>
          <path d={`${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`} fill="url(#ecoLineFill)" />
          <path d={pathD} fill="none" className="stroke-emerald-600 dark:stroke-emerald-400" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {points.map((p, i) => (
        <g key={p.key}>
          <circle cx={p.x} cy={p.y} r="5.5" className="fill-white dark:fill-stone-800 stroke-emerald-600 dark:stroke-emerald-400" strokeWidth="2.5" />
          {(i % xLabelEvery === 0 || i === points.length - 1) && (
            <text x={p.x} y={height - 14} textAnchor="middle" className="fill-stone-600 dark:fill-stone-300 text-[10px] sm:text-[11px] font-semibold">
              {p.label}
            </text>
          )}
          {(i % valueLabelEvery === 0 || i === points.length - 1) && (
            <text x={p.x} y={p.y - 12} textAnchor="middle" className="fill-emerald-800 dark:fill-emerald-300 text-[10px] sm:text-[11px] font-semibold tabular-nums">
              {p.value.toFixed(1)}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

export default function Dashboard() {
  const { format } = useFormatPrice()
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [myReviews, setMyReviews] = useState([])
  const [greenImpact, setGreenImpact] = useState({ totalCarbonSaved: 0, orderCount: 0 })
  const [realOrderStats, setRealOrderStats] = useState({ count: 0, totalSpent: 0 })
  const [carbonByOrderId, setCarbonByOrderId] = useState({})
  const [chartGranularity, setChartGranularity] = useState('week')
  const [communityBoard, setCommunityBoard] = useState([])
  const [loading, setLoading] = useState(true)

  const chartData = useMemo(
    () => buildImpactSeries(orders, carbonByOrderId, chartGranularity),
    [orders, carbonByOrderId, chartGranularity],
  )

  const chartPeriodDescription =
    chartGranularity === 'day'
      ? 'by day'
      : chartGranularity === 'week'
        ? 'by week'
        : chartGranularity === 'month'
          ? 'by month'
          : 'by year'

  const impactEquivalents = useMemo(
    () => environmentalEquivalentsFromCo2Kg(greenImpact.totalCarbonSaved),
    [greenImpact.totalCarbonSaved],
  )

  const kmDrivingEquiv = useMemo(
    () => kmDrivingEquivalentFromCo2Kg(greenImpact.totalCarbonSaved),
    [greenImpact.totalCarbonSaved],
  )

  const ecoLevel = useMemo(
    () => ecoLevelFromCarbonKg(greenImpact.totalCarbonSaved),
    [greenImpact.totalCarbonSaved],
  )

  useEffect(() => {
    document.title = 'Dashboard · EcoShop'
    return () => { document.title = 'EcoShop · Sustainable Shopping' }
  }, [])

  useEffect(() => {
    const uid = user?.id
    const memberSince = user?.created_at

    if (!uid) {
      setOrders([])
      setMyReviews([])
      setGreenImpact({ totalCarbonSaved: 0, orderCount: 0 })
      setRealOrderStats({ count: 0, totalSpent: 0 })
      setCarbonByOrderId({})
      setCommunityBoard([])
      setLoading(false)
      return
    }

    setLoading(true)
    let cancelled = false

    async function fetchDashboard() {
      const [ordersRes, reviewsRes, catalogRes, profileRes, leaderboardRes] = await Promise.all([
        supabase.from('orders').select('id, total_amount, status, created_at').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('reviews').select('id, rating, body, created_at, products(id, name, slug)').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('products').select('name, slug, image_url, price').limit(48),
        supabase.from('profiles').select('display_name').eq('id', uid).maybeSingle(),
        supabase.rpc('get_carbon_leaderboard', { p_limit: LEADERBOARD_RPC_LIMIT, p_min_kg: LEADERBOARD_MIN_KG }),
      ])
      if (cancelled) return

      const realOrders = ordersRes.data ?? []
      const { displayOrders, carbonByOrderIdSynthetic } = augmentOrdersWithPresentationHistory(
        uid,
        realOrders,
        catalogRes.data ?? [],
        memberSince,
      )

      const orderIds = realOrders.map((o) => o.id)
      const myItems = []
      if (orderIds.length > 0) {
        for (let i = 0; i < orderIds.length; i += ORDER_ITEMS_CARBON_CHUNK) {
          const chunk = orderIds.slice(i, i + ORDER_ITEMS_CARBON_CHUNK)
          const { data: orderItems, error: itemsErr } = await supabase
            .from('order_items')
            .select(
              'order_id, carbon_saving_kg, quantity, product_id, products(id, name, slug, price, sustainability_score, carbon_footprint_saving_kg)',
            )
            .in('order_id', chunk)
          if (itemsErr && import.meta.env.DEV) {
            console.warn('[EcoShop] dashboard order_items:', itemsErr.message)
          }
          if (orderItems?.length) myItems.push(...orderItems)
        }
      }
      if (cancelled) return

      const carbonByOrderIdNext = {}
      for (const item of myItems) {
        const add = effectiveOrderLineCarbonKg(item)
        carbonByOrderIdNext[item.order_id] = (carbonByOrderIdNext[item.order_id] || 0) + add
      }
      for (const o of realOrders) {
        if (carbonByOrderIdSynthetic[o.id] != null) continue
        const kg = Number(carbonByOrderIdNext[o.id] ?? 0) || 0
        if (kg > 0) continue
        const amt = Number(o.total_amount) || 0
        if (amt <= 0) continue
        carbonByOrderIdNext[o.id] = Number((Math.max(0.5, amt * ESTIMATED_CARBON_KG_PER_GBP_SPENT)).toFixed(2))
      }
      Object.assign(carbonByOrderIdNext, carbonByOrderIdSynthetic)
      const totalCarbonSaved = Object.values(carbonByOrderIdNext).reduce((sum, value) => sum + value, 0)

      const totalSpentReal = realOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0)
      setRealOrderStats({ count: realOrders.length, totalSpent: totalSpentReal })

      const myDisplayName = profileRes.data?.display_name
      let board
      if (leaderboardRes.error) {
        if (import.meta.env.DEV) {
          console.warn('[EcoShop] get_carbon_leaderboard:', leaderboardRes.error.message)
        }
        board = buildFallbackDemoBoard(totalCarbonSaved)
      } else {
        board = padLeaderboardWithFakeShoppers(
          mergeLeaderboardFromRpc(uid, totalCarbonSaved, normalizeLeaderboardRpcRows(leaderboardRes.data), myDisplayName),
        )
      }

      setOrders(displayOrders)
      setGreenImpact({ totalCarbonSaved, orderCount: displayOrders.length })
      setCarbonByOrderId({ ...carbonByOrderIdNext })
      setCommunityBoard(board)
      setMyReviews(reviewsRes.data ?? [])
      setLoading(false)
    }

    fetchDashboard()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.created_at])

  if (loading) return <p className="text-stone-500 dark:text-stone-400">Loading dashboard...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-5">Your dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 items-stretch">
        <div className={DASHBOARD_SUMMARY_CARD_CLASS}>
          <img
            src={co2SavedIcon}
            alt=""
            width={32}
            height={32}
            className="w-8 h-8 shrink-0 object-contain"
            decoding="async"
          />
          <p className="text-base font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide leading-tight">
            Total CO₂ Saved
          </p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
            {greenImpact.totalCarbonSaved.toFixed(1)} kg
          </p>
          <p className="text-base text-stone-500 dark:text-stone-400 mt-auto min-h-[3rem] flex flex-col justify-end leading-snug">
            Equal to {kmDrivingEquiv.toLocaleString()} km driven
          </p>
        </div>
        <div className={DASHBOARD_SUMMARY_CARD_CLASS}>
          <span className="text-blue-600 dark:text-blue-400">
            <PackageIcon className="w-8 h-8 shrink-0" />
          </span>
          <p className="text-base font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide leading-tight">
            Total Orders
          </p>
          <p className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums mt-0.5">
            {realOrderStats.count.toLocaleString()}
          </p>
          <p className="text-base text-stone-500 dark:text-stone-400 mt-auto min-h-[3rem] flex flex-col justify-end leading-snug">
            Since joining EcoShop
          </p>
        </div>
        <div className={DASHBOARD_SUMMARY_CARD_CLASS}>
          <span className="text-violet-600 dark:text-violet-400">
            <ImpactChartIcon className="w-8 h-8 shrink-0" />
          </span>
          <p className="text-base font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide leading-tight">
            Total Spent
          </p>
          <p className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums mt-0.5">
            {format(realOrderStats.totalSpent)}
          </p>
          <p className="text-base text-stone-500 dark:text-stone-400 mt-auto min-h-[3rem] flex flex-col justify-end leading-snug">
            On sustainable products
          </p>
        </div>
        <div className={DASHBOARD_SUMMARY_CARD_CLASS}>
          <SummaryMedalIcon className="w-8 h-8 shrink-0" />
          <p className="text-base font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide leading-tight">
            Eco Level
          </p>
          <p className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">{ecoLevel.label}</p>
          <p className="text-base text-stone-500 dark:text-stone-400 mt-auto min-h-[3rem] flex flex-col justify-end leading-snug">
            {ecoLevel.hint}
          </p>
        </div>
      </div>

      <section
        className="rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/35 px-5 py-7 sm:px-8 sm:py-8 mb-6 shadow-sm"
        aria-labelledby="env-impact-banner-title"
      >
        <h2 id="env-impact-banner-title" className="text-left text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 mb-8">
          Your Environmental Impact
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
          <div className="flex flex-col items-center text-center">
            <span className="text-4xl sm:text-5xl leading-none mb-4" aria-hidden>
              {'\u{1F331}'}
            </span>
            <p className="text-2xl sm:text-3xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
              {impactEquivalents.treesEquivalent.toLocaleString()}
            </p>
            <p className="text-base font-semibold text-stone-700 dark:text-stone-300 mt-2">Trees planted equivalent</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-4xl sm:text-5xl leading-none mb-4" aria-hidden>
              {'\u{1F4A7}'}
            </span>
            <p className="text-2xl sm:text-3xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
              {impactEquivalents.waterLiters.toLocaleString()} L
            </p>
            <p className="text-base font-semibold text-stone-700 dark:text-stone-300 mt-2">Water saved</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-4xl sm:text-5xl leading-none mb-4" aria-hidden>
              {'\u267B\uFE0F'}
            </span>
            <p className="text-2xl sm:text-3xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
              {impactEquivalents.wasteDivertedKg.toLocaleString()} kg
            </p>
            <p className="text-base font-semibold text-stone-700 dark:text-stone-300 mt-2">Waste diverted from landfill</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/35 p-5 md:p-6 mb-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Your green impact over time</h2>
        <div className="mt-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <p className="text-base font-semibold text-stone-800 dark:text-stone-200">Estimated CO₂ saved over time</p>
            <div
              className="flex flex-wrap rounded-lg border border-emerald-200/80 dark:border-emerald-800 bg-white dark:bg-stone-900 p-1 shadow-sm"
              role="group"
              aria-label="Chart time grouping"
            >
              {[
                { id: 'day', label: 'By day' },
                { id: 'week', label: 'By week' },
                { id: 'month', label: 'By month' },
                { id: 'year', label: 'By year' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChartGranularity(id)}
                  className={`px-3 py-1.5 text-base font-medium rounded-md transition ${
                    chartGranularity === id
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/60'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900/90 p-4 md:p-5 overflow-x-auto">
            <Co2LineChart data={chartData} periodDescription={chartPeriodDescription} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-lime-200 dark:border-lime-900/60 bg-lime-50/50 dark:bg-lime-950/25 p-4 mb-6">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3">Community leaderboard</h2>
        <ul className="space-y-2">
          {communityBoard.length === 0 && (
            <li className="text-base text-stone-600 dark:text-stone-400 py-2">
              No shoppers meet the minimum yet. Place an order to get on the board.
            </li>
          )}
          {communityBoard.map((u, idx) => (
            <li
              key={u.userId ? u.userId : u.isYou ? 'you' : `row-${idx}-${u.name}`}
              className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                u.isYou
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-400/30'
                  : 'bg-white dark:bg-stone-900 border-lime-200 dark:border-lime-900/50'
              }`}
            >
              <span className="text-base font-medium text-stone-800 dark:text-stone-200">
                #{idx + 1} {u.name}
              </span>
              <span className="text-base tabular-nums text-emerald-800 dark:text-emerald-300 font-semibold">{u.score.toFixed(1)} kg CO₂</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/25 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Purchase history</h2>
          <Link to="/orders" className="text-base font-medium text-emerald-600 dark:text-emerald-400 hover:underline">Track orders</Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-stone-600 dark:text-stone-400">You have not placed any orders yet.</p>
        ) : (
          <ul className="divide-y divide-stone-200 dark:divide-stone-700 rounded-lg border border-stone-200/80 dark:border-stone-700 bg-white/60 dark:bg-stone-900/50 overflow-hidden">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4"
              >
                <div className="min-w-0">
                  <span className="font-mono text-base text-stone-700 dark:text-stone-300">{order.id.slice(0, 8)}…</span>
                  <span className="ml-2 text-stone-600 dark:text-stone-400 text-base">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
                <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{format(Number(order.total_amount))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/30 p-4">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Your reviews</h2>
        {myReviews.length === 0 ? (
          <p className="text-stone-600 dark:text-stone-400">You haven’t written any reviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {myReviews.map((r) => (
              <li key={r.id} className="border-b border-stone-200 dark:border-stone-700 pb-3 last:border-0">
                <Link to={`/products/${r.products?.slug}`} className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
                  {formatCatalogProductName(r.products?.name ?? '') || 'Product'}
                </Link>
                <p className="text-amber-500 dark:text-amber-400 text-base mt-0.5">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                {r.body && <p className="text-stone-700 dark:text-stone-300 text-base mt-1">{r.body}</p>}
                <p className="text-stone-500 dark:text-stone-500 text-base mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5 mt-6">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Need help with an order?</h2>
        <p className="text-base text-stone-700 dark:text-stone-300 mb-3">Our support team can help with delivery updates, returns, and payment questions.</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/about" className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-base font-medium hover:bg-emerald-700">Open help center</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-base font-medium hover:bg-stone-200 dark:hover:bg-stone-700">Email support</a>
        </div>
      </section>
    </div>
  )
}
