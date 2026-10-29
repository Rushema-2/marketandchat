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
  const [sellerReviews, setSellerReviews] = useState([])
  const [sellerRating, setSellerRating] = useState(0)
  const [sellerReviewCount, setSellerReviewCount] = useState(0)
  const [eligibleOrders, setEligibleOrders] = useState([])
  const [mySellerReview, setMySellerReview] = useState(null)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewsError, setReviewsError] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewOrderId, setReviewOrderId] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewNotice, setReviewNotice] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

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

  useEffect(() => {
    let cancelled = false

    async function loadSellerReviews() {
      setReviewsLoading(true)
      setReviewsError('')

      try {
        const response = await api.get(
          `/seller-reviews/seller/${encodeURIComponent(sellerId || '')}`
        )
        if (cancelled) return

        const data = response.data || {}
        setSellerReviews(Array.isArray(data.reviews) ? data.reviews : [])
        setSellerRating(Number(data.averageRating) || 0)
        setSellerReviewCount(Number(data.reviewCount) || 0)
        setEligibleOrders(Array.isArray(data.eligibleOrders) ? data.eligibleOrders : [])
        setMySellerReview(data.myReview || null)

        if (data.myReview) {
          setReviewRating(Number(data.myReview.rating) || 5)
          setReviewComment(data.myReview.comment || '')
        } else {
          setReviewRating(5)
          setReviewComment('')
        }

        setReviewOrderId(data.eligibleOrders?.[0]?._id || '')
      } catch (err) {
        if (!cancelled) {
          setReviewsError(
            err.response?.data?.message || 'Could not load seller reviews.'
          )
        }
      } finally {
        if (!cancelled) setReviewsLoading(false)
      }
    }

    if (sellerId) loadSellerReviews()
    else setReviewsLoading(false)

    return () => { cancelled = true }
  }, [sellerId])

  useEffect(() => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    setCurrentUserId(String(user._id || user.id || user.userId || ''))
  } catch {
    setCurrentUserId('')
  }
}, [])


  async function handleSaveSellerReview(event) {
    event.preventDefault()
    setReviewsError('')
    setReviewNotice('')

    if (!localStorage.getItem('token')) {
      setReviewsError('Please sign in to review this seller.')
      return
    }

    if (!mySellerReview && !reviewOrderId) {
      setReviewsError('A successfully paid and delivered order is required to review this seller.')
      return
    }

    setReviewSaving(true)
    try {
      const response = await api.post(
        `/seller-reviews/seller/${encodeURIComponent(sellerId)}`,
        {
          rating: Number(reviewRating),
          comment: reviewComment,
          ...(mySellerReview ? {} : { orderId: reviewOrderId }),
        }
      )

      setReviewNotice(response.data?.message || 'Your review has been saved.')
      const refreshed = await api.get(
        `/seller-reviews/seller/${encodeURIComponent(sellerId)}`
      )
      const data = refreshed.data || {}
      setSellerReviews(Array.isArray(data.reviews) ? data.reviews : [])
      setSellerRating(Number(data.averageRating) || 0)
      setSellerReviewCount(Number(data.reviewCount) || 0)
      setEligibleOrders(Array.isArray(data.eligibleOrders) ? data.eligibleOrders : [])
      setMySellerReview(data.myReview || null)

      if (data.myReview) {
        setReviewRating(Number(data.myReview.rating) || 5)
        setReviewComment(data.myReview.comment || '')
      }
      setReviewOrderId(data.eligibleOrders?.[0]?._id || '')
    } catch (err) {
      setReviewsError(
        err.response?.data?.message || 'Could not save your review. Please try again.'
      )
    } finally {
      setReviewSaving(false)
    }
  }

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
          <span>NR Nexus</span>
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

          <section className="seller-store-reviews-section" aria-labelledby="seller-reviews-title">
            <div className="seller-store-section-heading">
              <h2 id="seller-reviews-title">Seller Ratings &amp; Reviews</h2>
              <p>Feedback from buyers who purchased from this seller.</p>
            </div>

            <div className="seller-store-rating-overview">
              <strong className="seller-store-rating-number">
                {sellerReviewCount ? sellerRating.toFixed(1) : '—'}
              </strong>
              <span className="seller-store-review-stars" aria-label={`${sellerRating} out of 5 stars`}>
                {'★'.repeat(Math.round(sellerRating))}
                {'☆'.repeat(5 - Math.round(sellerRating))}
              </span>
              <span>
                {sellerReviewCount} {sellerReviewCount === 1 ? 'review' : 'reviews'}
              </span>
            </div>

            {reviewsLoading ? (
              <p className="seller-store-review-status" role="status">Loading seller reviews...</p>
            ) : (
              <>
                {reviewsError && (
                  <p className="seller-store-review-error" role="alert">{reviewsError}</p>
                )}
                {reviewNotice && (
                  <p className="seller-store-review-success" role="status">{reviewNotice}</p>
                )}

                {reviewsError && sellerReviews.length === 0 ? (
                  <p className="seller-store-review-status">
                    Seller reviews could not be loaded. Please try again later.
                  </p>
                ) : sellerReviews.length === 0 ? (
                  <p className="seller-store-no-reviews">This seller has no reviews yet.</p>
                ) : (
                  <div className="seller-store-review-list">
                    {sellerReviews.map((review) => {
                      const buyer = review.buyer || {}
                      const buyerName = [buyer.firstName, buyer.lastName]
                        .filter(Boolean).join(' ') || 'Buyer'

                      return (
                        <article className="seller-store-review-item" key={review._id}>
                          <div className="seller-store-review-item-heading">
                            <strong>{buyerName}</strong>
                            <span className="seller-store-review-stars" aria-label={`${review.rating} out of 5 stars`}>
                              {'★'.repeat(Number(review.rating) || 0)}
                              {'☆'.repeat(5 - (Number(review.rating) || 0))}
                            </span>
                          </div>
                          <p>{review.comment || 'No written comment.'}</p>
                          <time dateTime={review.createdAt}>
                            {review.createdAt
                              ? new Date(review.createdAt).toLocaleDateString()
                              : ''}
                          </time>
                        </article>
                      )
                    })}
                  </div>
                )}

                {currentUserId &&
  currentUserId !== String(sellerId) &&
  localStorage.getItem('token') &&
  (mySellerReview || eligibleOrders.length > 0) && (
                    <form className="seller-store-review-form" onSubmit={handleSaveSellerReview}>
                      <h3>{mySellerReview ? 'Update your seller review' : 'Review this seller'}</h3>

                      {!mySellerReview && eligibleOrders.length > 1 && (
                        <label>
                          Delivered order
                          <select
                            value={reviewOrderId}
                            onChange={(event) => setReviewOrderId(event.target.value)}
                            required
                          >
                            {eligibleOrders.map((order) => (
                              <option value={order._id} key={order._id}>
                                Order {String(order._id).slice(-8)}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      <label>
                        Your rating
                        <select
                          value={reviewRating}
                          onChange={(event) => setReviewRating(Number(event.target.value))}
                          required
                        >
                          <option value={5}>★★★★★ — Excellent</option>
                          <option value={4}>★★★★☆ — Good</option>
                          <option value={3}>★★★☆☆ — Average</option>
                          <option value={2}>★★☆☆☆ — Poor</option>
                          <option value={1}>★☆☆☆☆ — Very poor</option>
                        </select>
                      </label>

                      <label>
                        Comment (optional)
                        <textarea
                          value={reviewComment}
                          onChange={(event) => setReviewComment(event.target.value)}
                          maxLength={1500}
                          rows={4}
                          placeholder="Share your experience with this seller..."
                        />
                      </label>

                      <button type="submit" disabled={reviewSaving}>
                        {reviewSaving ? 'Saving...' : mySellerReview ? 'Update review' : 'Submit review'}
                      </button>
                    </form>
                  )}
              </>
            )}
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
        © {new Date().getFullYear()} NR Nexus · Chat. Share. Trade together.
      </footer>
    </main>
  )
}

export default SellerStore
