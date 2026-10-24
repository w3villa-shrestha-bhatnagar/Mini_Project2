import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Crown, ArrowRight, Shield, Zap, Gift, CheckCircle2 } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetch(`${API_URL}/products`)
      .then(res => res.json())
      .then(data => {
        if (data.products) {
          setFeaturedProducts(data.products.slice(0, 3));
        }
      })
      .catch(err => console.error("Error loading products:", err));
  }, []);

  return (
    <div>
      {/* Ambient background glows */}
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />

      {/* Hero Section */}
      <section style={{ padding: '70px 0 90px', position: 'relative', overflow: 'hidden' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '880px', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(244, 114, 182, 0.12)',
            border: '1px solid rgba(244, 114, 182, 0.3)',
            padding: '6px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#BE185D',
            marginBottom: '24px'
          }}>
            <Crown size={15} color="var(--accent-gold)" />
            <span>Introducing Time-Limited VIP Shopping Passes</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.15, marginBottom: '24px' }}>
            Elevate Your Everyday with{' '}
            <span style={{
              background: 'linear-gradient(135deg, #EC4899 0%, #F472B6 45%, #E11D48 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Curated Luxury
            </span>
          </h1>

          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', marginBottom: '38px', lineHeight: 1.6 }}>
            Discover an exclusive lifestyle marketplace engineered for tastemakers. Unlock up to 25% instant discounts, express concierge deliveries, and time-limited VIP member passes.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link to="/shop" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1rem' }}>
              Explore Collection <ArrowRight size={18} />
            </Link>
            <Link to="/plans" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '1rem' }}>
              <Sparkles size={18} color="var(--primary)" /> View VIP Plans
            </Link>
          </div>

          {/* User Tier Status Pill */}
          {user && (
            <div style={{
              marginTop: '36px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              background: '#FFFFFF',
              border: '1px solid var(--border-glass)',
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.88rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
            }}>
              <span style={{ color: 'var(--text-muted)' }}>Logged in as <b>{user.name}</b>:</span>
              <span className={`badge ${user.subscription?.plan === 'gold' ? 'badge-gold' : user.subscription?.plan === 'silver' ? 'badge-silver' : 'badge-free'}`}>
                {user.subscription?.plan?.toUpperCase()} MEMBER
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Featured Products Section */}
      <section style={{ padding: '40px 0 80px' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '36px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Handcrafted Essentials
              </span>
              <h2 style={{ fontSize: '2rem', marginTop: '6px' }}>Featured Releases</h2>
            </div>
            <Link to="/shop" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              View all products <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid-3">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Membership Perks Showcase */}
      <section style={{ padding: '60px 0', background: 'rgba(255, 245, 248, 0.7)', borderTop: '1px solid var(--border-glass)', borderBottom: '1px solid var(--border-glass)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 48px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Why Join The Aura Club
            </span>
            <h2 style={{ fontSize: '2rem', marginTop: '6px' }}>Time-Limited Passes Built for Savvy Shoppers</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>
              Buy a 1h, 6h, or 12h pass right when you want to make large purchases, save hundreds, and enjoy concierge shipping.
            </p>
          </div>

          <div className="grid-3" style={{ gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '32px', background: '#FFFFFF' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(244, 114, 182, 0.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <Zap size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Immediate Savings</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Activate your Silver (10% off) or Gold (25% off) tier in seconds via Razorpay. Discounts apply instantly to your cart.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '32px', background: '#FFFFFF' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <Crown size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Automated Cron Expiration</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Passes automatically expire after their exact duration (1h, 6h, 12h) handled by our backend scheduler. No recurring subscription traps.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '32px', background: '#FFFFFF' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <Gift size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Account Merge & Social Login</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Sign in with Google, Facebook, or Email. If your email matches an existing account, they are merged seamlessly without data loss.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
