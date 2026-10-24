import React from 'react';
import { ShoppingBag, Star, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();

  const plan = user?.subscription?.plan || 'free';
  const discountPercent = plan === 'gold' ? 25 : plan === 'silver' ? 10 : 0;
  const discountedPrice = Math.round(product.price * (1 - discountPercent / 100));

  return (
    <div className="glass-panel card-hover" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Product Image */}
      <div style={{ position: 'relative', height: '240px', overflow: 'hidden', background: '#F9F4F6' }}>
        <img
          src={product.image}
          alt={product.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        />
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid var(--border-glass)',
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)'
        }}>
          {product.category}
        </div>

        {discountPercent > 0 && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: plan === 'gold' ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'linear-gradient(135deg, #F472B6, #FB7185)',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.72rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 8px rgba(244, 114, 182, 0.35)'
          }}>
            <Sparkles size={11} /> {discountPercent}% OFF
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', color: '#fbbf24' }}>
              <Star size={14} fill="#fbbf24" />
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>{product.rating}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>({product.reviews_count})</span>
          </div>

          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '8px', lineHeight: 1.3 }}>
            {product.title}
          </h3>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
            {product.description}
          </p>
        </div>

        <div>
          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
              ₹{discountedPrice.toLocaleString()}
            </span>
            {discountPercent > 0 && (
              <span style={{ fontSize: '0.9rem', color: 'var(--text-subtle)', textDecoration: 'line-through' }}>
                ₹{product.price.toLocaleString()}
              </span>
            )}
          </div>

          {/* Add to Cart button */}
          <button
            onClick={() => addToCart(product)}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.88rem' }}
          >
            <ShoppingBag size={16} /> Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};
