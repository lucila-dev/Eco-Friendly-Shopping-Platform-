import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'

function storageKey(userId) {
  return `ecoshop-wishlist-${userId || 'guest'}`
}

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [ids, setIds] = useState([])

  useEffect(() => {
    if (!userId) {
      setIds([])
      return
    }
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) {
      setIds([])
      return
    }
    try {
      setIds(JSON.parse(raw))
    } catch {
      setIds([])
    }
  }, [userId])

  const toggle = useCallback(
    (productId) => {
      if (!userId) return false
      setIds((prev) => {
        const next = prev.includes(productId)
          ? prev.filter((id) => id !== productId)
          : [...prev, productId]
        localStorage.setItem(storageKey(userId), JSON.stringify(next))
        return next
      })
      return true
    },
    [userId],
  )

  const value = useMemo(
    () => ({
      ids,
      toggle,
      isWishlisted: (productId) => ids.includes(productId),
      isAuthenticated: Boolean(userId),
    }),
    [ids, toggle, userId],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (ctx == null) {
    throw new Error('useWishlist must be used within WishlistProvider')
  }
  return ctx
}
