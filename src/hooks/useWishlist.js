import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

function keyFor(userId) {
  return `ecoshop-wishlist-${userId || 'guest'}`
}

export function useWishlist() {
  const { user } = useAuth()
  const [ids, setIds] = useState([])
  const isAuthenticated = Boolean(user?.id)

  useEffect(() => {
    if (!user?.id) {
      setIds([])
      return
    }
    const raw = localStorage.getItem(keyFor(user?.id))
    if (!raw) {
      setIds([])
      return
    }
    try {
      setIds(JSON.parse(raw))
    } catch {
      setIds([])
    }
  }, [user?.id])

  const persist = (next) => {
    if (!user?.id) return
    setIds(next)
    localStorage.setItem(keyFor(user?.id), JSON.stringify(next))
  }

  const toggle = (productId) => {
    if (!user?.id) return false
    const next = ids.includes(productId)
      ? ids.filter((id) => id !== productId)
      : [...ids, productId]
    persist(next)
    return true
  }

  const isWishlisted = (productId) => ids.includes(productId)

  return { ids, toggle, isWishlisted, isAuthenticated }
}
