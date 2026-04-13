import { Link } from 'react-router-dom'

export default function ProductCard({ product }) {
  const { name, slug, price, image_url, sustainability_score } = product
  const score = sustainability_score ?? 0

  return (
    <Link
      to={`/products/${slug}`}
      className="block rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="aspect-square bg-stone-100 relative overflow-hidden">
        <img
          src={image_url || '/placeholder.svg'}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-medium">
          {score}/10 green
        </span>
      </div>
      <div className="p-4">
        <h2 className="font-semibold text-stone-800 line-clamp-2">{name}</h2>
        <p className="mt-1 text-emerald-700 font-medium">${Number(price).toFixed(2)}</p>
      </div>
    </Link>
  )
}
