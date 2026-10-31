import React, { useState } from 'react';
import { Check, Sparkles, Crown, Clock, ArrowRight, ShieldCheck, Smartphone, CreditCard, X } from 'lucide-react';
import { siPhonepe, siPaytm } from 'simple-icons';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const BrandIcon = ({ icon }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" focusable="false">
    <path d={icon.path} fill={`#${icon.hex}`} />
  </svg>
);

export const PlanCard = ({ plan, user, onPaymentSuccess, onPaymentError }) => {
  const [selectedDuration, setSelectedDuration] = useState(plan.available_durations[0]?.hours || 0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('upi');
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState('');
  const [upiQrExpiresAt, setUpiQrExpiresAt] = useState(null);
  const [upiSecondsRemaining, setUpiSecondsRemaining] = useState(300);

  const activePlanId = user?.subscription?.plan || 'free';
  const isCurrentActive = activePlanId === plan.id && user?.subscription?.status === 'active';
  const isGold = plan.id === 'gold';
  const isSilver = plan.id === 'silver';
  const isFree = plan.id === 'free';

  const currentDurationObj = plan.available_durations.find(d => d.hours === selectedDuration) || plan.available_durations[0];
  const price = currentDurationObj?.price || 0;

  const generateDemoUpiQr = async () => {
    const generatedAt = Date.now();
    const expiresAt = generatedAt + 5 * 60 * 1000;
    const payload = JSON.stringify({
      type: 'AURAMART_DEMO_UPI_QR_NOT_PAYABLE',
      plan: plan.id,
      duration_hours: selectedDuration,
      amount_inr: price,
      generated_at: generatedAt,
      expires_at: expiresAt
    });

    try {
      const qrDataUrl = await QRCode.toDataURL(payload, {
        width: 200,
        margin: 1,
        color: { dark: '#17202a', light: '#ffffff' }
      });
      setUpiQrDataUrl(qrDataUrl);
      setUpiQrExpiresAt(expiresAt);
      setUpiSecondsRemaining(300);
    } catch (error) {
      onPaymentError('Could not generate the demo UPI QR. Please use Razorpay checkout.');
    }
  };

  React.useEffect(() => {
    if (!upiQrExpiresAt) return undefined;

    const updateRemainingTime = () => {
      setUpiSecondsRemaining(Math.max(0, Math.ceil((upiQrExpiresAt - Date.now()) / 1000)));
    };
    updateRemainingTime();
    const timerId = window.setInterval(updateRemainingTime, 1000);
    return () => window.clearInterval(timerId);
  }, [upiQrExpiresAt]);

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
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay using UPI",
                instruments: [{ method: "upi" }]
              },
              other: {
                name: "Other payment methods",
                instruments: [
                  { method: "card" },
                  { method: "netbanking" },
                  { method: "wallet" }
                ]
              }
            },
            sequence: selectedPaymentMethod === 'other'
              ? ["block.other", "block.upi"]
              : ["block.upi", "block.other"],
            preferences: { show_default_blocks: false }
          }
        },
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
    <>
    <div
      className="glass-panel card-hover"
      style={{
        padding: '36px 28px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#FFFFFF',
        border: isGold
          ? '1.5px solid rgba(245, 158, 11, 0.45)'
          : isSilver
          ? '1.5px solid rgba(244, 114, 182, 0.45)'
          : '1px solid var(--border-glass)',
        boxShadow: isGold
          ? '0 10px 30px rgba(245, 158, 11, 0.12)'
          : isSilver
          ? '0 10px 30px rgba(244, 114, 182, 0.12)'
          : undefined
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
          boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
        }}>
          ACTIVE PLAN
        </div>
      )}
      {!isCurrentActive && plan.is_popular && (
        <div style={{
          position: 'absolute',
          top: '-12px',
          right: '24px',
          background: 'linear-gradient(135deg, #F472B6, #FB7185)',
          color: '#ffffff',
          fontSize: '0.72rem',
          fontWeight: 800,
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 4px 10px rgba(244, 114, 182, 0.35)'
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
              ? 'rgba(245, 158, 11, 0.12)'
              : isSilver
              ? 'rgba(244, 114, 182, 0.12)'
              : 'rgba(0, 0, 0, 0.04)',
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
                      ? (isGold ? 'rgba(245, 158, 11, 0.12)' : 'rgba(244, 114, 182, 0.14)')
                      : '#FFFFFF',
                    color: selectedDuration === d.hours ? 'var(--text-main)' : 'var(--text-muted)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: selectedDuration === d.hours ? '0 2px 6px rgba(244, 114, 182, 0.15)' : undefined
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
            onClick={() => setShowPaymentOptions(true)}
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
    {showPaymentOptions && (
      <div
        role="presentation"
        onClick={() => !processing && setShowPaymentOptions(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(17, 24, 39, 0.52)', display: 'grid', placeItems: 'center', padding: '20px' }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={`payment-options-title-${plan.id}`}
          onClick={event => event.stopPropagation()}
          style={{ width: '100%', maxWidth: '440px', padding: '24px', background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 20px 60px rgba(17, 24, 39, 0.24)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
            <div>
              <p style={{ margin: '0 0 5px', color: 'var(--primary)', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase' }}>Checkout</p>
              <h2 id={`payment-options-title-${plan.id}`} style={{ margin: 0, fontSize: '1.35rem' }}>Payment Options</h2>
              <p style={{ margin: '7px 0 0', color: 'var(--text-muted)', fontSize: '0.86rem' }}>{plan.name} · {selectedDuration} hours · ₹{price}</p>
            </div>
            <button
              type="button"
              aria-label="Close payment options"
              onClick={() => setShowPaymentOptions(false)}
              disabled={processing}
              style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            >
              <X size={21} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { id: 'upi', label: 'UPI apps' },
              { id: 'other', label: 'Other methods' }
            ].map(option => (
              <button
                key={option.id}
                type="button"
                aria-pressed={selectedPaymentMethod === option.id}
                onClick={() => {
                  setSelectedPaymentMethod(option.id);
                  if (option.id === 'upi') {
                    generateDemoUpiQr();
                  } else {
                    setUpiQrDataUrl('');
                    setUpiQrExpiresAt(null);
                  }
                }}
                style={{ minHeight: '76px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px 8px', borderRadius: '8px', border: selectedPaymentMethod === option.id ? '1.5px solid var(--primary)' : '1px solid var(--border-glass)', background: selectedPaymentMethod === option.id ? 'rgba(244, 114, 182, 0.1)' : '#FFFFFF', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  {option.id === 'upi' ? <Smartphone size={18} /> : <CreditCard size={18} />}
                  {option.label}
                </span>
                {option.id === 'upi' && (
                  <span aria-label="PhonePe and Paytm supported UPI apps" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <span title="PhonePe"><BrandIcon icon={siPhonepe} /></span>
                    <span title="Paytm"><BrandIcon icon={siPaytm} /></span>
                  </span>
                )}
              </button>
            ))}
          </div>
          <p style={{ margin: '10px 0 20px', color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.45 }}>
            {selectedPaymentMethod === 'other'
              ? 'Cards, net banking, and wallets will appear first in Razorpay.'
              : 'PhonePe and Paytm are available through Razorpay UPI where supported.'}
          </p>
          {selectedPaymentMethod === 'upi' && upiQrDataUrl && (
            <div style={{ marginBottom: '18px', padding: '16px', border: '1px solid var(--border-glass)', borderRadius: '10px', textAlign: 'center', background: '#FFFFFF' }}>
              <div style={{ marginBottom: '10px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: upiSecondsRemaining > 0 ? 'var(--text-main)' : '#b91c1c' }}>
                {upiSecondsRemaining > 0
                  ? `QR expires in ${String(Math.floor(upiSecondsRemaining / 60)).padStart(2, '0')}:${String(upiSecondsRemaining % 60).padStart(2, '0')}`
                  : 'QR expired'}
              </div>
              <img src={upiQrDataUrl} alt="Demo-only UPI QR code; not a payment code" style={{ display: 'block', width: '180px', height: '180px', margin: '0 auto 8px', imageRendering: 'pixelated' }} />
              <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Demo QR only. Complete real payments through Razorpay.</div>
              {upiSecondsRemaining === 0 && (
                <button type="button" onClick={generateDemoUpiQr} style={{ marginTop: '10px', border: 0, background: 'transparent', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>
                  Generate a new QR
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={processing}
            className={`btn ${isGold ? 'btn-gold' : 'btn-primary'}`}
            style={{ width: '100%' }}
          >
            {processing ? 'Opening Razorpay...' : <>Continue to payment <ArrowRight size={17} /></>}
          </button>
        </section>
      </div>
    )}
    </>
  );
};
