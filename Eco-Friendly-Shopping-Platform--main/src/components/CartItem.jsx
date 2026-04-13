import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'

export default function CartItem({ item, onUpdate, onRemove }) {
  const product = item.products
  if (!product) return null

  return (
    <div className="flex gap-4 py-4 border-b border-stone-200 last:border-0">
      <Link to={`/products/${product.slug}`} className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-stone-100">
        <img src={product.image_url || '/placeholder.svg'} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/products/${product.slug}`} className="font-medium text-stone-800 hover:text-emerald-700">
          {product.name}
        </Link>
        <p className="text-emerald-700 font-medium">${Number(product.price).toFixed(2)} each</p>
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={() => onUpdate(item.id, item.quantity - 1)}
            className="w-7 h-7 rounded border border-stone-300 text-stone-600 hover:bg-stone-100"
            aria-label="Decrease"
          >
            −
          </button>
          <span className="w-8 text-center text-sm">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onUpdate(item.id, item.quantity + 1)}
            className="w-7 h-7 rounded border border-stone-300 text-stone-600 hover:bg-stone-100"
            aria-label="Increase"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="ml-2 text-red-600 text-sm hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
      <div className="text-right font-medium text-stone-800">
        ${(item.quantity * Number(product.price)).toFixed(2)}
      </div>
    </div>
  )
}
