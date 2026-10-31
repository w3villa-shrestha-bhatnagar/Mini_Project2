import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, Sparkles, ArrowRight, ArrowLeft, CreditCard, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const CartDrawer = () => {
  const [showPaymentStep, setShowPaymentStep] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState('online');
  const [demoQr, setDemoQr] = React.useState('');
  const [demoQrExpiresAt, setDemoQrExpiresAt] = React.useState(null);
  const [demoQrSecondsRemaining, setDemoQrSecondsRemaining] = React.useState(300);
  const [demoQrRefreshVersion, setDemoQrRefreshVersion] = React.useState(0);
  const [pendingDemoOrder, setPendingDemoOrder] = React.useState(null);
  const [processingPayment, setProcessingPayment] = React.useState(false);
  const [paymentError, setPaymentError] = React.useState('');
  const [paymentComplete, setPaymentComplete] = React.useState(false);
  const [showCodUnavailable, setShowCodUnavailable] = React.useState(false);
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    subtotal,
    discountPercent,
    discountAmount,
    shippingFee,
    total,
    lastAddedProduct,
    cartAddVersion,
    clearLastAddedProduct
  } = useCart();
  const { user } = useAuth();

  React.useEffect(() => {
    if (!lastAddedProduct) return;

    const timer = setTimeout(() => {
      clearLastAddedProduct();
    }, 1600);

    return () => clearTimeout(timer);
  }, [lastAddedProduct, clearLastAddedProduct]);

  React.useEffect(() => {
    if (!isCartOpen || !showPaymentStep || paymentMethod !== 'online') {
      setDemoQr('');
      setDemoQrExpiresAt(null);
      return undefined;
    }

    let active = true;
    const generatedAt = Date.now();
    const expiresAt = generatedAt + 5 * 60 * 1000;
    setDemoQrExpiresAt(expiresAt);
    setDemoQrSecondsRemaining(300);

    QRCode.toDataURL(JSON.stringify({
      type: 'AURAMART_DEMO_UPI_QR_NOT_PAYABLE',
      amount_inr: total,
      items: items.map(item => ({ id: item.id, quantity: item.quantity })),
      generated_at: generatedAt,
      expires_at: expiresAt
    }), {
      width: 180,
      margin: 1,
      color: { dark: '#17202a', light: '#ffffff' }
    }).then(qr => {
      if (active) setDemoQr(qr);
    }).catch(() => {
      if (active) setDemoQr('');
    });

    const timerId = window.setInterval(() => {
      setDemoQrSecondsRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    }, 1000);

    return () => {
      active = false;
      window.clearInterval(timerId);
    };
  }, [isCartOpen, showPaymentStep, paymentMethod, items, total, demoQrRefreshVersion]);

  React.useEffect(() => {
    setPendingDemoOrder(null);
    setPaymentComplete(false);
  }, [items]);

  React.useEffect(() => {
    setShowPaymentStep(false);
    setPaymentMethod('online');
    setPaymentError('');
    setShowCodUnavailable(false);
  }, [cartAddVersion]);

  const verifyProductPayment = async (orderId, paymentId, signature) => {
    const token = localStorage.getItem('auramart_token');
    const response = await fetch(`${API_URL}/payments/products/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Payment verification failed.');
    setPendingDemoOrder(null);
    setPaymentComplete(true);
    setPaymentError('');
  };

  const startRazorpayPayment = async () => {
    const token = localStorage.getItem('auramart_token');
    if (!token || !user) {
      setPaymentError('Please log in before continuing with online payment.');
      return;
    }

    setProcessingPayment(true);
    setPaymentError('');
    try {
      const createResponse = await fetch(`${API_URL}/payments/products/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: items.map(item => ({ product_id: String(item.id), quantity: item.quantity }))
        })
      });
      const orderData = await createResponse.json();
      if (!createResponse.ok) throw new Error(orderData.detail || 'Could not create your order.');

      const { order, user_info: userInfo } = orderData;
      if (order.is_mock) {
        setPendingDemoOrder(order);
        setProcessingPayment(false);
        return;
      }
      if (!window.Razorpay) throw new Error('Razorpay checkout could not be loaded. Please try again.');

      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'AuraMart',
        description: `Shopping cart (${items.length} products)`,
        order_id: order.order_id,
        prefill: {
          name: userInfo?.name || user?.name || '',
          email: userInfo?.email || user?.email || '',
          contact: userInfo?.phone || user?.phone || ''
        },
        theme: { color: '#ec4899' },
        handler: async response => {
          try {
            await verifyProductPayment(
              response.razorpay_order_id || order.order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
          } catch (error) {
            setPaymentError(error.message);
          } finally {
            setProcessingPayment(false);
          }
        },
        modal: { ondismiss: () => setProcessingPayment(false) }
      });
      checkout.on('payment.failed', response => {
        setPaymentError(response.error?.description || 'Payment failed. Please try again.');
        setProcessingPayment(false);
      });
      checkout.open();
    } catch (error) {
      setPaymentError(error.message);
      setProcessingPayment(false);
    }
  };

  const completeDemoPayment = async () => {
    if (!pendingDemoOrder) return;
    setProcessingPayment(true);
    try {
      await verifyProductPayment(
        pendingDemoOrder.order_id,
        `pay_demo_${Date.now()}`,
        'demo_signature'
      );
    } catch (error) {
      setPaymentError(error.message);
    } finally {
      setProcessingPayment(false);
    }
  };

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
        {lastAddedProduct && (
          <div style={{
            margin: '12px 0 0',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            color: '#166534',
            borderRadius: '10px',
            padding: '10px 12px',
            fontWeight: 700,
            fontSize: '0.82rem'
          }}>
            ADDED {lastAddedProduct.toUpperCase()}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '18px', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {showPaymentStep && (
              <button
                type="button"
                aria-label="Back to Your Aura Bag"
                title="Back to Your Aura Bag"
                onClick={() => setShowPaymentStep(false)}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', border: '1px solid var(--border-glass)', borderRadius: '8px', background: '#FFFFFF', color: 'var(--text-main)', cursor: 'pointer' }}
              >
                <ArrowLeft size={18} />
              </button>
            )}
            {showPaymentStep ? <CreditCard size={22} color="var(--primary)" /> : <ShoppingBag size={22} color="var(--primary)" />}
            <h3 style={{ fontSize: '1.25rem' }}>{showPaymentStep ? 'Payment' : `Your Aura Bag (${items.length})`}</h3>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Plan Perk Banner */}
        {!showPaymentStep && (discountPercent > 0 ? (
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
        ))}

        {/* Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {showPaymentStep ? (
            <div style={{ padding: '16px 4px' }}>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>Choose a payment method</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.5, marginBottom: '20px' }}>
                Select a payment option for your AuraMart order.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  type="button"
                  aria-pressed={paymentMethod === 'online'}
                  onClick={() => { setPaymentMethod('online'); setPaymentError(''); setShowCodUnavailable(false); }}
                  style={{ textAlign: 'left', padding: '16px', border: paymentMethod === 'online' ? '1px solid var(--primary)' : '1px solid var(--border-glass)', borderRadius: '10px', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: paymentMethod === 'online' ? '0 8px 22px rgba(236, 72, 153, 0.18)' : '0 3px 12px rgba(31, 41, 55, 0.07)', cursor: 'pointer' }}
                >
                  <input type="radio" name="payment-method" value="online" checked={paymentMethod === 'online'} readOnly />
                  <div>
                    <div style={{ fontWeight: 700 }}>Online payment</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '3px' }}>Razorpay: UPI, cards, and net banking</div>
                  </div>
                </button>
                <button
                  type="button"
                  aria-pressed={paymentMethod === 'cod'}
                  onClick={() => { setPaymentMethod('cod'); setShowCodUnavailable(true); }}
                  style={{ textAlign: 'left', padding: '16px', border: paymentMethod === 'cod' ? '1px solid var(--primary)' : '1px solid var(--border-glass)', borderRadius: '10px', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: paymentMethod === 'cod' ? '0 8px 22px rgba(236, 72, 153, 0.18)' : '0 3px 12px rgba(31, 41, 55, 0.07)', cursor: 'pointer' }}
                >
                  <input type="radio" name="payment-method" value="cod" checked={paymentMethod === 'cod'} readOnly />
                  <div>
                    <div style={{ fontWeight: 700 }}>Cash on delivery</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '3px' }}>Pay when your order arrives</div>
                  </div>
                </button>
              </div>

              {paymentMethod === 'online' && (
                <div style={{ marginTop: '16px', padding: '18px', border: '1px solid var(--border-glass)', borderRadius: '10px', background: '#FFFFFF', boxShadow: '0 8px 24px rgba(31, 41, 55, 0.08)', textAlign: 'center' }}>
                  {demoQrExpiresAt && (
                    <div style={{ marginBottom: '12px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: demoQrSecondsRemaining > 0 ? 'var(--text-main)' : '#b91c1c' }}>
                      {demoQrSecondsRemaining > 0
                        ? `QR expires in ${String(Math.floor(demoQrSecondsRemaining / 60)).padStart(2, '0')}:${String(demoQrSecondsRemaining % 60).padStart(2, '0')}`
                        : 'QR expired'}
                    </div>
                  )}
                  {demoQr && demoQrSecondsRemaining > 0 && <img src={demoQr} alt="Demo-only AuraMart QR code; not payable" style={{ width: '180px', height: '180px', display: 'block', margin: '0 auto 14px', imageRendering: 'pixelated' }} />}
                  {demoQrSecondsRemaining === 0 && (
                    <button type="button" onClick={() => setDemoQrRefreshVersion(version => version + 1)} style={{ margin: '0 0 14px', border: 0, background: 'transparent', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>
                      Generate a new QR
                    </button>
                  )}
                  {paymentComplete ? (
                    <div style={{ color: '#166534', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={18} /> Payment confirmed. Your cart is still saved.
                    </div>
                  ) : pendingDemoOrder ? (
                    <button type="button" className="btn btn-primary" onClick={completeDemoPayment} disabled={processingPayment} style={{ width: '100%' }}>
                      {processingPayment ? 'Confirming...' : `Complete demo payment · ₹${total.toLocaleString('en-IN')}`}
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={startRazorpayPayment} disabled={processingPayment} style={{ width: '100%' }}>
                      {processingPayment ? 'Opening Razorpay...' : `Pay with Razorpay · ₹${total.toLocaleString('en-IN')}`}
                    </button>
                  )}
                  {paymentError && <p role="alert" style={{ color: '#b91c1c', fontSize: '0.82rem', margin: '12px 0 0' }}>{paymentError}</p>}
                </div>
              )}
            </div>
          ) : items.length === 0 ? (
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
                if (showPaymentStep) {
                  setShowPaymentStep(false);
                  setPaymentError('');
                  setShowCodUnavailable(false);
                } else {
                  setShowPaymentStep(true);
                }
              }}
              className="btn btn-primary"
              style={{ width: '100%', fontSize: '1rem', padding: '14px' }}
            >
              {showPaymentStep ? <><ArrowLeft size={18} /> Back to Your Aura Bag</> : <>Continue <ArrowRight size={18} /></>}
            </button>
          </div>
        )}

        {showCodUnavailable && (
          <div role="presentation" onClick={() => { setShowCodUnavailable(false); setPaymentMethod('online'); }} style={{ position: 'fixed', inset: 0, zIndex: 20, background: 'rgba(17, 24, 39, 0.46)', display: 'grid', placeItems: 'center', padding: '20px' }}>
            <div role="dialog" aria-modal="true" aria-labelledby="cod-unavailable-title" onClick={event => event.stopPropagation()} style={{ width: '100%', maxWidth: '360px', padding: '24px', background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 16px 44px rgba(17, 24, 39, 0.22)', textAlign: 'center' }}>
              <h3 id="cod-unavailable-title" style={{ margin: '0 0 10px', fontSize: '1.1rem' }}>Cash on delivery unavailable</h3>
              <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', lineHeight: 1.5 }}>Cash on delivery is not available at your location. Please choose online payment instead.</p>
              <button type="button" className="btn btn-primary" onClick={() => { setShowCodUnavailable(false); setPaymentMethod('online'); }} style={{ width: '100%' }}>
                Choose online payment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
