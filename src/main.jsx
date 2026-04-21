import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { WishlistProvider } from './contexts/WishlistContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ToastHost from './components/ToastHost'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <App />
            <ToastHost />
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
