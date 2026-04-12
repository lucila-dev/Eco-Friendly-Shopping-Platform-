import { Navigate } from 'react-router-dom'

export default function AdminCategoryImages() {
  return <Navigate to={{ pathname: '/admin/products', hash: 'category-images' }} replace />
}
