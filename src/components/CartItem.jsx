import { Link } from 'react-router-dom'
import { getProductImage } from '../lib/productImageOverrides'
import { formatCatalogProductName } from '../lib/catalogProductName'
import { useFormatPrice } from '../hooks/useFormatPrice'

export default function CartItem({ item, onUpdate, onRemove }) {
  const product = item.products
  if (!product) return null
  const displayName = formatCatalogProductName(product.name)
  const { format } = useFormatPrice()

  return (
    <div className="flex gap-3 py-3 border-b border-stone-200 dark:border-stone-600 last:border-0">
      <Link
        to={`/products/${product.slug}`}
        className="shrink-0 w-[4.5rem] h-[4.5rem] rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800"
      >
        <img src={getProductImage(product)} alt={displayName} className="h-full w-full object-cover object-center" loading="lazy" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          to={`/products/${product.slug}`}
          className="text-sm font-medium text-stone-800 dark:text-stone-100 hover:text-emerald-700 dark:hover:text-emerald-400"
        >
          {displayName}
        </Link>
        {item.size && (
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Size: {item.size}</p>
        )}
        <p className="text-emerald-700 dark:text-emerald-400 font-medium">{format(Number(product.price))} each</p>
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
      <div className="text-right text-sm font-medium text-stone-800 dark:text-stone-100 tabular-nums">
        {format(item.quantity * Number(product.price))}
      </div>
    </div>
  )
}
