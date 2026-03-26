import { Outlet, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../hooks/useCart'
import { useProfile } from '../hooks/useProfile'
import { LeafIcon, CartIcon, PersonIcon } from './Icons'

export default function Layout() {
  const { signOut, isAuthenticated } = useAuth()
  const { items } = useCart()
  const { canManageProducts } = useProfile()
  const cartCount = items.length

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <header className="border-b border-stone-200 bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-emerald-800 hover:text-emerald-700 shrink-0">
            <LeafIcon className="w-7 h-7 text-emerald-600" />
            <span className="text-xl font-semibold">EcoShop</span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link to="/products" className="text-stone-600 hover:text-emerald-700 text-sm sm:text-base">
              Products
            </Link>
            <Link to="/cart" className="relative flex items-center text-stone-600 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-stone-100" aria-label="Shopping cart">
              <CartIcon className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 flex items-center justify-center bg-emerald-600 text-white text-xs font-medium rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link to="/dashboard" className="text-stone-600 hover:text-emerald-700 text-sm sm:text-base">
              Dashboard
            </Link>
            {canManageProducts && (
              <Link to="/admin/products" className="text-stone-600 hover:text-emerald-700 text-sm sm:text-base">
                Dev tools
              </Link>
            )}
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 text-stone-600 hover:text-emerald-700 text-sm sm:text-base"
                  aria-label="Profile"
                >
                  <PersonIcon className="w-5 h-5" />
                  <span>Profile</span>
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-red-600 hover:text-red-700 text-sm sm:text-base flex items-center gap-1.5"
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
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-stone-200 bg-white py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-stone-500 text-sm">
          EcoShop – Sustainable shopping for a greener future.
        </div>
      </footer>
    </div>
  )
}
