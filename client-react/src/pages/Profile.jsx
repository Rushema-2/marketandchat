import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import './Profile.css'

const emptyProfile = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
}

export default function Profile() {
  const [profile, setProfile] = useState(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      if (!localStorage.getItem('token')) {
        window.location.href = '/'
        return
      }

      try {
        const { data } = await api.get('/users/profile')
        if (!cancelled) {
          setProfile({
            firstName: data.user?.firstName || '',
            lastName: data.user?.lastName || '',
            email: data.user?.email || '',
            phone: data.user?.phone || '',
          })
        }
      } catch (err) {
        if (!cancelled) {
          if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/'
            return
          }
          setError(err.response?.data?.message || 'Could not load your profile.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfile()
    return () => {
      cancelled = true
    }
  }, [])

  function changeField(event) {
    const { name, value } = event.target
    setProfile((previous) => ({ ...previous, [name]: value }))
    setError('')
    setNotice('')
  }

  async function saveProfile(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const { data } = await api.put('/users/profile', profile)
      const updated = {
        firstName: data.user?.firstName || profile.firstName,
        lastName: data.user?.lastName || profile.lastName,
        email: data.user?.email || profile.email,
        phone: data.user?.phone || profile.phone,
      }

      setProfile(updated)

      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          localStorage.setItem('user', JSON.stringify({
            ...parsedUser,
            ...updated,
          }))
        } catch {
          // The profile update succeeded; an outdated local user cache is non-critical.
        }
      }

      setNotice(data.message || 'Profile updated successfully.')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="profile-page">
      <header className="profile-header">
        <Link className="profile-brand" to="/marketplace">
          <img src="/nr-nexus-logo.png" alt="NR Nexus logo" />
          <span>
            <strong>NR Nexus</strong>
            <small>Chat. Share. Trade together.</small>
          </span>
        </Link>

        <nav className="profile-nav" aria-label="Profile navigation">
          <Link to="/marketplace">Marketplace</Link>
          <Link className="profile-nav-active" to="/profile">My Profile</Link>
        </nav>
      </header>

      <section className="profile-content">
        <div className="profile-heading">
          <p className="profile-eyebrow">YOUR ACCOUNT</p>
          <h1>My Profile</h1>
          <p>View and update your personal account information.</p>
        </div>

        <section className="profile-card">
          <div className="profile-card-heading">
            <div className="profile-brand-mark">
              <img src="/nr-nexus-logo.png" alt="" />
            </div>
            <div>
              <h2>Personal information</h2>
              <p>Keep your contact details up to date.</p>
            </div>
          </div>

          {loading ? (
            <p className="profile-message">Loading your profile...</p>
          ) : (
            <>
              {error && <p className="profile-error" role="alert">{error}</p>}
              {notice && <p className="profile-success" role="status">{notice}</p>}

              <form className="profile-form" onSubmit={saveProfile}>
                <div className="profile-form-grid">
                  <label>
                    First name
                    <input
                      name="firstName"
                      value={profile.firstName}
                      onChange={changeField}
                      autoComplete="given-name"
                      maxLength={80}
                      required
                    />
                  </label>

                  <label>
                    Last name
                    <input
                      name="lastName"
                      value={profile.lastName}
                      onChange={changeField}
                      autoComplete="family-name"
                      maxLength={80}
                      required
                    />
                  </label>

                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      value={profile.email}
                      onChange={changeField}
                      autoComplete="email"
                      required
                    />
                  </label>

                  <label>
                    Phone number
                    <input
                      name="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={changeField}
                      autoComplete="tel"
                      required
                    />
                  </label>
                </div>

                <div className="profile-form-actions">
                  <Link className="profile-back-button" to="/marketplace">
                    Back to Marketplace
                  </Link>
                  <button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </section>
    </main>
  )
}
