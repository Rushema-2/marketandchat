
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import './ProductDetails.css'

function formatPrice(price) {
  return `${new Intl.NumberFormat('en-RW', {
    maximumFractionDigits: 0,
  }).format(Number(price) || 0)} RWF`
}

function ProductDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [contacting, setContacting] = useState(false)
  const [ordering, setOrdering] = useState(false)
  const [orderResult, setOrderResult] = useState(null)
  const [paying, setPaying] = useState(false)
  const [paymentResult, setPaymentResult] = useState(null)
  const [reviewsData, setReviewsData] = useState({
    reviews: [],
    averageRating: 0,
    reviewCount: 0,
    myReview: null,
    eligibleOrders: [],
    canReview: false,
  })
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewOrderId, setReviewOrderId] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewMessage, setReviewMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProduct() {
      try {
        const response = await api.get(
          `/products/${encodeURIComponent(id || '')}`
        )
        if (!cancelled) {
          setProduct(response.data.product || response.data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
            'Could not load this product. Please try again.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (id) {
      loadProduct()
    }

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    let cancelled = false

    async function loadReviews() {
      setReviewsLoading(true)
      setReviewError('')

      try {
        const response = await api.get(
          `/reviews/product/${encodeURIComponent(id || '')}`
        )
        if (cancelled) return

        const data = response.data || {}
        const nextData = {
          reviews: Array.isArray(data.reviews) ? data.reviews : [],
          averageRating: Number(data.averageRating) || 0,
          reviewCount: Number(data.reviewCount) || 0,
          myReview: data.myReview || null,
          eligibleOrders: Array.isArray(data.eligibleOrders)
            ? data.eligibleOrders
            : [],
          canReview: Boolean(data.canReview),
        }

        setReviewsData(nextData)

        if (nextData.myReview) {
          setReviewRating(Number(nextData.myReview.rating) || 5)
          setReviewComment(nextData.myReview.comment || '')
        }

        if (nextData.eligibleOrders.length) {
          setReviewOrderId(String(nextData.eligibleOrders[0]._id))
        }
      } catch (err) {
        if (!cancelled) {
          setReviewError(
            err.response?.data?.message ||
            'Could not load reviews. Please try again.'
          )
        }
      } finally {
        if (!cancelled) setReviewsLoading(false)
      }
    }

    if (id) loadReviews()
    else setReviewsLoading(false)

    return () => {
      cancelled = true
    }
  }, [id])

  function requireLogin() {
    if (localStorage.getItem('token')) return true

    setActionError('Please sign in to contact the seller or place an order.')
    setActionMessage('')
    return false
  }

  async function handleContactSeller() {
    setActionError('')
    setActionMessage('')
    setOrderResult(null)

    if (!requireLogin()) return

    const sellerId = product?.seller?._id || product?.seller?.id

    if (!sellerId) {
      setActionError('Seller information is unavailable. Please try again later.')
      return
    }

    if (String(sellerId) === String(
      JSON.parse(localStorage.getItem('user') || '{}')._id ||
      JSON.parse(localStorage.getItem('user') || '{}').id || ''
    )) {
      setActionError('You cannot start a conversation with yourself.')
      return
    }

    setContacting(true)

    try {
      // The existing chat page supports ?seller=SELLER_ID.
      // Open it only after confirming that the conversation can be opened.
      await api.post('/conversations', { userId: sellerId })
      window.location.href =
        `/messages?seller=${encodeURIComponent(sellerId)}`
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
        'Could not open the seller conversation. Please try again.'
      )
    } finally {
      setContacting(false)
    }
  }

  async function handleBuyNow() {
    setActionError('')
    setActionMessage('')
    setOrderResult(null)
    setPaymentResult(null)

    if (!requireLogin()) return

    const sellerId = product?.seller?._id || product?.seller?.id
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const currentUserId = user._id || user.id

    if (sellerId && currentUserId &&
        String(sellerId) === String(currentUserId)) {
      setActionError('You cannot buy your own product.')
      return
    }

    const stock = Number(product?.stock)

    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      setActionError('Please enter a valid quantity.')
      return
    }

    if (!Number.isFinite(stock) || stock < Number(quantity)) {
      setActionError('The requested quantity is not currently available.')
      return
    }

    setOrdering(true)

    try {
      const response = await api.post('/orders', {
        productId: product._id,
        quantity: Number(quantity),
      })

      const order = response.data.order
      setOrderResult(order)
      setActionMessage(
        'Your order has been created. Payment has not been started.'
      )
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
        'Could not create your order. Please try again.'
      )
    } finally {
      setOrdering(false)
    }
  }

  async function handlePayOrder() {
    setActionError('')
    setActionMessage('')

    if (!requireLogin()) return
    if (!orderResult?._id) {
      setActionError('Create an order before requesting payment.')
      return
    }
    if (paymentResult?.paymentReference) {
      setActionError('A payment request already exists for this order.')
      return
    }

    setPaying(true)
    try {
      const response = await api.post(
        `/orders/${encodeURIComponent(orderResult._id)}/pay`
      )
      setPaymentResult(response.data)
      setActionMessage(
        'MTN MoMo sandbox payment request submitted. This does not confirm that payment was completed.'
      )
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
        'Could not submit the payment request. Please check the order before trying again.'
      )
    } finally {
      setPaying(false)
    }
  }

  async function handleSaveReview(event) {
    event.preventDefault()
    setReviewError('')
    setReviewMessage('')

    if (!localStorage.getItem('token')) {
      setReviewError('Please sign in to write a review.')
      return
    }

    if (!Number.isInteger(Number(reviewRating)) ||
        Number(reviewRating) < 1 || Number(reviewRating) > 5) {
      setReviewError('Choose a rating from 1 to 5 stars.')
      return
    }

    if (!reviewsData.myReview && !reviewOrderId) {
      setReviewError('A successfully paid and delivered order is required to review this product.')
      return
    }

    setReviewSaving(true)
    try {
      const response = await api.post(
        `/reviews/product/${encodeURIComponent(id)}`,
        {
          rating: Number(reviewRating),
          comment: reviewComment,
          ...(!reviewsData.myReview ? { orderId: reviewOrderId } : {}),
        }
      )

      setReviewMessage(response.data?.message || 'Review saved successfully.')

      const refreshed = await api.get(
        `/reviews/product/${encodeURIComponent(id)}`
      )
      const data = refreshed.data || {}
      setReviewsData({
        reviews: Array.isArray(data.reviews) ? data.reviews : [],
        averageRating: Number(data.averageRating) || 0,
        reviewCount: Number(data.reviewCount) || 0,
        myReview: data.myReview || null,
        eligibleOrders: Array.isArray(data.eligibleOrders)
          ? data.eligibleOrders
          : [],
        canReview: Boolean(data.canReview),
      })
    } catch (err) {
      setReviewError(
        err.response?.data?.message ||
        'Could not save your review. Please try again.'
      )
    } finally {
      setReviewSaving(false)
    }
  }

  if (id && loading) {
    return (
      <main className="product-details-page">
        <p>Loading product...</p>
      </main>
    )
  }

  if (!id || error || !product) {
    return (
      <main className="product-details-page">
        <button className="details-back" onClick={() => navigate('/marketplace')}>
          ← Back to Marketplace
        </button>
        <section className="details-message">
          <h1>Product unavailable</h1>
          <p>{!id ? 'Product ID is missing.' : error || 'This product could not be found.'}</p>
          <button onClick={() => navigate('/marketplace')}>Browse products</button>
        </section>
      </main>
    )
  }

  const sellerName = [
    product.seller?.firstName,
    product.seller?.lastName,
  ].filter(Boolean).join(' ') || 'Seller'
  const sellerId = product.seller?._id || product.seller?.id

  const imagePath = product.images?.[0]
  const imageUrl = imagePath
    ? (/^https?:\/\//i.test(imagePath)
        ? imagePath
        : `${import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000'}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`)
    : ''

    const videoPath = product.video
