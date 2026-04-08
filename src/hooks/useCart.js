import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const CART_UPDATED_EVENT = 'ecoshop-cart-updated'

export function useCart() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCart = async () => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        quantity,
        products ( id, name, slug, price, image_url )
      `)
      .eq('user_id', user.id)
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchCart()
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`cart-items-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${user.id}` },
        () => {
          fetchCart()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  useEffect(() => {
    const onCartUpdated = () => {
      fetchCart()
    }
    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated)
    return () => window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated)
  }, [user?.id])

  const updateQuantity = async (cartItemId, quantity) => {
    if (quantity < 1) return
    await supabase.from('cart_items').update({ quantity }).eq('id', cartItemId)
    window.dispatchEvent(new Event(CART_UPDATED_EVENT))
    await fetchCart()
  }

  const removeItem = async (cartItemId) => {
    await supabase.from('cart_items').delete().eq('id', cartItemId)
    window.dispatchEvent(new Event(CART_UPDATED_EVENT))
    await fetchCart()
  }

  const total = items.reduce((sum, row) => sum + (row.quantity * (row.products?.price ?? 0)), 0)

  return { items, loading, updateQuantity, removeItem, refetch: fetchCart, total }
}
