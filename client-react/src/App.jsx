
import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { loginUser, googleLoginUser } from './services/authService'
import { GoogleLogin } from '@react-oauth/google'
import Register from './components/Register'
import Marketplace from './pages/Marketplace'
import Favorites from './pages/Favorites'
import ProductDetails from './pages/ProductDetails'
import SellerStore from './pages/SellerStore'
import Messages from './pages/Messages'
import MyOrders from './pages/MyOrders'
import MyProducts from './pages/MyProducts'
import Notifications from './pages/Notifications'
import SellerDashboard from './pages/SellerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import './App.css'

function LoginPage() {
  const [page, setPage] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googlePhone, setGooglePhone] = useState('')
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState('')

  async function handleLogin(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await loginUser({
        email: email.trim(),
        password,
      })

      if (!data.token) {
        setError('The server did not provide a login token.')
        return
      }

      localStorage.setItem('token', data.token)

      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      window.location.href =
        data.user?.role === 'admin' ? '/admin' : '/marketplace'
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Login failed. Please check your details and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function finishGoogleLogin(data) {
    if (data.phoneRequired) {
      setPendingGoogleCredential(data.credential || '')
      setError('')
      setGooglePhone('')
      return false
    }

    if (!data.token) {
      setError('The server did not provide a login token.')
      return false
    }

    localStorage.setItem('token', data.token)
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user))
    }

    window.location.href =
      data.user?.role === 'admin' ? '/admin' : '/marketplace'
    return true
  }

  async function handleGoogleSuccess(response) {
    if (!response?.credential) {
      setError('Google sign-in did not return a credential. Please try again.')
      return
    }

    setError('')
    setGoogleLoading(true)
    try {
      const data = await googleLoginUser({ credential: response.credential })
      if (data.phoneRequired) {
        setPendingGoogleCredential(response.credential)
        setError('')
        return
      }
      await finishGoogleLogin(data)
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Google sign-in failed. Please try again.'
      )
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleGooglePhoneSubmit(event) {
    event.preventDefault()
    if (!pendingGoogleCredential) {
      setError('Please select Continue with Google again.')
      return
    }

    setError('')
    setGoogleLoading(true)
    try {
      const data = await googleLoginUser({
        credential: pendingGoogleCredential,
        phone: googlePhone.trim(),
      })

      if (data.phoneRequired) {
        setError('Please enter your phone number to continue.')
        return
      }

      setPendingGoogleCredential('')
      await finishGoogleLogin(data)
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not complete Google sign-in. Please try again.'
      )
    } finally {
      setGoogleLoading(false)
    }
  }

  if (page === 'register') {
    return (
      <Register
        onLogin={() => {
          setPage('login')
          setError('')
        }}
      />
    )
  }

  return (
    <main className="login-page">
      <header className="brand">
        <div className="brand-icon" aria-hidden="true">R</div>
        <div>
          <h1>NR Nexus</h1>
          <p>Chat. Share. Trade together.</p>
        </div>
      </header>

      <section className="login-card">
        <div className="card-heading">
          <h2>Welcome back!</h2>
          <p>Sign in to your account to continue.</p>
        </div>

        <form onSubmit={handleLogin}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <div className="form-links">
            <a href="/forgot-password.html">Forgot password?</a>
          </div>

          {error && <p className="error-message" role="alert">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="google-login-divider"><span>OR</span></div>

        {pendingGoogleCredential ? (
          <form onSubmit={handleGooglePhoneSubmit} className="google-phone-form">
            <p className="google-phone-heading">
              Complete your account with a phone number
            </p>
            <label htmlFor="google-phone">Phone number</label>
            <input
              id="google-phone"
              type="tel"
              autoComplete="tel"
              placeholder="Enter your phone number"
              value={googlePhone}
              onChange={(event) => setGooglePhone(event.target.value)}
              required
            />
            <button type="submit" disabled={googleLoading}>
              {googleLoading ? 'Please wait...' : 'Continue'}
            </button>
            <button
              type="button"
              className="google-cancel-button"
              onClick={() => {
                setPendingGoogleCredential('')
                setGooglePhone('')
                setError('')
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="google-login-button">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in was cancelled or failed.')}
              text="continue_with"
              shape="rectangular"
              width="100%"
            />
            {googleLoading && (
              <p className="google-loading-message">Signing in with Google...</p>
            )}
          </div>
        )}

        <p className="register-prompt">
          Don't have an account?{' '}
          <button
            className="text-button"
            type="button"
            onClick={() => setPage('register')}
          >
            Sign up
          </button>
        </p>
      </section>

      <footer className="login-footer">
        © {new Date().getFullYear()} NR Nexus
      </footer>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/store/:sellerId" element={<SellerStore />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/my-products" element={<MyProducts />} />
        <Route path="/seller-dashboard" element={<SellerDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App


