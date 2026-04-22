import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../hooks/useCart'
import { isSupabaseConfigured } from '../lib/supabase'
import { CartIcon, PersonIcon } from './Icons'
import AccountDropdown from './AccountDropdown'
import HomeAnnouncementBar from './HomeAnnouncementBar'
import SiteFooter from './SiteFooter'
import { layoutContentPadClass, layoutContentWidthClass } from '../lib/layoutContent'

const navLinkClass =
  'text-base sm:text-[1.0625rem] font-medium text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 px-2 py-2 rounded-lg hover:bg-stone-100/80 dark:hover:bg-stone-800/70 transition-colors'
const navLinkActiveClass =
  'text-base sm:text-[1.0625rem] font-semibold text-stone-800 dark:text-stone-100 hover:text-emerald-700 dark:hover:text-emerald-400 px-2 py-2 rounded-lg hover:bg-stone-100/80 dark:hover:bg-stone-800/70 transition-colors'

export default function Layout() {
  const { isAuthenticated, emailConfirmed } = useAuth()
  const { items } = useCart()
  const location = useLocation()
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/verify-email'
  const isProductDetail = /^\/products\/[^/]+$/.test(location.pathname)
  const mainHorizontalPadding = isAuthPage ? 'px-0' : layoutContentPadClass
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
      <header className="overflow-visible border-b border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-r from-white via-emerald-50 to-teal-50 dark:from-stone-900 dark:via-emerald-950/50 dark:to-stone-900 shadow-sm sticky top-0 z-20">
        <div
          className={`${layoutContentWidthClass} ${layoutContentPadClass} flex flex-col gap-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-3`}
        >
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start sm:gap-0">
            <Link
              to="/"
              className="flex min-w-0 items-center gap-2 py-0.5 text-emerald-800 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200"
            >
              <img src="/favicon-96x96.png" alt="" aria-hidden="true" className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
              <span className="truncate text-xl font-bold tracking-tight sm:text-2xl">EcoShop</span>
            </Link>
            <Link
              to="/cart"
              className={`relative inline-flex shrink-0 items-center gap-1.5 sm:hidden ${navLinkClass}`}
            >
              <CartIcon className="h-5 w-5 shrink-0" aria-hidden />
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-xs font-semibold leading-none text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>

          <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <nav className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 sm:justify-end sm:gap-x-2 sm:gap-y-1.5">
              <Link to="/" className={navLinkActiveClass}>
                Home
              </Link>
              <Link to="/products" className={navLinkClass}>
                Products
              </Link>
              <Link to="/about" className={navLinkClass}>
                About
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className={navLinkClass}>
                    Dashboard
                  </Link>
                  <AccountDropdown />
                </>
              ) : (
                <span className="inline-flex flex-wrap items-center justify-center gap-2 sm:justify-end sm:gap-2.5">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-emerald-700 sm:px-5 sm:text-[1.0625rem] sm:py-2.5"
                    aria-label="Log in"
                  >
                    <PersonIcon className="h-5 w-5 shrink-0" />
                    <span>Login</span>
                  </Link>
                  <Link
                    to="/signup"
                    className="inline-flex items-center rounded-xl border border-transparent px-3 py-2.5 text-base font-semibold text-stone-800 hover:border-emerald-200/80 hover:bg-emerald-100/60 hover:text-emerald-700 dark:text-stone-100 dark:hover:border-emerald-700/50 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 sm:text-[1.0625rem]"
                  >
                    Sign up
                  </Link>
                </span>
              )}
            </nav>
            <Link
              to="/cart"
              className={`relative hidden shrink-0 items-center gap-1.5 sm:inline-flex ${navLinkClass}`}
            >
              <CartIcon className="h-5 w-5 shrink-0" aria-hidden />
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-xs font-semibold leading-none text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>
      {isAuthenticated && !emailConfirmed && location.pathname !== '/verify-email' && (
        <div
          className="bg-amber-100 dark:bg-amber-950/80 border-b border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 text-center text-base sm:text-lg px-4 py-2.5"
          role="status"
        >
          <strong className="font-semibold">Confirm your email</strong> to use the cart, checkout, and your account.{' '}
          <Link to="/verify-email" className="font-semibold text-emerald-800 dark:text-emerald-300 underline underline-offset-2">
            Open confirmation page
          </Link>
        </div>
      )}
      {!isSupabaseConfigured && (
        <div
          className="bg-amber-100 dark:bg-amber-950/80 border-b border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 text-center text-base sm:text-lg px-4 py-2.5"
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
            ? `${layoutContentWidthClass} ${layoutContentPadClass} mx-auto flex w-full flex-col justify-center py-8 sm:py-12 md:py-16`
            : `${layoutContentWidthClass} ${mainHorizontalPadding} py-5 sm:py-8`
        } text-base sm:text-lg leading-relaxed`}
      >
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
