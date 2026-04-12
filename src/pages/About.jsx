import { useEffect, useMemo, useState } from 'react'
import { FREE_SHIPPING_MIN_SUBTOTAL } from '../lib/shipping'
import { useFormatPrice } from '../hooks/useFormatPrice'

const SECTIONS = [
  { id: 'guarantee', label: 'Sustainability', title: 'Sustainability guarantee' },
  { id: 'essentials', label: 'Shopping basics', title: 'Shopping essentials' },
  { id: 'delivery', label: 'Delivery', title: 'Delivery information' },
  { id: 'policies', label: 'Policies', title: 'Policies' },
  { id: 'contact', label: 'Contact', title: 'Contact' },
  { id: 'questions', label: 'Questions', title: 'Questions' },
  { id: 'help', label: 'Quick links', title: 'Quick links' },
]

const bodyText = 'text-sm sm:text-base text-stone-800 dark:text-stone-200 leading-6 sm:leading-7'

const navInactive =
  'w-full text-left rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-stone-900 px-3 py-2.5 text-sm font-medium text-emerald-950 dark:text-emerald-100 shadow-sm transition-colors hover:border-emerald-300 dark:hover:border-emerald-500 hover:bg-emerald-50/90 dark:hover:bg-stone-800'
const navActive =
  'w-full text-left rounded-lg border border-emerald-800 dark:border-emerald-600 bg-emerald-700 dark:bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/10'

const panelClass =
  'relative overflow-hidden rounded-2xl border border-emerald-200/90 dark:border-emerald-800/80 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 dark:from-stone-900 dark:via-emerald-950/35 dark:to-stone-900 p-5 shadow-md ring-1 ring-emerald-100/80 dark:ring-emerald-900/40 sm:p-6 lg:min-h-[360px] lg:p-8'

const subAccordion =
  'w-full text-left rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white/90 dark:bg-stone-900/95 px-3 py-2.5 text-sm font-medium text-emerald-950 dark:text-emerald-100 shadow-sm transition-colors hover:border-emerald-300 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-stone-800'
const subAccordionBody = `${bodyText} rounded-r-lg border-l-[3px] border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 py-3 pl-4 pr-3 ml-1 mt-2 mb-3`

const inputClass =
  'w-full rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-500 shadow-inner shadow-stone-100/80 dark:shadow-none focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/25'

const panelProse = 'w-full max-w-5xl mx-auto'

function HeroStat({ title, detail }) {
  return (
    <div className="flex flex-1 flex-col justify-center rounded-xl border border-emerald-200/70 dark:border-emerald-800 bg-white/90 dark:bg-stone-900/90 px-4 py-3 text-center shadow-sm sm:py-4">
      <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200 sm:text-base">{title}</p>
      <p className="mt-1 text-xs leading-snug text-stone-600 dark:text-stone-400 sm:text-sm">{detail}</p>
    </div>
  )
}

