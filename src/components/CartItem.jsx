import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { getProductImage } from '../lib/productImageOverrides'

export default function CartItem({ item, onUpdate, onRemove }) {
  const product = item.products
  if (!product) return null

  return (
    <div className="flex gap-4 py-4 border-b border-stone-200 dark:border-stone-600 last:border-0">
      <Link
        to={`/products/${product.slug}`}
        className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800"
      >
        <img src={getProductImage(product)} alt={product.name} className="h-full w-full object-cover object-center" loading="lazy" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          to={`/products/${product.slug}`}
          className="font-medium text-stone-800 dark:text-stone-100 hover:text-emerald-700 dark:hover:text-emerald-400"
        >
          {product.name}
        </Link>
        {item.size && (
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Size: {item.size}</p>
        )}
        <p className="text-emerald-700 dark:text-emerald-400 font-medium">${Number(product.price).toFixed(2)} each</p>
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={() => onUpdate(item.id, item.quantity - 1)}
            className="w-7 h-7 rounded border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="Decrease"
          >
            −
          </button>
          <span className="w-8 text-center text-sm text-stone-800 dark:text-stone-200">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onUpdate(item.id, item.quantity + 1)}
            className="w-7 h-7 rounded border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="Increase"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="ml-2 text-red-600 dark:text-red-400 text-sm hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
      <div className="text-right font-medium text-stone-800 dark:text-stone-100">
        ${(item.quantity * Number(product.price)).toFixed(2)}
      </div>
    </div>
  )
}
