import { useEffect, useMemo, useState } from 'react'

export default function About() {
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

  return (
    <div className="max-w-5xl">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-100 via-teal-50 to-cyan-100 border border-emerald-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-stone-800">About EcoShop</h1>
        <p className="text-stone-600 text-sm mt-2">Delivery help, policies, and support in one place.</p>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5 mb-4">
        <h2 className="text-lg font-semibold text-stone-800 mb-3">Shopping essentials</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="font-semibold text-stone-800">Order cut-off</p>
            <p className="text-stone-600 mt-1">Next-day delivery for orders placed before 8pm.</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="font-semibold text-stone-800">Secure checkout</p>
            <p className="text-stone-600 mt-1">Encrypted card handling and account protection controls.</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="font-semibold text-stone-800">Flexible changes</p>
            <p className="text-stone-600 mt-1">Update or cancel orders before dispatch from tracking.</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="font-semibold text-stone-800">Eco loyalty</p>
            <p className="text-stone-600 mt-1">Earn and spend loyalty credits at checkout.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
        <h2 className="text-lg font-semibold text-stone-800 mb-2">Delivery information</h2>
        <p className="text-stone-600 text-sm mb-3">Free shipping on orders over $50. Tracking details are sent by email after checkout.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Destination</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
            >
              <option>UK</option>
              <option>EU</option>
              <option>International</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Shipping type</label>
            <select
              value={shippingType}
              onChange={(e) => setShippingType(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
            >
              <option value="standard">Standard</option>
              <option value="express">Express</option>
            </select>
          </div>
        </div>
        <p className="mt-3 inline-block rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
          Estimated delivery: {deliveryEstimate}
        </p>
      </section>

      <section className="rounded-xl border border-teal-200 bg-teal-50/40 p-5">
        <h2 className="text-lg font-semibold text-stone-800 mb-2">Policies</h2>
        <div className="space-y-2">
          <button type="button" onClick={() => setOpenPolicy('returns')} className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-700">
            Returns policy
          </button>
          {openPolicy === 'returns' && <p className="text-sm text-stone-600 px-1">Returns accepted within 30 days. Items must be unused and in original packaging.</p>}
          <button type="button" onClick={() => setOpenPolicy('refunds')} className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-700">
            Refund policy
          </button>
          {openPolicy === 'refunds' && <p className="text-sm text-stone-600 px-1">Refunds are processed within 5-10 business days after return approval.</p>}
          <button type="button" onClick={() => setOpenPolicy('sourcing')} className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-700">
            Sustainable sourcing
          </button>
          {openPolicy === 'sourcing' && <p className="text-sm text-stone-600 px-1">We vet suppliers for ethical production, durable materials, and lower-impact packaging.</p>}
          <button type="button" onClick={() => setOpenPolicy('substitutions')} className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-700">
            Substitutions and unavailable items
          </button>
          {openPolicy === 'substitutions' && <p className="text-sm text-stone-600 px-1">If an item is unavailable, we suggest close alternatives. You can accept or reject substitutions before checkout.</p>}
          <button type="button" onClick={() => setOpenPolicy('privacy')} className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-700">
            Privacy and data policy
          </button>
          {openPolicy === 'privacy' && <p className="text-sm text-stone-600 px-1">Your account and order data are used to process purchases, improve service, and support your sustainability dashboard.</p>}
        </div>
      </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-5">
        <h2 className="text-lg font-semibold text-stone-800 mb-2">Contact</h2>
        <p className="text-stone-600 text-sm mb-3">Email: support@ecoshop.example | Phone: +44 20 0000 0000 | Mon-Fri 9:00-18:00</p>
        <form onSubmit={contactSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="px-3 py-2 border border-stone-300 rounded-lg text-sm" placeholder="Your name" value={contactForm.name} onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))} required />
            <input className="px-3 py-2 border border-stone-300 rounded-lg text-sm" placeholder="Email" type="email" value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <select className="px-3 py-2 border border-stone-300 rounded-lg text-sm w-full" value={contactForm.topic} onChange={(e) => setContactForm((f) => ({ ...f, topic: e.target.value }))}>
            <option value="order">Order support</option>
            <option value="delivery">Delivery</option>
            <option value="returns">Returns</option>
            <option value="other">Other</option>
          </select>
          <textarea className="px-3 py-2 border border-stone-300 rounded-lg text-sm w-full" rows={3} placeholder="How can we help?" value={contactForm.message} onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))} required />
          <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Send message</button>
          {submitted && <p className="text-sm text-emerald-700">Message sent. Our team will reply soon.</p>}
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="px-2 py-1 rounded-md bg-white border border-stone-200 text-xs text-stone-600">Live chat: 9:00-20:00</span>
          <span className="px-2 py-1 rounded-md bg-white border border-stone-200 text-xs text-stone-600">Avg response: under 2h</span>
          <span className="px-2 py-1 rounded-md bg-white border border-stone-200 text-xs text-stone-600">Order issues priority queue</span>
        </div>
      </section>

      <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5">
        <h2 className="text-lg font-semibold text-stone-800 mb-2">Quick FAQ</h2>
        <div className="space-y-2">
          <button type="button" onClick={() => setOpenFaq('track')} className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-700">How do I track my order?</button>
          {openFaq === 'track' && <p className="text-sm text-stone-600 px-1">Open Dashboard, then click Track orders to view status and order timeline.</p>}
          <button type="button" onClick={() => setOpenFaq('credits')} className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-700">Where can I see loyalty credits?</button>
          {openFaq === 'credits' && <p className="text-sm text-stone-600 px-1">Go to Profile to view remaining loyalty credits and account details.</p>}
          <button type="button" onClick={() => setOpenFaq('change-address')} className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-700">Can I change my delivery address?</button>
          {openFaq === 'change-address' && <p className="text-sm text-stone-600 px-1">Yes, if your order is not shipped yet. Contact support with your order ID.</p>}
          <button type="button" onClick={() => setOpenFaq('cancel-order')} className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-700">Can I cancel an order?</button>
          {openFaq === 'cancel-order' && <p className="text-sm text-stone-600 px-1">Orders can be cancelled before dispatch from the order tracking page.</p>}
          <button type="button" onClick={() => setOpenFaq('eco-score')} className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-700">How is sustainability score calculated?</button>
          {openFaq === 'eco-score' && <p className="text-sm text-stone-600 px-1">It combines materials, production impact, packaging, and durability into a 1-10 score.</p>}
          <button type="button" onClick={() => setOpenFaq('loyalty-earn')} className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-700">How do I earn loyalty credits?</button>
          {openFaq === 'loyalty-earn' && <p className="text-sm text-stone-600 px-1">You earn credits with completed purchases and occasional eco promotions.</p>}
          <button type="button" onClick={() => setOpenFaq('international')} className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-700">Do you ship internationally?</button>
          {openFaq === 'international' && <p className="text-sm text-stone-600 px-1">Yes. International shipping times and rates are shown at checkout.</p>}
          <button type="button" onClick={() => setOpenFaq('payment-methods')} className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-700">What payment methods do you accept?</button>
          {openFaq === 'payment-methods' && <p className="text-sm text-stone-600 px-1">Loyalty credits and card payment are available in checkout.</p>}
          <button type="button" onClick={() => setOpenFaq('account-security')} className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-700">How do I keep my account secure?</button>
          {openFaq === 'account-security' && <p className="text-sm text-stone-600 px-1">Use a strong password, reset it regularly, and log out on shared devices.</p>}
        </div>
      </section>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5 mt-4">
        <h2 className="text-lg font-semibold text-stone-800 mb-3">Need quick help?</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href="/orders" className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Track order</a>
          <a href="/profile" className="px-3 py-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200">Manage profile</a>
          <a href="/products" className="px-3 py-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200">Browse products</a>
          <a href="/cart" className="px-3 py-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200">Open cart</a>
        </div>
      </section>
    </div>
  )
}