export default function About() {
  const { format } = useFormatPrice()
  const [activeSection, setActiveSection] = useState('guarantee')
  const [country, setCountry] = useState('UK')
  const [shippingType, setShippingType] = useState('standard')
  const [openPolicy, setOpenPolicy] = useState('returns')
  const [openFaq, setOpenFaq] = useState('track')
  const [contactForm, setContactForm] = useState({ name: '', email: '', topic: 'order', message: '' })
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    document.title = 'About – EcoShop'
    return () => { document.title = 'EcoShop – Sustainable Shopping' }
  }, [])

  const deliveryEstimate = useMemo(() => {
    const table = {
      UK: { standard: '2-4 business days', express: '1-2 business days' },
      EU: { standard: '4-7 business days', express: '2-3 business days' },
      International: { standard: '7-12 business days', express: '3-5 business days' },
    }
    return table[country][shippingType]
  }, [country, shippingType])

  const contactSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

  const activeMeta = SECTIONS.find((s) => s.id === activeSection)

  return (
    <div className="w-full max-w-none rounded-2xl border border-emerald-100/80 dark:border-emerald-900/50 bg-gradient-to-b from-emerald-50/50 via-stone-50/80 to-white dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 px-4 py-6 text-stone-900 dark:text-stone-100 sm:px-6 sm:py-8 lg:px-6 lg:py-10">
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-100/90 via-white to-teal-50 dark:from-emerald-950/70 dark:via-stone-900 dark:to-emerald-950/50 px-5 py-7 text-center shadow-md sm:mb-8 sm:px-8 sm:py-9">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-emerald-200/40 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-teal-200/35 blur-2xl"
          aria-hidden
        />
        <p className="relative text-xs font-semibold uppercase tracking-widest text-emerald-800 dark:text-emerald-300">Help center</p>
        <h1 className="relative mt-2 text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100 sm:text-3xl">
          About EcoShop
        </h1>
        <p className="relative mx-auto mt-3 max-w-xl text-sm leading-relaxed text-emerald-950/90 dark:text-emerald-100/85 sm:text-base">
          Delivery help, policies, and support.
        </p>
        <div className="relative mx-auto mt-6 flex max-w-3xl flex-col gap-2.5 sm:flex-row sm:gap-3">
          <HeroStat title="Free shipping" detail={`On orders over ${format(FREE_SHIPPING_MIN_SUBTOTAL)}`} />
          <HeroStat title="30-day returns" detail="Unused items, original packaging" />
          <HeroStat title="Secure checkout" detail="Encrypted payments" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 lg:items-start">
        <aside className="lg:col-span-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white/95 dark:bg-stone-900/95 p-4 shadow-sm sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Topics</p>
            <nav className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-2" aria-label="About sections">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  aria-pressed={activeSection === s.id}
                  className={activeSection === s.id ? navActive : navInactive}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <section className="lg:col-span-9" aria-live="polite">
          <div className={panelClass}>
            <div
              className="pointer-events-none absolute right-0 top-0 h-32 w-32 translate-x-1/3 -translate-y-1/3 rounded-full bg-emerald-200/25 blur-2xl"
              aria-hidden
            />
            <header className="relative mx-auto mb-6 max-w-5xl border-b border-emerald-200/60 dark:border-emerald-800/70 pb-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Current section</p>
              <h2 className="mt-1.5 text-xl font-bold text-emerald-950 dark:text-emerald-100 sm:text-2xl">
                {activeMeta?.title ?? activeMeta?.label}
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-stone-700 dark:text-stone-300">
                {activeSection === 'guarantee' && 'How we choose products and keep listings honest.'}
                {activeSection === 'essentials' && 'Before you check out.'}
                {activeSection === 'delivery' && 'Estimates and free shipping thresholds.'}
                {activeSection === 'policies' && 'Returns, refunds, privacy, and sourcing.'}
                {activeSection === 'contact' && 'Reach our team or send a message.'}
                {activeSection === 'questions' && 'Short answers to common questions.'}
                {activeSection === 'help' && 'Go straight to a page in the app.'}
              </p>
            </header>

            {activeSection === 'guarantee' && (
              <div className={`relative ${panelProse} space-y-6`}>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ['Vetted listings', 'Every product meets our sustainability bar before it goes live.'],
                    ['Honest metrics', 'Scores and claims match the data we store and show.'],
                    ['We update fast', 'Listings change when products or standards do.'],
                  ].map(([h, d]) => (
                    <div
                      key={h}
                      className="rounded-xl border border-emerald-200/80 dark:border-emerald-700/80 bg-white/90 dark:bg-stone-900/90 p-4 shadow-sm"
                    >
                      <p className="font-semibold text-emerald-950 dark:text-emerald-100">{h}</p>
                      <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">{d}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-emerald-300/60 dark:border-emerald-600/50 bg-emerald-100/40 dark:bg-emerald-950/40 px-5 py-4 sm:px-6">
                  <p className="text-center text-sm font-semibold text-emerald-950 dark:text-emerald-100 sm:text-base">
                    Our environmental promise is about real impact—not greenwashing.
                  </p>
                </div>
                <p className={bodyText}>
                  EcoShop is built around a clear sustainability promise: every product in our catalogue is reviewed
                  for materials, durability, packaging impact, and transparent environmental claims. We favour recycled and
                  renewable inputs, lower-carbon logistics where possible, and suppliers who can document ethical
                  production. Product pages show a sustainability score and estimated carbon savings versus conventional
                  alternatives so you can compare items before you buy.
                </p>
                <p className={bodyText}>
                  If product information changes or a listing no longer meets our standards, we update or remove it. Our
                  returns window gives you time to verify quality and fit, and our support team can answer questions
                  about materials, certifications, and care instructions.
                </p>
                <ul className={`list-disc space-y-3 rounded-xl border border-emerald-100 dark:border-emerald-800 bg-white/80 dark:bg-stone-900/80 py-4 pl-10 pr-5 ${bodyText} marker:text-emerald-700 dark:marker:text-emerald-500 sm:pl-12`}>
                  <li>Material and sourcing criteria applied before products appear on the site</li>
                  <li>Consistency between on-page claims and the data we store for search and filters</li>
                  <li>Ongoing review as we add categories and suppliers</li>
                </ul>
              </div>
            )}

            {activeSection === 'essentials' && (
              <div className="relative mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ['Order cut-off', 'Next-day delivery for orders placed before 8pm.'],
                  ['Secure checkout', 'Encrypted card handling and account protection controls.'],
                  ['Flexible changes', 'Update or cancel orders before dispatch from tracking.'],
                  ['Eco loyalty', 'Earn and spend loyalty credits at checkout.'],
                ].map(([t, d]) => (
                  <div
                    key={t}
                    className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white/95 dark:bg-stone-900/95 p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <p className="text-base font-semibold text-emerald-950 dark:text-emerald-100">{t}</p>
                    <p className={`mt-2 ${bodyText}`}>{d}</p>
                  </div>
                ))}
              </div>
            )}

            {activeSection === 'delivery' && (
              <div className={`relative ${panelProse} space-y-6`}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white/95 dark:bg-stone-900/95 p-4 shadow-sm">
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Free shipping</p>
                    <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
                      On qualifying orders over {format(FREE_SHIPPING_MIN_SUBTOTAL)} at checkout.
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white/95 dark:bg-stone-900/95 p-4 shadow-sm">
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Tracking</p>
                    <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">We email tracking details as soon as your order ships.</p>
                  </div>
                </div>
                <p className={bodyText}>
                  Free shipping on orders over {format(FREE_SHIPPING_MIN_SUBTOTAL)}. Tracking is emailed after checkout.
                </p>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-emerald-900 dark:text-emerald-300">Destination</label>
                    <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass}>
                      <option>UK</option>
                      <option>EU</option>
                      <option>International</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-emerald-900 dark:text-emerald-300">Shipping type</label>
                    <select
                      value={shippingType}
                      onChange={(e) => setShippingType(e.target.value)}
                      className={inputClass}
                    >
                      <option value="standard">Standard</option>
                      <option value="express">Express</option>
                    </select>
                  </div>
                </div>
                <p className="rounded-xl border-2 border-emerald-300/50 dark:border-emerald-600/40 bg-gradient-to-r from-emerald-50 to-teal-50/80 dark:from-emerald-950/50 dark:to-stone-900 px-5 py-4 text-center text-base font-semibold text-emerald-950 dark:text-emerald-100 shadow-sm">
                  Estimated delivery: {deliveryEstimate}
                </p>
              </div>
            )}

            {activeSection === 'policies' && (
              <div className="relative mx-auto w-full max-w-5xl space-y-1">
                <p className={`mb-4 ${bodyText}`}>
                  Policies below expand when selected. Same rules apply at checkout and in your account.
                </p>
                <button type="button" onClick={() => setOpenPolicy('returns')} className={subAccordion}>
                  Returns policy
                </button>
                {openPolicy === 'returns' && (
                  <p className={subAccordionBody}>Returns accepted within 30 days. Items must be unused and in original packaging.</p>
                )}
                <button type="button" onClick={() => setOpenPolicy('refunds')} className={subAccordion}>
                  Refund policy
                </button>
                {openPolicy === 'refunds' && (
                  <p className={subAccordionBody}>Refunds are processed within 5-10 business days after return approval.</p>
                )}
                <button type="button" onClick={() => setOpenPolicy('guarantee')} className={subAccordion}>
                  Sustainability guarantee (summary)
                </button>
                {openPolicy === 'guarantee' && (
                  <p className={subAccordionBody}>
                    We only list products that meet our materials and sourcing bar, show honest sustainability metrics, and
                    correct listings when standards change. Open the{' '}
                    <span className="font-semibold text-emerald-800 dark:text-emerald-400">Sustainability</span> topic for the full explanation.
                  </p>
                )}
                <button type="button" onClick={() => setOpenPolicy('sourcing')} className={subAccordion}>
                  Sustainable sourcing
                </button>
                {openPolicy === 'sourcing' && (
                  <p className={subAccordionBody}>We vet suppliers for ethical production, durable materials, and lower-impact packaging.</p>
                )}
                <button type="button" onClick={() => setOpenPolicy('substitutions')} className={subAccordion}>
                  Substitutions and unavailable items
                </button>
                {openPolicy === 'substitutions' && (
                  <p className={subAccordionBody}>
                    If an item is unavailable, we suggest close alternatives. You can accept or reject substitutions before checkout.
                  </p>
                )}
                <button type="button" onClick={() => setOpenPolicy('privacy')} className={subAccordion}>
                  Privacy and data policy
                </button>
                {openPolicy === 'privacy' && (
                  <p className={subAccordionBody}>
                    Your account and order data are used to process purchases, improve service, and support your sustainability dashboard.
                  </p>
                )}
              </div>
            )}

            {activeSection === 'contact' && (
              <div className="relative mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-5">
                <div className="space-y-4 rounded-2xl border border-emerald-200 dark:border-emerald-700 bg-white/95 dark:bg-stone-900/95 p-5 shadow-sm lg:col-span-2">
                  <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-400">Direct contact</p>
                  <div className={`${bodyText} space-y-2`}>
                    <p>
                      <span className="font-medium text-stone-900 dark:text-stone-100">Email</span>
                      <br />
                      support@ecoshop.example
                    </p>
                    <p>
                      <span className="font-medium text-stone-900 dark:text-stone-100">Phone</span>
                      <br />
                      +44 20 0000 0000
                    </p>
                    <p className="text-sm text-stone-600 dark:text-stone-400">Mon–Fri 9:00–18:00</p>
                  </div>
                  <div className="flex flex-col gap-2 border-t border-emerald-100 dark:border-emerald-800 pt-4">
                    <span className="rounded-lg bg-emerald-50 dark:bg-emerald-950/60 px-3 py-2 text-xs font-medium text-emerald-900 dark:text-emerald-200">
                      Live chat 9:00–20:00
                    </span>
                    <span className="rounded-lg bg-emerald-50 dark:bg-emerald-950/60 px-3 py-2 text-xs font-medium text-emerald-900 dark:text-emerald-200">
                      Typical reply under 2 hours
                    </span>
                  </div>
                </div>
                <div className="lg:col-span-3">
                  <p className={`mb-4 ${bodyText}`}>Or send us a message—we read every submission.</p>
                  <form onSubmit={contactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <input
                        className={inputClass}
                        placeholder="Your name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                        required
                      />
                      <input
                        className={inputClass}
                        placeholder="Email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                        required
                      />
                    </div>
                    <select
                      className={inputClass}
                      value={contactForm.topic}
                      onChange={(e) => setContactForm((f) => ({ ...f, topic: e.target.value }))}
                    >
                      <option value="order">Order support</option>
                      <option value="delivery">Delivery</option>
                      <option value="returns">Returns</option>
                      <option value="other">Other</option>
                    </select>
                    <textarea
                      className={inputClass}
                      rows={4}
                      placeholder="How can we help?"
                      value={contactForm.message}
                      onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                      required
                    />
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-emerald-800 sm:w-auto"
                    >
                      Send message
                    </button>
                    {submitted && (
                      <p className="text-base font-medium text-emerald-800 dark:text-emerald-400">Message sent. Our team will reply soon.</p>
                    )}
                  </form>
                </div>
              </div>
            )}

            {activeSection === 'questions' && (
              <div className="relative mx-auto w-full max-w-5xl space-y-1">
                <p className={`mb-4 ${bodyText}`}>
                  Tap a question to read the answer. Use policies or contact if you need official wording.
                </p>
                <button type="button" onClick={() => setOpenFaq('track')} className={subAccordion}>
                  How do I track my order?
                </button>
                {openFaq === 'track' && (
                  <p className={subAccordionBody}>Open Dashboard, then click Track orders to view status and order timeline.</p>
                )}
                <button type="button" onClick={() => setOpenFaq('credits')} className={subAccordion}>
                  Where can I see loyalty credits?
                </button>
                {openFaq === 'credits' && (
                  <p className={subAccordionBody}>Go to Profile to view remaining loyalty credits and account details.</p>
                )}
                <button type="button" onClick={() => setOpenFaq('change-address')} className={subAccordion}>
                  Can I change my delivery address?
                </button>
                {openFaq === 'change-address' && (
                  <p className={subAccordionBody}>Yes, if your order is not shipped yet. Contact support with your order ID.</p>
                )}
                <button type="button" onClick={() => setOpenFaq('cancel-order')} className={subAccordion}>
                  Can I cancel an order?
                </button>
                {openFaq === 'cancel-order' && (
                  <p className={subAccordionBody}>Orders can be cancelled before dispatch from the order tracking page.</p>
                )}
                <button type="button" onClick={() => setOpenFaq('eco-score')} className={subAccordion}>
                  How is sustainability score calculated?
                </button>
                {openFaq === 'eco-score' && (
                  <p className={subAccordionBody}>It combines materials, production impact, packaging, and durability into a 1-10 score.</p>
                )}
                <button type="button" onClick={() => setOpenFaq('loyalty-earn')} className={subAccordion}>
                  How do I earn loyalty credits?
                </button>
                {openFaq === 'loyalty-earn' && (
                  <p className={subAccordionBody}>You earn credits with completed purchases and occasional eco promotions.</p>
                )}
                <button type="button" onClick={() => setOpenFaq('international')} className={subAccordion}>
                  Do you ship internationally?
                </button>
                {openFaq === 'international' && (
                  <p className={subAccordionBody}>Yes. International shipping times and rates are shown at checkout.</p>
                )}
                <button type="button" onClick={() => setOpenFaq('payment-methods')} className={subAccordion}>
                  What payment methods do you accept?
                </button>
                {openFaq === 'payment-methods' && (
                  <p className={subAccordionBody}>Loyalty credits and card payment are available in checkout.</p>
                )}
                <button type="button" onClick={() => setOpenFaq('account-security')} className={subAccordion}>
                  How do I keep my account secure?
                </button>
                {openFaq === 'account-security' && (
                  <p className={subAccordionBody}>Use a strong password, reset it regularly, and log out on shared devices.</p>
                )}
              </div>
            )}

            {activeSection === 'help' && (
              <div className="relative mx-auto w-full max-w-5xl space-y-4">
                <p className={`${bodyText} text-center sm:text-left`}>
                  Shortcuts to the main areas of the shop.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <a
                    href="/orders"
                    className="flex min-h-16 flex-col items-center justify-center rounded-xl bg-emerald-700 px-3 py-3 text-center text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-800"
                  >
                    Track order
                  </a>
                  <a
                    href="/profile"
                    className="flex min-h-16 flex-col items-center justify-center rounded-xl border-2 border-emerald-300 dark:border-emerald-600 bg-white dark:bg-stone-900 px-3 py-3 text-center text-sm font-semibold text-emerald-950 dark:text-emerald-100 shadow-sm transition-colors hover:bg-emerald-50 dark:hover:bg-stone-800"
                  >
                    Profile
                  </a>
                  <a
                    href="/products"
                    className="flex min-h-16 flex-col items-center justify-center rounded-xl border-2 border-emerald-300 dark:border-emerald-600 bg-white dark:bg-stone-900 px-3 py-3 text-center text-sm font-semibold text-emerald-950 dark:text-emerald-100 shadow-sm transition-colors hover:bg-emerald-50 dark:hover:bg-stone-800"
                  >
                    Products
                  </a>
                  <a
                    href="/cart"
                    className="flex min-h-16 flex-col items-center justify-center rounded-xl border-2 border-emerald-300 dark:border-emerald-600 bg-white dark:bg-stone-900 px-3 py-3 text-center text-sm font-semibold text-emerald-950 dark:text-emerald-100 shadow-sm transition-colors hover:bg-emerald-50 dark:hover:bg-stone-800"
                  >
                    Cart
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
