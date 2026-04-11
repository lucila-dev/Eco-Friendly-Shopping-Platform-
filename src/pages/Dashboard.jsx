import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { augmentOrdersWithPresentationHistory } from '../lib/presentationOrders'
import { hashString } from '../lib/productMetrics'

/** Illustrative “top savers” only — scores in a high band, not tied to real users. */
function buildHighImpactCommunityBoard(userId) {
  const names = ['Zoe', 'Noah', 'Maya', 'Sam', 'Ava', 'Jordan']
  const base = hashString(userId || 'anon')
  const rows = names.map((name, idx) => {
    const band = 58 + ((base + idx * 31) % 38)
    const fine = ((base >> (idx % 4)) % 19) / 10
    return { name, score: Number((band + fine).toFixed(1)) }
  })
  rows.sort((a, b) => b.score - a.score)
  return rows
}

function localYmd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Monday-based week (ISO-style); key is the Monday date in local time. */
function startOfWeekMonday(d) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = date.getDay()
  const offset = (dow + 6) % 7
  date.setDate(date.getDate() - offset)
  return date
}

/**
 * @param {'day' | 'week' | 'month' | 'year'} granularity
 * @returns {{ label: string, value: number, key: string }[]}
 */
function buildImpactSeries(displayOrders, carbonByOrderId, granularity) {
  const list = displayOrders ?? []
  if (!list.length) return []

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
      label = `${wStart.toLocaleDateString(undefined, opts)} – ${wEnd.toLocaleDateString(undefined, opts)}`
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
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [myReviews, setMyReviews] = useState([])
  const [greenImpact, setGreenImpact] = useState({ totalCarbonSaved: 0, orderCount: 0 })
  const [carbonByOrderId, setCarbonByOrderId] = useState({})
  const [chartGranularity, setChartGranularity] = useState('month')
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

  useEffect(() => {
    document.title = 'Dashboard – EcoShop'
    return () => { document.title = 'EcoShop – Sustainable Shopping' }
  }, [])

  useEffect(() => {
    const uid = user?.id
    const memberSince = user?.created_at

    if (!uid) {
      setOrders([])
      setMyReviews([])
      setGreenImpact({ totalCarbonSaved: 0, orderCount: 0 })
      setCarbonByOrderId({})
      setCommunityBoard([])
      setLoading(false)
      return
    }

    setLoading(true)
    let cancelled = false

    async function fetchDashboard() {
      const [ordersRes, reviewsRes, catalogRes] = await Promise.all([
        supabase.from('orders').select('id, total_amount, status, created_at').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('reviews').select('id, rating, body, created_at, products(id, name, slug)').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('products').select('name, slug, image_url, price').limit(48),
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
      let myItems = []
      if (orderIds.length > 0) {
        const { data: orderItems } = await supabase.from('order_items').select('order_id, carbon_saving_kg').in('order_id', orderIds)
        myItems = orderItems ?? []
      }
      if (cancelled) return

      const carbonByOrderIdNext = {}
      for (const item of myItems) {
        carbonByOrderIdNext[item.order_id] = (carbonByOrderIdNext[item.order_id] || 0) + (Number(item.carbon_saving_kg) || 0)
      }
      Object.assign(carbonByOrderIdNext, carbonByOrderIdSynthetic)
      const totalCarbonSaved = Object.values(carbonByOrderIdNext).reduce((sum, value) => sum + value, 0)
      const board = buildHighImpactCommunityBoard(uid)

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
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-4">Your dashboard</h1>

      {/* Green impact */}
      <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/35 p-5 md:p-6 mb-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1.5">Your green impact</h2>
        <p className="text-stone-700 dark:text-stone-300 text-sm sm:text-base mb-1.5">
          By choosing eco-friendly products, you have saved an estimated:
        </p>
        <p className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400">
          {greenImpact.totalCarbonSaved.toFixed(1)} kg CO₂
        </p>
        <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base mt-1">
          Across {greenImpact.orderCount} {greenImpact.orderCount === 1 ? 'order' : 'orders'}.
        </p>
        <p className="text-stone-700 dark:text-stone-300 text-sm sm:text-base mt-2">
          Your contribution to the environment through your purchases is shown above.
        </p>
        {chartData.length > 0 && (
          <div className="mt-5">
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
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
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
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
              Switch grouping for day-by-day noise, weekly rollups (weeks start Monday), monthly totals, or yearly totals.
              Empty days/weeks/months show as 0 kg.
            </p>
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900/90 p-4 md:p-5 overflow-x-auto">
              <Co2LineChart data={chartData} periodDescription={chartPeriodDescription} />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-lime-200 dark:border-lime-900/60 bg-lime-50/50 dark:bg-lime-950/25 p-4 mb-6">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3">High-impact savers (illustrative)</h2>
        <p className="text-xs text-stone-600 dark:text-stone-400 mb-3">
          Example community members with strong estimated savings — not real rankings. Your own total is in <span className="font-medium text-stone-700 dark:text-stone-300">Your green impact</span> above.
        </p>
        <ul className="space-y-2">
          {communityBoard.map((u, idx) => (
            <li key={`${u.name}-${idx}`} className="flex items-center justify-between rounded-md bg-white dark:bg-stone-900 border border-lime-200 dark:border-lime-900/50 px-3 py-2">
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                #{idx + 1} {u.name}
              </span>
              <span className="text-sm tabular-nums text-emerald-800 dark:text-emerald-300 font-semibold">{u.score.toFixed(1)} kg CO₂</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Order history */}
      <section className="mb-6 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/25 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Purchase history</h2>
          <Link to="/orders" className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">Track orders</Link>
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
                  <span className="font-mono text-sm text-stone-700 dark:text-stone-300">{order.id.slice(0, 8)}…</span>
                  <span className="ml-2 text-stone-600 dark:text-stone-400 text-sm">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
                <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">${Number(order.total_amount).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* My reviews */}
      <section className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/30 p-4">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Your reviews</h2>
        {myReviews.length === 0 ? (
          <p className="text-stone-600 dark:text-stone-400">You haven’t written any reviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {myReviews.map((r) => (
              <li key={r.id} className="border-b border-stone-200 dark:border-stone-700 pb-3 last:border-0">
                <Link to={`/products/${r.products?.slug}`} className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
                  {r.products?.name ?? 'Product'}
                </Link>
                <p className="text-amber-500 dark:text-amber-400 text-sm mt-0.5">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                {r.body && <p className="text-stone-700 dark:text-stone-300 text-sm mt-1">{r.body}</p>}
                <p className="text-stone-500 dark:text-stone-500 text-xs mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5 mt-6">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Need help with an order?</h2>
        <p className="text-sm text-stone-700 dark:text-stone-300 mb-3">Our support team can help with delivery updates, returns, and payment questions.</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/about" className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">Open help center</Link>
          <a href="mailto:support@ecoshop.example" className="px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-sm font-medium hover:bg-stone-200 dark:hover:bg-stone-700">Email support</a>
        </div>
      </section>
    </div>
  )
}
