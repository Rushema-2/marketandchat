import { useEffect, useState } from 'react'
import api from '../api'
import './Workspace.css'

function price(value, currency = 'RWF') {
  return `${new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(value) || 0)} ${currency || 'RWF'}`
}

function statusLabel(value) {
  return String(value || 'Pending').replace(/[_-]/g, ' ')
}

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmingOrderId, setConfirmingOrderId] = useState('')

  async function loadOrders() {
    const { data } = await api.get('/orders/my-orders')
    setOrders(data.orders || [])
  }

  useEffect(() => {
    loadOrders()
      .catch((err) => setError(
        err.response?.data?.message || 'Could not load your orders.'
      ))
      .finally(() => setLoading(false))
  }, [])

  async function handleConfirmDelivery(orderId) {
    const confirmed = window.confirm(
      'Confirm that you have received this order? Only confirm if the product has arrived.'
    )

    if (!confirmed) return

    setError('')
    setNotice('')
    setConfirmingOrderId(orderId)

    try {
      const { data } = await api.patch(
        `/orders/${encodeURIComponent(orderId)}/confirm-delivery`
      )

      setNotice(data.message || 'Delivery confirmed successfully.')
      await loadOrders()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not confirm delivery. Please refresh your orders and try again.'
      )
    } finally {
      setConfirmingOrderId('')
    }
  }

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/marketplace">NR Nexus</a>
        <nav className="workspace-nav">
          <a href="/marketplace">Marketplace</a>
          <a href="/messages">Messages</a>
          <a className="active" href="/my-orders">My Orders</a>
          <a href="/my-products">My Products</a>
        </nav>
      </header>

      <section className="workspace-content">
        <div className="workspace-title">
          <div><p className="workspace-eyebrow">YOUR PURCHASES</p><h1>My Orders</h1><p>Track products you have ordered.</p></div>
          <a className="workspace-primary" href="/marketplace">Browse products</a>
        </div>

        {loading && <p className="workspace-muted">Loading your orders...</p>}
        {error && <p className="workspace-error" role="alert">{error}</p>}
        {notice && <p className="workspace-success" role="status">{notice}</p>}

        {!loading && !error && orders.length === 0 && (
          <div className="workspace-empty"><span>▤</span><h2>No orders yet</h2><p>Products you order will appear here.</p><a className="workspace-primary" href="/marketplace">Explore Marketplace</a></div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="orders-list">
            {orders.map((order) => {
              const product = order.product || {}
              const seller = order.seller || {}
              const orderStatus = order.status || order.orderStatus || 'Pending'
              const paymentStatus = order.paymentStatus
              return (
                <article className="order-card" key={order._id}>
                  <div className="order-card-top">
                    <div><small>ORDER ID</small><strong>#{String(order._id).slice(-8).toUpperCase()}</strong></div>
                    <span className="status-pill">{statusLabel(orderStatus)}</span>
                  </div>
                  <div className="order-card-body">
                    {product.images?.[0] ? (
                      <img className="order-image" src={/^https?:\/\//i.test(product.images[0]) ? product.images[0] : `${import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000'}${product.images[0].startsWith('/') ? '' : '/'}${product.images[0]}`} alt={product.title || 'Product'} />
                    ) : <div className="order-image order-image-placeholder">No image</div>}
                    <div className="order-product-info">
                      <h2>{product.title || 'Product unavailable'}</h2>
                      <p>Seller: {[seller.firstName, seller.lastName].filter(Boolean).join(' ') || 'Seller'}</p>
                      <p>Quantity: {order.quantity ?? 1}</p>
                      <strong>{price((Number(product.price) || 0) * (Number(order.quantity) || 1), product.currency)}</strong>
                    </div>
                  </div>
                  <div className="order-card-footer">
                    <span>Placed {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'date unavailable'}</span>
                    {product._id && (
                      <a
                        className="workspace-secondary order-review-link"
                        href={`/product/${encodeURIComponent(product._id)}#details-reviews`}
                      >
                        View product &amp; reviews
                      </a>
                    )}
                    {paymentStatus && <span>Payment: {statusLabel(paymentStatus)}</span>}
                    {paymentStatus === 'successful' && orderStatus === 'shipped' && (
                      <button
                        className="workspace-primary"
                        type="button"
                        onClick={() => handleConfirmDelivery(order._id)}
                        disabled={confirmingOrderId === order._id}
                      >
                        {confirmingOrderId === order._id
                          ? 'Confirming...'
                          : 'Confirm Delivery'}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
