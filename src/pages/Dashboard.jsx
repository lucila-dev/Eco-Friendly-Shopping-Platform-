import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { augmentOrdersWithPresentationHistory } from '../lib/presentationOrders'

function niceYMax(value) {
  if (!Number.isFinite(value) || value <= 0) return 1
  const exp = Math.floor(Math.log10(value))
  const fraction = value / 10 ** exp
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return niceFraction * 10 ** exp
}

function MonthlyCo2LineChart({ data }) {
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
      aria-label="Line chart of CO₂ saved per month"
    >
      <defs>
        <linearGradient id="ecoLineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <text x={6} y={16} className="fill-stone-500 text-[12px] font-semibold">kg CO₂</text>
      {tickValues.map((t, i) => {
        const y = padT + innerH - (t / yMax) * innerH
        return (
          <g key={`y-${i}`}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} className="stroke-stone-200" strokeDasharray="4 3" strokeWidth="1" />
            <text x={padL - 10} y={y + 4} textAnchor="end" className="fill-stone-500 text-[11px] tabular-nums">
              {t.toFixed(1)}
            </text>
          </g>
        )
      })}
      <line x1={padL} y1={padT + innerH} x2={width - padR} y2={padT + innerH} className="stroke-stone-300" strokeWidth="1" />
      <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} className="stroke-stone-300" strokeWidth="1" />
      {pathD && (
        <>
          <path d={`${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`} fill="url(#ecoLineFill)" />
          <path d={pathD} fill="none" className="stroke-emerald-600" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {points.map((p) => (
        <g key={p.month}>
          <circle cx={p.x} cy={p.y} r="5.5" className="fill-white stroke-emerald-600" strokeWidth="2.5" />
          <text x={p.x} y={height - 14} textAnchor="middle" className="fill-stone-600 text-[11px] font-semibold">
            {p.month}
          </text>
          <text x={p.x} y={p.y - 12} textAnchor="middle" className="fill-emerald-800 text-[11px] font-semibold tabular-nums">
            {p.value.toFixed(1)}
          </text>
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
  const [monthlyImpact, setMonthlyImpact] = useState([])
  const [communityBoard, setCommunityBoard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Dashboard – EcoShop'
    return () => { document.title = 'EcoShop – Sustainable Shopping' }
  }, [])

  useEffect(() => {
    async function fetchDashboard() {
      if (!user) return
      const [ordersRes, reviewsRes, catalogRes] = await Promise.all([
        supabase.from('orders').select('id, total_amount, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('reviews').select('id, rating, body, created_at, products(id, name, slug)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('products').select('name, slug, image_url, price').limit(48),
      ])
      const realOrders = ordersRes.data ?? []
      const { displayOrders, carbonByOrderIdSynthetic } = augmentOrdersWithPresentationHistory(
        user.id,
        realOrders,
        catalogRes.data ?? [],
      )
      setOrders(displayOrders)

      const orderIds = realOrders.map((o) => o.id)
      let myItems = []
      if (orderIds.length > 0) {
        const { data: orderItems } = await supabase.from('order_items').select('order_id, carbon_saving_kg').in('order_id', orderIds)
        myItems = orderItems ?? []
      }
      const carbonByOrderId = {}
      for (const item of myItems) {
        carbonByOrderId[item.order_id] = (carbonByOrderId[item.order_id] || 0) + (Number(item.carbon_saving_kg) || 0)
      }
      Object.assign(carbonByOrderId, carbonByOrderIdSynthetic)
      const totalCarbonSaved = Object.values(carbonByOrderId).reduce((sum, value) => sum + value, 0)
      setGreenImpact({ totalCarbonSaved, orderCount: displayOrders.length })
      const monthMap = {}
      for (const o of displayOrders) {
        const month = new Date(o.created_at).toLocaleDateString(undefined, { month: 'short' })
        monthMap[o.id] = month
      }
      const monthlyTotals = {}
      for (const [orderId, value] of Object.entries(carbonByOrderId)) {
        const month = monthMap[orderId] || 'Other'
        monthlyTotals[month] = (monthlyTotals[month] || 0) + (Number(value) || 0)
      }
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const series = Object.entries(monthlyTotals)
        .sort((a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]))
        .map(([month, value]) => ({ month, value: Number(value.toFixed(1)) }))
      setMonthlyImpact(series)
      const pseudoUsers = ['Ava', 'Maya', 'Liam', 'Noah', 'Zoe']
      const base = Math.max(10, totalCarbonSaved)
      const board = pseudoUsers.map((name, idx) => ({
        name,
        score: Number((base * (0.72 + (idx * 0.11))).toFixed(1)),
      }))
      board.push({ name: 'You', score: Number(totalCarbonSaved.toFixed(1)) })
      board.sort((a, b) => b.score - a.score)
      setCommunityBoard(board)
      setMyReviews(reviewsRes.data ?? [])
      setLoading(false)
    }
    fetchDashboard()
  }, [user?.id])

  if (loading) return <p className="text-stone-500">Loading dashboard...</p>

  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-800 mb-6">Your dashboard</h1>

      {/* Green impact */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 md:p-8 mb-6 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-800 mb-2">Your green impact</h2>
        <p className="text-stone-600 text-base mb-2">
          By choosing eco-friendly products, you have saved an estimated:
        </p>
        <p className="text-3xl font-bold text-emerald-700">
          {greenImpact.totalCarbonSaved.toFixed(1)} kg CO₂
        </p>
        <p className="text-stone-500 text-base mt-1">
          Across {greenImpact.orderCount} {greenImpact.orderCount === 1 ? 'order' : 'orders'}.
        </p>
        <p className="text-stone-600 text-base mt-3">
          Your contribution to the environment through your purchases is shown above.
        </p>
        {monthlyImpact.length > 0 && (
          <div className="mt-5">
            <p className="text-base font-semibold text-stone-700 mb-2">CO₂ saved by month</p>
            <div className="rounded-xl border border-emerald-200 bg-white p-4 md:p-5">
              <MonthlyCo2LineChart data={monthlyImpact} />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-lime-200 bg-lime-50/50 p-4 mb-6">
        <h2 className="text-lg font-semibold text-stone-800 mb-3">Community CO₂ comparison</h2>
        <ul className="space-y-2">
          {communityBoard.map((u, idx) => (
            <li key={`${u.name}-${idx}`} className="flex items-center justify-between rounded-md bg-white border border-lime-200 px-3 py-2">
              <span className={`text-sm ${u.name === 'You' ? 'font-semibold text-emerald-700' : 'text-stone-700'}`}>
                #{idx + 1} {u.name}
              </span>
              <span className={`text-sm ${u.name === 'You' ? 'font-semibold text-emerald-700' : 'text-stone-600'}`}>{u.score.toFixed(1)} kg CO₂</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Order history */}
      <section className="mb-6 rounded-xl border border-teal-200 bg-teal-50/30 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-800">Purchase history</h2>
          <Link to="/orders" className="text-sm text-emerald-600 hover:underline">Track orders</Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-stone-500">You have not placed any orders yet.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex items-center justify-between py-3 border-b border-stone-200 last:border-0"
              >
                <div>
                  <span className="font-mono text-sm text-stone-600">{order.id.slice(0, 8)}...</span>
                  <span className="ml-2 text-stone-500 text-sm">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
                <span className="font-medium text-emerald-700">${Number(order.total_amount).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* My reviews */}
      <section className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
        <h2 className="text-lg font-semibold text-stone-800 mb-4">Your reviews</h2>
        {myReviews.length === 0 ? (
          <p className="text-stone-500">You haven’t written any reviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {myReviews.map((r) => (
              <li key={r.id} className="border-b border-stone-200 pb-3 last:border-0">
                <Link to={`/products/${r.products?.slug}`} className="font-medium text-emerald-700 hover:underline">
                  {r.products?.name ?? 'Product'}
                </Link>
                <p className="text-amber-500 text-sm mt-0.5">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                {r.body && <p className="text-stone-600 text-sm mt-1">{r.body}</p>}
                <p className="text-stone-400 text-xs mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 mt-6">
        <h2 className="text-lg font-semibold text-stone-800 mb-2">Need help with an order?</h2>
        <p className="text-sm text-stone-600 mb-3">Our support team can help with delivery updates, returns, and payment questions.</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/about" className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700">Open help center</Link>
          <a href="mailto:support@ecoshop.example" className="px-3 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm hover:bg-stone-200">Email support</a>
        </div>
      </section>
    </div>
  )
}
