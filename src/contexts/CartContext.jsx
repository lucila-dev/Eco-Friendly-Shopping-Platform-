import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const CART_UPDATED_EVENT = 'ecoshop-cart-updated'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCart = useCallback(async () => {
    if (!userId) {
      setItems([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        size,
        quantity,
        products ( id, name, slug, price, image_url )
      `)
      .eq('user_id', userId)

    if (err) {
      console.warn('[EcoShop] cart fetch failed:', err.message)
      setError(err.message)
      setItems([])
    } else {
      setItems(data ?? [])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`cart-items-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${userId}` },
        () => {
          fetchCart()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchCart])

  useEffect(() => {
    const onCartUpdated = () => {
      fetchCart()
    }
    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated)
    return () => window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated)
  }, [fetchCart])

  const updateQuantity = useCallback(
    async (cartItemId, quantity) => {
      if (quantity < 1) {
        await supabase.from('cart_items').delete().eq('id', cartItemId)
        window.dispatchEvent(new Event(CART_UPDATED_EVENT))
        await fetchCart()
        return
      }
      await supabase.from('cart_items').update({ quantity }).eq('id', cartItemId)
      window.dispatchEvent(new Event(CART_UPDATED_EVENT))
      await fetchCart()
    },
    [fetchCart],
  )

  const removeItem = useCallback(
    async (cartItemId) => {
      await supabase.from('cart_items').delete().eq('id', cartItemId)
      window.dispatchEvent(new Event(CART_UPDATED_EVENT))
      await fetchCart()
    },
    [fetchCart],
  )

  const removeAllForProduct = useCallback(
    async (productId) => {
      if (!userId) return
      await supabase.from('cart_items').delete().eq('user_id', userId).eq('product_id', productId)
      window.dispatchEvent(new Event(CART_UPDATED_EVENT))
      await fetchCart()
    },
    [userId, fetchCart],
  )

  const total = useMemo(() => {
    return items.reduce((sum, row) => {
      const p = Array.isArray(row.products) ? row.products[0] : row.products
      return sum + row.quantity * (Number(p?.price) || 0)
    }, 0)
  }, [items])

  const value = useMemo(
    () => ({
      items,
      loading,
      error,
      updateQuantity,
      removeItem,
      removeAllForProduct,
      refetch: fetchCart,
      total,
    }),
    [items, loading, error, updateQuantity, removeItem, removeAllForProduct, fetchCart, total],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return ctx
}
