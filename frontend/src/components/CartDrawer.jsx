import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, Sparkles, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const CartDrawer = () => {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    discountPercent,
    discountAmount,
    shippingFee,
    total
  } = useCart();
  const { user } = useAuth();

  if (!isCartOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setIsCartOpen(false)}>
      <div
        className="modal-content"
        style={{
          maxWidth: '480px',
          height: '100%',
          maxHeight: '100vh',
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          borderRadius: '24px 0 0 24px',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          boxShadow: '-10px 0 40px rgba(180, 80, 110, 0.12)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '18px', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag size={22} color="var(--primary)" />
            <h3 style={{ fontSize: '1.25rem' }}>Your Aura Bag ({items.length})</h3>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Plan Perk Banner */}
        {discountPercent > 0 ? (
          <div style={{
            margin: '16px 0',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.85rem',
            color: 'var(--accent-green)'
          }}>
            <Sparkles size={16} />
            <span><b>{user?.subscription?.plan?.toUpperCase()} Tier Active:</b> You saved ₹{discountAmount} on this order!</span>
          </div>
        ) : (
          <div style={{
            margin: '16px 0',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(244, 114, 182, 0.12)',
            border: '1px solid rgba(244, 114, 182, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            color: '#BE185D'
          }}>
            <span>Get up to 25% OFF instantly with VIP Plan</span>
            <Link to="/plans" onClick={() => setIsCartOpen(false)} style={{ color: 'var(--primary)', fontWeight: 700 }}>
              Upgrade →
            </Link>
          </div>
        )}

        {/* Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <ShoppingBag size={48} style={{ opacity: 0.3, margin: '0 auto 16px', color: 'var(--primary)' }} />
              <p>Your shopping bag is currently empty.</p>
              <Link
                to="/shop"
                onClick={() => setIsCartOpen(false)}
                className="btn btn-primary btn-sm"
                style={{ marginTop: '16px' }}
              >
                Browse Collection
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    gap: '14px',
                    padding: '12px',
                    background: '#FAF7F5',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.3 }}>{item.title}</h4>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F0E5E9', borderRadius: '6px', padding: '3px 8px' }}>
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                        >
                          <Minus size={13} />
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        ₹{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        {items.length > 0 && (
          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString()}</span>
            </div>

            {discountPercent > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--accent-green)', marginBottom: '6px' }}>
                <span>VIP Discount ({discountPercent}%)</span>
                <span>- ₹{discountAmount.toLocaleString()}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              <span>Express Concierge Shipping</span>
              <span>{shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '18px' }}>
              <span>Order Total</span>
              <span>₹{total.toLocaleString()}</span>
            </div>

            <button
              onClick={() => {
                alert(`Checkout simulated! Total amount: ₹${total}. Thank you for shopping with AuraMart.`);
                clearCart();
                setIsCartOpen(false);
              }}
              className="btn btn-primary"
              style={{ width: '100%', fontSize: '1rem', padding: '14px' }}
            >
              Proceed to Secure Checkout <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
