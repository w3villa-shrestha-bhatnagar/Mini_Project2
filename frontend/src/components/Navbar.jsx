import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingBag, ShieldCheck, User, LogOut, Sparkles, Crown } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { totalCount, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getPlanBadge = () => {
    const plan = user?.subscription?.plan || 'free';
    if (plan === 'gold') {
      return (
        <span className="badge badge-gold" title="Gold VIP Member - 25% Discount">
          <Crown size={12} /> Gold VIP
        </span>
      );
    }
    if (plan === 'silver') {
      return (
        <span className="badge badge-silver" title="Silver Member - 10% Discount">
          <Sparkles size={12} /> Silver Club
        </span>
      );
    }
    return (
      <span className="badge badge-free" title="Free Tier">
        Free
      </span>
    );
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '72px',
      background: 'rgba(10, 14, 23, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-glass)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'var(--text-main)' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(14, 165, 233, 0.4)'
          }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <span style={{ fontSize: '1.28rem', fontWeight: 800, letterSpacing: '-0.03em', fontFamily: 'var(--font-heading)' }}>
              AURA<span style={{ color: 'var(--primary)' }}>MART</span>
            </span>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '-4px' }}>
              VIP Lifestyle
            </div>
          </div>
        </Link>

        {/* Center Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              fontSize: '0.92rem',
              fontWeight: 500,
              color: isActive('/') ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'color 0.2s'
            }}
          >
            Home
          </Link>
          <Link
            to="/shop"
            style={{
              textDecoration: 'none',
              fontSize: '0.92rem',
              fontWeight: 500,
              color: isActive('/shop') ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'color 0.2s'
            }}
          >
            Shop Collection
          </Link>
          <Link
            to="/plans"
            style={{
              textDecoration: 'none',
              fontSize: '0.92rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: isActive('/plans') ? 'var(--accent-gold)' : 'var(--text-muted)',
              transition: 'color 0.2s'
            }}
          >
            <Crown size={15} color="var(--accent-gold)" />
            VIP Plans
          </Link>
        </div>

        {/* Right Nav Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Cart Icon Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              position: 'relative',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-md)',
              padding: '9px 12px',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            title="View Shopping Cart"
          >
            <ShoppingBag size={18} />
            {totalCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: 'var(--primary)',
                color: '#000',
                fontSize: '0.72rem',
                fontWeight: 700,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {totalCount}
              </span>
            )}
          </button>

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Admin Panel Link */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="btn btn-secondary btn-sm"
                  style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--primary)' }}
                  title="Go to Admin Panel"
                >
                  <ShieldCheck size={16} /> Admin
                </Link>
              )}

              {/* Plan Badge */}
              <Link to="/plans" style={{ textDecoration: 'none' }}>
                {getPlanBadge()}
              </Link>

              {/* User Profile Avatar Link */}
              <Link
                to="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textDecoration: 'none',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-glass)'
                }}
              >
                <img
                  src={user?.avatar_thumb || user?.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                  alt={user?.name || 'User'}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.5px solid var(--primary)'
                  }}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name?.split(' ')[0] || 'Profile'}
                </span>
              </Link>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-subtle)',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Log Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Log In
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
