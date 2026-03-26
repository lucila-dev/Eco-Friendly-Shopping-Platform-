import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'

const ProductList = lazy(() => import('./pages/ProductList'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const AdminProducts = lazy(() => import('./pages/AdminProducts'))
const AdminProductForm = lazy(() => import('./pages/AdminProductForm'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <p className="text-stone-500">Loading...</p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Suspense fallback={<PageFallback />}><ProductList /></Suspense>} />
          <Route path="products/:slug" element={<Suspense fallback={<PageFallback />}><ProductDetail /></Suspense>} />
          <Route path="cart" element={<ProtectedRoute><Suspense fallback={<PageFallback />}><Cart /></Suspense></ProtectedRoute>} />
          <Route path="checkout" element={<ProtectedRoute><Suspense fallback={<PageFallback />}><Checkout /></Suspense></ProtectedRoute>} />
          <Route path="order-confirmation/:id" element={<ProtectedRoute><Suspense fallback={<PageFallback />}><OrderConfirmation /></Suspense></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute><Suspense fallback={<PageFallback />}><Dashboard /></Suspense></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><Suspense fallback={<PageFallback />}><Profile /></Suspense></ProtectedRoute>} />
          <Route path="login" element={<Suspense fallback={<PageFallback />}><Login /></Suspense>} />
          <Route path="signup" element={<Suspense fallback={<PageFallback />}><Signup /></Suspense>} />
          <Route path="admin/products" element={<ProtectedRoute><Suspense fallback={<PageFallback />}><AdminProducts /></Suspense></ProtectedRoute>} />
          <Route path="admin/products/new" element={<ProtectedRoute><Suspense fallback={<PageFallback />}><AdminProductForm /></Suspense></ProtectedRoute>} />
          <Route path="admin/products/:id" element={<ProtectedRoute><Suspense fallback={<PageFallback />}><AdminProductForm /></Suspense></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
