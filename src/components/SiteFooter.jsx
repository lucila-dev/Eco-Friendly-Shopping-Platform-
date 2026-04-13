import { Link } from 'react-router-dom'

const SITE_FOOTER_COLUMNS = [
  {
    heading: 'Here to help',
    links: [
      { label: 'Your account', to: '/account' },
      { label: 'Your orders', to: '/orders' },
      { label: 'Delivery & help', to: '/about#delivery' },
      { label: 'Common questions', to: '/about#questions' },
      { label: 'Basket', to: '/cart' },
      { label: 'Wishlist', to: '/wishlist' },
      { label: 'Settings', to: '/settings' },
    ],
  },
  {
    heading: 'About',
    links: [
      { label: 'About EcoShop', to: '/about#guarantee' },
      { label: 'Privacy & cookies', to: '/about#policies' },
      { label: 'Conditions & delivery', to: '/about#policies' },
      { label: 'Delivery details', to: '/about#delivery' },
      { label: 'Sustainability claims', to: '/about#certifications' },
      { label: 'Shopping basics', to: '/about#essentials' },
      { label: 'All products', to: '/products' },
    ],
  },
  {
    heading: 'Ways to shop',
    links: [
      { label: 'Shop by category', to: '/products' },
      { label: 'Quick links', to: '/about#help' },
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Green impact', to: '/about#guarantee' },
      { label: 'Checkout', to: '/checkout' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/signup' },
      { label: 'Profile', to: '/profile' },
      { label: 'Contact', to: '/about#contact' },
    ],
  },
]

export default function SiteFooter() {
  return (
    <footer
      className="mt-12 sm:mt-14 bg-emerald-800 text-white dark:bg-emerald-900 dark:text-emerald-50 border-t border-emerald-700/60 dark:border-emerald-800 shadow-sm"
      style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}
      aria-label="Site directory"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {SITE_FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold text-white tracking-tight mb-4">
                {col.heading}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map(({ label, to }) => (
                  <li key={`${col.heading}-${label}`}>
                    <Link
                      to={to}
                      className="text-sm text-emerald-50/95 hover:text-white hover:underline underline-offset-2"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-white/20 text-center text-xs sm:text-sm text-emerald-100/85 space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link to="/about#delivery" className="hover:text-white hover:underline underline-offset-2">
              Conditions & delivery
            </Link>
            <Link to="/about#policies" className="hover:text-white hover:underline underline-offset-2">
              Privacy & cookies
            </Link>
            <Link to="/about#certifications" className="hover:text-white hover:underline underline-offset-2">
              Sustainability claims
            </Link>
          </div>
          <p className="text-emerald-100/90">
            © {new Date().getFullYear()} EcoShop · Sustainable shopping for a greener future.
          </p>
        </div>
      </div>
    </footer>
  )
}
