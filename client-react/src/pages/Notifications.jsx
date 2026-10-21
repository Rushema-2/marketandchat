import { useCallback, useEffect, useState } from 'react'
import api from '../api'
import './Notifications.css'

function senderName(notification) {
  const sender = notification.sender

  if (!sender) return 'RwhatsApp'

  return (
    [sender.firstName, sender.lastName].filter(Boolean).join(' ').trim() ||
    sender.email ||
    'RwhatsApp'
  )
}

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { data } = await api.get('/notifications')
      setNotifications(data.notifications || [])
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not load notifications. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const unreadCount = notifications.filter((item) => !item.read).length

  async function markAsRead(id) {
    setBusy(id)
    setError('')
    setSuccess('')

    try {
      await api.patch(`/notifications/${encodeURIComponent(id)}/read`)
      setNotifications((previous) =>
        previous.map((item) =>
          item._id === id ? { ...item, read: true } : item
        )
      )
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not mark this notification as read.'
      )
    } finally {
      setBusy('')
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0) return

    setBusy('all')
    setError('')
    setSuccess('')

    try {
      await api.patch('/notifications/read-all')
      setNotifications((previous) =>
        previous.map((item) => ({ ...item, read: true }))
      )
      setSuccess('All notifications marked as read.')
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not mark notifications as read.'
      )
    } finally {
      setBusy('')
    }
  }

  return (
    <main className="notifications-page">
      <header className="notifications-header">
        <a className="notifications-brand" href="/marketplace">
          <span className="notifications-logo">R</span>
          <span>
            <strong>RwhatsApp</strong>
            <small>Chat. Share. Trade together.</small>
          </span>
        </a>

        <nav className="notifications-nav" aria-label="Main navigation">
          <a href="/marketplace">Marketplace</a>
          <a href="/messages">Messages</a>
          <a className="active" href="/notifications">Notifications</a>
        </nav>
      </header>

      <section className="notifications-content">
        <div className="notifications-title-row">
          <div>
            <p className="notifications-eyebrow">YOUR ACTIVITY</p>
            <h1>Notifications</h1>
            <p className="notifications-subtitle">
              {unreadCount
                ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}.`
                : 'You are all caught up.'}
            </p>
          </div>

          <button
            className="mark-all-button"
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || Boolean(busy)}
          >
            {busy === 'all' ? 'Saving...' : 'Mark all as read'}
          </button>
        </div>

        {error && <p className="notifications-error" role="alert">{error}</p>}
        {success && <p className="notifications-success" role="status">{success}</p>}

        {loading ? (
          <div className="notifications-empty">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">
            <span aria-hidden="true">♧</span>
            <h2>No notifications yet</h2>
            <p>New messages and activity will appear here.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <article
                className={`notification-item${notification.read ? '' : ' unread'}`}
                key={notification._id}
              >
                <span className="notification-type-icon" aria-hidden="true">
                  {notification.type === 'message'
                    ? '✉'
                    : notification.type === 'follow'
                      ? '＋'
                      : notification.type === 'product_like'
                        ? '♥'
                        : '◉'}
                </span>

                <div className="notification-details">
                  <p className="notification-message">
                    {notification.type === 'message' && (
                      <strong>{senderName(notification)}: </strong>
                    )}
                    {notification.message}
                  </p>
                  <time dateTime={notification.createdAt}>
                    {formatDate(notification.createdAt)}
                  </time>
                </div>

                {!notification.read && (
                  <button
                    className="mark-read-button"
                    type="button"
                    onClick={() => markAsRead(notification._id)}
                    disabled={Boolean(busy)}
                  >
                    {busy === notification._id ? 'Saving...' : 'Mark read'}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}

        <a className="back-to-marketplace" href="/marketplace">
          ← Back to Marketplace
        </a>
      </section>
    </main>
  )
}
