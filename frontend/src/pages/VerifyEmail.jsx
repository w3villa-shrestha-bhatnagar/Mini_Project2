import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token in link. Please check the URL.');
      return;
    }

    verifyEmail(token)
      .then(data => {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.message || 'Verification link expired or invalid.');
      });
  }, [token]);

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '48px 36px', textAlign: 'center' }}>
        {status === 'verifying' && (
          <div>
            <Loader2 size={48} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>Verifying Your Email...</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
              Validating your security token with AuraMart auth servers.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(52, 211, 153, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              border: '2px solid var(--accent-green)'
            }}>
              <CheckCircle2 size={36} color="var(--accent-green)" />
            </div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '12px' }}>Account Activated!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '32px', lineHeight: 1.6 }}>
              {message} You are now officially verified and can access your dashboard and VIP member passes.
            </p>
            <Link to="/profile" className="btn btn-primary" style={{ width: '100%', padding: '14px' }}>
              Go to Profile & Dashboard <ArrowRight size={18} />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              border: '2px solid #fb7185'
            }}>
              <AlertCircle size={36} color="#fb7185" />
            </div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '12px' }}>Verification Failed</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '32px', lineHeight: 1.6 }}>
              {message}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
                Go to Login Page
              </Link>
              <Link to="/signup" className="btn btn-secondary" style={{ width: '100%' }}>
                Create New Account
              </Link>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
