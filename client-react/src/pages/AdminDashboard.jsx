import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import api from '../api'
import './AdminDashboard.css'

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'performance', label: 'Performance' },
  { id: 'users', label: 'Users' },
  { id: 'products', label: 'Products' },
  { id: 'orders', label: 'Orders' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'services', label: 'Services' },
  { id: 'videos', label: 'NEXUS TV' },
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
  const [analytics, setAnalytics] = useState(null)
  const [performanceData, setPerformanceData] = useState(null)
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState('')

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

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/admin/analytics')
      setAnalytics(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load analytics.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPerformance = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/admin/performance')
      setPerformanceData(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load platform performance.')
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
    else if (section === 'analytics') loadAnalytics()
    else if (section === 'performance') loadPerformance()
    else loadList(section, page)
  }, [section, page, loadOverview, loadAnalytics, loadPerformance, loadList])

  if (!localStorage.getItem('token')) {
    return <Navigate to="/login" replace />
  }

  if (storedUser?.role !== 'admin') {
    return <Navigate to="/marketplace" replace />
  }

  function changeSection(id) {
    setSection(id)
    setPage(1)
    setItems([])
    setError('')
  }

  async function updateItemStatus(item, target, nextStatus) {
    if (!item?._id || !nextStatus || nextStatus === item.status) return

    const confirmed = window.confirm(
      `Are you sure you want to change this status from "${item.status}" to "${nextStatus}"?`
    )
    if (!confirmed) return

    setUpdatingId(item._id)
    setError('')

    try {
      await api.patch(`/admin/${target}/${item._id}/status`, {
        status: nextStatus,
      })
      await loadList(section, page)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update item status.')
    } finally {
      setUpdatingId('')
    }
  }

  async function updateSellerVerification(user) {
    if (!user?._id || updatingId === user._id) return

    const nextValue = !Boolean(user.isVerifiedSeller)
    const action = nextValue ? 'verify' : 'revoke verification for'

    if (!window.confirm(`Are you sure you want to ${action} ${personName(user)}?`)) {
      return
    }

    setUpdatingId(user._id)
    setError('')

    try {
      await api.patch(`/admin/users/${user._id}/verification`, {
        isVerifiedSeller: nextValue,
      })
      await loadList('users', page)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update seller verification.')
    } finally {
      setUpdatingId('')
    }
  }

  function renderStatusSelect(item, target, allowedStatuses) {
    return (
      <select
        className="admin-action-select"
        value={item.status || ''}
        disabled={updatingId === item._id}
        onChange={(event) => updateItemStatus(item, target, event.target.value)}
        aria-label={`Change status for ${item.title || 'item'}`}
      >
        {allowedStatuses.map((status) => (
          <option key={status} value={status}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </option>
        ))}
      </select>
    )
  }

  function renderUsers() {
    return (
      <div className="admin-table-wrap"><table className="admin-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Seller verification</th>
            <th>Joined</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>{items.map((user) => (
          <tr key={user._id}>
            <td>{personName(user)}</td>
            <td>{user.email || '—'}</td>
            <td>{user.phone || '—'}</td>
            <td><Status value={user.role} /></td>
            <td>
              {user.role === 'admin' ? (
                <Status value="not-applicable" />
              ) : (
                <>
                  <Status value={user.isVerifiedSeller ? 'verified' : 'not-verified'} />
                  {user.sellerVerifiedAt && (
                    <small className="admin-verification-date">
                      Verified {dateText(user.sellerVerifiedAt)}
                    </small>
                  )}
                </>
              )}
            </td>
            <td>{dateText(user.createdAt)}</td>
            <td>
              {user.role === 'admin' ? (
                <span>Not applicable</span>
              ) : (
                <button
                  type="button"
                  className={user.isVerifiedSeller
                    ? 'admin-verification-button revoke'
                    : 'admin-verification-button'}
                  disabled={updatingId === user._id}
                  onClick={() => updateSellerVerification(user)}
                >
                  {updatingId === user._id
                    ? 'Updating…'
                    : user.isVerifiedSeller
                      ? 'Revoke'
                      : 'Verify seller'}
                </button>
              )}
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    )
  }

  function renderProducts() {
    return (
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Product</th><th>Price</th><th>Seller</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{items.map((product) => (
          <tr key={product._id}>
            <td>{product.title || 'Untitled'}</td>
            <td>{money(product.price, product.currency)}</td>
            <td>{personName(product.seller)}</td><td>{product.location || '—'}</td>
            <td><Status value={product.status} /></td>
            <td>
              {product.status === 'sold'
                ? '—'
                : renderStatusSelect(product, 'products', ['active', 'hidden'])}
            </td>
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

  function renderServices() {
    return (
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Service / Job</th><th>Type</th><th>Category</th><th>Owner</th><th>Location</th><th>Price / Salary</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
        <tbody>{items.map((service) => (
          <tr key={service._id}>
            <td>{service.title || 'Untitled'}</td>
            <td><Status value={service.type} /></td>
            <td>{service.category || '—'}</td>
            <td>{personName(service.owner)}</td>
            <td>{service.location || '—'}</td>
            <td>{service.price != null ? money(service.price, service.currency) : service.salary || '—'}</td>
            <td><Status value={service.status} /></td>
            <td>{dateText(service.createdAt)}</td>
            <td>{renderStatusSelect(service, 'services', ['active', 'closed', 'hidden'])}</td>
          </tr>
        ))}</tbody>
      </table></div>
    )
  }

  function renderVideos() {
    return (
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Video</th><th>Category</th><th>Owner</th><th>Views</th><th>Downloads</th><th>Status</th><th>Uploaded</th><th>Actions</th></tr></thead>
        <tbody>{items.map((video) => (
          <tr key={video._id}>
            <td>{video.title || 'Untitled'}</td>
            <td>{video.category || '—'}</td>
            <td>{personName(video.owner)}</td>
            <td>{Number(video.views || 0).toLocaleString()}</td>
            <td><Status value={video.allowDownload ? 'allowed' : 'disabled'} /></td>
            <td><Status value={video.status} /></td>
            <td>{dateText(video.createdAt)}</td>
            <td>{renderStatusSelect(video, 'videos', ['active', 'hidden'])}</td>
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
            <div className="admin-review-actions">
              <Status value={review.status || 'active'} />
              {renderStatusSelect(
                { ...review, status: review.status || 'active' },
                'reviews',
                ['active', 'hidden']
              )}
            </div>
          </article>
        ))}
      </div>
    )
  }

  function renderAnalytics() {
    if (!analytics) {
      return <p className="admin-empty">No analytics data available yet.</p>
    }

    const daily = analytics.daily || []
    const maxUsers = Math.max(1, ...daily.map((day) => Number(day.users || 0)))
    const maxOrders = Math.max(1, ...daily.map((day) => Number(day.orders || 0)))
    const categories = analytics.productCategories || []
    const maxCategory = Math.max(1, ...categories.map((item) => Number(item.products || 0)))

    return (
      <div className="admin-analytics">
        <div className="admin-analytics-period">
          Reporting period: {dateText(analytics.period?.start)} – {dateText(analytics.period?.end)}
          <span>Last 30 days</span>
        </div>

        <div className="admin-stats-grid">
          <StatCard
            label="New registrations"
            value={daily.reduce((sum, day) => sum + Number(day.users || 0), 0).toLocaleString()}
            detail="During the reporting period"
          />
          <StatCard
            label="Orders created"
            value={daily.reduce((sum, day) => sum + Number(day.orders || 0), 0).toLocaleString()}
            detail="During the reporting period"
          />
          <StatCard
            label="Paid orders"
            value={daily.reduce((sum, day) => sum + Number(day.paidOrders || 0), 0).toLocaleString()}
            detail="Platform or direct payment confirmed"
          />
          <StatCard
            label="Services and jobs posted"
            value={Number(analytics.services?.created || 0).toLocaleString()}
            detail="Created during the reporting period"
          />
        </div>

        <section className="admin-analytics-panel">
          <h2>Daily activity</h2>
          <p>New user registrations and orders created each day.</p>
          <div className="admin-daily-chart">
            {daily.map((day) => (
              <div className="admin-daily-column" key={day.date} title={`${day.date}: ${day.users} registrations, ${day.orders} orders`}>
                <div className="admin-daily-bars">
                  <span
                    className="admin-daily-bar users"
                    style={{ height: `${(Number(day.users || 0) / maxUsers) * 100}%` }}
                  />
                  <span
                    className="admin-daily-bar orders"
                    style={{ height: `${(Number(day.orders || 0) / maxOrders) * 100}%` }}
                  />
                </div>
                <small>{day.date.slice(8)}</small>
              </div>
            ))}
          </div>
          <div className="admin-chart-legend">
            <span><i className="users" /> Registrations</span>
            <span><i className="orders" /> Orders</span>
          </div>
        </section>

        <section className="admin-analytics-panel">
          <h2>Paid sales value</h2>
          <p>Confirmed paid orders only. Amounts are separated by currency.</p>
          {analytics.paidSales?.length ? (
            <div className="admin-sales-grid">
              {analytics.paidSales.map((sale) => (
                <article className="admin-sales-card" key={sale.currency}>
                  <span>{sale.currency} sales value</span>
                  <strong>{money(sale.salesValue, sale.currency)}</strong>
                  <small>{Number(sale.orders || 0).toLocaleString()} paid orders</small>
                  <small>Recorded commission: {money(sale.platformCommission, sale.currency)}</small>
                </article>
              ))}
            </div>
          ) : <p className="admin-analytics-empty">No confirmed paid orders in this period.</p>}
          <p className="admin-analytics-disclaimer">
            Sales value is the total value of paid orders, not platform revenue. Commission is shown separately.
          </p>
        </section>

        <section className="admin-analytics-panel">
          <h2>Registrations by campaign</h2>
          <p>New registrations during the last 30 days, grouped by recorded first-touch UTM attribution.</p>
          {analytics.acquisition?.registrations?.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Medium</th>
                    <th>Campaign</th>
                    <th>Registrations</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.acquisition.registrations.map((item, index) => (
                    <tr key={`${item.source}-${item.medium || ''}-${item.campaign || ''}-${index}`}>
                      <td>{item.source || '—'}</td>
                      <td>{item.medium || '—'}</td>
                      <td>{item.campaign || '—'}</td>
                      <td>{Number(item.registrations || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-analytics-empty">No attributed registrations recorded during this period.</p>
          )}
        </section>

        <section className="admin-analytics-panel">
          <h2>Paid orders by campaign</h2>
          <p>Confirmed paid orders placed during the last 30 days by buyers with recorded acquisition attribution.</p>
          {analytics.acquisition?.paidSales?.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Medium</th>
                    <th>Campaign</th>
                    <th>Currency</th>
                    <th>Paid orders</th>
                    <th>Unique buyers</th>
                    <th>Sales value</th>
                    <th>Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.acquisition.paidSales.map((item, index) => (
                    <tr key={`${item.source}-${item.medium || ''}-${item.campaign || ''}-${item.currency}-${index}`}>
                      <td>{item.source || '—'}</td>
                      <td>{item.medium || '—'}</td>
                      <td>{item.campaign || '—'}</td>
                      <td>{item.currency || 'RWF'}</td>
                      <td>{Number(item.paidOrders || 0).toLocaleString()}</td>
                      <td>{Number(item.paidBuyers || 0).toLocaleString()}</td>
                      <td>{money(item.salesValue, item.currency || 'RWF')}</td>
                      <td>{money(item.platformCommission, item.currency || 'RWF')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-analytics-empty">No attributed paid orders recorded during this period.</p>
          )}
          <p className="admin-analytics-disclaimer">
            These reports include only users with recorded UTM attribution. Older or untagged users are not assigned to a campaign.
          </p>
        </section>

        <div className="admin-analytics-grid">
          <section className="admin-analytics-panel">
            <h2>Active product categories</h2>
            <p>Current active product listings by category.</p>
            {categories.length ? categories.map((item) => (
              <div className="admin-category-row" key={item.category}>
                <div><span>{item.category}</span><strong>{Number(item.products || 0).toLocaleString()}</strong></div>
                <div className="admin-category-track">
                  <span style={{ width: `${(Number(item.products || 0) / maxCategory) * 100}%` }} />
                </div>
              </div>
            )) : <p className="admin-analytics-empty">No active product categories.</p>}
          </section>

          <section className="admin-analytics-panel">
            <h2>Services and jobs</h2>
            <p>New listings created during the last 30 days.</p>
            {analytics.services?.byType?.length ? analytics.services.byType.map((item) => (
              <div className="admin-metric-row" key={item.type}>
                <span>{item.type || 'Other'}</span>
                <strong>{Number(item.count || 0).toLocaleString()}</strong>
              </div>
            )) : <p className="admin-analytics-empty">No new service listings in this period.</p>}
          </section>
        </div>

        <section className="admin-analytics-panel">
          <h2>Most-viewed active products</h2>
          <p>Ranked by recorded product views.</p>
          {analytics.topViewedProducts?.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Product</th><th>Category</th><th>Views</th><th>Likes</th></tr></thead>
                <tbody>{analytics.topViewedProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.title || 'Untitled'}</td>
                    <td>{product.category || '—'}</td>
                    <td>{Number(product.views || 0).toLocaleString()}</td>
                    <td>{Number(product.likes || 0).toLocaleString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="admin-analytics-empty">No active products found.</p>}
        </section>

        <section className="admin-analytics-panel">
          <h2>NEXUS TV activity</h2>
          <p>Video uploads and recorded views during the last 30 days.</p>
          <div className="admin-tv-metrics">
            <div><strong>{Number(analytics.videos?.uploaded || 0).toLocaleString()}</strong><span>Videos uploaded</span></div>
            <div><strong>{Number(analytics.videos?.recordedViews || 0).toLocaleString()}</strong><span>Recorded video views</span></div>
          </div>
          <p className="admin-analytics-disclaimer">
            Recorded video views are the current view totals for videos uploaded during this period.
          </p>
        </section>
      </div>
    )
  }

  function renderPerformance() {
    if (!performanceData) {
      return <p className="admin-empty">No performance data available yet.</p>
    }

    const server = performanceData.server || {}
    const database = performanceData.database || {}
    const memory = server.memory || {}
    const endpoints = Array.isArray(server.endpoints) ? server.endpoints : []
    const statusCodes = server.statusCodes || {}

    const number = (value) => Number(value || 0).toLocaleString()
    const milliseconds = (value) => `${Number(value || 0).toFixed(2)} ms`

    const uptimeSeconds = Math.max(0, Number(server.uptimeSeconds || 0))
    const days = Math.floor(uptimeSeconds / 86400)
    const hours = Math.floor((uptimeSeconds % 86400) / 3600)
    const minutes = Math.floor((uptimeSeconds % 3600) / 60)
    const uptime = `${days}d ${hours}h ${minutes}m`

    const updatedAt = server.generatedAt
      ? new Date(server.generatedAt).toLocaleString()
      : 'Not available'

    return (
      <div className="admin-performance">
        <section className="admin-performance-health">
          <div>
            <span className="admin-performance-label">SERVER STATUS</span>
            <strong className={server.status === 'running' ? 'admin-performance-healthy' : 'admin-performance-warning'}>
              {server.status || 'Unknown'}
            </strong>
          </div>
          <div>
            <span className="admin-performance-label">DATABASE STATUS</span>
            <strong className={database.connected ? 'admin-performance-healthy' : 'admin-performance-warning'}>
              {database.status || 'Unknown'}
            </strong>
          </div>
          <div>
            <span className="admin-performance-label">MONITORING PERIOD</span>
            <strong>{server.period || 'Since last server restart'}</strong>
          </div>
          <div>
            <span className="admin-performance-label">LAST UPDATED</span>
            <strong>{updatedAt}</strong>
          </div>
        </section>

        <div className="admin-stats-grid">
          <StatCard label="Total requests" value={number(server.requests)} detail="Requests observed by the server monitor" />
          <StatCard label="Client errors" value={number(server.clientErrors)} detail="HTTP 4xx responses" />
          <StatCard label="Server errors" value={number(server.serverErrors)} detail="HTTP 5xx responses" />
          <StatCard label="Slow requests" value={number(server.slowRequests)} detail={`At least ${number(server.slowRequestThresholdMs)} ms`} />
          <StatCard label="Average response" value={milliseconds(server.averageResponseTimeMs)} detail="Across recorded requests" />
          <StatCard label="95th percentile" value={milliseconds(server.p95ResponseTimeMs)} detail="95% of recorded requests were at or below this time" />
          <StatCard label="Maximum response" value={milliseconds(server.maxResponseTimeMs)} detail="Highest recorded response time" />
          <StatCard label="Server uptime" value={uptime} detail="Time since the current server process started" />
        </div>

        <div className="admin-performance-panels">
          <section className="admin-analytics-panel">
            <h2>Server memory usage</h2>
            <p>Memory currently used by the Node.js server process.</p>
            <div className="admin-performance-memory">
              <div>
                <span>Heap used</span>
                <strong>{Number(memory.heapUsedMb || 0).toFixed(2)} MB</strong>
              </div>
              <div>
                <span>Heap allocated</span>
                <strong>{Number(memory.heapTotalMb || 0).toFixed(2)} MB</strong>
              </div>
              <div>
                <span>Total process memory (RSS)</span>
                <strong>{Number(memory.rssMb || 0).toFixed(2)} MB</strong>
              </div>
            </div>
          </section>

          <section className="admin-analytics-panel">
            <h2>HTTP response codes</h2>
            <p>Responses grouped by HTTP status code.</p>
            {Object.keys(statusCodes).length ? (
              <div className="admin-performance-status-codes">
                {Object.entries(statusCodes).sort(([a], [b]) => Number(a) - Number(b)).map(([code, count]) => (
                  <div key={code}>
                    <strong>{code}</strong>
                    <span>{number(count)} responses</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="admin-analytics-empty">No HTTP responses recorded yet.</p>
            )}
          </section>
        </div>

        <section className="admin-analytics-panel">
          <h2>Endpoint performance</h2>
          <p>Request volume, errors, and response times grouped by API endpoint.</p>
          {endpoints.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table admin-performance-table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Endpoint</th>
                    <th>Requests</th>
                    <th>Client errors</th>
                    <th>Server errors</th>
                    <th>Slow requests</th>
                    <th>Average</th>
                    <th>p95</th>
                    <th>Maximum</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((endpoint, index) => (
                    <tr key={`${endpoint.method || 'unknown'}-${endpoint.route || index}-${index}`}>
                      <td><strong>{endpoint.method || '—'}</strong></td>
                      <td className="admin-performance-route">
                        {endpoint.route === 'unmatched' ? 'Route not identified' : endpoint.route || '—'}
                      </td>
                      <td>{number(endpoint.requests)}</td>
                      <td>{number(endpoint.clientErrors)}</td>
                      <td>{number(endpoint.serverErrors)}</td>
                      <td>{number(endpoint.slowRequests)}</td>
                      <td>{milliseconds(endpoint.averageResponseTimeMs)}</td>
                      <td>{milliseconds(endpoint.p95ResponseTimeMs)}</td>
                      <td>{milliseconds(endpoint.maxResponseTimeMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-analytics-empty">No endpoint requests recorded yet. Use the application and refresh this section to collect measurements.</p>
          )}
        </section>

        <p className="admin-performance-note">
          Monitoring data is stored in server memory and resets when the backend restarts.
          These measurements describe observed HTTP requests and process memory; they do not independently measure payment-provider failures, upload-provider health, or mobile-device performance.
        </p>
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
            <StatCard label="Total services" value={overview.services?.total} detail={`${overview.services?.active ?? 0} active`} />
            <StatCard label="Closed services" value={overview.services?.closed} />
            <StatCard label="NEXUS TV videos" value={overview.videos?.total} detail={`${overview.videos?.active ?? 0} active`} />
            <StatCard label="Hidden videos" value={overview.videos?.hidden} />
          </div>
          <div className="admin-overview-note">
            <strong>Platform overview</strong>
            <p>Select Users, Products, Orders, Reviews, or Analytics to explore platform activity and performance.</p>
          </div>
        </>
      )
    }

    if (section === 'analytics') return renderAnalytics()
    if (section === 'performance') return renderPerformance()
    if (!items.length) return <p className="admin-empty">No data available in this section.</p>
    if (section === 'users') return renderUsers()
    if (section === 'products') return renderProducts()
    if (section === 'orders') return renderOrders()
    if (section === 'reviews') return renderReviews()
    if (section === 'services') return renderServices()
    if (section === 'videos') return renderVideos()
    return null
  }

  const currentLabel = sections.find((item) => item.id === section)?.label || 'Overview'

  return (
    <main className="admin-dashboard">
      <header className="admin-header">
        <div>
          <Link className="admin-brand" to="/marketplace">NR Nexus</Link>
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
            <div><span className="admin-eyebrow">NR NEXUS ADMIN</span><h1>{currentLabel}</h1>
              <p>Monitor platform performance and activity.</p></div>
            <button type="button" className="admin-refresh" disabled={loading}
              onClick={() => section === 'overview' ? loadOverview() : section === 'analytics' ? loadAnalytics() : section === 'performance' ? loadPerformance() : loadList(section, page)}>
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
