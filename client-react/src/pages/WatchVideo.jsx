import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api'
import './NexusTV.css'

function WatchVideo() {
  const { id } = useParams()
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadVideo() {
      setLoading(true)
      setError('')
      try {
        const response = await api.get(`/videos/${id}`)
        if (active) setVideo(response.data.video)
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Video could not be found.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadVideo()
    return () => { active = false }
  }, [id])

  const downloadUrl = `${(api.defaults.baseURL || '/api').replace(/\/$/, '')}/videos/${id}/download`

  return (
    <main className="nexus-tv-page">
      <header className="tv-header">
        <Link to="/tv" className="tv-brand">NEXUS TV</Link>
        <nav><Link to="/marketplace">Marketplace</Link><Link to="/tv">All videos</Link></nav>
      </header>
      <section className="tv-watch-content">
        {loading ? <p className="tv-empty">Loading video…</p> : error ? (
          <p className="tv-error">{error}</p>
        ) : video && (
          <>
            <video className="tv-player" src={video.videoUrl} poster={video.thumbnailUrl || undefined} controls autoPlay playsInline />
            <div className="tv-watch-details">
              <span className="tv-card-category">{video.category}</span>
              <h1>{video.title}</h1>
              <p className="tv-watch-owner">
                By {video.owner?.firstName || ''} {video.owner?.lastName || ''}
                {' · '}{video.views || 0} views
              </p>
              {video.description && <p className="tv-description">{video.description}</p>}
              <div className="tv-watch-actions">
                <Link to="/tv">← Back to NEXUS TV</Link>
                {video.allowDownload ? (
                  <a className="tv-download-button" href={downloadUrl}>Download video</a>
                ) : (
                  <span className="tv-download-disabled">Downloads are disabled by the owner</span>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

export default WatchVideo
