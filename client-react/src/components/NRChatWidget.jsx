import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import './NRChatWidget.css'

const API_ORIGIN = (
  import.meta.env.VITE_API_ORIGIN ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://marketandchat.onrender.com')
).replace(/\/$/, '')

const quickQuestions = [
  'How do I find products?',
  'Where can I view my orders?',
  'How does NEXUS TV work?',
  'Where can I find services and jobs?',
]


function getNRPageContext(pathname) {
  const path = pathname.toLowerCase()

  if (path.startsWith('/product/')) return { page: 'product_detail' }
  if (path.startsWith('/tv/')) return { page: 'video_detail' }
  if (path === '/marketplace') return { page: 'marketplace' }
  if (path === '/services') return { page: 'services' }
  if (path === '/messages') return { page: 'messages' }
  if (path === '/my-orders') return { page: 'my_orders' }
  if (path === '/my-products') return { page: 'my_products' }
  if (path === '/favorites') return { page: 'favorites' }
  if (path === '/tv') return { page: 'nexus_tv' }
  if (path.startsWith('/store/')) return { page: 'seller_store' }
  if (path === '/seller-dashboard') return { page: 'seller_dashboard' }
  if (path === '/referrals') return { page: 'referrals' }
  if (path === '/notifications') return { page: 'notifications' }
  if (path === '/admin') return { page: 'admin' }
  if (path === '/login' || path === '/') return { page: 'login' }

  return { page: 'other' }
}

function NRChatWidget() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text = message) {
    const cleanMessage = text.trim()

    if (!cleanMessage || loading) return

    const now = Date.now()

    const history = messages
      .slice(-8)
      .map((item) => ({
        role: item.sender === 'user' ? 'user' : 'assistant',
        content: item.text,
      }))

    setMessages((current) => [
      ...current,
      {
        id: `${now}-user`,
        sender: 'user',
        text: cleanMessage,
      },
    ])

    setMessage('')
    setLoading(true)

    try {
      const response = await fetch(`${API_ORIGIN}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token')
            ? { Authorization: `Bearer ${localStorage.getItem('token')}` }
            : {}),
        },
        body: JSON.stringify({
          message: cleanMessage,
          history,
          pageContext: getNRPageContext(location.pathname),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'NR AI is temporarily unavailable. Please try again.')
      }

      if (!data.reply) {
        throw new Error('NR AI did not return a response. Please try again.')
      }

      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          sender: 'assistant',
          text: data.reply,
          actionConfirmation: data.actionConfirmation || null,
        },
      ])
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-error`,
          sender: 'assistant',
          text: error.message || 'An error occurred. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function confirmNotificationAction(item) {
    if (
      item.actionConfirmation?.type !== 'mark_all_notifications_read' ||
      actionLoadingId
    ) {
      return
    }

    const token = localStorage.getItem('token')

    if (!token) {
      setMessages((current) => [
        ...current.map((messageItem) =>
          messageItem.id === item.id
            ? { ...messageItem, actionConfirmation: null }
            : messageItem
        ),
        {
          id: `${Date.now()}-sign-in`,
          sender: 'assistant',
          text: 'Please sign in to your NR Nexus account before confirming this action. No notifications were changed.',
        },
      ])
      return
    }

    setActionLoadingId(item.id)

    try {
      const response = await fetch(`${API_ORIGIN}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || 'The notification update failed. Please try again.'
        )
      }

      const updatedCount = Number(data.modifiedCount) || 0
      const successMessage = updatedCount > 0
        ? `Success. ${updatedCount} notification${updatedCount === 1 ? '' : 's'} have been marked as read.`
        : 'There were no unread notifications left to mark as read.'

      setMessages((current) => [
        ...current.map((messageItem) =>
          messageItem.id === item.id
            ? { ...messageItem, actionConfirmation: null }
            : messageItem
        ),
        {
          id: `${Date.now()}-action-success`,
          sender: 'assistant',
          text: successMessage,
        },
      ])
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-action-error`,
          sender: 'assistant',
          text: error.message || 'The action could not be completed. Please try again.',
        },
      ])
    } finally {
      setActionLoadingId(null)
    }
  }

  function cancelNotificationAction(item) {
    if (actionLoadingId || !item.actionConfirmation) return

    setMessages((current) => [
      ...current.map((messageItem) =>
        messageItem.id === item.id
          ? { ...messageItem, actionConfirmation: null }
          : messageItem
      ),
      {
        id: `${Date.now()}-action-cancelled`,
        sender: 'assistant',
        text: 'Cancelled. No notifications were changed.',
      },
    ])
  }

  function handleSubmit(event) {
    event.preventDefault()
    sendMessage()
  }

  return (
    <div className="nr-ai-widget">
      {isOpen && (
        <section className="nr-ai-panel" aria-label="NR AI chat">
          <header className="nr-ai-header">
            <div className="nr-ai-avatar">
              <span>NR</span>
              <small>AI</small>
            </div>

            <div className="nr-ai-heading">
              <h2>NR AI</h2>
              <p>
                <span className="nr-ai-online-dot" />
                Your Smart Assistant
              </p>
            </div>

            <button
              className="nr-ai-close"
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close NR AI"
            >
              ×
            </button>
          </header>

          <div className="nr-ai-messages">
            <div className="nr-ai-message nr-ai-bot-message">
              Hello! 👋 I am NR AI. I can help you use RWhatsApp and find what you need.
              <br />
              <strong>You can ask me about:</strong>
            </div>

            {messages.length === 0 && (
              <div className="nr-ai-quick-questions">
                {quickQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    disabled={loading}
                    onClick={() => sendMessage(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

            {messages.map((item) => (
              <div
                key={item.id}
                className={`nr-ai-message ${
                  item.sender === 'user'
                    ? 'nr-ai-user-message'
                    : 'nr-ai-bot-message'
                }`}
              >
                <div>{item.text}</div>

                {item.actionConfirmation?.type === 'mark_all_notifications_read' && (
                  <div className="nr-ai-action-confirmation">
                    <button
                      type="button"
                      disabled={actionLoadingId !== null}
                      onClick={() => confirmNotificationAction(item)}
                    >
                      {actionLoadingId === item.id ? 'Working...' : 'Confirm'}
                    </button>

                    <button
                      type="button"
                      className="nr-ai-action-cancel"
                      disabled={actionLoadingId !== null}
                      onClick={() => cancelNotificationAction(item)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="nr-ai-message nr-ai-bot-message nr-ai-thinking">
                NR AI is thinking...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="nr-ai-input-area" onSubmit={handleSubmit}>
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type your question..."
              aria-label="Type a message to NR AI"
              disabled={loading}
            />

            <button
              type="submit"
              disabled={!message.trim() || loading}
              aria-label="Send message"
            >
              {loading ? '…' : '➤'}
            </button>
          </form>

          <p className="nr-ai-demo-note">
            NR AI · Powered by Artificial Intelligence
          </p>
        </section>
      )}

      <button
        className={`nr-ai-launcher ${isOpen ? 'nr-ai-launcher-open' : ''}`}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Close NR AI' : 'Open NR AI'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          '×'
        ) : (
          <>
            <span className="nr-ai-launcher-mark">NR</span>
            <small>AI</small>
          </>
        )}
      </button>
    </div>
  )
}

export default NRChatWidget
