
import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import api from '../api'
import './Workspace.css'

function getId(value) {
  return String(value?._id || value?.id || value || '')
}

function getName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'
}

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return getId(user._id || user.id || user.userId)
  } catch {
    return ''
  }
}

function otherParticipant(conversation, currentUserId) {
  const participants = conversation?.participants || []
  return participants.find((person) => getId(person) !== currentUserId) || participants[0]
}

export default function Messages() {
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const hasToken = Boolean(localStorage.getItem('token'))
  const currentUserId = getCurrentUserId()
  const [onlineUserIds, setOnlineUserIds] = useState([])
  const [typingUserId, setTypingUserId] = useState('')
const typingTimerRef = useRef(null)

  const socketRef = useRef(null)
  const selectedRef = useRef(null)
  const currentUserIdRef = useRef(currentUserId)

  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      return
    }

    const socketOrigin =
      import.meta.env.VITE_API_ORIGIN ||
      `${window.location.protocol}//${window.location.hostname}:3000`

    const socket = io(socketOrigin, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('userTyping', ({ userId, conversationId }) => {
  if (
    String(userId) !== String(currentUserIdRef.current) &&
    String(conversationId) === String(selectedRef.current?._id)
  ) {
    setTypingUserId(String(userId))
  }
})

socket.on('userStoppedTyping', ({ userId, conversationId }) => {
  if (
    String(conversationId) === String(selectedRef.current?._id) &&
    String(userId) === String(otherParticipant(selectedRef.current, currentUserIdRef.current)?._id)
  ) {
    setTypingUserId('')
  }
})

    socket.on('onlineUsers', (userIds) => {
  setOnlineUserIds(userIds.map(String))
})

socket.on('userOnline', ({ userId }) => {
  setOnlineUserIds((previous) =>
    previous.includes(String(userId))
      ? previous
      : [...previous, String(userId)]
  )
})

socket.on('userOffline', ({ userId }) => {
  setOnlineUserIds((previous) =>
    previous.filter((id) => id !== String(userId))
  )
})

    socket.on('connect', () => {
      setError('')
      const conversation = selectedRef.current

      if (conversation?._id) {
        socket.emit('joinConversation', conversation._id)
      }
    })

    socket.on('connect_error', (err) => {
      console.error('Chat connection error:', err.message)
      setError(`Chat connection failed: ${err.message}`)
    })

    socket.on('newMessage', (message) => {
      const conversationId = getId(message.conversation)
      const activeConversation = selectedRef.current

      if (!activeConversation || conversationId !== getId(activeConversation._id)) {
        setConversations((previous) =>
          previous.map((item) =>
            getId(item._id) === conversationId
              ? { ...item, lastMessage: message, updatedAt: message.createdAt }
              : item
          )
        )
        return
      }

      setMessages((previous) => {
        if (previous.some((item) => getId(item._id) === getId(message._id))) {
          return previous
        }

        return [...previous, message]
      })

      setConversations((previous) =>
        previous.map((item) =>
          getId(item._id) === conversationId
            ? { ...item, lastMessage: message, updatedAt: message.createdAt }
            : item
        )
      )
    })

    socket.on('messageError', (data) => {
      setError(data?.message || 'Could not send or receive message.')
      setSending(false)
    })

    api.get('/conversations')
      .then(({ data }) => setConversations(data.conversations || []))
      .catch((err) =>
        setError(err.response?.data?.message || 'Could not load conversations.')
      )
      .finally(() => setLoading(false))

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  async function openConversation(conversation) {
    const previous = selectedRef.current

    if (previous?._id && socketRef.current?.connected) {
      socketRef.current.emit('leaveConversation', previous._id)
    }

    selectedRef.current = conversation
    setSelected(conversation)
    setMessages([])
    setError('')

    if (socketRef.current?.connected) {
      socketRef.current.emit('joinConversation', conversation._id)
    }

    try {
      const { data } = await api.get(
        `/messages/${encodeURIComponent(conversation._id)}`
      )

      if (getId(selectedRef.current?._id) !== getId(conversation._id)) {
        return
      }

      setMessages((previousMessages) => {
        const combined = [...data.messages || [], ...previousMessages]
        return combined.filter(
          (message, index, all) =>
            all.findIndex((item) => getId(item._id) === getId(message._id)) === index
        ).sort(
          (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        )
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load messages.')
    }
  }

  function sendMessage(event) {
    event.preventDefault()

    const messageText = text.trim()
    const socket = socketRef.current

    if (!selected || !messageText || sending) return

    if (!socket?.connected) {
      setError('Chat is not connected. Please wait and try again.')
      return
    }

    setSending(true)
    setError('')

    socket.emit('sendMessage', {
      conversationId: selected._id,
      text: messageText,
    })

    setText('')
    setSending(false)
  }

  if (!hasToken) {
    return (
      <main className="workspace-page">
        <section className="workspace-panel">
          <p className="workspace-error" role="alert">
            Please sign in to use messages.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/marketplace">RwhatsApp</a>
        <nav className="workspace-nav">
          <a href="/marketplace">Marketplace</a>
          <a className="active" href="/messages">Messages</a>
          <a href="/my-orders">My Orders</a>
          <a href="/my-products">My Products</a>
        </nav>
      </header>

      <section className="workspace-content">
        <div className="workspace-title">
          <div>
            <p className="workspace-eyebrow">STAY CONNECTED</p>
            <h1>Messages</h1>
          </div>
        </div>

        {error && <p className="workspace-error" role="alert">{error}</p>}

        <div className="messages-layout">
          <aside className="conversation-list">
            <h2>Conversations</h2>

            {loading && <p className="workspace-muted">Loading conversations...</p>}

            {!loading && conversations.length === 0 && (
              <p className="workspace-muted">
                No conversations yet. Contact a seller from a product page to start chatting.
              </p>
            )}

            {conversations.map((conversation) => {
              const person = otherParticipant(conversation, currentUserId)

              return (
                <button
                  className={`conversation-item ${
                    selected?._id === conversation._id ? 'selected' : ''
                  }`}
                  key={conversation._id}
                  onClick={() => openConversation(conversation)}
                >
                  <span className="conversation-avatar">
                    {getName(person).charAt(0).toUpperCase()}
                  </span>
<span className="conversation-copy">
  <strong>{getName(person)}</strong>
  <small className="presence-status">
    <span
      className={`presence-dot ${
        onlineUserIds.includes(getId(person)) ? 'is-online' : ''
      }`}
    />
    {onlineUserIds.includes(getId(person)) ? 'Online' : 'Offline'}
  </small>
  <small>{conversation.lastMessage?.text || 'Open conversation'}</small>
</span>

                </button>
              )
            })}
          </aside>

          <section className="message-panel">
            {!selected ? (
              <div className="workspace-empty">
                <span>✉</span>
                <h2>Your messages</h2>
                <p>Select a conversation to read and reply.</p>
              </div>
            ) : (
              <>
                <div className="message-panel-heading">
  <div>
    <h2>{getName(otherParticipant(selected, currentUserId))}</h2>
    {typingUserId === getId(otherParticipant(selected, currentUserId)) && (
      <small className="typing-indicator">Typing...</small>
    )}
  </div>
</div>

                <div className="message-list">
                  {messages.length === 0 && (
                    <p className="workspace-muted">No messages in this conversation yet.</p>
                  )}

                  {messages.map((message) => {
                    const senderId = getId(message.sender)
                    const mine = senderId && currentUserId && senderId === currentUserId

                    return (
                      <div
                        className={`message-bubble ${mine ? 'mine' : ''}`}
                        key={message._id}
                      >
                        <p>{message.text}</p>
                        <small>
                          {message.createdAt
                            ? new Date(message.createdAt).toLocaleString()
                            : ''}
                        </small>
                      </div>
                    )
                  })}
                </div>

                <form className="message-compose" onSubmit={sendMessage}>
                  <input
                    value={text}
                   onChange={(event) => {
  const value = event.target.value
  setText(value)

  const socket = socketRef.current
  const conversationId = selectedRef.current?._id

  if (!socket?.connected || !conversationId) return

  if (typingTimerRef.current) {
    clearTimeout(typingTimerRef.current)
  }

  if (value.trim()) {
    socket.emit('typing', { conversationId })

    typingTimerRef.current = setTimeout(() => {
      socket.emit('stopTyping', { conversationId })
      typingTimerRef.current = null
    }, 1200)
  } else {
    socket.emit('stopTyping', { conversationId })
    typingTimerRef.current = null
  }
}}
                    placeholder="Write a message..."
                    aria-label="Write a message"
                    maxLength={5000}
                    required
                  />
                  <button type="submit" disabled={sending || !text.trim()}>
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}

