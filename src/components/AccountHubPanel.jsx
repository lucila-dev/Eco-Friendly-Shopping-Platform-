import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import {
  CartIcon,
  DevToolsIcon,
  GearIcon,
  HeartIcon,
  ImpactChartIcon,
  PackageIcon,
  PersonIcon,
  TruckIcon,
} from './Icons'

const cardClass =
  'group flex h-full min-h-[9.5rem] sm:min-h-[8.75rem] gap-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 sm:p-5 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md transition-all text-left items-start'

const CARDS = [
  {
    to: '/orders',
    title: 'Your orders',
    description: 'Track shipments, view order details, and see delivery status.',
    Icon: PackageIcon,
  },
  {
    to: '/cart',
    title: 'Basket',
    description: 'Review items in your basket and continue to checkout.',
    Icon: CartIcon,
  },
  {
    to: '/profile',
    title: 'Your profile',
    description: 'Update your name, photo, and loyalty balance.',
    Icon: PersonIcon,
  },
  {
    to: '/wishlist',
    title: 'Wishlist',
    description: 'Products you have saved for later.',
    Icon: HeartIcon,
  },
  {
    to: '/dashboard',
    title: 'Dashboard',
    description: 'Your green impact, purchase history, and community snapshot.',
    Icon: ImpactChartIcon,
  },
  {
    to: '/settings',
    title: 'Settings',
    description: 'Country, currency, text size, theme, and account deletion.',
    Icon: GearIcon,
  },
  {
    to: '/about',
    title: 'Delivery & help',
    description: 'Shipping, returns, and answers to common questions.',
    Icon: TruckIcon,
  },
]

export default function AccountHubPanel({ onNavigate, heading = 'h1', inlineDevTools = false }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { canManageProducts } = useProfile()
  const email = user?.email ?? ''
  const TitleTag = heading === 'h1' ? 'h1' : 'h2'

  return (
    <>
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1">
            <TitleTag className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Your account
            </TitleTag>
            <p className="mt-2 text-stone-600 dark:text-stone-400 text-base sm:text-lg">
              Signed in as{' '}
              <span className="font-medium text-stone-800 dark:text-stone-200">{email || 'n/a'}</span>
            </p>
          </div>
          {user && (
            <button
              type="button"
              onClick={async () => {
                onNavigate?.()
                try {
                  await signOut()
                } catch (e) {
                  console.warn('[EcoShop] signOut failed:', e)
                } finally {
                  navigate('/login', { replace: true })
                }
              }}
              className="shrink-0 rounded-lg border border-red-200/90 bg-red-50/90 px-3 py-2 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-950/80 sm:px-4 sm:text-base"
              aria-label="Log out"
            >
              Log out
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        {CARDS.map(({ to, title, description, Icon }) => (
          <Link key={to} to={to} className={cardClass} onClick={() => onNavigate?.()}>
            <span
              className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-200/80 dark:ring-emerald-800/80 group-hover:ring-emerald-400/60 dark:group-hover:ring-emerald-600/50"
              aria-hidden
            >
              <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
            </span>
            <div className="min-w-0 flex flex-col flex-1">
              <span className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100 group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                {title}
              </span>
              <p className="text-base text-stone-600 dark:text-stone-400 mt-1 leading-relaxed line-clamp-3 flex-1">
                {description}
              </p>
            </div>
          </Link>
        ))}
        {canManageProducts && (
          <div className={`${cardClass} cursor-default`}>
            <div
              className={`relative shrink-0 rounded-full outline-none ${inlineDevTools ? '' : 'group/devmenu'}`}
              tabIndex={inlineDevTools ? undefined : 0}
            >
              <span
                className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-200/80 dark:ring-emerald-800/80 ${
                  inlineDevTools
                    ? ''
                    : 'cursor-pointer group-hover/devmenu:ring-emerald-400/60 dark:group-hover/devmenu:ring-emerald-600/50 group-focus-visible/devmenu:ring-emerald-500'
                }`}
                aria-label={inlineDevTools ? 'Admin' : 'Admin: open menu'}
                title="Admin"
              >
                <DevToolsIcon className={`w-6 h-6 sm:w-7 sm:h-7 ${inlineDevTools ? '' : 'pointer-events-none'}`} aria-hidden />
              </span>
              {!inlineDevTools && (
                <div
                  className="pointer-events-none invisible absolute left-0 top-full z-30 hidden min-w-[13rem] pt-2 opacity-0 transition-[opacity,visibility] duration-150 sm:block
                    group-hover/devmenu:pointer-events-auto group-hover/devmenu:visible group-hover/devmenu:opacity-100
                    group-focus-within/devmenu:pointer-events-auto group-focus-within/devmenu:visible group-focus-within/devmenu:opacity-100"
                  role="menu"
                  aria-label="Admin"
                >
                  <div className="rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-600 dark:bg-stone-900">
                    <Link
                      role="menuitem"
                      to="/admin/products"
                      className="block px-4 py-2.5 text-base font-medium text-stone-800 hover:bg-emerald-50 dark:text-stone-100 dark:hover:bg-emerald-950/50"
                      onClick={() => onNavigate?.()}
                    >
                      Products
                    </Link>
                    <Link
                      role="menuitem"
                      to="/admin/categories"
                      className="block px-4 py-2.5 text-base font-medium text-stone-800 hover:bg-emerald-50 dark:text-stone-100 dark:hover:bg-emerald-950/50"
                      onClick={() => onNavigate?.()}
                    >
                      Category images
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <div className="min-w-0 flex flex-1 flex-col">
              <span className="text-base font-semibold text-stone-900 dark:text-stone-100 sm:text-lg">
                Admin
              </span>
              {!inlineDevTools && (
                <p className="mt-1 text-base leading-relaxed text-stone-600 dark:text-stone-400">
                  Hover the icon for products or category images. On a phone, use the links below.
                </p>
              )}
              <div
                className={`flex flex-col gap-2 border-t border-stone-200 pt-3 dark:border-stone-600 ${inlineDevTools ? 'mt-1' : 'mt-3 sm:hidden'}`}
              >
                <Link
                  to="/admin/products"
                  className="text-base font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  onClick={() => onNavigate?.()}
                >
                  Products →
                </Link>
                <Link
                  to="/admin/categories"
                  className="text-base font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  onClick={() => onNavigate?.()}
                >
                  Category images →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
