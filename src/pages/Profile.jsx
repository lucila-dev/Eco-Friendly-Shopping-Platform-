import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [nameInput, setNameInput] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null)
  const [profileMessage, setProfileMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Profile – EcoShop'
    return () => { document.title = 'EcoShop – Sustainable Shopping' }
  }, [])

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, loyalty_credits')
        .eq('id', user.id)
        .maybeSingle()
      setProfile(data ?? null)
      setNameInput(data?.display_name ?? '')
      setLoading(false)
    }
    fetchProfile()
  }, [user?.id])

  if (loading) return <p className="text-stone-500">Loading profile...</p>

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User'

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileMessage('')
    setSavingProfile(true)
    const updates = {
      id: user.id,
      display_name: nameInput.trim() || null,
      avatar_url: profile?.avatar_url || null,
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
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Profile</h1>
      <section className="rounded-xl border border-stone-200 bg-white p-6">
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

            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
              <span className="text-emerald-700 font-semibold">Loyalty card</span>
              <span className="text-emerald-800 text-sm">Credits: {Number(profile?.loyalty_credits ?? 1000).toFixed(2)}</span>
            </div>

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
    </div>
  )
}
