import { Navigate } from 'react-router-dom'

/** Old URL — category settings now live under Dev tools (/admin/products). */
export default function AdminCategoryImages() {
  return <Navigate to={{ pathname: '/admin/products', hash: 'category-images' }} replace />
}
