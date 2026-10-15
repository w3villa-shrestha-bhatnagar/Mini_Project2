import React, { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { Search, Filter, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const CATEGORIES = ["All", "Electronics", "Accessories", "Fashion", "Home Decor"];

export const Shop = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();

  const plan = user?.subscription?.plan || 'free';

  useEffect(() => {
    setLoading(true);
    let url = `${API_URL}/products?`;
    if (selectedCategory !== "All") url += `category=${encodeURIComponent(selectedCategory)}&`;
    if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
      })
      .catch(err => console.error("Error fetching products:", err))
      .finally(() => setLoading(false));
  }, [selectedCategory, searchTerm]);

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {/* Header Banner */}
      <div style={{ padding: '40px 0 30px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Exclusive Collection</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Discover state-of-the-art electronics, horology, and elevated accessories.
        </p>

        {/* Tier Discount Banner */}
        {plan !== 'free' ? (
          <div style={{
            marginTop: '20px',
            padding: '12px 20px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--accent-green)',
            fontSize: '0.92rem'
          }}>
            <Sparkles size={18} />
            <span>
              Your <b>{plan.toUpperCase()}</b> membership is active! An automatic {plan === 'gold' ? '25%' : '10%'} VIP discount is applied to every item below.
            </span>
          </div>
        ) : (
          <div style={{
            marginTop: '20px',
            padding: '12px 20px',
            background: 'rgba(244, 114, 182, 0.12)',
            border: '1px solid rgba(244, 114, 182, 0.3)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            color: '#BE185D',
            fontSize: '0.92rem'
          }}>
            <span>Want up to 25% off these prices? Get a time-limited VIP Pass.</span>
            <Link to="/plans" className="btn btn-primary btn-sm">
              View VIP Plans
            </Link>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '18px',
        marginBottom: '36px',
        padding: '18px 24px',
        background: '#FFFFFF',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 4px 15px rgba(220, 150, 175, 0.05)'
      }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? 'linear-gradient(135deg, #F472B6, #FB7185)' : '#FFFFFF',
                color: selectedCategory === cat ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.85rem',
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                border: selectedCategory === cat ? 'none' : '1px solid var(--border-glass)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: selectedCategory === cat ? '0 4px 12px rgba(244, 114, 182, 0.3)' : 'none'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-subtle)' }} />
          <input
            type="text"
            className="form-input"
            style={{ padding: '8px 14px 8px 36px', fontSize: '0.88rem' }}
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          Loading collection...
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          No products matched your search or filter.
        </div>
      ) : (
        <div className="grid-3">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
