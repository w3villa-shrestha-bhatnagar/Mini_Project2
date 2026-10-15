import React, { useState, useEffect } from 'react';
import { PlanCard } from '../components/PlanCard';
import { useAuth } from '../context/AuthContext';
import { Crown, Sparkles, Clock, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const { user, refreshUser } = useAuth();
  const [remainingTime, setRemainingTime] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Fetch plans from API
  useEffect(() => {
    fetch(`${API_URL}/plans`)
      .then(res => res.json())
      .then(data => {
        if (data.plans) setPlans(data.plans);
      })
      .catch(err => console.error("Error loading plans:", err))
      .finally(() => setLoading(false));
  }, []);

  // Real-time live countdown timer for active plan
  useEffect(() => {
    const sub = user?.subscription;
    if (sub?.status !== 'active' || !sub?.expires_at) {
      return;
    }

    const interval = setInterval(() => {
      const expiresAt = new Date(sub.expires_at).getTime();
      const now = new Date().getTime();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setRemainingTime({ hours: 0, minutes: 0, seconds: 0 });
        refreshUser(); // Refresh when timer hits 0 to show expired status from cron
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setRemainingTime({ hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.subscription?.expires_at, user?.subscription?.status]);

  const handlePaymentSuccess = async (verifyData) => {
    setNotification({
      type: 'success',
      message: verifyData.message || 'Plan activated successfully!'
    });
    await refreshUser();
  };

  const handlePaymentError = (errMsg) => {
    setNotification({
      type: 'error',
      message: errMsg || 'Payment failed or cancelled'
    });
  };

  const hasActivePaidPlan = user?.subscription?.status === 'active' && user?.subscription?.plan !== 'free';

  return (
    <div className="container" style={{ paddingBottom: '90px' }}>
      {/* Toast Notification */}
      {notification && (
        <div className="toast-container">
          <div className={`toast ${notification.type === 'success' ? 'toast-success' : 'toast-error'}`}>
            {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '12px' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto', padding: '50px 0 40px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(244, 114, 182, 0.12)',
          border: '1px solid rgba(244, 114, 182, 0.3)',
          padding: '6px 16px',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.85rem',
          fontWeight: 700,
          color: '#BE185D',
          marginBottom: '20px'
        }}>
          <Crown size={15} color="var(--accent-gold)" /> Time-Limited VIP Memberships
        </div>

        <h1 style={{ fontSize: '2.8rem', marginBottom: '14px', lineHeight: 1.2 }}>
          Shop Like Royalty, On Your Schedule
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Choose a 1-hour sprint, 6-hour spree, or 12-hour VIP pass. Instant checkout discounts, complimentary expedited concierge courier, and automated duration expiration.
        </p>
      </div>

      {/* Active Membership Live Countdown Card (if active paid plan) */}
      {hasActivePaidPlan && (
        <div className="glass-panel" style={{
          maxWidth: '820px',
          margin: '0 auto 48px',
          padding: '28px 36px',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF5F8 100%)',
          border: '1.5px solid rgba(244, 114, 182, 0.45)',
          boxShadow: '0 10px 30px rgba(244, 114, 182, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span className={`badge ${user.subscription.plan === 'gold' ? 'badge-gold' : 'badge-silver'}`}>
                  {user.subscription.plan.toUpperCase()} VIP PASS
                </span>
                <span className="badge badge-active">● Active Now</span>
              </div>
              <h3 style={{ fontSize: '1.4rem' }}>Your Pass is Active!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                Enjoy {user.subscription.plan === 'gold' ? '25%' : '10%'} off your cart + free priority delivery until expiration.
              </p>
            </div>

            {/* Countdown Box */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: '#FFF0F5',
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(244, 114, 182, 0.3)',
              boxShadow: '0 2px 10px rgba(244, 114, 182, 0.1)'
            }}>
              <Clock size={24} color="var(--primary)" />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace', color: '#BE185D' }}>
                  {String(remainingTime.hours).padStart(2, '0')}:
                  {String(remainingTime.minutes).padStart(2, '0')}:
                  {String(remainingTime.seconds).padStart(2, '0')}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Time Remaining (Hours : Mins : Secs)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading plans...
        </div>
      ) : (
        <div className="grid-3" style={{ maxWidth: '1140px', margin: '0 auto' }}>
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              user={user}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          ))}
        </div>
      )}

      {/* Cron Explanation Section */}
      <div className="glass-panel" style={{ maxWidth: '820px', margin: '60px auto 0', padding: '24px 30px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(244, 114, 182, 0.14)', borderRadius: '10px', color: 'var(--primary)', flexShrink: 0 }}>
            <Clock size={22} />
          </div>
          <div>
            <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>Automated Plan Expiration by Cron Job</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
              Our backend daemon checks active plans every 30 seconds. Once your purchased duration (1h, 6h, or 12h) is reached, your account status seamlessly transitions to expired and your subscription defaults to Free. You will never be rebilled automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
