import { Link } from 'react-router-dom'
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

export default function AccountHubPanel({ onNavigate, heading = 'h1' }) {
  const { user } = useAuth()
  const { canManageProducts } = useProfile()
  const email = user?.email ?? ''
  const TitleTag = heading === 'h1' ? 'h1' : 'h2'

  return (
    <>
      <header className="mb-6 sm:mb-8">
        <TitleTag className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
          Your account
        </TitleTag>
        <p className="mt-2 text-stone-600 dark:text-stone-400 text-sm sm:text-base">
          Signed in as{' '}
          <span className="font-medium text-stone-800 dark:text-stone-200">{email || 'n/a'}</span>
        </p>
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
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-1 leading-relaxed line-clamp-3 flex-1">
                {description}
              </p>
            </div>
          </Link>
        ))}
        {canManageProducts && (
          <Link to="/admin/products" className={cardClass} onClick={() => onNavigate?.()}>
            <span
              className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-200/80 dark:ring-emerald-800/80 group-hover:ring-emerald-400/60 dark:group-hover:ring-emerald-600/50"
              aria-hidden
            >
              <DevToolsIcon className="w-6 h-6 sm:w-7 sm:h-7" />
            </span>
            <div className="min-w-0 flex flex-col flex-1">
              <span className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100 group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                Dev tools
              </span>
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-1 leading-relaxed line-clamp-3 flex-1">
                Manage products and catalog images.
              </p>
            </div>
          </Link>
        )}
      </div>
    </>
  )
}
