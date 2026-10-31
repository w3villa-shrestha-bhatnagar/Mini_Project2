import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Mail, Lock, ArrowRight, AlertCircle, CheckCircle, RefreshCw, Shield } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);
  const googleBtnRef = useRef(null);

  const { login, socialLogin, resendVerification } = useAuth();
  const navigate = useNavigate();

  const handleStandardLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsUnverified(false);
    setResendStatus(null);
    setLoading(true);

    try {
      const data = await login(email, password);
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/profile');
      }
    } catch (err) {
      setError(err.message);
      if (err.isUnverified) {
        setIsUnverified(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setError('');
    setIsUnverified(false);
    setLoading(true);

    try {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      // 1. If Google and real Client ID is available, try Google OAuth2 popup
      if (provider === 'google' && window.google?.accounts?.oauth2 && googleClientId && !googleClientId.startsWith('placeholder_')) {
        try {
          const tokenResponse = await new Promise((resolve, reject) => {
            const client = window.google.accounts.oauth2.initTokenClient({
              client_id: googleClientId,
              scope: 'email profile openid',
              callback: (res) => {
                if (res.error) reject(new Error(res.error_description || res.error));
                else if (res.access_token) resolve(res);
                else reject(new Error('No token returned from Google'));
              },
              error_callback: (err) => reject(new Error(err.message || 'Google Sign-In failed'))
            });
            client.requestAccessToken();
          });

          if (tokenResponse?.access_token) {
            const data = await socialLogin('google', { token: tokenResponse.access_token });
            if (data.is_merged) {
              alert(`Account merged successfully! Linked with ${data.user.email}`);
            }
            navigate('/profile');
            return;
          }
        } catch (gErr) {
          console.warn("Google popup was cancelled or failed, falling back to direct input:", gErr);
        }
      }

      // 2. Direct Social Login with Real Email (prevents hardcoded dummy data)
      const inputEmail = email.trim() || window.prompt(`Enter your ${provider.toUpperCase()} account email address:`);
      if (!inputEmail) {
        setLoading(false);
        return;
      }

      const derivedName = inputEmail.split('@')[0];
      const socialToken = `mock_${provider}___${inputEmail}___${derivedName}`;
      const data = await socialLogin(provider, {
        token: socialToken,
        email: inputEmail,
        name: derivedName
      });

      if (data.is_merged) {
        alert(`Account merged successfully! Linked with ${data.user.email}`);
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
    setIsUnverified(false);
    setLoading(true);

    try {
      const data = await socialLogin('google', {
        token: response.credential,
        email: '',
        name: ''
      });

      if (data.is_merged) {
        alert(`Account merged successfully! Linked with ${data.user.email}`);
      }
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const data = await resendVerification(email);
      setResendStatus({
        type: 'success',
        message: data.message,
        dev_url: data.dev_verification_url
      });
    } catch (err) {
      setResendStatus({
        type: 'error',
        message: err.message
      });
    }
  };

  const quickFillAdmin = () => {
    setEmail('admin@auramart.com');
    setPassword('Admin@123');
  };

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="glass-panel" style={{ maxWidth: '460px', width: '100%', padding: '40px 32px', background: '#FFFFFF', boxShadow: '0 20px 40px -15px rgba(220, 140, 165, 0.12)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #F472B6, #FB7185)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 4px 16px rgba(244, 114, 182, 0.35)'
          }}>
            <Sparkles size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Log in to manage your orders, VIP pass, and address
          </p>
        </div>

        {/* Unverified Account Alert */}
        {isUnverified && (
          <div style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.28)',
            color: 'var(--accent-gold)',
            fontSize: '0.88rem',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 700 }}>
              <AlertCircle size={18} />
              <span>Email Not Verified</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: '12px' }}>
              Only verified accounts can access the dashboard. Please verify your email via the confirmation link sent to your inbox.
            </p>
            <button
              type="button"
              onClick={handleResendVerification}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', background: '#FFFFFF', color: 'var(--accent-gold)' }}
            >
              <RefreshCw size={14} /> Resend Verification Link
            </button>

            {resendStatus?.dev_url && (
              <div style={{ marginTop: '10px' }}>
                <a
                  href={resendStatus.dev_url}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                >
                  Verify Email Now (Dev Link) →
                </a>
              </div>
            )}
          </div>
        )}

        {/* Regular Error Alert */}
        {error && !isUnverified && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            color: '#E11D48',
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

        {/* Social Login Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            className="btn btn-secondary"
            style={{ width: '100%', gap: '12px', background: '#FFFFFF', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('facebook')}
            disabled={loading}
            className="btn btn-secondary"
            style={{ width: '100%', gap: '12px', background: '#FFFFFF', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)' }}
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
          <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or sign in with credentials</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
        </div>

        {/* Standard Form */}
        <form onSubmit={handleStandardLogin}>
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
            {loading ? 'Authenticating...' : (
              <>Sign In <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        {/* Demo Quick Fill for Admin */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={quickFillAdmin}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-subtle)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Shield size={13} /> Quick Fill Default Admin Credentials
          </button>
        </div>

        {/* Footer switch */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Don't have an account yet?{' '}
          <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};
