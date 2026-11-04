import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import './Services.css'

const tabs = [
  { value: 'all', label: 'All listings' },
  { value: 'job', label: 'Find a job' },
  { value: 'service', label: 'Find services' },
  { value: 'professional', label: 'Professionals' },
  { value: 'mine', label: 'My listings' },
]

const categories = [
  'Construction',
  'Carpentry',
  'Plumbing',
  'Electricity',
  'Technology',
  'Tailoring',
  'Beauty',
  'Mechanics',
  'Transport',
  'Cleaning',
  'Home care',
  'Agriculture',
  'Education',
  'Cooking',
  'Other',
]

const emptyForm = {
  type: 'service',
  title: '',
  description: '',
  category: '',
  location: '',
  phone: '',
  price: '',
  salary: '',
  experience: '',
  skills: '',
}

function Services() {
  const [activeTab, setActiveTab] = useState('all')
  const [services, setServices] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 9, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [notice, setNotice] = useState('')
  const [currentImages, setCurrentImages] = useState([])
  const [selectedImages, setSelectedImages] = useState([])
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)

  const loadServices = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = { page: currentPage, limit: 9 }

      if (activeTab !== 'all' && activeTab !== 'mine') {
        params.type = activeTab
      }

      if (activeTab === 'mine') {
        const response = await api.get('/services/mine', {
          params: { page: currentPage, limit: 9 },
        })
        const pageInfo = response.data.pagination || { total: 0, page: currentPage, limit: 9, totalPages: 0 }
        setPagination(pageInfo)
        if (pageInfo.totalPages > 0 && currentPage > pageInfo.totalPages) {
          setCurrentPage(pageInfo.totalPages)
          return
        }
        if (pageInfo.totalPages === 0 && currentPage !== 1) {
          setCurrentPage(1)
          return
        }
        setServices(response.data.services || [])
        return
      }

      if (search.trim()) params.search = search.trim()
      if (location.trim()) params.location = location.trim()
      if (category) params.category = category

      const response = await api.get('/services', { params })
      const pageInfo = response.data.pagination || { total: 0, page: currentPage, limit: 9, totalPages: 0 }
      setPagination(pageInfo)
      if (pageInfo.totalPages > 0 && currentPage > pageInfo.totalPages) {
        setCurrentPage(pageInfo.totalPages)
        return
      }
      if (pageInfo.totalPages === 0 && currentPage !== 1) {
        setCurrentPage(1)
        return
      }
      setServices(response.data.services || [])
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not load listings. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [activeTab, search, location, category, currentPage])

  useEffect(() => {
    loadServices()
  }, [loadServices])

  function updateForm(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleImageSelection(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    if (!files.length) return

    const remaining = 6 - currentImages.length - selectedImages.length

    if (remaining <= 0) {
      setError('This listing already has the maximum of 6 photos.')
      return
    }

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not an image.`)
        return false
      }

      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is larger than the 10 MB limit.`)
        return false
      }

      return true
    })

    if (validFiles.length > remaining) {
      setError(`You can add only ${remaining} more photo(s). Maximum is 6.`)
    } else {
      setError('')
    }

    const acceptedFiles = validFiles.slice(0, remaining)

    const previews = await Promise.all(
      acceptedFiles.map((file) => new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve({ file, preview: reader.result })
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(file)
      }))
    )

    setSelectedImages((current) => [
      ...current,
      ...previews.filter(Boolean),
    ])
  }

  function removeSelectedImage(index) {
    setSelectedImages((current) =>
      current.filter((_, imageIndex) => imageIndex !== index)
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')

    const isEditing = Boolean(editingId)
    const successMessage = isEditing
      ? 'Your listing has been updated successfully.'
      : 'Your listing has been published successfully.'

    try {
      const payload = {
        ...form,
        price: form.price === '' ? null : Number(form.price),
        salary: form.salary === '' ? null : Number(form.salary),
        skills: form.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
      }

      let serviceId = editingId

      if (isEditing) {
        const response = await api.put(`/services/${editingId}`, payload)
        serviceId = response.data.service?._id || editingId
      } else {
        const response = await api.post('/services', payload)
        serviceId = response.data.service?._id
      }

      let finalNotice = successMessage

      if (selectedImages.length > 0) {
        try {
          const imageData = new FormData()

          selectedImages.forEach(({ file }) => {
            imageData.append('images', file)
          })

          await api.post(`/services/${serviceId}/images`, imageData)
        } catch (imageError) {
          finalNotice += ` Photos could not be uploaded: ${
            imageError.response?.data?.message || imageError.message
          }. You can edit this listing and try again.`
        }
      }

      setNotice(finalNotice)
      setForm(emptyForm)
      setEditingId(null)
      setCurrentImages([])
      setSelectedImages([])
      setShowForm(false)
      setActiveTab('mine')
      setCurrentPage(1)

      try {
        const mineResponse = await api.get('/services/mine', {
          params: { page: 1, limit: 9 },
        })
        setServices(mineResponse.data.services || [])
        setPagination(mineResponse.data.pagination || { total: 0, page: 1, limit: 9, totalPages: 0 })
      } catch (refreshError) {
        setError('Listing saved, but the list could not be refreshed. Please reload.')
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (isEditing
          ? 'Could not update your listing. Please check the information.'
          : 'Could not publish your listing. Please check the information.')
      )
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(item) {
    setEditingId(item._id)
    setCurrentImages(Array.isArray(item.images) ? item.images : [])
    setSelectedImages([])
    setForm({
      type: item.type || 'service',
      title: item.title || '',
      description: item.description || '',
      category: item.category || '',
      location: item.location || '',
      phone: item.phone || item.owner?.phone || '',
      price: item.price == null ? '' : String(item.price),
      salary: item.salary == null ? '' : String(item.salary),
      experience: item.experience || '',
      skills: Array.isArray(item.skills) ? item.skills.join(', ') : '',
    })
    setShowForm(true)
    setNotice('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setCurrentImages([])
    setSelectedImages([])
    setForm(emptyForm)
    setShowForm(false)
    setError('')
  }

  async function changeListingStatus(id, status) {
    setStatusUpdatingId(id)
    setError('')
    setNotice('')

    try {
      const response = await api.put(`/services/${id}`, { status })
      const updatedService = response.data.service

      setServices((current) =>
        current.map((item) =>
          item._id === id
            ? { ...item, status: updatedService?.status || status }
            : item
        )
      )

      setNotice('Listing status updated successfully.')
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not update listing status.'
      )
    } finally {
      setStatusUpdatingId(null)
    }
  }

  async function deleteListing(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this listing?'
    )

    if (!confirmed) return

    try {
      await api.delete(`/services/${id}`)
      setNotice('Listing deleted successfully.')
      await loadServices()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not delete this listing.'
      )
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  function getOwnerName(owner) {
    if (!owner) return 'Service provider'
    return [owner.firstName, owner.lastName].filter(Boolean).join(' ') ||
      'Service provider'
  }

  function getTypeLabel(type) {
    if (type === 'job') return 'JOB OPPORTUNITY'
    if (type === 'professional') return 'PROFESSIONAL'
    return 'SERVICE'
  }

  return (
    <main className="services-page">
      <header className="services-header">
        <Link to="/marketplace" className="services-brand">
          <span className="services-brand-icon">N</span>
          <span>
            <strong>NR Nexus</strong>
            <small>Chat. Share. Trade together.</small>
          </span>
        </Link>

        <nav className="services-nav">
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/messages">Messages</Link>
          <Link to="/favorites">Favorites</Link>
          <Link to="/my-orders">My orders</Link>
          <Link className="services-nav-active" to="/services">Services</Link>
        </nav>

        <button className="services-logout" onClick={logout}>
          Sign out
        </button>
      </header>

      <section className="services-hero">
        <p className="services-eyebrow">WORK • SKILLS • OPPORTUNITIES</p>
        <h1>Find work. Find talent. Get things done.</h1>
        <p>
          Discover job opportunities, trusted service providers and
          skilled professionals around you.
        </p>

        <button
          className="services-primary-button"
          onClick={() => {
            if (showForm && editingId) {
              cancelEdit()
            } else {
              setShowForm((current) => !current)
            }
          }}
        >
          {showForm ? 'Close form' : '+ Post a job or service'}
        </button>
      </section>

      <section className="services-content">
        {notice && (
          <div className="services-notice" role="status">
            {notice}
          </div>
        )}

        {error && (
          <div className="services-error" role="alert">
            {error}
          </div>
        )}

        {showForm && (
          <form className="services-form" onSubmit={handleSubmit}>
            <div className="services-form-heading">
              <div>
                <h2>{editingId ? 'Edit your listing' : 'Create a listing'}</h2>
                <p>
                  {editingId
                    ? 'Update the details of your listing.'
                    : 'Share an opportunity or introduce your professional service.'}
                </p>
              </div>
            </div>

            <div className="services-form-grid">
              <label>
                Listing type *
                <select
                  name="type"
                  value={form.type}
                  onChange={updateForm}
                  required
                >
                  <option value="service">Offer a service</option>
                  <option value="job">Post a job opportunity</option>
                  <option value="professional">Professional profile</option>
                </select>
              </label>

              <label>
                Title *
                <input
                  name="title"
                  value={form.title}
                  onChange={updateForm}
                  placeholder="e.g. Experienced electrician available"
                  maxLength={120}
                  required
                />
              </label>

              <label>
                Category *
                <select
                  name="category"
                  value={form.category}
                  onChange={updateForm}
                  required
                >
                  <option value="">Choose a category</option>
                  {categories.map((item) => (
                    <option key={item} value={item.toLowerCase()}>{item}</option>
                  ))}
                </select>
              </label>

              <label>
                Location *
                <input
                  name="location"
                  value={form.location}
                  onChange={updateForm}
                  placeholder="e.g. Kigali, Gasabo"
                  maxLength={120}
                  required
                />
              </label>

              <label>
                Phone number
                <input
                  name="phone"
                  value={form.phone}
                  onChange={updateForm}
                  placeholder="Your contact number"
                />
              </label>

              {form.type === 'job' ? (
                <label>
                  Salary (RWF)
                  <input
                    name="salary"
                    type="number"
                    min="0"
                    value={form.salary}
                    onChange={updateForm}
                    placeholder="Expected salary"
                  />
                </label>
              ) : (
                <label>
                  Price (RWF)
                  <input
                    name="price"
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={updateForm}
                    placeholder="Service price (optional)"
                  />
                </label>
              )}

              <label>
                Experience
                <input
                  name="experience"
                  value={form.experience}
                  onChange={updateForm}
                  placeholder="e.g. 3 years"
                />
              </label>

              <label>
                Skills (separate with commas)
                <input
                  name="skills"
                  value={form.skills}
                  onChange={updateForm}
                  placeholder="e.g. Wiring, installation, repairs"
                />
              </label>
            </div>

            <label className="services-description-label">
              Description *
              <textarea
                name="description"
                value={form.description}
                onChange={updateForm}
                placeholder="Describe the job, service, skills or experience..."
                rows={5}
                maxLength={3000}
                required
              />
            </label>

            <div className="service-photo-upload">
              <label htmlFor="service-photos">
                Photos (up to 6, maximum 10 MB each)
              </label>
              <input
                id="service-photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelection}
                disabled={currentImages.length + selectedImages.length >= 6}
              />
              <small>
                {currentImages.length + selectedImages.length} of 6 photos selected
              </small>

              {currentImages.length > 0 && (
                <div className="service-photo-preview">
                  {currentImages.map((image, index) => (
                    <div className="service-photo-preview-item" key={`existing-${index}`}>
                      <img src={image} alt={`Existing service photo ${index + 1}`} />
                      <span>Saved</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedImages.length > 0 && (
                <div className="service-photo-preview">
                  {selectedImages.map((image, index) => (
                    <div className="service-photo-preview-item" key={`selected-${index}`}>
                      <img src={image.preview} alt={`Selected photo ${index + 1}`} />
                      <button
                        type="button"
                        onClick={() => removeSelectedImage(index)}
                        disabled={submitting}
                        aria-label={`Remove selected photo ${index + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="services-form-actions">
              <button
                className="services-primary-button"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? (editingId ? 'Saving...' : 'Publishing...')
                  : (editingId ? 'Save changes' : 'Publish listing')}
              </button>

              {editingId && (
                <button
                  className="services-secondary-button"
                  type="button"
                  onClick={cancelEdit}
                  disabled={submitting}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        )}

        <div className="services-section-heading">
          <div>
            <p className="services-eyebrow">EXPLORE OPPORTUNITIES</p>
            <h2>Jobs and services</h2>
          </div>
          <span>{pagination.total} listings</span>
        </div>

        <div className="services-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={activeTab === tab.value ? 'active' : ''}
              onClick={() => {
                setCurrentPage(1)
                setActiveTab(tab.value)
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== 'mine' && (
          <div className="services-filters">
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setCurrentPage(1)
                setSearch(event.target.value)
              }}
              placeholder="Search jobs, skills or services..."
              aria-label="Search listings"
            />

            <input
              type="search"
              value={location}
              onChange={(event) => {
                setCurrentPage(1)
                setLocation(event.target.value)
              }}
              placeholder="Location..."
              aria-label="Filter by location"
            />

            <select
              value={category}
              onChange={(event) => {
                setCurrentPage(1)
                setCategory(event.target.value)
              }}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item.toLowerCase()}>{item}</option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="services-empty">Loading listings...</div>
        ) : services.length === 0 ? (
          <div className="services-empty">
            <span className="services-empty-icon">⌕</span>
            <h3>No listings found</h3>
            <p>
              {activeTab === 'mine'
                ? 'You have not published any listings yet.'
                : 'Try another search or be the first to publish a listing.'}
            </p>
            <button
              className="services-secondary-button"
              onClick={() => setShowForm(true)}
            >
              Create a listing
            </button>
          </div>
        ) : (
          <div className="services-grid">
            {services.map((item) => (
              <article className="service-card" key={item._id}>
                <div className="service-card-top">
                  <span className={`service-type service-type-${item.type}`}>
                    {getTypeLabel(item.type)}
                  </span>
                  <span className="service-date">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : ''}
                  </span>
                </div>

                <span className={`service-status service-status-${item.status || 'active'}`}>
                  {item.status === 'closed'
                    ? 'Closed'
                    : item.status === 'hidden'
                      ? 'Hidden'
                      : 'Active'}
                </span>

                {Array.isArray(item.images) && item.images.length > 0 && (
                  <div className="service-card-images">
                    {item.images.map((image, index) => (
                      <img
                        key={`${item._id}-photo-${index}`}
                        src={image}
                        alt={`${item.title} photo ${index + 1}`}
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}

                <h3>{item.title}</h3>
                <p className="service-category">{item.category}</p>
                <p className="service-description">{item.description}</p>

                {item.skills?.length > 0 && (
                  <div className="service-skills">
                    {item.skills.map((skill, index) => (
                      <span key={`${skill}-${index}`}>{skill}</span>
                    ))}
                  </div>
                )}

                <div className="service-details">
                  <span>📍 {item.location}</span>
                  {item.type === 'job' && item.salary != null && (
                    <strong>Salary: {Number(item.salary).toLocaleString()} RWF</strong>
                  )}
                  {item.type !== 'job' && item.price != null && (
                    <strong>{Number(item.price).toLocaleString()} RWF</strong>
                  )}
                  {item.experience && <span>Experience: {item.experience}</span>}
                </div>

                <div className="service-owner">
                  <span>{getOwnerName(item.owner)}</span>
                  {item.owner?.phone && <small>{item.owner.phone}</small>}
                </div>

                <div className="service-card-actions">
                  {item.owner?._id && (
                    <Link
                      to={`/messages?seller=${item.owner._id}`}
                      className="service-contact-button"
                    >
                      Contact
                    </Link>
                  )}

                  {activeTab === 'mine' && (
                    <>
                      <label className="service-status-control">
                        <span>Listing status</span>
                        <select
                          value={item.status || 'active'}
                          disabled={statusUpdatingId === item._id}
                          onChange={(event) =>
                            changeListingStatus(item._id, event.target.value)
                          }
                          aria-label={`Change status for ${item.title}`}
                        >
                          <option value="active">Active</option>
                          <option value="closed">Closed</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </label>

                      <button
                        className="service-edit-button"
                        onClick={() => startEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="service-delete-button"
                        onClick={() => deleteListing(item._id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && pagination.total > 0 && (
          <div className="services-pagination">
            <span className="services-pagination-info">
              Showing {Math.min(pagination.total, (pagination.page - 1) * pagination.limit + 1)}–{Math.min(pagination.total, pagination.page * pagination.limit)} of {pagination.total} listings
            </span>
            {pagination.totalPages > 1 && (
              <div className="services-pagination-controls">
                <button type="button" disabled={currentPage <= 1 || loading}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                  Previous
                </button>
                <span>Page {pagination.page} of {pagination.totalPages}</span>
                <button type="button" disabled={currentPage >= pagination.totalPages || loading}
                  onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

export default Services
