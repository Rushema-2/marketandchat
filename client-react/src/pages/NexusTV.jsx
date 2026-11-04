import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import './NexusTV.css'

const categories = [
  { value: 'all', label: 'All videos' },
  { value: 'movies', label: 'Movies' },
  { value: 'education', label: 'Education' },
  { value: 'music', label: 'Music' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'sports', label: 'Sports' },
  { value: 'news', label: 'News' },
  { value: 'other', label: 'Other' },
]

function NexusTV() {
  const [videos, setVideos] = useState([])
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 })
  const [myVideos, setMyVideos] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploadCategory, setUploadCategory] = useState('entertainment')
  const [allowDownload, setAllowDownload] = useState(false)
  const [videoFile, setVideoFile] = useState(null)
  const [showUpload, setShowUpload] = useState(false)

  async function loadVideos() {
    setLoading(true)
    setError('')
    try {
      const endpoint = myVideos ? '/videos/mine' : '/videos'
      const response = await api.get(endpoint, {
        params: {
          page,
          limit: 12,
          ...(myVideos || category === 'all' ? {} : { category }),
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      })
      setVideos(response.data.videos || [])
      setPagination(response.data.pagination || { totalPages: 1, total: 0 })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load videos. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()
  }, [page, category, myVideos])

  async function handleSearch(event) {
    event.preventDefault()
    setPage(1)
    await loadVideos()
  }

  async function handleUpload(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!localStorage.getItem('token')) {
      setError('Please sign in before uploading a video.')
      return
    }
    if (!videoFile) {
      setError('Please select a video file.')
      return
    }

    const formData = new FormData()
    formData.append('video', videoFile)
    formData.append('title', title)
    formData.append('description', description)
    formData.append('category', uploadCategory)
    formData.append('allowDownload', String(allowDownload))

    setUploading(true)
    try {
      await api.post('/videos', formData, {
        timeout: 0,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMessage('Your video was uploaded successfully.')
      setTitle('')
      setDescription('')
      setVideoFile(null)
      setAllowDownload(false)
      setShowUpload(false)
      setMyVideos(false)
      setCategory('all')
      setSearch('')
      setPage(1)
      await loadVideos()
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Video upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function toggleVideoDownloads(video) {
    setError('')
    setMessage('')

    try {
      const response = await api.put(`/videos/${video._id}`, {
        allowDownload: !video.allowDownload,
      })

      const updatedVideo = response.data.video

      setVideos((current) =>
        current.map((item) =>
          item._id === updatedVideo._id ? updatedVideo : item
        )
      )

      setMessage(
        updatedVideo.allowDownload
          ? 'Downloads are now enabled for this video.'
          : 'Downloads are now disabled for this video.'
      )
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to update download permission.'
      )
    }
  }

  return (
    <main className="nexus-tv-page">
      <header className="tv-header">
        <Link to="/marketplace" className="tv-brand">NR Nexus</Link>
        <nav>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/services">Services</Link>
          <Link to="/messages">Messages</Link>
        </nav>
      </header>

      <section className="tv-hero">
        <p className="tv-eyebrow">WATCH · SHARE · DISCOVER</p>
        <h1>NEXUS TV</h1>
        <p>Discover movies, education, music, documentaries and more.</p>
        <button type="button" onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? 'Close upload form' : '+ Upload a video'}
        </button>
      </section>

      <section className="tv-content">
        {showUpload && (
          <form className="tv-upload-form" onSubmit={handleUpload}>
            <h2>Upload to NEXUS TV</h2>
            <label>
              Video title
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} required />
            </label>
            <label>
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} rows={4} />
            </label>
            <label>
              Category
              <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                {categories.filter((item) => item.value !== 'all').map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label>
              Video file (MP4, MOV, WEBM or AVI; maximum 100 MB)
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                required
              />
            </label>
            <label className="tv-download-check">
              <input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} />
              Allow other people to download this video
            </label>
            <p className="tv-upload-note">Only upload videos you own or have permission to share.</p>
            <button type="submit" disabled={uploading}>
              {uploading ? 'Uploading video…' : 'Publish video'}
            </button>
          </form>
        )}

        {message && <p className="tv-success" role="status">{message}</p>}
        {error && <p className="tv-error" role="alert">{error}</p>}

        <div className="tv-toolbar">
          <div className="tv-tabs">
            <button className={!myVideos ? 'selected' : ''} onClick={() => { setMyVideos(false); setPage(1) }}>Explore</button>
            <button className={myVideos ? 'selected' : ''} onClick={() => { setMyVideos(true); setPage(1) }}>My videos</button>
          </div>
          <form className="tv-search" onSubmit={handleSearch}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search videos..." />
            <button type="submit">Search</button>
          </form>
        </div>

        {!myVideos && (
          <div className="tv-categories">
            {categories.map((item) => (
              <button
                key={item.value}
                className={category === item.value ? 'selected' : ''}
                onClick={() => { setCategory(item.value); setPage(1) }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div className="tv-section-title">
          <h2>{myVideos ? 'My videos' : 'Explore videos'}</h2>
          <span>{pagination.total || 0} videos</span>
        </div>

        {loading ? (
          <p className="tv-empty">Loading videos…</p>
        ) : videos.length === 0 ? (
          <p className="tv-empty">No videos found. Be the first to upload one!</p>
        ) : (
          <div className="tv-grid">
            {videos.map((video) => (
              <article className="tv-card" key={video._id}>
                <Link to={`/tv/${video._id}`} className="tv-card-media">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} />
                  ) : (
                    <video src={video.videoUrl} preload="metadata" muted />
                  )}
                  <span className="tv-play-mark">▶</span>
                </Link>
                <div className="tv-card-info">
                  <span className="tv-card-category">{video.category}</span>
                  <h3><Link to={`/tv/${video._id}`}>{video.title}</Link></h3>
                  <p>{video.owner?.firstName || ''} {video.owner?.lastName || ''}</p>
                  <small>{video.views || 0} views · {new Date(video.createdAt).toLocaleDateString()}</small>
                  {myVideos && (
                    <>
                      <span className={`tv-status ${video.status}`}>{video.status}</span>
                      <p className="tv-download-permission">
                        Downloads: {video.allowDownload ? 'Enabled' : 'Disabled'}
                      </p>
                      <button
                        type="button"
                        className="tv-download-toggle"
                        onClick={() => toggleVideoDownloads(video)}
                      >
                        {video.allowDownload ? 'Disable downloads' : 'Enable downloads'}
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="tv-pagination">
            <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
            <span>Page {page} of {pagination.totalPages}</span>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        )}
      </section>
    </main>
  )
}

export default NexusTV
