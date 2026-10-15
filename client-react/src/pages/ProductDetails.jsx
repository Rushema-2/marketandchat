
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

    if (!id) {
      setError('Product ID is missing.')
      setLoading(false)
    } else {
      loadProduct()
    }

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
        `http://localhost:3000/chat.html?seller=${encodeURIComponent(sellerId)}`
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

  if (loading) {
    return (
      <main className="product-details-page">
        <p>Loading product...</p>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="product-details-page">
        <button className="details-back" onClick={() => navigate('/marketplace')}>
          ← Back to Marketplace
        </button>
        <section className="details-message">
          <h1>Product unavailable</h1>
          <p>{error || 'This product could not be found.'}</p>
          <button onClick={() => navigate('/marketplace')}>Browse products</button>
        </section>
      </main>
    )
  }

  const sellerName = [
    product.seller?.firstName,
    product.seller?.lastName,
  ].filter(Boolean).join(' ') || 'Seller'

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
              <p>Status: {orderResult.status || 'pending'}</p>
              <p>Payment has not been started. You have not been charged.</p>
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
    </main>
  )
}

export default ProductDetails
