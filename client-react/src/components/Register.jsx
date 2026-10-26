import { useState } from 'react'
import { registerUser } from '../services/authService'

export default function Register({ onLogin }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)

    try {
      await registerUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      })

      setMessage('Account created successfully! You can now sign in.')
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
      })
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Registration failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <header className="brand">
        <img src="/nr-nexus-logo.png" alt="NR Nexus logo" style={{ width: 58, height: 58, objectFit: "contain" }} />
        <div>
          <h1>NR Nexus</h1>
          <p>Chat. Share. Trade together.</p>
        </div>
      </header>

      <section className="login-card">
        <div className="card-heading">
          <h2>Create an account</h2>
          <p>Enter your details to get started with NR Nexus.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="firstName">First name</label>
          <input id="firstName" name="firstName" autoComplete="given-name"
            value={form.firstName} onChange={handleChange} required />

          <label htmlFor="lastName">Last name</label>
          <input id="lastName" name="lastName" autoComplete="family-name"
            value={form.lastName} onChange={handleChange} required />

          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email"
            value={form.email} onChange={handleChange} required />

          <label htmlFor="phone">Phone number</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel"
            value={form.phone} onChange={handleChange} required />

          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password"
            autoComplete="new-password" value={form.password}
            onChange={handleChange} required minLength={6} />

          <label htmlFor="confirmPassword">confirmPassword</label>
          <input id="confirmPassword" name="confirmPassword" type="password"
            autoComplete="new-password" value={form.confirmPassword}
            onChange={handleChange} required minLength={6} />

          {error && <p className="error-message" role="alert">{error}</p>}
          {message && <p className="success-message" role="status">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="register-prompt">
          Already have an account?{' '}
          <button className="text-button" type="button" onClick={onLogin}>
            Sign in
          </button>
        </p>
      </section>

      <footer className="login-footer">
        © {new Date().getFullYear()} NR Nexus
      </footer>
    </main>
  )
}
