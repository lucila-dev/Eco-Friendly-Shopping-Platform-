import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { LOYALTY_POINTS_PER_DOLLAR, loyaltyCreditsToMoney } from '../lib/loyaltyValue'
import { usdToGbpApprox } from '../lib/shopMoney'
import { useFormatPrice } from '../hooks/useFormatPrice'
import {
  getProfileAvatarLocal,
  setProfileAvatarLocal,
  notifyProfileAvatarUpdated,
} from '../lib/profileAvatarLocal'
import { CartIcon, LeafIcon, TruckIcon } from '../components/Icons'

const DEFAULT_AVATAR = '/favicon-96x96.png'

export default function Profile() {
  const { format } = useFormatPrice()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [nameInput, setNameInput] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [avatarBump, setAvatarBump] = useState(0)
  const avatarInputRef = useRef(null)

  useEffect(() => {
    document.title = 'Profile · EcoShop'
    return () => { document.title = 'EcoShop · Sustainable Shopping' }
  }, [])

  useEffect(() => {
    const fn = () => setAvatarBump((n) => n + 1)
    window.addEventListener('ecoshop_profile_avatar', fn)
    return () => window.removeEventListener('ecoshop_profile_avatar', fn)
  }, [])

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, loyalty_credits')
        .eq('id', user.id)
        .maybeSingle()
      const localAv = getProfileAvatarLocal(user.id)
      const merged = data
        ? { ...data, avatar_url: (data.avatar_url || '').trim() || localAv || data.avatar_url }
        : data
      setProfile(merged ?? null)
      setNameInput(merged?.display_name ?? '')
      setLoading(false)
    }
    fetchProfile()
  }, [user?.id, avatarBump])

  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto flex justify-center py-10">
        <p className="text-stone-500 dark:text-stone-400 text-sm">Loading profile...</p>
      </div>
    )
  }

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User'
  const loyaltyBalance = Number(profile?.loyalty_credits ?? 1000)
  const redeemApproxUsd = loyaltyCreditsToMoney(loyaltyBalance)
  const avatarSrc =
    (profile?.avatar_url || '').trim() ||
    getProfileAvatarLocal(user?.id) ||
    DEFAULT_AVATAR

  const persistAvatarUrl = async (avatarUrl) => {
    if (!user?.id || !avatarUrl?.trim()) return { error: new Error('Missing user or URL') }
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: nameInput.trim() || null,
        avatar_url: avatarUrl.trim(),
        loyalty_credits: Number(profile?.loyalty_credits ?? 1000),
      })
    return { error }
  }

  const processAvatarFile = async (file) => {
    if (!file || !user?.id) return
    setProfileMessage('')
    setUploadingAvatar(true)

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `avatars/${user.id}-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: false })

    if (!uploadError) {
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      const publicUrl = data.publicUrl
      setProfile((prev) => ({ ...(prev ?? {}), avatar_url: publicUrl }))
      setProfileAvatarLocal(user.id, publicUrl)
      notifyProfileAvatarUpdated()
      const { error: saveErr } = await persistAvatarUrl(publicUrl)
      setUploadingAvatar(false)
      setProfileMessage(saveErr ? `Could not save: ${saveErr.message}` : '')
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result
      if (typeof dataUrl !== 'string') {
        setUploadingAvatar(false)
        setProfileMessage(`Could not use image: ${uploadError.message}`)
        return
      }
      setProfile((prev) => ({ ...(prev ?? {}), avatar_url: dataUrl }))
      setProfileAvatarLocal(user.id, dataUrl)
      notifyProfileAvatarUpdated()
      setUploadingAvatar(false)
      const { error: saveErr } = await persistAvatarUrl(dataUrl)
      setProfileMessage(saveErr ? `Could not save: ${saveErr.message}` : '')
    }
    reader.onerror = () => {
      setUploadingAvatar(false)
      setProfileMessage(`Could not read file: ${uploadError.message}`)
    }
    reader.readAsDataURL(file)
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileMessage('')
    setSavingProfile(true)
    const url = (profile?.avatar_url || '').trim() || null
    if (url) setProfileAvatarLocal(user.id, url)
    const updates = {
      id: user.id,
      display_name: nameInput.trim() || null,
      avatar_url: url,
      loyalty_credits: Number(profile?.loyalty_credits ?? 1000),
    }
    const { data, error } = await supabase
      .from('profiles')
      .upsert(updates)
      .select('display_name, avatar_url, loyalty_credits')
      .single()
    setSavingProfile(false)
    if (error) {
      setProfileMessage(`Could not save profile: ${error.message}`)
      return
    }
    setProfile(data)
    notifyProfileAvatarUpdated()
    setProfileMessage('')
  }

  const memberSinceLabel = new Date(user?.created_at || Date.now()).toLocaleDateString(undefined, {
    dateStyle: 'long',
  })

  const shortcutClass =
    'group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-emerald-100 dark:border-emerald-800/70 bg-white dark:bg-stone-900 px-3 py-4 text-center shadow-sm transition hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-stone-800/80 hover:shadow'

  return (
    <div className="w-full max-w-3xl mx-auto pb-8">
      <header className="text-center mb-6 sm:mb-8">
        <p className="mb-2">
          <Link
            to="/account"
            className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            ← Your account
          </Link>
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">Your profile</h1>
        <p className="mt-2 text-sm sm:text-base text-stone-600 dark:text-stone-300 max-w-md mx-auto leading-relaxed">
          Update how you appear on EcoShop, check your loyalty balance, and jump back to shopping or your activity.
        </p>
      </header>

      <section className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" aria-hidden />
        <div className="p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36">
              <img
                src={avatarSrc}
                alt={`${displayName} avatar`}
                className="w-full h-full rounded-full object-cover border-4 border-emerald-100 dark:border-emerald-800 shadow-md ring-4 ring-emerald-50 dark:ring-emerald-950/50"
              />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) processAvatarFile(f)
                }}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white dark:border-stone-900 bg-emerald-600 text-lg font-light leading-none text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                aria-label="Change profile photo"
              >
                {uploadingAvatar ? '…' : '+'}
              </button>
            </div>
            <p className="text-lg sm:text-xl font-semibold text-stone-900 dark:text-stone-100 mt-4">{displayName}</p>
            <p className="text-stone-600 dark:text-stone-400 mt-2 text-sm sm:text-base break-all max-w-md">{user?.email}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-6 sm:mt-8">
            <div className="rounded-xl border border-stone-100 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-800/60 px-4 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Member since</p>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 mt-1.5 leading-snug">{memberSinceLabel}</p>
            </div>
            <div className="rounded-xl border border-stone-100 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-800/60 px-4 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Loyalty snapshot</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                {loyaltyBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })} pts
              </p>
            </div>
            <div className="rounded-xl border border-stone-100 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-800/60 px-4 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Redeem value</p>
              <p className="text-lg font-semibold text-stone-800 dark:text-stone-100 mt-1 tabular-nums">{format(usdToGbpApprox(redeemApproxUsd))}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">at checkout</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 sm:p-6 shadow-lg border border-emerald-500/40 text-center sm:text-left">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-emerald-100/90">EcoShop loyalty</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1.5 tabular-nums text-center sm:text-left">
              {loyaltyBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })} pts
            </p>
            <p className="text-sm sm:text-base text-emerald-50 mt-2 leading-snug">
              {LOYALTY_POINTS_PER_DOLLAR} points = {format(usdToGbpApprox(1))} when redeemed at checkout.
            </p>
            <p className="text-sm font-medium mt-1.5">
              Balance worth about <span className="tabular-nums">{format(usdToGbpApprox(redeemApproxUsd))}</span> off eligible orders.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-700">
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 text-center sm:text-left mb-4">Edit your details</h2>
            <form onSubmit={saveProfile} className="space-y-4 max-w-lg mx-auto sm:mx-0">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                  Display name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-xl bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save profile'}
                </button>
              </div>
              {profileMessage && <p className="text-sm text-red-700 dark:text-red-400">{profileMessage}</p>}
            </form>
          </div>
        </div>
      </section>

      <section className="mt-8" aria-label="Quick links">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 text-center mb-3">Quick links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link to="/products" className={shortcutClass}>
            <CartIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">Shop</span>
            <span className="text-xs text-stone-500 dark:text-stone-400">Browse products</span>
          </Link>
          <Link to="/dashboard" className={shortcutClass}>
            <LeafIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">Impact</span>
            <span className="text-xs text-stone-500 dark:text-stone-400">Your dashboard</span>
          </Link>
          <Link to="/orders" className={shortcutClass}>
            <TruckIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">Orders</span>
            <span className="text-xs text-stone-500 dark:text-stone-400">Track shipments</span>
          </Link>
          <Link to="/wishlist" className={shortcutClass}>
            <span className="text-xl" aria-hidden>
              ♡
            </span>
            <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">Wishlist</span>
            <span className="text-xs text-stone-500 dark:text-stone-400">Saved items</span>
          </Link>
        </div>
      </section>

      <p className="mt-8 text-center text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-lg mx-auto leading-relaxed px-2">
        Earn more points with every purchase, then apply them at checkout to support a lower-impact basket.
      </p>
    </div>
  )
}
