import { useEffect, useRef, useState } from 'react'
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

function NRChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
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
        },
        body: JSON.stringify({
          message: cleanMessage,
          history,
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
              Hello! 👋 I am NR AI. I can help you use RWh​​atsApp and find what you need.
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
                {item.text}
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
