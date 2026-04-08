import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import CartItem from '../components/CartItem'

export default function Cart() {
  const { items, loading, updateQuantity, removeItem, total } = useCart()
  const deliveryFee = total >= 50 ? 0 : 4.99
  const finalTotal = total + deliveryFee
  useEffect(() => {
    document.title = 'Cart – EcoShop'
    return () => { document.title = 'EcoShop – Sustainable Shopping' }
  }, [])

  if (loading) return <p className="text-stone-500">Loading cart...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Your cart</h1>
      {items.length === 0 ? (
        <p className="text-stone-600">
          Your cart is empty. <Link to="/products" className="text-emerald-600 hover:underline">Browse products</Link>
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
          <div className="mt-6 flex items-center justify-between border border-emerald-200 bg-emerald-50/60 rounded-xl p-4">
            <div>
              <p className="text-lg font-semibold text-stone-800">Subtotal: ${total.toFixed(2)}</p>
              <p className="text-sm text-stone-500">Delivery: {deliveryFee === 0 ? 'Free' : `$${deliveryFee.toFixed(2)}`}</p>
              <p className="text-sm text-stone-700 font-medium mt-1">Estimated total: ${finalTotal.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <Link
                to="/checkout"
                className="inline-block px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
              >
                Proceed to checkout
              </Link>
              <p className="text-xs text-stone-500 mt-2">Secure checkout • Easy returns • Order tracking</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
