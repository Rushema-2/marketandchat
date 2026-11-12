import { useEffect, useState } from 'react'
import api from '../api'
import './Referrals.css'

function formatRwf(value) {
  return `${new Intl.NumberFormat('en-RW', {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)} RWF`
}

function formatDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function referredMemberName(user) {
  if (!user) return 'Member'

  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.email ||
    'Member'
  )
}

export default function Referrals() {
  const [referralData, setReferralData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true

    async function loadReferrals() {
      try {
        const { data } = await api.get('/referrals/me')
        if (active) setReferralData(data)
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
            'Could not load your referral information. Please try again.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadReferrals()

    return () => {
      active = false
    }
  }, [])

  const referralCode = referralData?.referralCode || ''

  const inviteUrl = referralCode
    ? `https://marketandchat.vercel.app/?ref=${encodeURIComponent(referralCode)}`
    : ''

  const shareText =
    'Join me on NR Nexus! Sign up using my personal invitation link and discover our marketplace, services and community.'

  const encodedUrl = encodeURIComponent(inviteUrl)
  const encodedText = encodeURIComponent(shareText)

  const [shareOpen, setShareOpen] = useState(false)

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const temporaryInput = document.createElement('textarea')
        temporaryInput.value = text
        temporaryInput.style.position = 'fixed'
        temporaryInput.style.opacity = '0'
        document.body.appendChild(temporaryInput)
        temporaryInput.select()

        const copied = document.execCommand('copy')
        temporaryInput.remove()

        if (!copied) throw new Error('Copy failed')
      }

      setError('')
      setNotice('Invitation copied successfully. You can now share it.')
      return true
    } catch {
      setError('Copy failed. Select the invitation link and copy it manually.')
      return false
    }
  }

  async function copyInvitation() {
    if (!inviteUrl) return
    await copyText(inviteUrl)
  }

  function shareInvitation() {
    if (!inviteUrl) return
    setError('')
    setNotice('')
    setShareOpen(current => !current)
  }

  async function shareOnTikTok() {
    if (!inviteUrl) return

    const copied = await copyText(`${shareText}\n${inviteUrl}`)
    window.open('https://www.tiktok.com/', '_blank', 'noopener,noreferrer')

    if (copied) {
      setNotice('Invitation copied. Paste it into your TikTok content.')
    }
  }


  return (
    <main className="referrals-page">
      <header className="referrals-header">
        <a className="referrals-brand" href="/marketplace">
          <span className="referrals-logo">R</span>
          <span>
            <strong>NR Nexus</strong>
            <small>Chat. Share. Trade together.</small>
          </span>
        </a>

        <nav className="referrals-nav" aria-label="Main navigation">
          <a href="/marketplace">Marketplace</a>
          <a href="/services">Services</a>
          <a href="/messages">Messages</a>
          <a href="/my-orders">My Orders</a>
          <a className="active" href="/referrals">Referrals &amp; Rewards</a>
        </nav>
      </header>

      <section className="referrals-content">
        <div className="referrals-heading">
          <p className="referrals-eyebrow">INVITE FRIENDS · GROW TOGETHER</p>
          <h1>Referrals &amp; Rewards</h1>
          <p>
            Invite people to join NR Nexus. When a referred member completes
            their first successfully paid order and confirms delivery, you earn
            a referral reward.
          </p>
        </div>

        {error && <p className="referrals-error" role="alert">{error}</p>}
        {notice && <p className="referrals-notice" role="status">{notice}</p>}

        {loading ? (
          <div className="referrals-panel referrals-loading">
            Loading your referral information...
          </div>
        ) : referralData ? (
          <>
            <section className="referrals-panel invite-panel">
              <div>
                <p className="referrals-card-label">YOUR REFERRAL CODE</p>
                <div className="referral-code">{referralCode}</div>
                <p className="referrals-muted">
                  Share this code or your invitation link with new members.
                </p>
              </div>

              <div className="invite-link-group">
                <label htmlFor="referral-invite-link">Your invitation link</label>
                <input
                  id="referral-invite-link"
                  type="text"
                  value={inviteUrl}
                  readOnly
                  onFocus={(event) => event.target.select()}
                />
                <div className="referral-actions">
                  <button type="button" onClick={copyInvitation}>
                    Copy invitation link
                  </button>
                  <button
                    type="button"
                    className="referral-share-button"
                    onClick={shareInvitation}
                  >
                    Share
                  </button>
                </div>
              </div>
            </section>

            <div className="referral-stats">


            {shareOpen && (
              <section
                className="referral-share-panel"
                id="referral-share-panel"
              >
                <h3>Share NR Nexus with friends</h3>
                <p>Choose where you want to share your invitation.</p>

                <div className="referral-social-grid">
                  <a
                    className="referral-social-link whatsapp"
                    href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${inviteUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>W</span> WhatsApp
                  </a>

                  <a
                    className="referral-social-link facebook"
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>f</span> Facebook
                  </a>

                  <a
                    className="referral-social-link telegram"
                    href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>➤</span> Telegram
                  </a>

                  <a
                    className="referral-social-link x-social"
                    href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>𝕏</span> X
                  </a>

                  <button
                    type="button"
                    className="referral-social-link tiktok"
                    onClick={shareOnTikTok}
                  >
                    <span>♪</span> TikTok
                  </button>

                  <a
                    className="referral-social-link email-share"
                    href={`mailto:?subject=${encodeURIComponent('Join NR Nexus')}&body=${encodeURIComponent(`${shareText}\n${inviteUrl}`)}`}
                  >
                    <span>✉</span> Email
                  </a>
                </div>

                <button
  type="button"
  className="referral-share-button"
  onClick={shareInvitation}
  aria-expanded={shareOpen}
  aria-controls="referral-share-panel"
>
  {shareOpen ? 'Close sharing options' : 'Share'}
</button>
              </section>
            )}

              <article className="referrals-panel referral-stat">
                <span>Reward per successful referral</span>
                <strong>{formatRwf(referralData.rewardPerReferral)}</strong>
              </article>
              <article className="referrals-panel referral-stat">
                <span>Successful referrals</span>
                <strong>{referralData.successfulReferrals || 0}</strong>
              </article>
              <article className="referrals-panel referral-stat">
                <span>Total rewards earned</span>
                <strong>{formatRwf(referralData.totalEarned)}</strong>
              </article>
            </div>

            <section className="referrals-panel referral-history">
              <div className="referral-history-heading">
                <div>
                  <p className="referrals-card-label">YOUR INVITATIONS</p>
                  <h2>Reward history</h2>
                </div>
                <span>{referralData.rewards?.length || 0} earned</span>
              </div>

              {!referralData.rewards?.length ? (
                <div className="referrals-empty">
                  <span aria-hidden="true">♧</span>
                  <h3>No rewards yet</h3>
                  <p>
                    Share your invitation link. Your reward will appear here
                    after a referred member completes their first paid order
                    and confirms delivery.
                  </p>
                </div>
              ) : (
                <div className="referral-history-list">
                  {referralData.rewards.map((reward) => (
                    <article className="referral-history-item" key={reward._id}>
                      <div className="referral-member-icon" aria-hidden="true">
                        {(reward.referredUser?.firstName || 'M').charAt(0).toUpperCase()}
                      </div>
                      <div className="referral-member-details">
                        <strong>{referredMemberName(reward.referredUser)}</strong>
                        <span>Successful referral</span>
                        <time dateTime={reward.createdAt}>
                          {formatDate(reward.createdAt)}
                        </time>
                      </div>
                      <strong className="referral-earned-amount">
                        +{formatRwf(reward.amount)}
                      </strong>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="referrals-rules">
              <h2>How referral rewards work</h2>
              <ol>
                <li>Share your personal referral code or invitation link.</li>
                <li>A new member registers using your referral code.</li>
                <li>That member completes their first successfully paid order.</li>
                <li>They confirm that the order has been delivered.</li>
                <li>You earn {formatRwf(referralData.rewardPerReferral)}.</li>
              </ol>
              <p>
                Only the inviter receives this referral reward. Rewards shown
                here are recorded earnings; cash withdrawals and mobile-money
                payouts are not currently provided by this page.
              </p>
            </section>
          </>
        ) : (
          <div className="referrals-panel referrals-empty">
            Your referral information is not available right now.
          </div>
        )}

        <a className="referrals-back-link" href="/marketplace">
          ← Back to Marketplace
        </a>
      </section>
    </main>
  )
}
