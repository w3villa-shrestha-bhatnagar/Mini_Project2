import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const MyOrder = () => {
  const { items, setIsCartOpen } = useCart();

  return (
    <div className="container" style={{ padding: '40px 20px 90px', maxWidth: '1200px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 24px rgba(59, 130, 246, 0.25)'
          }}>
            <ShoppingBag size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Dashboard</div>
            <h1 style={{ fontSize: '2.2rem', margin: '4px 0 0' }}>My Order</h1>
          </div>
        </div>

        <Link to="/shop" className="btn btn-primary btn-sm" style={{ padding: '12px 20px' }}>
          Continue Shopping <ArrowRight size={16} />
        </Link>
      </div>

      {items && items.length > 0 ? (
        <div className="glass-panel" style={{ padding: '28px 24px', background: '#FFFFFF', textAlign: 'center' }}>
          <p style={{ margin: '0 0 18px', fontSize: '1.05rem' }}>
            Your added products are shown in the shopping cart view.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setIsCartOpen(true)}
          >
            View Shopping Cart
          </button>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '32px 24px', textAlign: 'center', background: '#FFFFFF' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1rem' }}>
            Your shopping cart is empty right now. Add products to see them here in the cart view.
          </p>
          <Link to="/shop" className="btn btn-primary" style={{ marginTop: '18px' }}>
            Explore Collection
          </Link>
        </div>
      )}
    </div>
  );
};
