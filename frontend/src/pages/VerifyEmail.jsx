import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, ArrowRight, Mail, RefreshCw } from 'lucide-react';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const { verifyOtp, resendVerification } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('verifying');
    setMessage('');
    try {
      const result = await verifyOtp(email, otp);
      setStatus('success');
      setMessage(result.message || 'Email verified successfully.');
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setMessage('');
    try {
      const result = await resendVerification(email);
      setStatus('idle');
      setOtp('');
      setMessage(result.message);
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '40px 32px', textAlign: 'center', background: '#FFFFFF', boxShadow: '0 20px 40px -15px rgba(220, 140, 165, 0.12)' }}>
        {status === 'success' ? (
          <div>
            <CheckCircle2 size={48} color="var(--accent-green)" style={{ margin: '0 auto 18px' }} />
            <h1 style={{ fontSize: '1.7rem', marginBottom: '10px' }}>Email Verified</h1>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>{message}</p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
              Continue to Login <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(244, 114, 182, 0.12)', display: 'grid', placeItems: 'center', color: 'var(--primary)', margin: '0 auto 16px' }}>
              <Mail size={24} />
            </div>
            <h1 style={{ fontSize: '1.7rem', marginBottom: '8px' }}>Verify Your Email</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.55, marginBottom: '24px' }}>
              Enter the six-digit code sent to your inbox. It expires in 10 minutes.
            </p>

            {message && (
              <div role="status" style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '12px', borderRadius: '8px', background: status === 'error' ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)', color: status === 'error' ? '#be123c' : '#166534', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'left' }}>
                {status === 'error' ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="verification-email">Email Address</label>
                <input
                  id="verification-email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="verification-code">Six-digit code</label>
                <input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  className="form-input"
                  style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.35em', fontVariantNumeric: 'tabular-nums' }}
                  placeholder="000000"
                  value={otp}
                  onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
              <button type="submit" disabled={status === 'verifying'} className="btn btn-primary" style={{ width: '100%' }}>
                {status === 'verifying' ? 'Verifying...' : <>Verify Email <ArrowRight size={17} /></>}
              </button>
            </form>

            <button type="button" onClick={handleResend} disabled={resending || !email} className="btn btn-secondary" style={{ width: '100%', marginTop: '12px' }}>
              <RefreshCw size={16} /> {resending ? 'Sending code...' : 'Resend code'}
            </button>
            <div style={{ marginTop: '20px' }}>
              <Link to="/login" style={{ color: 'var(--primary)', fontSize: '0.88rem', fontWeight: 600 }}>Back to Login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
