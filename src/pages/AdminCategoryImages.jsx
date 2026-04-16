import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import AdminCategoryImagesPanel from '../components/AdminCategoryImagesPanel'

export default function AdminCategoryImages() {
  const { canManageProducts, loading: profileLoading } = useProfile()

  useEffect(() => {
    document.title = 'Category images · Dev tools · EcoShop'
    return () => { document.title = 'EcoShop · Sustainable Shopping' }
  }, [])

  if (profileLoading || !canManageProducts) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4">Category images</h1>
        {!profileLoading && !canManageProducts && (
          <p className="text-stone-600 dark:text-stone-300">
            Access denied. Dev tools is only available to accounts on the project allowlist.
          </p>
        )}
        {profileLoading && <p className="text-stone-500 dark:text-stone-400">Loading...</p>}
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Link
        to="/admin/products"
        className="text-base text-stone-500 dark:text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-3 inline-block"
      >
        ← Products
      </Link>
      <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">Category images</h1>
      <p className="text-base text-stone-600 dark:text-stone-400 mb-4">Home page category cards.</p>
      <section className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900/90 p-4 sm:p-5 shadow-sm dark:shadow-none">
        <AdminCategoryImagesPanel />
      </section>
    </div>
  )
}
