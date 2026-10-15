import React, { useState } from 'react';
import { Check, Sparkles, Crown, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const PlanCard = ({ plan, user, onPaymentSuccess, onPaymentError }) => {
  const [selectedDuration, setSelectedDuration] = useState(plan.available_durations[0]?.hours || 0);
  const [processing, setProcessing] = useState(false);

  const activePlanId = user?.subscription?.plan || 'free';
  const isCurrentActive = activePlanId === plan.id && user?.subscription?.status === 'active';
  const isGold = plan.id === 'gold';
  const isSilver = plan.id === 'silver';
  const isFree = plan.id === 'free';

  const currentDurationObj = plan.available_durations.find(d => d.hours === selectedDuration) || plan.available_durations[0];
  const price = currentDurationObj?.price || 0;

  const handleCheckout = async () => {
    if (isFree) return;

    if (!user) {
      alert("Please log in to purchase a membership plan.");
      window.location.href = '/login';
      return;
    }

    if (!user.is_verified) {
      alert("Please verify your email before purchasing a plan.");
      return;
    }

    setProcessing(true);
    const token = localStorage.getItem('auramart_token');

    try {
      // 1. Create order on backend
      const res = await fetch(`${API_URL}/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_name: plan.id,
          duration_hours: selectedDuration
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to initiate payment");
      }

      const { order, user_info } = data;

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: order.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "AuraMart VIP Club",
        description: `${plan.name} (${selectedDuration} Hours Access)`,
        image: "https://api.dicebear.com/7.x/initials/svg?seed=AuraMart",
        order_id: order.order_id,
        handler: async function (response) {
          // 3. Verify Payment
          try {
            const verifyRes = await fetch(`${API_URL}/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || order.order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_name: plan.id,
                duration_hours: selectedDuration
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.detail || "Payment verification failed");
            }

            // Trigger celebration confetti
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });

            onPaymentSuccess(verifyData);
          } catch (verErr) {
            console.error("Verification error:", verErr);
            onPaymentError(verErr.message);
          }
        },
        prefill: {
          name: user_info?.name || user?.name || "",
          email: user_info?.email || user?.email || "",
          contact: user_info?.phone || user?.phone || ""
        },
        theme: {
          color: isGold ? "#f59e0b" : "#ec4899"
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          }
        }
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          onPaymentError(response.error.description || "Payment failed");
          setProcessing(false);
        });
        rzp.open();
      } else {
        // Fallback simulator if Razorpay script is blocked
        const simulate = confirm(`Simulate Razorpay payment of ₹${price} for ${plan.name} (${selectedDuration}h)?`);
        if (simulate) {
          options.handler({
            razorpay_order_id: order.order_id,
            razorpay_payment_id: "pay_simulated_" + Math.random().toString(36).substring(7),
            razorpay_signature: "simulated_valid_signature"
          });
        }
        setProcessing(false);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      onPaymentError(err.message);
      setProcessing(false);
    }
  };

  return (
    <div
      className="glass-panel card-hover"
      style={{
        padding: '36px 28px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: isGold
          ? '1.5px solid rgba(251, 191, 36, 0.4)'
          : isSilver
          ? '1px solid rgba(56, 189, 248, 0.3)'
          : '1px solid var(--border-glass)',
        boxShadow: isGold ? '0 10px 30px rgba(251, 191, 36, 0.1)' : undefined
      }}
    >
      {/* Popular/Current Tag */}
      {isCurrentActive && (
        <div style={{
          position: 'absolute',
          top: '-12px',
          right: '24px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#ffffff',
          fontSize: '0.72rem',
          fontWeight: 800,
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 4px 10px rgba(16, 185, 129, 0.4)'
        }}>
          ACTIVE PLAN
        </div>
      )}
      {!isCurrentActive && plan.is_popular && (
        <div style={{
          position: 'absolute',
          top: '-12px',
          right: '24px',
          background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
          color: '#ffffff',
          fontSize: '0.72rem',
          fontWeight: 800,
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)'
        }}>
          MOST POPULAR
        </div>
      )}

      <div>
        {/* Header & Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: isGold
              ? 'rgba(251, 191, 36, 0.15)'
              : isSilver
              ? 'rgba(56, 189, 248, 0.15)'
              : 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isGold ? 'var(--accent-gold)' : isSilver ? 'var(--primary)' : 'var(--text-muted)'
          }}>
            {isGold ? <Crown size={22} /> : isSilver ? <Sparkles size={22} /> : <ShieldCheck size={22} />}
          </div>
          <div>
            <h3 style={{ fontSize: '1.35rem', color: 'var(--text-main)' }}>{plan.name}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{plan.badge}</span>
          </div>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '24px', minHeight: '44px' }}>
          {plan.description}
        </p>

        {/* Duration Selection (for Silver and Gold) */}
        {!isFree && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
              Select Time Duration
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {plan.available_durations.map((d) => (
                <button
                  key={d.hours}
                  type="button"
                  onClick={() => setSelectedDuration(d.hours)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-sm)',
                    border: selectedDuration === d.hours
                      ? `1.5px solid ${isGold ? 'var(--accent-gold)' : 'var(--primary)'}`
                      : '1px solid var(--border-glass)',
                    background: selectedDuration === d.hours
                      ? (isGold ? 'rgba(251, 191, 36, 0.12)' : 'rgba(236, 72, 153, 0.12)')
                      : 'var(--bg-surface-elevated)',
                    color: selectedDuration === d.hours ? 'var(--text-main)' : 'var(--text-muted)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Display */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
              ₹{price}
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {isFree ? '/ permanent' : `for ${selectedDuration} hours`}
            </span>
          </div>
          {plan.discount_percent > 0 && (
            <div style={{
              display: 'inline-block',
              marginTop: '6px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(52, 211, 153, 0.15)',
              color: 'var(--accent-green)',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              ✨ Save {plan.discount_percent}% on all orders
            </div>
          )}
        </div>

        {/* Features List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {plan.features.map((feat, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <div style={{
                color: isGold ? 'var(--accent-gold)' : 'var(--primary)',
                marginTop: '3px',
                flexShrink: 0
              }}>
                <Check size={16} strokeWidth={2.5} />
              </div>
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div>
        {isFree ? (
          <button
            disabled
            className="btn btn-secondary"
            style={{ width: '100%', opacity: 0.6, cursor: 'default' }}
          >
            Included by Default
          </button>
        ) : isCurrentActive ? (
          <button
            disabled
            className="btn btn-secondary"
            style={{ width: '100%', borderColor: 'rgba(52, 211, 153, 0.4)', color: 'var(--accent-green)' }}
          >
            Currently Active
          </button>
        ) : (
          <button
            onClick={handleCheckout}
            disabled={processing}
            className={`btn ${isGold ? 'btn-gold' : 'btn-primary'}`}
            style={{ width: '100%' }}
          >
            {processing ? 'Opening Razorpay...' : (
              <>
                Upgrade to {plan.name.split(' ')[0]} <ArrowRight size={16} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
