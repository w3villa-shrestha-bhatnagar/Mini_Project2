import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Shield, Clock, CreditCard } from 'lucide-react';

export const Footer = () => {
  return (
    <footer style={{
      background: '#F5EEEB',
      borderTop: '1px solid var(--border-glass)',
      padding: '60px 0 30px',
      marginTop: '80px'
    }}>
      <div className="container">
        {/* Value Proposition Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '24px',
          paddingBottom: '40px',
          borderBottom: '1px solid var(--border-glass)',
          marginBottom: '40px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '10px', background: 'rgba(244, 114, 182, 0.15)', borderRadius: '12px', color: 'var(--primary)' }}>
              <Clock size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>Time-Limited Passes</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>1h, 6h, and 12h VIP access tiers</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.12)', borderRadius: '12px', color: 'var(--accent-gold)' }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>Instant 25% Savings</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Automatic discounts at checkout</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '12px', color: 'var(--accent-green)' }}>
              <CreditCard size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>Razorpay Secured</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Instant, encrypted checkout</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '10px', background: 'rgba(168, 85, 247, 0.12)', borderRadius: '12px', color: 'var(--accent-purple)' }}>
              <Shield size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>Cloudinary Media</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ultra-fast CDN media storage</p>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          color: 'var(--text-subtle)',
          fontSize: '0.85rem'
        }}>
          <div>
            © 2026 AuraMart Inc. All rights reserved. Built with FastAPI, MongoDB, React, Razorpay & Cloudinary.
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link to="/plans" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>VIP Membership</Link>
            <Link to="/shop" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Curated Store</Link>
            <Link to="/profile" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Account Profile</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
