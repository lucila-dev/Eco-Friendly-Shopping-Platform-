import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../hooks/useCart'
import { isSupabaseConfigured } from '../lib/supabase'
import { CartIcon, PersonIcon } from './Icons'
import AccountDropdown from './AccountDropdown'
import HomeAnnouncementBar from './HomeAnnouncementBar'

const contentPad = 'px-4 sm:px-6 lg:px-8'
const contentWidth = 'max-w-7xl mx-auto w-full'

const navLinkClass =
  'text-sm sm:text-[0.9375rem] font-medium text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 px-1.5 py-1.5 rounded-lg hover:bg-stone-100/80 dark:hover:bg-stone-800/70 transition-colors'
const navLinkActiveClass =
  'text-sm sm:text-[0.9375rem] font-semibold text-stone-800 dark:text-stone-100 hover:text-emerald-700 dark:hover:text-emerald-400 px-1.5 py-1.5 rounded-lg hover:bg-stone-100/80 dark:hover:bg-stone-800/70 transition-colors'

export default function Layout() {
  const { signOut, isAuthenticated } = useAuth()
  const { items } = useCart()
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'
  const isProductDetail = /^\/products\/[^/]+$/.test(location.pathname)
  const mainHorizontalPadding = isAuthPage ? 'px-0' : contentPad
  const footerBg = isAuthPage
    ? 'bg-emerald-100/40 dark:bg-emerald-950/50'
    : isProductDetail
      ? 'bg-emerald-50/85 dark:bg-emerald-950/40'
      : 'bg-gradient-to-r from-white to-emerald-50 dark:from-stone-900 dark:to-emerald-950/30'
  const cartCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  const isHome = location.pathname === '/'

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isAuthPage
          ? 'bg-emerald-100/70 dark:bg-emerald-950/40'
          : isProductDetail
            ? 'bg-emerald-50/85 dark:bg-emerald-950/35'
            : 'bg-stone-50 dark:bg-stone-900'
      }`}
    >
      {isHome && <HomeAnnouncementBar />}
      <header className="border-b border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-r from-white via-emerald-50 to-teal-50 dark:from-stone-900 dark:via-emerald-950/50 dark:to-stone-900 shadow-sm sticky top-0 z-20">
        <div className={`${contentWidth} ${contentPad} py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3`}>
          <Link
            to="/"
            className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 hover:text-emerald-700 dark:hover:text-emerald-200 shrink-0 py-0.5"
          >
            <img src="/favicon-96x96.png" alt="" aria-hidden="true" className="w-8 h-8 sm:w-9 sm:h-9" />
            <span className="text-lg sm:text-xl font-bold tracking-tight">EcoShop</span>
          </Link>
          <nav className="w-full sm:w-auto flex flex-wrap items-center gap-x-1 gap-y-1 sm:gap-x-2 sm:gap-y-1.5">
            <Link to="/" className={navLinkActiveClass}>
              Home
            </Link>
            <Link to="/products" className={navLinkClass}>
              Products
            </Link>
            <Link to="/about" className={navLinkClass}>
              About
            </Link>
            <Link
              to="/cart"
              className={`relative inline-flex items-center gap-1.5 ${navLinkClass}`}
            >
              <CartIcon className="w-5 h-5 shrink-0" aria-hidden />
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="min-w-[1.125rem] h-5 px-1 flex items-center justify-center bg-emerald-600 text-white text-[0.65rem] font-semibold rounded-full leading-none">
                  {cartCount}
                </span>
              )}
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className={navLinkClass}>
                  Dashboard
                </Link>
                <AccountDropdown />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await signOut()
                    } catch (e) {
                      console.warn('[EcoShop] signOut failed:', e)
                    } finally {
                      navigate('/login', { replace: true })
                    }
                  }}
                  className="text-sm sm:text-[0.9375rem] font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-1.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  aria-label="Log out"
                >
                  Log out
                </button>
              </>
            ) : (
              <span className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2 bg-emerald-600 text-white text-sm sm:text-[0.9375rem] font-semibold rounded-xl hover:bg-emerald-700 shadow-sm"
                  aria-label="Log in"
                >
                  <PersonIcon className="w-5 h-5 shrink-0" />
                  <span>Login</span>
                </Link>
                <Link
                  to="/signup"
                  className="text-stone-800 dark:text-stone-100 hover:text-emerald-700 dark:hover:text-emerald-400 text-sm sm:text-[0.9375rem] font-semibold px-3 py-2 rounded-xl hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 border border-transparent hover:border-emerald-200/80 dark:hover:border-emerald-700/50"
                >
                  Sign up
                </Link>
              </span>
            )}
          </nav>
        </div>
      </header>
      {!isSupabaseConfigured && (
        <div
          className="bg-amber-100 dark:bg-amber-950/80 border-b border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 text-center text-xs sm:text-sm px-4 py-2"
          role="status"
        >
          <strong className="font-semibold">Backend not configured.</strong> Add{' '}
          <code className="rounded bg-amber-200/80 dark:bg-amber-900/60 px-1 py-0.5 text-[0.8em]">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-amber-200/80 dark:bg-amber-900/60 px-1 py-0.5 text-[0.8em]">VITE_SUPABASE_ANON_KEY</code> in
          your host&apos;s environment variables, then redeploy.
        </div>
      )}
      <main
        className={`flex-1 text-stone-900 dark:text-stone-100 ${
          isAuthPage
            ? 'w-full max-w-none mx-0 px-0 py-0'
            : `${contentWidth} ${mainHorizontalPadding} ${
                isHome ? 'pt-4 sm:pt-6 pb-0' : 'py-4 sm:py-6'
              }`
        } ${!isAuthPage ? 'text-sm sm:text-base leading-relaxed' : ''}`}
      >
        <Outlet />
      </main>
      {!isHome && (
        <footer className={`border-t border-emerald-200 dark:border-emerald-800/50 py-4 sm:py-5 mt-auto ${footerBg}`}>
          <div className={`${contentWidth} ${contentPad} text-center text-stone-600 dark:text-stone-400 text-xs sm:text-sm`}>
            EcoShop · Sustainable shopping for a greener future.
          </div>
        </footer>
      )}
    </div>
  )
}
