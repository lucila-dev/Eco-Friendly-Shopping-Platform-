import { Outlet, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../hooks/useCart'
import { useProfile } from '../hooks/useProfile'
import { CartIcon, PersonIcon } from './Icons'

export default function Layout() {
  const { signOut, isAuthenticated } = useAuth()
  const { items } = useCart()
  const { canManageProducts } = useProfile()
  const cartCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <header className="border-b border-emerald-200 bg-gradient-to-r from-white via-emerald-50 to-teal-50 shadow-sm sticky top-0 z-10">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 text-emerald-800 hover:text-emerald-700 shrink-0">
            <img src="/favicon.svg" alt="" aria-hidden="true" className="w-7 h-7" />
            <span className="text-xl font-semibold">EcoShop</span>
          </Link>
          <nav className="w-full sm:w-auto flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-6">
            <Link to="/products" className="text-stone-600 hover:text-emerald-700 text-sm">
              Products
            </Link>
            <Link to="/about" className="text-stone-600 hover:text-emerald-700 text-sm">
              About
            </Link>
            <Link to="/cart" className="relative flex items-center text-stone-600 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-stone-100" aria-label="Shopping cart">
              <CartIcon className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 flex items-center justify-center bg-emerald-600 text-white text-xs font-medium rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
            {isAuthenticated && (
              <Link to="/wishlist" className="text-stone-600 hover:text-emerald-700 text-sm">
                Wishlist
              </Link>
            )}
            <Link to="/dashboard" className="text-stone-600 hover:text-emerald-700 text-sm">
              Dashboard
            </Link>
            {canManageProducts && (
              <Link to="/admin/products" className="text-stone-600 hover:text-emerald-700 text-sm">
                Dev tools
              </Link>
            )}
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-1.5 text-stone-600 hover:text-emerald-700 text-sm"
                  aria-label="Profile"
                >
                  <PersonIcon className="w-5 h-5" />
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1.5"
                  aria-label="Log out"
                >
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
                  aria-label="Log in"
                >
                  <PersonIcon className="w-5 h-5" />
                  <span>Login</span>
                </Link>
                <Link to="/signup" className="text-stone-600 hover:text-emerald-700 text-sm font-medium">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 text-[15px] sm:text-base">
        <Outlet />
      </main>
      <footer className="border-t border-emerald-200 bg-gradient-to-r from-white to-emerald-50 py-6 mt-auto">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center text-stone-500 text-sm">
          EcoShop – Sustainable shopping for a greener future.
        </div>
      </footer>
    </div>
  )
}
