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

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function uploadCloudinaryChunk({ url, formData, start, end, total, uploadId, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.open('POST', url)
    xhr.setRequestHeader('X-Unique-Upload-Id', uploadId)
    xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${total}`)

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded)
      }
    })

    xhr.onload = () => {
      let response

      try {
        response = JSON.parse(xhr.responseText)
      } catch {
        reject(new Error('Cloudinary returned an unreadable upload response.'))
        return
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(
          response.error?.message ||
          `Cloudinary upload failed (HTTP ${xhr.status}).`
        ))
        return
      }

      resolve(response)
    }

    xhr.onerror = () => reject(new Error(
      'Network error while uploading to Cloudinary. Check your connection and try again.'
    ))

    xhr.onabort = () => reject(new Error('The video upload was cancelled.'))

    xhr.send(formData)
  })
}

function NexusTV() {
  const [videos, setVideos] = useState([])
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 })
  const [myVideos, setMyVideos] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
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
    setUploadProgress(0)

    if (!localStorage.getItem('token')) {
      setError('Please sign in before uploading a video.')
      return
    }

    if (!videoFile) {
      setError('Please select a video file.')
      return
    }

    if (!title.trim()) {
      setError('Please enter a video title.')
      return
    }

    setUploading(true)

    try {
      // Request a short-lived signature for this user's Cloudinary folder.
      const signatureResponse = await api.post('/videos/upload/sign')
      const upload = signatureResponse.data.upload

      if (!upload?.cloudName || !upload?.apiKey || !upload?.signature) {
        throw new Error('The server returned incomplete upload credentials.')
      }

      if (videoFile.size <= 0 || videoFile.size > upload.maxVideoBytes) {
        throw new Error(
          `This file is ${formatFileSize(videoFile.size)}. The current upload limit is ${formatFileSize(upload.maxVideoBytes)}.`
        )
      }

      const chunkSize = Number(upload.chunkSize)

      if (!Number.isSafeInteger(chunkSize) || chunkSize < 5 * 1024 * 1024) {
        throw new Error('The server returned an invalid upload chunk size.')
      }

      const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(upload.cloudName)}/video/upload`
      const totalChunks = Math.ceil(videoFile.size / chunkSize)
      let completedBytes = 0
      let finalCloudinaryResponse = null

      for (let index = 0; index < totalChunks; index += 1) {
        const start = index * chunkSize
        const end = Math.min(start + chunkSize, videoFile.size)
        const chunk = videoFile.slice(start, end)

        const formData = new FormData()
        formData.append('file', chunk, videoFile.name)
        formData.append('api_key', upload.apiKey)
        formData.append('timestamp', String(upload.timestamp))
        formData.append('public_id', upload.publicId)
        formData.append('signature', upload.signature)

        setMessage(`Uploading video: chunk ${index + 1} of ${totalChunks}…`)

        const cloudinaryResponse = await uploadCloudinaryChunk({
          url: uploadUrl,
          formData,
          start,
          end,
          total: videoFile.size,
          uploadId: upload.uploadId,
          onProgress: (loaded) => {
            const overallProgress = Math.min(
              99,
              Math.round(((completedBytes + loaded) / videoFile.size) * 100)
            )
            setUploadProgress(overallProgress)
          },
        })

        completedBytes += chunk.size
        finalCloudinaryResponse = cloudinaryResponse
        setUploadProgress(Math.min(
          99,
          Math.round((completedBytes / videoFile.size) * 100)
        ))
      }

      if (
        finalCloudinaryResponse?.public_id !== upload.publicId ||
        finalCloudinaryResponse?.resource_type !== 'video' ||
        !finalCloudinaryResponse?.secure_url ||
        Number(finalCloudinaryResponse?.bytes) !== videoFile.size
      ) {
        throw new Error('Cloudinary could not confirm that the complete video was uploaded.')
      }

      setMessage('Upload complete. Publishing your video…')

      await api.post('/videos/upload/finalize', {
        publicId: upload.publicId,
        expectedBytes: videoFile.size,
        title: title.trim(),
        description,
        category: uploadCategory,
        allowDownload,
      })

      setUploadProgress(100)
      setMessage('Your video was uploaded and published successfully.')
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
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Video upload failed.'
      )
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
              Video file (MP4, MOV, WEBM or AVI; large videos upload in chunks)
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                required
              />
            </label>
            {videoFile && (
              <p className="tv-selected-file">
                Selected: {videoFile.name} ({formatFileSize(videoFile.size)})
              </p>
            )}
            {uploading && (
              <div className="tv-upload-progress" aria-live="polite">
                <div className="tv-upload-progress-heading">
                  <span>Upload progress</span>
                  <strong>{uploadProgress}%</strong>
                </div>
                <progress value={uploadProgress} max="100">
                  {uploadProgress}%
                </progress>
              </div>
            )}
            <label className="tv-download-check">
              <input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} />
              Allow other people to download this video
            </label>
            <p className="tv-upload-note">Only upload videos you own or have permission to share.</p>
            <button type="submit" disabled={uploading}>
              {uploading ? `Uploading video… ${uploadProgress}%` : 'Publish video'}
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
