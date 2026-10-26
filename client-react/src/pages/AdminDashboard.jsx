import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import api from '../api'
import './AdminDashboard.css'

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'products', label: 'Products' },
  { id: 'orders', label: 'Orders' },
  { id: 'reviews', label: 'Reviews' },
]

const money = (amount, currency = 'RWF') =>
  `${Number(amount || 0).toLocaleString()} ${currency || 'RWF'}`

const personName = (person) => {
  if (!person) return 'Unknown'
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ')
  return name || person.email || 'Unknown'
}

const dateText = (date) => {
  if (!date) return '—'
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString()
}

function StatCard({ label, value, detail }) {
  return (
    <article className="admin-stat-card">
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
      {detail && <small>{detail}</small>}
    </article>
  )
}

function Status({ value }) {
  const label = value || 'unknown'
  return <span className={`admin-status admin-status-${label}`}>{label}</span>
}

export default function AdminDashboard() {
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })()

  const [section, setSection] = useState('overview')
  const [overview, setOverview] = useState(null)
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadOverview = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/admin/overview')
      setOverview(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load dashboard overview.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadList = useCallback(async (target, currentPage) => {
    if (target === 'overview') return
    setLoading(true)
    setError('')
    try {
      const response = await api.get(`/admin/${target}`, {
        params: { page: currentPage, limit: 20 },
      })
      const key = target
      setItems(Array.isArray(response.data[key]) ? response.data[key] : [])
      setPagination(response.data.pagination || { page: currentPage, pages: 1, total: 0 })
    } catch (err) {
      setItems([])
      setError(err.response?.data?.message || `Could not load ${target}.`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (section === 'overview') loadOverview()
    else loadList(section, page)
  }, [section, page, loadOverview, loadList])

  if (!localStorage.getItem('token')) return <Navigate to="/" replace />
  if (storedUser?.role !== 'admin') {
    return (
      <main className="admin-access-denied">
        <h1>Admin access required</h1>
        <p>This page is for accounts with administrator access.</p>
        <Link to="/marketplace">Back to Marketplace</Link>
      </main>
    )
  }

  function changeSection(id) {
    setSection(id)
    setPage(1)
    setItems([])
    setError('')
  }

  function renderUsers() {
    return (
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>User</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th></tr></thead>
        <tbody>{items.map((user) => (
          <tr key={user._id}>
            <td>{personName(user)}</td><td>{user.email || '—'}</td>
            <td>{user.phone || '—'}</td><td><Status value={user.role} /></td>
            <td>{dateText(user.createdAt)}</td>
          </tr>
        ))}</tbody>
      </table></div>
    )
  }

  function renderProducts() {
    return (
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Product</th><th>Price</th><th>Seller</th><th>Location</th><th>Status</th></tr></thead>
        <tbody>{items.map((product) => (
          <tr key={product._id}>
            <td>{product.title || 'Untitled'}</td>
            <td>{money(product.price, product.currency)}</td>
            <td>{personName(product.seller)}</td><td>{product.location || '—'}</td>
            <td><Status value={product.status} /></td>
          </tr>
        ))}</tbody>
      </table></div>
    )
  }

  function renderOrders() {
    return (
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Order</th><th>Product</th><th>Buyer</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
        <tbody>{items.map((order) => (
          <tr key={order._id}>
            <td title={order._id}>{String(order._id || '').slice(-8)}</td>
            <td>{order.product?.title || 'Product unavailable'}</td>
            <td>{personName(order.buyer)}</td>
            <td>{money(order.totalAmount, order.currency)}</td>
            <td><Status value={order.paymentStatus} /></td>
            <td><Status value={order.status} /></td>
          </tr>
        ))}</tbody>
      </table></div>
    )
  }

  function renderReviews() {
    return (
      <div className="admin-review-list">
        {items.map((review) => (
          <article className="admin-review-card" key={review._id}>
            <div className="admin-review-heading">
              <strong>{review.product?.title || 'Product unavailable'}</strong>
              <span>{'★'.repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}{'☆'.repeat(5 - Math.max(0, Math.min(5, Number(review.rating) || 0)))}</span>
            </div>
            <p>{review.comment || 'No written comment.'}</p>
            <small>By {personName(review.buyer)} · {dateText(review.createdAt)}</small>
          </article>
        ))}
      </div>
    )
  }

  function renderContent() {
    if (loading) return <p className="admin-empty">Loading data…</p>
    if (error) return <div className="admin-error" role="alert">{error}</div>

    if (section === 'overview') {
      if (!overview) return <p className="admin-empty">No overview data available yet.</p>
      return (
        <>
          <div className="admin-stats-grid">
            <StatCard label="Total users" value={overview.users?.total} detail={`${overview.users?.admins ?? 0} admins`} />
            <StatCard label="Total products" value={overview.products?.total} detail={`${overview.products?.active ?? 0} active`} />
            <StatCard label="Total orders" value={overview.orders?.total} detail={`${overview.orders?.pending ?? 0} pending`} />
            <StatCard label="Reviews" value={overview.reviews?.total} detail={`Average rating: ${Number(overview.reviews?.averageRating || 0).toFixed(2)} / 5`} />
            <StatCard label="Sold products" value={overview.products?.sold} />
            <StatCard label="Hidden products" value={overview.products?.hidden} />
            <StatCard label="Completed orders" value={overview.orders?.completed} />
          </div>
          <div className="admin-overview-note">
            <strong>Platform overview</strong>
            <p>Hitamo Users, Products, Orders cyangwa Reviews kugira ngo urebe amakuru arambuye.</p>
          </div>
        </>
      )
    }

    if (!items.length) return <p className="admin-empty">No data available in this section.</p>
    if (section === 'users') return renderUsers()
    if (section === 'products') return renderProducts()
    if (section === 'orders') return renderOrders()
    if (section === 'reviews') return renderReviews()
    return null
  }

  const currentLabel = sections.find((item) => item.id === section)?.label || 'Overview'

  return (
    <main className="admin-dashboard">
      <header className="admin-header">
        <div>
          <Link className="admin-brand" to="/marketplace">RwhatsApp</Link>
          <p>Administration workspace</p>
        </div>
        <Link className="admin-back-link" to="/marketplace">← Marketplace</Link>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <p className="admin-sidebar-label">MANAGEMENT</p>
          {sections.map((item) => (
            <button
              type="button"
              key={item.id}
              className={section === item.id ? 'admin-nav-item active' : 'admin-nav-item'}
              onClick={() => changeSection(item.id)}
            >
              {item.label}
            </button>
          ))}
          <div className="admin-sidebar-foot">Signed in as<br /><strong>{personName(storedUser)}</strong></div>
        </aside>

        <section className="admin-main">
          <div className="admin-page-heading">
            <div><span className="admin-eyebrow">RWHATSAPP ADMIN</span><h1>{currentLabel}</h1>
              <p>Reba uko platform ihagaze n'amakuru y'ibikorwa.</p></div>
            <button type="button" className="admin-refresh" disabled={loading}
              onClick={() => section === 'overview' ? loadOverview() : loadList(section, page)}>
              Refresh
            </button>
          </div>

          {renderContent()}

          {section !== 'overview' && pagination.pages > 1 && (
            <div className="admin-pagination">
              <span>{pagination.total} records · Page {pagination.page} of {pagination.pages}</span>
              <div>
                <button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
                <button type="button" disabled={loading || page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
