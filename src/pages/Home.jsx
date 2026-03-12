import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LeafIcon, TruckIcon, PackageIcon, RecycleIcon, CheckCircleIcon, ArrowUpIcon } from '../components/Icons'

const COMMITMENTS = [
  {
    title: 'Sustainable Materials',
    description: 'Products made from recycled, organic, and fair trade certified materials.',
    Icon: LeafIcon,
  },
  {
    title: 'Carbon Footprint Reduction',
    description: 'Every product shows estimated carbon footprint savings compared to traditional alternatives.',
    Icon: ArrowUpIcon,
  },
  {
    title: 'Waste Reduction',
    description: 'Products designed for longevity and made from recycled materials to minimize waste.',
    Icon: RecycleIcon,
  },
  {
    title: 'Green Shipping',
    description: 'Optimized logistics and carbon-neutral delivery options to reduce transportation emissions.',
    Icon: TruckIcon,
  },
  {
    title: 'Sustainable Packaging',
    description: 'Minimal, recyclable, and biodegradable packaging materials.',
    Icon: PackageIcon,
  },
  {
    title: 'Conscious Curation',
    description: 'Every product is carefully vetted for sustainability credentials and environmental impact.',
    Icon: CheckCircleIcon,
  },
]

export default function Home() {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    document.title = 'EcoShop – Sustainable Shopping'
  }, [])

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('id, name, slug, description').order('name')
      setCategories(data ?? [])
    }
    fetchCategories()
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="relative rounded-2xl overflow-hidden mb-12 sm:mb-16">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-emerald-50/90 to-teal-50/80" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200')] bg-cover bg-center opacity-20 mix-blend-multiply" />
        <div className="relative max-w-3xl mx-auto text-center px-6 py-16 sm:py-20">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-900 mb-4">
            Shop Sustainably, Live Better
          </h1>
          <p className="text-emerald-800/90 text-lg sm:text-xl mb-8 max-w-2xl mx-auto">
            Discover eco-friendly products that make a difference. Every purchase helps reduce your carbon footprint.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* Our Environmental Commitment */}
      <section className="mb-12 sm:mb-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-800 text-center mb-2">
          Our Environmental Commitment
        </h2>
        <p className="text-stone-600 text-center max-w-2xl mx-auto mb-8">
          We're dedicated to reducing environmental impact through every aspect of our platform.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {COMMITMENTS.map(({ title, description, Icon }) => (
            <div
              key={title}
              className="rounded-xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700">
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="font-semibold text-stone-800">{title}</h3>
              </div>
              <p className="text-stone-600 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section>
        <h2 className="text-xl font-bold text-stone-800 mb-4">Shop by category</h2>
        <p className="text-stone-600 text-sm mb-6">
          Choose a category to find eco-friendly products quickly.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.slug}`}
              className="block rounded-xl border border-stone-200 bg-white p-5 hover:border-emerald-300 hover:shadow-md transition-all group"
            >
              <h3 className="font-semibold text-stone-800 group-hover:text-emerald-700">{cat.name}</h3>
              {cat.description && (
                <p className="text-stone-500 text-sm mt-1 line-clamp-2">{cat.description}</p>
              )}
              <span className="inline-block mt-2 text-emerald-600 text-sm font-medium group-hover:underline">
                View products →
              </span>
            </Link>
          ))}
        </div>
        {categories.length === 0 && (
          <p className="text-stone-500">No categories yet. <Link to="/products" className="text-emerald-600 hover:underline">Browse all products</Link>.</p>
        )}
      </section>
    </div>
  )
}
