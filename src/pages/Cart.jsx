import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import CartItem from '../components/CartItem'
import { FREE_SHIPPING_MIN_SUBTOTAL, getDeliveryFee, STANDARD_DELIVERY_FEE } from '../lib/shipping'
import { useFormatPrice } from '../hooks/useFormatPrice'

export default function Cart() {
  const { items, loading, updateQuantity, removeItem, total } = useCart()
  const { format } = useFormatPrice()
  const deliveryFee = getDeliveryFee(total)
  const finalTotal = total + deliveryFee
  useEffect(() => {
    document.title = 'Cart · EcoShop'
    return () => { document.title = 'EcoShop · Sustainable Shopping' }
  }, [])

  if (loading) return <p className="text-stone-500 dark:text-stone-400">Loading cart...</p>

  return (
    <div>
      <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4">Your cart</h1>
      {items.length === 0 ? (
        <p className="text-stone-600 dark:text-stone-300">
          Your cart is empty.{' '}
          <Link to="/products" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
            Browse products
          </Link>
        </p>
      ) : (
        <>
          <div className="space-y-0">
            {items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdate={updateQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl p-3 sm:p-4">
            <div>
              <p className="text-base font-semibold text-stone-800 dark:text-stone-100">Subtotal: {format(total)}</p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Delivery:{' '}
                {deliveryFee === 0 ? (
                  <>
                    <span className="line-through text-stone-500 dark:text-stone-500 tabular-nums">
                      {format(STANDARD_DELIVERY_FEE)}
                    </span>{' '}
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Free</span>
                    <span className="text-stone-500 dark:text-stone-500"> (orders {format(FREE_SHIPPING_MIN_SUBTOTAL)}+)</span>
                  </>
                ) : (
                  format(deliveryFee)
                )}
              </p>
              <p className="text-sm text-stone-700 dark:text-stone-300 font-medium mt-1">
                Estimated total: {format(finalTotal)}
              </p>
            </div>
            <div className="text-right">
              <Link
                to="/checkout"
                className="inline-block px-5 py-2.5 text-sm bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
              >
                Proceed to checkout
              </Link>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">Secure checkout • Easy returns • Order tracking</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
