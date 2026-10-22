import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import './SellerStore.css'

const API_ORIGIN = (
  import.meta.env.VITE_API_ORIGIN || 'https://marketandchat.onrender.com'
).replace(/\/$/, '')

function formatPrice(price, currency = 'RWF') {
  return `${new Intl.NumberFormat('en-RW', {
    maximumFractionDigits: 0,
  }).format(Number(price) || 0)} ${currency || 'RWF'}`
}

function getImageUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

function SellerStore() {
  const { sellerId } = useParams()
  const navigate = useNavigate()

  const [seller, setSeller] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [contactError, setContactError] = useState('')
  const [contacting, setContacting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadStore() {
      setLoading(true)
      setError('')

      try {
        const response = await api.get(
          `/products/seller/${encodeURIComponent(sellerId || '')}`
        )

        if (cancelled) return

        setSeller(response.data.seller || null)
        setProducts(
          Array.isArray(response.data.products)
            ? response.data.products
            : []
        )
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
            'Could not load this seller store. Please try again.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (sellerId) {
      loadStore()
    } else {
      setError('Seller ID is missing.')
      setLoading(false)
    }

    return () => {
      cancelled = true
    }
  }, [sellerId])

  async function handleMessageSeller() {
    setContactError('')

    if (!localStorage.getItem('token')) {
      setContactError('Please sign in to contact this seller.')
      return
    }

    if (!sellerId) {
      setContactError('Seller information is unavailable.')
      return
    }

    let currentUserId = ''

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      currentUserId = String(user._id || user.id || user.userId || '')
    } catch {
      setContactError('Could not read your account. Please sign in again.')
      return
    }

    if (currentUserId && currentUserId === String(sellerId)) {
      setContactError('You cannot start a conversation with yourself.')
      return
    }

    setContacting(true)

    try {
      await api.post('/conversations', { userId: sellerId })
      window.location.href =
        `/messages?seller=${encodeURIComponent(sellerId)}`
    } catch (err) {
      setContactError(
        err.response?.data?.message ||
        'Could not open the seller conversation. Please try again.'
      )
    } finally {
      setContacting(false)
    }
  }

  const sellerName = [
    seller?.firstName,
    seller?.lastName,
  ].filter(Boolean).join(' ') || 'Seller'

  return (
    <main className="seller-store-page">
      <header className="seller-store-header">
        <a className="seller-store-brand" href="/marketplace">
          <span className="seller-store-logo">R</span>
          <span>RwhatsApp</span>
        </a>

        <button
          type="button"
          className="seller-store-back"
          onClick={() => navigate('/marketplace')}
        >
          ← Marketplace
        </button>
      </header>

      {loading ? (
        <section className="seller-store-message" role="status">
          Loading seller store...
        </section>
      ) : error ? (
        <section className="seller-store-message" role="alert">
          <h1>Store unavailable</h1>
          <p>{error}</p>
          <button type="button" onClick={() => navigate('/marketplace')}>
            Browse marketplace
          </button>
        </section>
      ) : (
        <>
          <section className="seller-store-profile">
            <div className="seller-store-avatar" aria-hidden="true">
              {sellerName.charAt(0).toUpperCase()}
            </div>

            <div className="seller-store-profile-info">
              <p className="seller-store-eyebrow">SELLER STORE</p>
              <h1>{sellerName}</h1>
              <p>
                {products.length} active product{products.length === 1 ? '' : 's'}
              </p>

              <button
                type="button"
                className="seller-store-message-button"
                onClick={handleMessageSeller}
                disabled={contacting || !sellerId}
              >
                {contacting ? 'Opening chat...' : 'Message Seller'}
              </button>

              {contactError && (
                <p className="seller-store-contact-error" role="alert">
                  {contactError}
                </p>
              )}
            </div>
          </section>

          <section className="seller-store-products">
            <div className="seller-store-section-heading">
              <div>
                <h2>Products from {sellerName}</h2>
                <p>Explore this seller's available products.</p>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="seller-store-empty">
                This seller has no active products right now.
              </div>
            ) : (
              <div className="seller-store-grid">
                {products.map((product) => {
                  const imageUrl = getImageUrl(product.images?.[0])

                  return (
                    <article className="seller-store-card" key={product._id}>
                      <a
                        className="seller-store-product-image"
                        href={`/product/${encodeURIComponent(product._id)}`}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.title || 'Product'}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <span>No image available</span>
                        )}

                        {product.video && (
                          <span className="seller-store-video-badge">
                            Video
                          </span>
                        )}
                      </a>

                      <div className="seller-store-card-info">
                        <p className="seller-store-category">
                          {String(product.category || 'Other').replace(/_/g, ' ')}
                        </p>

                        <h3>
                          <a href={`/product/${encodeURIComponent(product._id)}`}>
                            {product.title || 'Untitled product'}
                          </a>
                        </h3>

                        <div
                          className="seller-store-review-summary"
                          aria-label={
                            product.reviewCount > 0
                              ? `${product.averageRating} out of 5 stars from ${product.reviewCount} reviews`
                              : 'No reviews yet'
                          }
                        >
                          <span className="seller-store-review-stars" aria-hidden="true">
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

                        <p className="seller-store-description">
                          {product.description || 'No description provided.'}
                        </p>

                        <strong className="seller-store-price">
                          {formatPrice(product.price, product.currency)}
                        </strong>

                        <p className="seller-store-location">
                          📍 {product.location || 'Location not specified'}
                        </p>

                        <a
                          className="seller-store-view-product"
                          href={`/product/${encodeURIComponent(product._id)}`}
                        >
                          View product →
                        </a>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}

      <footer className="seller-store-footer">
        © {new Date().getFullYear()} RwhatsApp · Chat. Share. Trade together.
      </footer>
    </main>
  )
}

export default SellerStore
