import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isEmailConfirmed } from '../lib/authEmail'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-stone-500">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isEmailConfirmed(user)) {
    return <Navigate to="/verify-email" replace />
  }

  return children
}
