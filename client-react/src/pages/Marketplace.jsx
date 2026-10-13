
import { useEffect, useState } from 'react'
import api from '../api'
import './Marketplace.css'

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000'

const categories = [
  { value: 'all', label: 'All categories' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'property', label: 'Property' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'home', label: 'Home & Living' },
  { value: 'other', label: 'Other' },
]

function formatPrice(price, currency = 'RWF') {
  const amount = new Intl.NumberFormat('en-RW', {
    maximumFractionDigits: 0,
  }).format(Number(price) || 0)

  return `${amount} RWF`
}

function Marketplace() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      try {
        const response = await api.get('/products')
        if (!cancelled) {
          setProducts(response.data.products || [])
          setError('')
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
            'Could not load products. Please try again.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProducts()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredProducts = products.filter((product) => {
    const query = search.trim().toLowerCase()
    const matchesSearch =
      !query ||
      [product.title, product.description, product.location, product.category]
        .some((value) => String(value || '').toLowerCase().includes(query))

    const matchesCategory =
      category === 'all' || product.category?.toLowerCase() === category

    return matchesSearch && matchesCategory
  })

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  return (
    <main className="marketplace-page">
      <header className="market-header">
        <a className="market-brand" href="/marketplace">
          <span className="market-logo">R</span>
          <span>
            <strong>RwhatsApp</strong>
            <small>Chat. Share. Trade together.</small>
          </span>
        </a>

        <nav className="market-nav" aria-label="Main navigation">
          <a className="active" href="/marketplace">Marketplace</a>
          <a href="/messages">Messages</a>
          <a href="/my-orders">My orders</a>
          <a href="/my-products">My products</a>
        </nav>

        <button className="logout-button" onClick={logout}>
          Sign out
        </button>
      </header>

      <section className="market-hero">
        <p className="market-eyebrow">YOUR LOCAL MARKETPLACE</p>
        <h1>Find what you need.</h1>
        <p>Discover products and connect with sellers around you.</p>

        <div className="market-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            aria-label="Search products"
            placeholder="Search products, categories or locations..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </section>

      <section className="market-content">
        <div className="market-section-heading">
          <div>
            <h2>Explore products</h2>
            <p>Find something you love.</p>
          </div>

          <label className="category-filter">
            <span>Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading && <p className="market-status">Loading products...</p>}

        {!loading && error && (
          <div className="market-error" role="alert">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Try again</button>
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="market-empty">
            <h3>No products found</h3>
            <p>Try another search or choose a different category.</p>
          </div>
        )}

        {!loading && !error && filteredProducts.length > 0 && (
          <>
            <p className="product-count">
              {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}
            </p>

            <div className="product-grid">
              {filteredProducts.map((product) => {
                const imagePath = product.images?.[0]
                const imageUrl = imagePath
                  ? `${API_ORIGIN}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`
                  : ''

                return (
                  <article className="product-card" key={product._id}>
                    <a
                      className="product-image"
                     href={`/product/${encodeURIComponent(product._id)}`}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.title}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <span className="product-placeholder">No image available</span>
                      )}

                      {product.isPromoted && (
                        <span className="promoted-badge">Promoted</span>
                      )}

                      {product.video && (
                        <span className="video-badge">Video</span>
                      )}
                    </a>

                    <div className="product-info">
                      <p className="product-category">
                        {String(product.category || 'Other').replace(/_/g, ' ')}
                      </p>
                      <h3>
                        <a href={`/product/${encodeURIComponent(product._id)}`}>
                          {product.title}
                        </a>
                      </h3>
                      <p className="product-description">
                        {product.description}
                      </p>
                      <strong className="product-price">
                        {formatPrice(product.price, product.currency || 'RWF')}
                      </strong>
                      <div className="product-meta">
                        <span>📍 {product.location || 'Location not specified'}</span>
                        <span>{product.stock > 0 ? 'In stock' : 'Out of stock'}</span>
                      </div>
                      <p className="seller-name">
                        Seller: {product.seller
                          ? `${product.seller.firstName || ''} ${product.seller.lastName || ''}`.trim()
                          : 'Seller'}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>

      <footer className="market-footer">
        © {new Date().getFullYear()} RwhatsApp · Chat. Share. Trade together.
      </footer>
    </main>
  )
}

export default Marketplace
