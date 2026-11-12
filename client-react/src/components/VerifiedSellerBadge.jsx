import './VerifiedSellerBadge.css'

function VerifiedSellerBadge({ verified, className = '' }) {
  if (verified !== true) return null

  return (
    <span
      className={`verified-seller-badge ${className}`.trim()}
      title="Verified seller"
      aria-label="Verified seller"
    >
      <span className="verified-seller-check" aria-hidden="true">✓</span>
      <span>Verified</span>
    </span>
  )
}

export default VerifiedSellerBadge
