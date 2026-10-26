import { useCallback, useEffect, useState } from 'react'
import api from '../api'
import './Workspace.css'
import './SellerDashboard.css'

const plans = [
  { id: '1_day', label: '1 Day', price: 200 },
  { id: '7_days', label: '7 Days', price: 1400 },
  { id: '30_days', label: '30 Days', price: 5000 },
]

const zeroSummary = {
  totalSales: 0,
  totalCommission: 0,
  totalEarnings: 0,
  totalOrders: 0,
}

function money(value, currency = 'RWF') {
  return `${new Intl.NumberFormat('en-RW', {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)} ${currency || 'RWF'}`
}

function imageUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path

  const origin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000'
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`
}

function activePromotion(product) {
  return Boolean(
    product.isPromoted &&
    (!product.promotionEnd || new Date(product.promotionEnd) > new Date())
  )
}

export default function SellerDashboard() {
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState(zeroSummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [promotionId, setPromotionId] = useState('')
  const [promotionBusy, setPromotionBusy] = useState(false)
  const [promotionMessage, setPromotionMessage] = useState('')
  const [paymentMessage, setPaymentMessage] = useState('')
  const [orderBusy, setOrderBusy] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    const results = await Promise.allSettled([
      api.get('/products/seller/me/products'),
      api.get('/orders/sales-summary'),
      api.get('/orders/my-sales'),
    ])

    const failed = results.find((result) => result.status === 'rejected')

    if (results[0].status === 'fulfilled') {
      setProducts(results[0].value.data.products || [])
    }

    if (results[1].status === 'fulfilled') {
      setSummary({
        ...zeroSummary,
        ...(results[1].value.data.summary || {}),
      })
    }

    if (results[2].status === 'fulfilled') {
      setOrders(results[2].value.data.orders || [])
    }

    if (failed) {
      setError(
        failed.reason?.response?.data?.message ||
        'Some dashboard information could not be loaded. Try refreshing.'
      )
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  async function updateOrder(order, status) {
    setOrderBusy(order._id)
    setError('')
    setNotice('')

    try {
      await api.patch(`/orders/${encodeURIComponent(order._id)}/status`, {
        status,
      })

      setNotice('Order status updated.')
      await loadDashboard()
    } catch (err) {
      const data = err.response?.data || {}

      if (data.paymentMode === 'sandbox' || err.response?.status === 409) {
        setError(
          data.message ||
          'Sandbox mode: this order status cannot be changed during testing.'
        )
      } else {
        setError(data.message || 'Could not update the order status.')
      }
    } finally {
      setOrderBusy('')
    }
  }

  function openPromotion(product) {
    setSelectedProduct(product)
    setPromotionId('')
    setPromotionMessage('')
    setPaymentMessage('')
    setError('')
  }

  function closePromotion() {
    if (promotionBusy) return
    setSelectedProduct(null)
    setPromotionId('')
    setPromotionMessage('')
    setPaymentMessage('')
  }

  async function createPromotion(packageName) {
    if (!selectedProduct || promotionBusy) return

    setPromotionBusy(true)
    setError('')
    setPromotionMessage('Creating promotion request...')
    setPaymentMessage('')

    try {
      const { data } = await api.post('/promotions', {
        productId: selectedProduct._id,
        package: packageName,
      })

      setPromotionId(data.promotion?.id || '')
      setPromotionMessage(
        `Promotion request created: ${money(
          data.promotion?.amount,
          data.promotion?.currency
        )}.`
      )
    } catch (err) {
      setPromotionMessage('')
      setError(
        err.response?.data?.message ||
        'Could not create the promotion request.'
      )
    } finally {
      setPromotionBusy(false)
    }
  }

  async function payPromotion() {
    if (!promotionId || promotionBusy) return

    setPromotionBusy(true)
    setPaymentMessage('Sending MTN MoMo payment request...')

    try {
      const { data } = await api.post(
        `/promotions/${encodeURIComponent(promotionId)}/pay`
      )

      setPaymentMessage(
        data.message ||
        'Payment request submitted. Check your phone for the MoMo prompt.'
      )
    } catch (err) {
      setPaymentMessage(
        err.response?.data?.message ||
        'Could not send the payment request.'
      )
    } finally {
      setPromotionBusy(false)
    }
  }

  async function checkPromotionPayment() {
    if (!promotionId || promotionBusy) return

    setPromotionBusy(true)
    setPaymentMessage('Checking MTN MoMo payment status...')

    try {
      const { data } = await api.get(
        `/promotions/${encodeURIComponent(promotionId)}/payment-status`
      )

      const payment = data.payment || {}
      const status = payment.momoStatus || 'PENDING'

      setPaymentMessage(
        status === 'SUCCESSFUL'
          ? 'Payment provider reported success. Confirm the promotion status before assuming it is active.'
          : status === 'FAILED'
            ? 'The payment provider reported a failed payment.'
            : `Payment status: ${status}. If you are testing in sandbox, this does not activate the promotion.`
      )
    } catch (err) {
      const data = err.response?.data || {}

      if (
        err.response?.status === 409 &&
        data.payment?.paymentMode === 'sandbox'
      ) {
        setPaymentMessage(
          'Sandbox test only — the promotion has not been activated. No real payment or promotion status was changed.'
        )
      } else {
        setPaymentMessage(
          data.message || 'Could not check payment status.'
        )
      }
    } finally {
      setPromotionBusy(false)
    }
  }

  const promotedCount = products.filter(activePromotion).length
  const totalViews = products.reduce(
    (sum, product) => sum + Number(product.views || 0), 0
  )
  const totalLikes = products.reduce(
    (sum, product) => sum + Number(product.likes || 0), 0
  )

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/marketplace">NR Nexus</a>
        <nav className="workspace-nav">
          <a href="/marketplace">Marketplace</a>
          <a href="/favorites">Favorites</a>
          <a href="/messages">Messages</a>
          <a href="/notifications">Notifications</a>
          <a href="/my-orders">My Orders</a>
          <a href="/my-products">My Products</a>
          <a className="active" href="/seller-dashboard">Seller Dashboard</a>
        </nav>
      </header>

      <section className="workspace-content seller-dashboard-content">
        <div className="workspace-title">
          <div>
            <p className="workspace-eyebrow">YOUR BUSINESS</p>
            <h1>Seller Dashboard</h1>
            <p>Track your sales, manage orders and promote your products.</p>
          </div>
          <div className="seller-dashboard-title-actions">
            <a className="workspace-secondary" href="/my-products">Manage products</a>
            <button
              className="workspace-primary"
              type="button"
              onClick={loadDashboard}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {notice && <p className="workspace-success" role="status">{notice}</p>}
        {error && <p className="workspace-error" role="alert">{error}</p>}

        <section className="seller-dashboard-section">
          <div className="seller-section-heading">
            <div>
              <h2>Store performance</h2>
              <p>Activity across your product listings.</p>
            </div>
          </div>

          <div className="seller-stats-grid">
            <article className="seller-stat-card">
              <span>My Products</span>
              <strong>{products.length}</strong>
            </article>
            <article className="seller-stat-card">
              <span>Total Views</span>
              <strong>{totalViews.toLocaleString('en-RW')}</strong>
            </article>
            <article className="seller-stat-card">
              <span>Total Likes</span>
              <strong>{totalLikes.toLocaleString('en-RW')}</strong>
            </article>
            <article className="seller-stat-card">
              <span>Promoted Products</span>
              <strong>{promotedCount}</strong>
            </article>
          </div>
        </section>

        <section className="seller-dashboard-section">
          <div className="seller-section-heading">
            <div>
              <h2>Sales overview</h2>
              <p>Sales totals for paid and completed orders.</p>
            </div>
          </div>

          <div className="seller-stats-grid">
            <article className="seller-stat-card seller-stat-highlight">
              <span>Total Sales</span>
              <strong>{money(summary.totalSales)}</strong>
            </article>
            <article className="seller-stat-card">
              <span>Commission</span>
              <strong>{money(summary.totalCommission)}</strong>
            </article>
            <article className="seller-stat-card">
              <span>Your Earnings</span>
              <strong>{money(summary.totalEarnings)}</strong>
            </article>
            <article className="seller-stat-card">
              <span>Paid Orders</span>
              <strong>{Number(summary.totalOrders || 0)}</strong>
            </article>
          </div>
        </section>

        <section className="seller-dashboard-section">
          <div className="seller-section-heading">
            <div>
              <h2>My products</h2>
              <p>Check listing activity and choose products to promote.</p>
            </div>
            <a className="seller-text-link" href="/my-products">Edit products →</a>
          </div>

          {loading && <p className="workspace-muted">Loading your products...</p>}

          {!loading && products.length === 0 && (
            <div className="workspace-empty">
              <h3>No products yet</h3>
              <p>Add your first listing to start selling.</p>
              <a className="workspace-primary" href="/my-products">Add a product</a>
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="seller-products-grid">
              {products.map((product) => (
                <article className="seller-product-card" key={product._id}>
                  {product.images?.[0]
                    ? <img src={imageUrl(product.images[0])} alt={product.title || 'Product'} />
                    : <div className="seller-product-placeholder">No image</div>}

                  <div className="seller-product-body">
                    <span className="product-category-label">
                      {String(product.category || 'other').replace(/_/g, ' ')}
                    </span>
                    <h3>{product.title}</h3>
                    <strong>{money(product.price, product.currency)}</strong>
                    <p className="workspace-muted">
                      Views: {Number(product.views || 0)} · Likes: {Number(product.likes || 0)}
                    </p>
                    <p className="workspace-muted">
                      Stock: {product.stock ?? 0} · Status: {product.status || 'active'}
                    </p>
                    <p className={activePromotion(product) ? 'seller-promotion-active' : 'seller-promotion-inactive'}>
                      {activePromotion(product) ? 'Promotion active' : 'Promotion not active'}
                    </p>
                    <div className="seller-product-actions">
                      <a className="workspace-secondary" href={`/product/${encodeURIComponent(product._id)}`}>View</a>
                      <a className="workspace-secondary" href="/my-products">Edit</a>
                      <button
                        type="button"
                        className="workspace-primary"
                        onClick={() => openPromotion(product)}
                        disabled={promotionBusy || activePromotion(product) || product.status !== 'active'}
                      >
                        {activePromotion(product) ? 'Promoted' : 'Promote'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="seller-dashboard-section">
          <div className="seller-section-heading">
            <div>
              <h2>Sales orders</h2>
              <p>Orders customers placed for your products.</p>
            </div>
          </div>

          {loading && <p className="workspace-muted">Loading sales orders...</p>}

          {!loading && orders.length === 0 && (
            <div className="workspace-empty">
              <h3>No sales yet</h3>
              <p>Your customer orders will appear here.</p>
            </div>
          )}

          {!loading && orders.length > 0 && (
            <div className="seller-orders-list">
              {orders.map((order) => {
                const product = order.product || {}
                const buyer = order.buyer || {}
                const buyerName = `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || 'Unknown buyer'
                const nextStatus = order.status === 'paid'
                  ? 'processing'
                  : order.status === 'processing'
                    ? 'shipped'
                    : ''

                return (
                  <article className="seller-order-card" key={order._id}>
                    <div className="seller-order-heading">
                      <div>
                        <h3>{product.title || 'Product unavailable'}</h3>
                        <p>Buyer: {buyerName}</p>
                      </div>
                      <span className="status-pill">{order.status || 'pending'}</span>
                    </div>

                    <div className="seller-order-details">
                      <p>Quantity: <strong>{Number(order.quantity || 0)}</strong></p>
                      <p>Date: <strong>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}</strong></p>
                      <p>Payment: <strong>{order.paymentStatus || 'pending'}</strong></p>
                      <p>Total: <strong>{money(order.totalAmount, order.currency)}</strong></p>
                      <p>Commission: <strong>{money(order.commissionAmount, order.currency)}</strong></p>
                      <p>Your earnings: <strong>{money(order.sellerAmount, order.currency)}</strong></p>
                    </div>

                    {nextStatus && (
                      <button
                        type="button"
                        className="workspace-primary"
                        disabled={orderBusy === order._id}
                        onClick={() => updateOrder(order, nextStatus)}
                      >
                        {orderBusy === order._id
                          ? 'Updating...'
                          : nextStatus === 'processing'
                            ? 'Start processing'
                            : 'Mark as shipped'}
                      </button>
                    )}

                    {order.status === 'shipped' && (
                      <p className="workspace-muted">Awaiting buyer confirmation.</p>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </section>

      {selectedProduct && (
        <div className="seller-modal-backdrop" role="presentation" onClick={closePromotion}>
          <section
            className="seller-promotion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-promotion-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="seller-modal-close"
              aria-label="Close promotion window"
              onClick={closePromotion}
              disabled={promotionBusy}
            >
              ×
            </button>

            <p className="workspace-eyebrow">GROW YOUR REACH</p>
            <h2 id="seller-promotion-title">Promote your product</h2>
            <p>{selectedProduct.title}</p>

            <div className="seller-promotion-plans">
              {plans.map((plan) => (
                <button
                  type="button"
                  key={plan.id}
                  className="seller-promotion-plan"
                  disabled={promotionBusy || Boolean(promotionId)}
                  onClick={() => createPromotion(plan.id)}
                >
                  <strong>{plan.label}</strong>
                  <span>{money(plan.price)}</span>
                </button>
              ))}
            </div>

            {promotionMessage && <p className="workspace-success" role="status">{promotionMessage}</p>}
            {error && <p className="workspace-error" role="alert">{error}</p>}
            {paymentMessage && <p className="seller-payment-message" role="status">{paymentMessage}</p>}

            {promotionId && (
              <div className="seller-promotion-payment-actions">
                <button
                  type="button"
                  className="workspace-primary"
                  disabled={promotionBusy}
                  onClick={payPromotion}
                >
                  Pay with MTN MoMo
                </button>
                <button
                  type="button"
                  className="workspace-secondary"
                  disabled={promotionBusy}
                  onClick={checkPromotionPayment}
                >
                  Check payment status
                </button>
              </div>
            )}

            <p className="seller-sandbox-note">
              If sandbox mode is enabled, payment results are tests and do not activate a real promotion.
            </p>
          </section>
        </div>
      )}
    </main>
  )
}
