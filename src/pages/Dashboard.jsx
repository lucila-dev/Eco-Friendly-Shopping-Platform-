import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [nameInput, setNameInput] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null)
  const [profileMessage, setProfileMessage] = useState('')
  const [orders, setOrders] = useState([])
  const [myReviews, setMyReviews] = useState([])
  const [greenImpact, setGreenImpact] = useState({ totalCarbonSaved: 0, orderCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Dashboard – EcoShop'
    return () => { document.title = 'EcoShop – Sustainable Shopping' }
  }, [])

  useEffect(() => {
    async function fetchDashboard() {
      if (!user) return
      const [profileRes, ordersRes, reviewsRes] = await Promise.all([
        supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle(),
        supabase.from('orders').select('id, total_amount, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('reviews').select('id, rating, body, created_at, products(id, name, slug)').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])
      setProfile(profileRes.data ?? null)
      setNameInput(profileRes.data?.display_name ?? '')
      setOrders(ordersRes.data ?? [])

      const orderIds = (ordersRes.data ?? []).map((o) => o.id)
      let myItems = []
      if (orderIds.length > 0) {
        const { data: orderItems } = await supabase.from('order_items').select('order_id, carbon_saving_kg').in('order_id', orderIds)
        myItems = orderItems ?? []
      }
      const totalCarbonSaved = myItems.reduce((sum, i) => sum + (Number(i.carbon_saving_kg) || 0), 0)
      setGreenImpact({ totalCarbonSaved, orderCount: ordersRes.data?.length ?? 0 })
      setMyReviews(reviewsRes.data ?? [])
      setLoading(false)
    }
    fetchDashboard()
  }, [user?.id])

  if (loading) return <p className="text-stone-500">Loading dashboard...</p>

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User'

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileMessage('')
    setSavingProfile(true)
    const updates = {
      id: user.id,
      display_name: nameInput.trim() || null,
      avatar_url: profile?.avatar_url || null,
    }
    const { data, error } = await supabase
      .from('profiles')
      .upsert(updates)
      .select('display_name, avatar_url')
      .single()
    setSavingProfile(false)
    if (error) {
      setProfileMessage(`Could not save profile: ${error.message}`)
      return
    }
    setProfile(data)
    setProfileMessage('Profile updated successfully.')
  }

  const uploadAvatar = async () => {
    if (!selectedAvatarFile) return
    setProfileMessage('')
    setUploadingAvatar(true)
    const ext = selectedAvatarFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `avatars/${user.id}-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, selectedAvatarFile, { upsert: false })
    if (uploadError) {
      setUploadingAvatar(false)
      setProfileMessage(`Avatar upload failed: ${uploadError.message}`)
      return
    }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    const next = { ...(profile ?? {}), avatar_url: data.publicUrl }
    setProfile(next)
    setUploadingAvatar(false)
    setProfileMessage('Avatar uploaded. Click Save profile to keep changes.')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Your dashboard</h1>

      {/* Profile & details */}
      <section className="rounded-xl border border-stone-200 bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold text-stone-800 mb-3">Your details</h2>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="shrink-0">
            <img
              src={profile?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200'}
              alt={`${displayName} avatar`}
              className="w-24 h-24 rounded-full object-cover border border-stone-200"
            />
          </div>
          <div className="flex-1">
            <p className="text-stone-700 font-medium">{displayName}</p>
            <p className="text-stone-500 text-sm mt-1">{user?.email}</p>
            <p className="text-stone-500 text-sm mt-1">Member since: {new Date(user?.created_at || Date.now()).toLocaleDateString()}</p>
            <p className="text-stone-500 text-sm mt-1">Payment method: Card ending in **** (saved for checkout)</p>
            <form onSubmit={saveProfile} className="mt-4 space-y-3">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-stone-700 mb-1">Display name</label>
                <input
                  id="displayName"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 max-w-md">
                <label className="block text-sm font-medium text-stone-700 mb-1">Profile picture</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={(e) => setSelectedAvatarFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-xs text-stone-600 file:mr-2 file:rounded file:border-0 file:bg-emerald-600 file:px-2 file:py-1 file:text-white hover:file:bg-emerald-700"
                  />
                  <button
                    type="button"
                    onClick={uploadAvatar}
                    disabled={uploadingAvatar || !selectedAvatarFile}
                    className="shrink-0 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {uploadingAvatar ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save profile'}
              </button>
              {profileMessage && <p className="text-sm text-stone-600">{profileMessage}</p>}
            </form>
          </div>
        </div>
      </section>

      {/* Green impact */}
      <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 mb-6">
        <h2 className="text-lg font-semibold text-stone-800 mb-2">Your green impact</h2>
        <p className="text-stone-600 mb-2">
          By choosing eco-friendly products, you have saved an estimated:
        </p>
        <p className="text-2xl font-bold text-emerald-700">
          {greenImpact.totalCarbonSaved.toFixed(1)} kg CO₂
        </p>
        <p className="text-stone-500 text-sm mt-1">
          Across {greenImpact.orderCount} {greenImpact.orderCount === 1 ? 'order' : 'orders'}.
        </p>
        <p className="text-stone-600 text-sm mt-3">
          Your contribution to the environment through your purchases is shown above.
        </p>
      </section>

      {/* Order history */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-stone-800 mb-4">Purchase history</h2>
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
      <section>
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
    </div>
  )
}
