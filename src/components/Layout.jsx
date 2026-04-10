import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../hooks/useCart'
import { useProfile } from '../hooks/useProfile'
import { CartIcon, PersonIcon } from './Icons'

/** Horizontal padding + max width so lines don’t stretch endlessly on large monitors. */
const contentPad = 'px-4 sm:px-6 lg:px-8'
const contentWidth = 'max-w-7xl mx-auto w-full'

/** Header nav text — matches Login / Sign up scale (text-lg). */
const navLinkClass =
  'text-lg font-medium text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 px-2 py-2 rounded-xl hover:bg-stone-100/80 dark:hover:bg-stone-800/70 transition-colors'
const navLinkActiveClass =
  'text-lg font-semibold text-stone-800 dark:text-stone-100 hover:text-emerald-700 dark:hover:text-emerald-400 px-2 py-2 rounded-xl hover:bg-stone-100/80 dark:hover:bg-stone-800/70 transition-colors'

export default function Layout() {
  const { signOut, isAuthenticated } = useAuth()
  const { items } = useCart()
  const { canManageProducts } = useProfile()
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'
  const isProductDetail = /^\/products\/[^/]+$/.test(location.pathname)
  const mainHorizontalPadding = isAuthPage ? 'px-0' : contentPad
  const footerBg = isAuthPage
    ? 'bg-emerald-100/40 dark:bg-emerald-950/50'
    : isProductDetail
      ? 'bg-emerald-50/85 dark:bg-emerald-950/40'
      : 'bg-gradient-to-r from-white to-emerald-50 dark:from-stone-900 dark:to-emerald-950/30'
  const cartCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

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
      <header className="border-b border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-r from-white via-emerald-50 to-teal-50 dark:from-stone-900 dark:via-emerald-950/50 dark:to-stone-900 shadow-sm sticky top-0 z-10">
        <div className={`${contentWidth} ${contentPad} py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}>
          <Link
            to="/"
            className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300 hover:text-emerald-700 dark:hover:text-emerald-200 shrink-0 py-1"
          >
            <img src="/favicon-96x96.png" alt="" aria-hidden="true" className="w-10 h-10 sm:w-11 sm:h-11" />
            <span className="text-2xl sm:text-[1.65rem] font-bold tracking-tight">EcoShop</span>
          </Link>
          <nav className="w-full sm:w-auto flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3 sm:gap-y-2 lg:gap-x-4">
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
              className={`relative inline-flex items-center justify-center ${navLinkClass} !px-3`}
              aria-label="Shopping cart"
            >
              <CartIcon className="w-7 h-7" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.375rem] h-6 px-1.5 flex items-center justify-center bg-emerald-600 text-white text-sm font-semibold rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
            {isAuthenticated && (
              <Link to="/wishlist" className={navLinkClass}>
                Wishlist
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/dashboard" className={navLinkClass}>
                Dashboard
              </Link>
            )}
            {canManageProducts && (
              <Link to="/admin/products" className={navLinkClass}>
                Dev tools
              </Link>
            )}
            {isAuthenticated ? (
              <>
                <Link to="/settings" className={navLinkClass}>
                  Settings
                </Link>
                <Link
                  to="/profile"
                  className={`inline-flex items-center justify-center ${navLinkClass} !px-3`}
                  aria-label="Profile"
                >
                  <PersonIcon className="w-7 h-7" />
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-lg font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  aria-label="Log out"
                >
                  Logout
                </button>
              </>
            ) : (
              <span className="flex flex-wrap items-center gap-3 sm:gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2.5 px-7 py-3 sm:px-8 sm:py-3.5 bg-emerald-600 text-white text-lg font-semibold rounded-2xl hover:bg-emerald-700 shadow-md"
                  aria-label="Log in"
                >
                  <PersonIcon className="w-7 h-7 shrink-0" />
                  <span>Login</span>
                </Link>
                <Link
                  to="/signup"
                  className="text-stone-800 dark:text-stone-100 hover:text-emerald-700 dark:hover:text-emerald-400 text-lg font-semibold px-4 py-2.5 sm:py-3 rounded-2xl hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 border-2 border-transparent hover:border-emerald-200/80 dark:hover:border-emerald-700/50"
                >
                  Sign up
                </Link>
              </span>
            )}
          </nav>
        </div>
      </header>
      <main
        className={`flex-1 text-stone-900 dark:text-stone-100 ${
          isAuthPage
            ? 'w-full max-w-none mx-0 px-0 py-0'
            : `${contentWidth} ${mainHorizontalPadding} py-6 sm:py-8`
        } ${!isAuthPage ? 'text-base leading-relaxed' : ''}`}
      >
        <Outlet />
      </main>
      <footer className={`border-t border-emerald-200 dark:border-emerald-800/50 py-6 sm:py-7 mt-auto ${footerBg}`}>
        <div className={`${contentWidth} ${contentPad} text-center text-stone-600 dark:text-stone-400 text-sm sm:text-base`}>
          EcoShop – Sustainable shopping for a greener future.
        </div>
      </footer>
    </div>
  )
}
