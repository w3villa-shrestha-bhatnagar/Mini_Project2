import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Mail, Lock, User, ArrowRight, CheckCircle, AlertCircle, Info } from 'lucide-react';

export const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  const googleBtnRef = useRef(null);

  const { signup, socialLogin } = useAuth();
  const navigate = useNavigate();

  const handleStandardSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await signup(name, email, password);
      setSuccessInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignup = async (provider) => {
    setError('');
    setLoading(true);

    try {
      // Social login supports simulated tokens or real client tokens
      const mockSocialToken = `mock_${provider}___${email || (provider + "_user@example.com")}___${name || (provider.toUpperCase() + " Member")}`;
      const data = await socialLogin(provider, {
        token: mockSocialToken,
        email: email || `${provider}_user@example.com`,
        name: name || `${provider.toUpperCase()} Member`
      });

      if (data.is_merged) {
        alert(`Account merged! We linked your ${provider.toUpperCase()} login to your existing account with ${data.user.email}.`);
      }
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initialize Google Identity Services
  useEffect(() => {
    if (window.google && google.accounts && google.accounts.id) {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (clientId && clientId !== 'your_google_client_id.apps.googleusercontent.com') {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        if (googleBtnRef.current) {
          google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            type: 'standard',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left'
          });
        }
      }
    }
  }, []);

  const handleGoogleCredentialResponse = async (response) => {
    setError('');
    setLoading(true);

    try {
      const data = await socialLogin('google', {
        token: response.credential,
        email: '',
        name: ''
      });

      if (data.is_merged) {
        alert(`Account merged! We linked your Google login to your existing account with ${data.user.email}.`);
      }
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '40px 32px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 0 20px rgba(236, 72, 153, 0.4)'
          }}>
            <Sparkles size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Create Your Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Join AuraMart VIP Club for exclusive member perks
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fb7185',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success / Verification Link Banner */}
        {successInfo ? (
          <div style={{
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(52, 211, 153, 0.1)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            color: 'var(--text-main)',
            textAlign: 'center'
          }}>
            <CheckCircle size={48} color="var(--accent-green)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Verification Email Sent!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '20px' }}>
              We have sent a verification link to <b>{email}</b>. You must click the confirmation link to activate your account before logging in.
            </p>

            {/* Development shortcut button */}
            {successInfo.dev_verification_url && (
              <div style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px dashed var(--border-glass)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                marginTop: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--primary)', marginBottom: '8px', fontWeight: 600 }}>
                  <Info size={14} /> Local Dev Helper
                </div>
                <a
                  href={successInfo.dev_verification_url}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                >
                  Click here to verify instantly →
                </a>
              </div>
            )}

            <div style={{ marginTop: '20px' }}>
              <Link to="/login" style={{ color: 'var(--primary)', fontSize: '0.88rem', textDecoration: 'none', fontWeight: 600 }}>
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Social Signup Buttons (Google & Facebook) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div
                ref={googleBtnRef}
                style={{ width: '100%' }}
              />
              <button
                type="button"
                onClick={() => handleSocialSignup('facebook')}
                disabled={loading}
                className="btn btn-secondary"
                style={{ width: '100%', gap: '12px', background: 'var(--bg-surface-elevated)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Continue with Facebook (Demo)
              </button>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or sign up with email</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
            </div>

            {/* Standard Signup Form */}
            <form onSubmit={handleStandardSignup}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-subtle)' }} />
                  <input
                    type="text"
                    required
                    className="form-input"
                    style={{ paddingLeft: '42px' }}
                    placeholder="Alex Mercer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-subtle)' }} />
                  <input
                    type="email"
                    required
                    className="form-input"
                    style={{ paddingLeft: '42px' }}
                    placeholder="alex@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-subtle)' }} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="form-input"
                    style={{ paddingLeft: '42px' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px' }}
              >
                {loading ? 'Creating Account...' : (
                  <>Create Account <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            {/* Footer switch */}
            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                Log In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
