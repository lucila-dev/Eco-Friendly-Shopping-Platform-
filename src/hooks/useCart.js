import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

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

  const updateQuantity = async (cartItemId, quantity) => {
    if (quantity < 1) return
    await supabase.from('cart_items').update({ quantity }).eq('id', cartItemId)
    await fetchCart()
  }

  const removeItem = async (cartItemId) => {
    await supabase.from('cart_items').delete().eq('id', cartItemId)
    await fetchCart()
  }

  const total = items.reduce((sum, row) => sum + (row.quantity * (row.products?.price ?? 0)), 0)

  return { items, loading, updateQuantity, removeItem, refetch: fetchCart, total }
}
