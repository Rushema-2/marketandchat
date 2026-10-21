import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import api from '../api'

const API_ORIGIN = (
  import.meta.env.VITE_API_ORIGIN ||
  (window.location.port === '5173'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : 'https://marketandchat.onrender.com')
).replace(/\/$/, '')

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return undefined

    let active = true

    api.get('/notifications/unread-count')
      .then(({ data }) => {
        if (active) setUnreadCount(Number(data.unreadCount) || 0)
      })
      .catch((error) => {
        console.error('Could not load unread notifications:', error)
      })

    const socket = io(API_ORIGIN, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socket.on('newNotification', () => {
      if (active) {
        setUnreadCount((count) => count + 1)
      }
    })

    return () => {
      active = false
      socket.disconnect()
    }
  }, [])

  return (
    <a
      className="notification-nav-link"
      href="/notifications"
      aria-label={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : 'Notifications'
      }
    >
      Notifications
      {unreadCount > 0 && (
        <span className="notification-badge">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </a>
  )
}
