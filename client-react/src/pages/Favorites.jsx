import { useEffect, useState } from 'react'
import api from '../api'
import NotificationBell from '../components/NotificationBell'
import './Marketplace.css'
import './Favorites.css'

const API_ORIGIN = (
  import.meta.env.VITE_API_ORIGIN || 'https://marketandchat.onrender.com'
).replace(/\/$/, '')

function formatPrice(price, currency = 'RWF') {
  return `${new Intl.NumberFormat('en-RW', {
    maximumFractionDigits: 0,
  }).format(Number(price) || 0)} ${currency || 'RWF'}`
}

function Favorites() {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState({})

  async function loadFavorites() {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/favorites')
      setFavorites(response.data.favorites || [])
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'Please sign in to view your favorites.'
          : err.response?.data?.message || 'Could not load favorites.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setError('Please sign in to view your favorites.')
      setLoading(false)
      return
    }

    loadFavorites()
  }, [])

  async function removeFavorite(productId) {
    setRemoving((current) => ({ ...current, [productId]: true }))

    try {
      await api.delete(`/favorites/${encodeURIComponent(productId)}`)
      setFavorites((current) =>
        current.filter((favorite) => favorite.product?._id !== productId)
      )
    } catch (err) {
      window.alert(
        err.response?.data?.message ||
        'Could not remove this favorite. Please try again.'
      )
    } finally {
      setRemoving((current) => {
        const next = { ...current }
        delete next[productId]
        return next
      })
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  return (
    <main className="marketplace-page">
      <header className="market-header">
        <a className="market-brand" href="/marketplace">
          <span className="market-logo">R</span>
          <span>
            <strong>NR Nexus</strong>
            <small>Chat. Share. Trade together.</small>
          </span>
        </a>

        <nav className="market-nav" aria-label="Main navigation">
          <a href="/marketplace">Marketplace</a>
          <a href="/messages">Messages</a>
          <a className="active" href="/favorites">❤️ Favorites</a>
          <NotificationBell />
          <a href="/my-orders">My orders</a>
          <a href="/my-products">My products</a>
        </nav>

        <button className="logout-button" onClick={logout}>
          Sign out
        </button>
      </header>

      <section className="favorites-heading">
        <p className="market-eyebrow">YOUR SAVED PRODUCTS</p>
        <h1>❤️ My Favorites</h1>
        <p>Products you saved to find again later.</p>
      </section>

      <section className="market-content">
        {loading && <p className="market-status">Loading favorites...</p>}

        {!loading && error && (
          <div className="market-error" role="alert">
            <p>{error}</p>
            {localStorage.getItem('token') && (
              <button onClick={loadFavorites}>Try again</button>
            )}
            {!localStorage.getItem('token') && (
              <button onClick={() => { window.location.href = '/' }}>
                Sign in
              </button>
            )}
          </div>
        )}

        {!loading && !error && favorites.length === 0 && (
          <div className="market-empty">
            <h3>No favorites yet</h3>
            <p>Tap the heart on a product in the Marketplace to save it here.</p>
            <a className="favorites-market-link" href="/marketplace">
              Explore Marketplace
            </a>
          </div>
        )}

        {!loading && !error && favorites.length > 0 && (
          <>
            <p className="product-count">
              {favorites.length} saved product{favorites.length === 1 ? '' : 's'}
            </p>

            <div className="product-grid">
              {favorites.map((favorite) => {
                const product = favorite.product
                if (!product) return null

                const imagePath = product.images?.[0]
                const imageUrl = imagePath
                  ? (/^https?:\/\//i.test(imagePath)
                      ? imagePath
                      : `${API_ORIGIN}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`)
                  : ''

                return (
                  <article className="product-card" key={favorite._id}>
                    <a
                      className="product-image"
                      href={`/product/${encodeURIComponent(product._id)}`}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.title}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <span className="product-placeholder">No image available</span>
                      )}
                      {product.video && <span className="video-badge">Video</span>}
                    </a>

                    <div className="product-info">
                      <p className="product-category">
                        {String(product.category || 'Other').replace(/_/g, ' ')}
                      </p>
                      <h3>
                        <a href={`/product/${encodeURIComponent(product._id)}`}>
                          {product.title}
                        </a>
                      </h3>
                      <div
                        className="favorites-review-summary"
                        aria-label={
                          product.reviewCount > 0
                            ? `${product.averageRating} out of 5 stars from ${product.reviewCount} reviews`
                            : 'No reviews yet'
                        }
                      >
                        <span className="favorites-review-stars" aria-hidden="true">
                          {'★'.repeat(Math.round(product.averageRating || 0))}
                          {'☆'.repeat(5 - Math.round(product.averageRating || 0))}
                        </span>
                        {product.reviewCount > 0 ? (
                          <>
                            <strong>{Number(product.averageRating || 0).toFixed(1)} / 5</strong>
                            <span>
                              ({product.reviewCount} {product.reviewCount === 1 ? 'review' : 'reviews'})
                            </span>
                          </>
                        ) : (
                          <span>No reviews yet</span>
                        )}
                      </div>
                      <p className="product-description">{product.description}</p>
                      <strong className="product-price">
                        {formatPrice(product.price, product.currency)}
                      </strong>
                      <div className="product-meta">
                        <span>📍 {product.location || 'Location not specified'}</span>
                        <span>{product.stock > 0 ? 'In stock' : 'Out of stock'}</span>
                      </div>
                      <p className="seller-name">
                        Seller: {product.seller
                          ? `${product.seller.firstName || ''} ${product.seller.lastName || ''}`.trim()
                          : 'Seller'}
                      </p>
                      <button
                        className="remove-favorite-button"
                        type="button"
                        disabled={Boolean(removing[product._id])}
                        onClick={() => removeFavorite(product._id)}
                      >
                        {removing[product._id] ? 'Removing...' : '♥ Remove from favorites'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>

      <footer className="market-footer">
        © {new Date().getFullYear()} NR Nexus · Chat. Share. Trade together.
      </footer>
    </main>
  )
}

export default Favorites
