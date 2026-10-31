import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AddressMap } from '../components/AddressMap';
import { Camera, Download, Save, Clock, Crown, Sparkles, ShieldCheck, Mail, Phone, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const Profile = () => {
  const { user, updateProfile, uploadAvatar, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [toast, setToast] = useState(null);
  const [remainingTime, setRemainingTime] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || {});
    }
  }, [user]);

  // Live countdown timer for active subscription
  useEffect(() => {
    const sub = user?.subscription;
    if (sub?.status !== 'active' || !sub?.expires_at) {
      return;
    }

    const updateTimer = () => {
      const expiresAt = new Date(sub.expires_at).getTime();
      const now = new Date().getTime();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setRemainingTime({ hours: 0, minutes: 0, seconds: 0 });
        refreshUser();
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setRemainingTime({ hours, minutes, seconds });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [user?.subscription?.expires_at, user?.subscription?.status]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name,
        phone,
        address
      });
      setToast({ type: 'success', message: 'Profile details and address updated successfully!' });
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      await uploadAvatar(file);
      setToast({ type: 'success', message: 'Profile picture uploaded to Cloudinary!' });
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to upload image' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDownloadProfilePdf = async () => {
    setDownloadingPdf(true);
    try {
      const token = localStorage.getItem('auramart_token');
      const res = await fetch(`${API_URL}/profile/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to generate profile document');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AuraMart_Profile_${user?.name?.replace(/\s+/g, '_') || 'User'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setToast({ type: 'success', message: 'Profile PDF downloaded successfully!' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const sub = user?.subscription || { plan: 'free', status: 'active' };
  const isPaidActive = sub.status === 'active' && sub.plan !== 'free';

  return (
    <div className="container" style={{ paddingBottom: '90px', paddingTop: '30px' }}>
      {/* Toast Alert */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '12px' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header with Download Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', marginBottom: '6px' }}>Account & Profile</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your personal details, delivery address, and VIP membership</p>
        </div>

        {/* 4.3 Profile Download Button */}
        <button
          onClick={handleDownloadProfilePdf}
          disabled={downloadingPdf}
          className="btn btn-secondary"
          style={{ borderColor: 'rgba(244, 114, 182, 0.5)', color: 'var(--primary)' }}
          title="Download profile information in PDF format"
        >
          <Download size={18} />
          {downloadingPdf ? 'Generating PDF...' : 'Download Profile (PDF)'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px' }}>
        {/* Left Column: Avatar & Membership Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Avatar Card (Cloudinary 4.1) */}
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', background: '#FFFFFF' }}>
            <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto 20px' }}>
              <img
                src={user?.avatar_thumb || user?.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                alt={user?.name}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--primary)',
                  boxShadow: '0 0 25px rgba(244, 114, 182, 0.3)'
                }}
              />
              <label
                htmlFor="avatar-input"
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(236, 72, 153, 0.4)',
                  transition: 'transform 0.2s'
                }}
                title="Upload Profile Picture to Cloudinary"
              >
                <Camera size={18} />
              </label>
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                style={{ display: 'none' }}
              />
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{user?.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '14px' }}>{user?.email}</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className={`badge ${user?.is_verified ? 'badge-active' : 'badge-expired'}`}>
                {user?.is_verified ? '✓ Verified Account' : '⚠ Unverified'}
              </span>
              <span className="badge badge-free">
                {user?.role?.toUpperCase()}
              </span>
            </div>

            {uploadingAvatar && (
              <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '12px' }}>
                Uploading to Cloudinary CDN...
              </p>
            )}
          </div>

          {/* Membership Tier & Expiration Countdown Card */}
          <div className="glass-panel" style={{
            padding: '24px',
            background: '#FFFFFF',
            border: sub.plan === 'gold'
              ? '1.5px solid rgba(245, 158, 11, 0.45)'
              : sub.plan === 'silver'
              ? '1.5px solid rgba(244, 114, 182, 0.45)'
              : '1px solid var(--border-glass)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: sub.plan === 'gold' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(244, 114, 182, 0.12)',
                color: sub.plan === 'gold' ? 'var(--accent-gold)' : 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {sub.plan === 'gold' ? <Crown size={20} /> : <Sparkles size={20} />}
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  {sub.plan.toUpperCase()} MEMBERSHIP
                </h4>
                <span className={`badge ${sub.status === 'active' ? 'badge-active' : 'badge-expired'}`} style={{ fontSize: '0.7rem' }}>
                  {sub.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Live Countdown if active paid plan */}
            {isPaidActive ? (
              <div style={{
                background: '#FFF0F5',
                border: '1px solid rgba(244, 114, 182, 0.25)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                textAlign: 'center',
                boxShadow: '0 2px 10px rgba(244, 114, 182, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--primary)', marginBottom: '4px' }}>
                  <Clock size={14} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase' }}>Time Until Expiration</span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace', color: '#BE185D' }}>
                  {String(remainingTime.hours).padStart(2, '0')}:
                  {String(remainingTime.minutes).padStart(2, '0')}:
                  {String(remainingTime.seconds).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Expires: {new Date(sub.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                {sub.status === 'expired'
                  ? 'Your previous pass expired. Upgrade to reactivate discounts.'
                  : 'You are currently on the Free Tier with standard benefits.'}
              </p>
            )}

            <Link
              to="/plans"
              className="btn btn-primary btn-sm"
              style={{ width: '100%', fontSize: '0.88rem' }}
            >
              {isPaidActive ? 'Extend / Upgrade Pass' : 'Unlock VIP Pass →'}
            </Link>
          </div>

        </div>

        {/* Right Column: Profile Details & Address Form */}
        <div className="glass-panel" style={{ padding: '36px', background: '#FFFFFF' }}>
          <form onSubmit={handleSaveProfile}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              Personal Information
            </h2>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={phone}
                  placeholder="+91 98765 43210"
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Registered Email Address</label>
              <input
                type="email"
                className="form-input"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.8, cursor: 'not-allowed', background: '#FAF7F5' }}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: '4px', display: 'block' }}>
                Email address is permanently linked with your verified account.
              </span>
            </div>

            {/* 4.2 Address & Auto-Suggestions with Map */}
            <h2 style={{ fontSize: '1.4rem', marginTop: '36px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              Shipping Address & Map Location
            </h2>

            <AddressMap
              initialAddress={address}
              onAddressChange={(updatedAddr) => setAddress(updatedAddr)}
            />

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: '12px 30px' }}
              >
                <Save size={18} />
                {saving ? 'Saving Profile...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