const videoUrl = videoPath
  ? (/^https?:\/\//i.test(videoPath)
      ? videoPath
      : `${import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000'}${videoPath.startsWith('/') ? '' : '/'}${videoPath}`)
  : ''

  const stock = Number(product.stock)
  const inStock = Number.isFinite(stock) && stock > 0
  const isSeller = String(
    product.seller?._id || product.seller?.id || ''
  ) === String(
    (() => {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      return user._id || user.id || ''
    })()
  )

  return (
    <main className="product-details-page">
      <header className="details-header">
        <a href="/marketplace" className="details-brand">RwhatsApp</a>
        <button className="details-back" onClick={() => navigate('/marketplace')}>
          ← Back to Marketplace
        </button>
      </header>

      <section className="details-layout">
        <div className="details-image">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.title}
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <p>No image available</p>
          )}
        </div>

        <div className="details-info">
          <p className="details-category">{product.category || 'Other'}</p>
          <h1>{product.title}</h1>
          <p className="details-price">{formatPrice(product.price)}</p>
          <p className="details-location">
            Location: {product.location || 'Not specified'}
          </p>

          <div className="details-divider" />
          <h2>Description</h2>
          <p className="details-description">
            {product.description || 'No description provided.'}
          </p>

          <div className="details-divider" />
          <h2>Seller information</h2>
          <p className="details-seller">{sellerName}</p>
          {sellerId && (
            <a className="details-store-link" href={`/store/${sellerId}`}>
              View seller store →
            </a>
          )}
          <p className="details-stock">
            {inStock ? `${stock} available` : 'Out of stock or availability unconfirmed'}
          </p>

          <div className="details-actions">
            <button
              type="button"
              className="details-contact-button"
              onClick={handleContactSeller}
              disabled={contacting || isSeller}
            >
              {contacting ? 'Opening chat...' : 'Contact Seller'}
            </button>

            <label className="details-quantity-label" htmlFor="product-quantity">
              Quantity
            </label>
            <input
              id="product-quantity"
              className="details-quantity"
              type="number"
              min="1"
              max={inStock ? stock : 1}
              step="1"
              value={quantity}
              onChange={(event) => {
                setQuantity(event.target.value)
                setActionError('')
                setActionMessage('')
                setOrderResult(null)
                setPaymentResult(null)
              }}
              disabled={!inStock || ordering || isSeller}
            />

            <p className="details-total">
              Total: {formatPrice(Number(product.price) * Number(quantity || 0))}
            </p>

            <button
              type="button"
              className="details-buy-button"
              onClick={handleBuyNow}
              disabled={!inStock || ordering || isSeller}
            >
              {ordering ? 'Creating order...' : 'Buy Now'}
            </button>
          </div>

          {actionError && (
            <p className="details-action-error" role="alert">
              {actionError}
            </p>
          )}

          {actionMessage && (
            <p className="details-action-success" role="status">
              {actionMessage}
            </p>
          )}

          {orderResult && (
            <section className="details-order-result" aria-live="polite">
              <h3>Order created successfully</h3>
              <p>Order reference: {orderResult._id}</p>
              <p>Quantity: {orderResult.quantity}</p>
              <p>Total: {formatPrice(orderResult.totalAmount)}</p>
              <p>Order status: {orderResult.status || 'pending'}</p>

              {!paymentResult && (
                <>
                  <p>Payment has not been started. You have not been charged.</p>
                  <button
                    type="button"
                    className="details-buy-button"
                    onClick={handlePayOrder}
                    disabled={paying || ordering}
                  >
                    {paying ? 'Submitting payment request...' : 'Pay with MTN MoMo (Sandbox)'}
                  </button>
                </>
              )}

              {paymentResult && (
                <div className="details-payment-result">
                  <h4>Payment request submitted</h4>
                  <p>Provider: MTN MoMo sandbox</p>
                  {paymentResult.paymentReference && (
                    <p>Payment reference: {paymentResult.paymentReference}</p>
                  )}
                  <p>Request status: {paymentResult.paymentStatus || 'pending'}</p>
                  <p>
                    Sandbox testing only. This is not confirmation of a completed
                    payment, and the order is not confirmed as paid.
                  </p>
                </div>
              )}
            </section>
          )}

          <p className="details-note">
            Contact the seller to ask questions and confirm availability.
            Creating an order does not start payment.
          </p>
        </div>

                  {videoUrl && (
            <div className="details-video">
              <h2>Product Video</h2>
              <video
                controls
                playsInline
                preload="metadata"
              >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support video playback.
              </video>
            </div>
          )}
      </section>

      <section id="details-reviews" className="details-reviews" aria-labelledby="details-reviews-title">
        <div className="details-reviews-heading">
          <div>
            <h2 id="details-reviews-title">Ratings &amp; Reviews</h2>
            <p className="details-review-summary">
              <span className="details-review-stars" aria-label={`${reviewsData.averageRating} out of 5 stars`}>
                {'★'.repeat(Math.round(reviewsData.averageRating))}
                {'☆'.repeat(5 - Math.round(reviewsData.averageRating))}
              </span>
              <strong>{reviewsData.averageRating.toFixed(1)} / 5</strong>
              <span>({reviewsData.reviewCount} {reviewsData.reviewCount === 1 ? 'review' : 'reviews'})</span>
            </p>
          </div>
        </div>

        {reviewsLoading ? (
          <p>Loading reviews...</p>
        ) : (
          <>
            {localStorage.getItem('token') && (
              <form className="details-review-form" onSubmit={handleSaveReview}>
                <h3>{reviewsData.myReview ? 'Edit your review' : 'Rate this product'}</h3>

                {!reviewsData.myReview && reviewsData.eligibleOrders.length > 0 && (
                  <label className="details-review-order-label">
                    Delivered order
                    <select
                      value={reviewOrderId}
                      onChange={(event) => setReviewOrderId(event.target.value)}
                      required
                    >
                      {reviewsData.eligibleOrders.map((order) => (
                        <option key={order._id} value={order._id}>
                          Order {order._id}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="details-review-rating" role="group" aria-label="Choose a rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={star <= reviewRating ? 'is-selected' : ''}
                      onClick={() => setReviewRating(star)}
                      aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
                      aria-pressed={reviewRating === star}
                    >
                      ★
                    </button>
                  ))}
                  <span>{reviewRating} / 5</span>
                </div>

                <label className="details-review-comment-label">
                  Your review (optional)
                  <textarea
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    maxLength={1500}
                    rows={4}
                    placeholder="Share your experience with this product..."
                  />
                </label>

                {!reviewsData.myReview && reviewsData.eligibleOrders.length === 0 && (
                  <p className="details-review-hint">
                    You can review this product after your order is successfully paid
                    and you confirm that it has been delivered.
                  </p>
                )}

                {reviewError && (
                  <p className="details-review-error" role="alert">{reviewError}</p>
                )}
                {reviewMessage && (
                  <p className="details-review-success" role="status">{reviewMessage}</p>
                )}

                <button
                  className="details-review-submit"
                  type="submit"
                  disabled={
                    reviewSaving ||
                    (!reviewsData.myReview && reviewsData.eligibleOrders.length === 0)
                  }
                >
                  {reviewSaving ? 'Saving...' : reviewsData.myReview ? 'Update review' : 'Submit review'}
                </button>
              </form>
            )}

            {!localStorage.getItem('token') && (
              <p className="details-review-hint">
                <button
                  type="button"
                  className="details-review-login"
                  onClick={() => navigate('/login')}
                >
                  Sign in
                </button>
                {' '}to write a review after purchasing and receiving this product.
              </p>
            )}

            {reviewError && !localStorage.getItem('token') && (
              <p className="details-review-error" role="alert">{reviewError}</p>
            )}

            {reviewsData.reviews.length === 0 ? (
              <p className="details-review-empty">No reviews yet. Be the first to share your experience after a completed delivery.</p>
            ) : (
              <div className="details-review-list">
                {reviewsData.reviews.map((review) => {
                  const buyerName = [
                    review.buyer?.firstName,
                    review.buyer?.lastName,
                  ].filter(Boolean).join(' ') || 'Buyer'

                  return (
                    <article className="details-review-card" key={review._id}>
                      <div className="details-review-card-top">
                        <strong>{buyerName}</strong>
                        <span className="details-review-stars" aria-label={`${review.rating} out of 5 stars`}>
                          {'★'.repeat(Number(review.rating) || 0)}
                          {'☆'.repeat(5 - (Number(review.rating) || 0))}
                        </span>
                      </div>
                      {review.comment && <p>{review.comment}</p>}
                      <time dateTime={review.createdAt}>
                        {review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString()
                          : ''}
                        {review.updatedAt && review.createdAt &&
                         new Date(review.updatedAt).getTime() > new Date(review.createdAt).getTime()
                          ? ' · Edited'
                          : ''}
                      </time>
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}

export default ProductDetails
