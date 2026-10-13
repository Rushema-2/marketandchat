import { useEffect, useState } from 'react'
import api from '../api'
import './Workspace.css'

const emptyForm = {
  title: '',
  description: '',
  price: '',
  currency: 'RWF',
  category: 'other',
  location: '',
  condition: 'new',
  stock: '1',
}

const categories = ['electronics', 'vehicles', 'property', 'fashion', 'home', 'other']

function formatPrice(value, currency = 'RWF') {
  return `${new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(value) || 0)} ${currency || 'RWF'}`
}

export default function MyProducts() {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [selectedImages, setSelectedImages] = useState([]);
const [selectedVideo, setSelectedVideo] = useState(null);
  const [editingId, setEditingId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadProducts() {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/products/seller/me/products')
      setProducts(data.products || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProducts() }, [])

  function changeField(event) {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }))
  }

  function startNewProduct() {
    setEditingId('')
    setForm(emptyForm)
    setNotice('')
    setError('')
    setShowForm(true)
  }

  function startEdit(product) {
    setEditingId(product._id)
    setForm({
      title: product.title || '',
      description: product.description || '',
      price: String(product.price ?? ''),
      currency: product.currency || 'RWF',
      category: product.category || 'other',
      location: product.location || '',
      condition: product.condition || 'new',
      stock: String(product.stock ?? 1),
    })
    setNotice('')
    setError('')
    setShowForm(true)
  }

  
  async function saveProduct(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    if (selectedImages.length > 6) {
      setError('Select up to 6 images.')
      setSaving(false)
      return
    }

    const payload = new FormData()

    Object.entries(form).forEach(([key, value]) => {
      payload.append(key, value)
    })

    selectedImages.forEach((file) => {
      payload.append('images', file)
    })

    if (selectedVideo) {
      payload.append('video', selectedVideo)
    }

    try {
      if (editingId) {
        await api.put(
          `/products/${encodeURIComponent(editingId)}`,
          payload
        )
        setNotice('Product updated successfully.')
      } else {
        await api.post('/products', payload)
        setNotice('Product created successfully.')
      }

      setShowForm(false)
      setEditingId('')
      setForm(emptyForm)
      setSelectedImages([])
      setSelectedVideo(null)

      await loadProducts()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not save product. Check the information and try again.'
      )
    } finally {
      setSaving(false)
    }
  }


  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.title}"? This action cannot be undone.`)) return
    setError('')
    setNotice('')
    try {
      await api.delete(`/products/${encodeURIComponent(product._id)}`)
      setProducts((previous) => previous.filter((item) => item._id !== product._id))
      setNotice('Product deleted successfully.')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete product.')
    }
  }

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/marketplace">RwhatsApp</a>
        <nav className="workspace-nav">
          <a href="/marketplace">Marketplace</a>
          <a href="/messages">Messages</a>
          <a href="/my-orders">My Orders</a>
          <a className="active" href="/my-products">My Products</a>
        </nav>
      </header>

      <section className="workspace-content">
        <div className="workspace-title">
          <div><p className="workspace-eyebrow">YOUR STORE</p><h1>My Products</h1><p>Manage the products you offer on the Marketplace.</p></div>
          <button className="workspace-primary" onClick={startNewProduct}>+ Add product</button>
        </div>

        {notice && <p className="workspace-success" role="status">{notice}</p>}
        {error && <p className="workspace-error" role="alert">{error}</p>}

        {showForm && (
          <form className="product-form" onSubmit={saveProduct}>
            <div className="product-form-heading">
              <h2>{editingId ? 'Edit product' : 'Add a product'}</h2>
              <button type="button" className="workspace-secondary" onClick={() => { setShowForm(false); setError('') }}>Cancel</button>
            </div>
            <label>Product title<input name="title" value={form.title} onChange={changeField} maxLength={150} required /></label>
            <label>Description<textarea name="description" value={form.description} onChange={changeField} rows={4} required /></label>
            <div className="product-form-grid">
              <label>Price (RWF)<input name="price" type="number" min="0" step="1" value={form.price} onChange={changeField} required /></label>
              <label>Category<select name="category" value={form.category} onChange={changeField}>{categories.map((category) => <option key={category} value={category}>{category.replace(/_/g, ' ')}</option>)}</select></label>
              <label>Location<input name="location" value={form.location} onChange={changeField} placeholder="e.g. Kigali" /></label>
              <label>Condition<select name="condition" value={form.condition} onChange={changeField}><option value="new">New</option><option value="used">Used</option></select></label>
              <label>Stock<input name="stock" type="number" min="0" step="1" value={form.stock} onChange={changeField} required /></label>
            </div>
          <div className="product-media-fields">
  <label>
    Product Images (up to 6)
    <input
      type="file"
      accept="image/*"
      multiple
      onChange={(event) => {
        const files = Array.from(event.target.files || []);

        if (files.length > 6) {
          setError('Select up to 6 images.');
          event.target.value = '';
          setSelectedImages([]);
          return;
        }

        setSelectedImages(files);
        setError('');
      }}
    />
  </label>

  <label>
    Product Video (one file)
    <input
      type="file"
      accept="video/*"
      onChange={(event) => {
        setSelectedVideo(event.target.files?.[0] || null);
        setError('');
      }}
    />
  </label>

  {selectedImages.length > 0 && (
    <p className="workspace-muted">
      Selected images: {selectedImages.length}
    </p>
  )}

  {selectedVideo && (
    <p className="workspace-muted">
      Selected video: {selectedVideo.name}
    </p>
  )}
</div>
            <button className="workspace-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Publish product'}</button>
          </form>
        )}

        {loading && <p className="workspace-muted">Loading your products...</p>}
        {!loading && !error && products.length === 0 && !showForm && (
          <div className="workspace-empty"><span>◇</span><h2>Your store is empty</h2><p>Add your first product to show it on the Marketplace.</p><button className="workspace-primary" onClick={startNewProduct}>Add your first product</button></div>
        )}

        {!loading && products.length > 0 && (
          <div className="my-products-grid">
            {products.map((product) => (
              <article className="my-product-card" key={product._id}>
                {product.images?.[0] ? (
                  <img src={`${import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000'}${product.images[0].startsWith('/') ? '' : '/'}${product.images[0]}`} alt={product.title} />
                ) : <div className="my-product-placeholder">No image available</div>}
                <div className="my-product-info">
                  <span className="product-category-label">{String(product.category || 'other').replace(/_/g, ' ')}</span>
                  <h2>{product.title}</h2>
                  <p className="my-product-description">{product.description}</p>
                  <strong>{formatPrice(product.price, product.currency)}</strong>
                  <p className="workspace-muted">Stock: {product.stock ?? 0} · {product.location || 'Location not specified'}</p>
                  <div className="my-product-actions">
                    <button className="workspace-secondary" onClick={() => startEdit(product)}>Edit</button>
                    <button className="workspace-danger" onClick={() => deleteProduct(product)}>Delete</button>
                    <a href={`/product/${encodeURIComponent(product._id)}`}>View</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
