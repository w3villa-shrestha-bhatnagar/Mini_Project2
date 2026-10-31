import React from 'react';
import { StoresMap } from '../components/StoresMap';
import { MapPin } from 'lucide-react';

export const Stores = () => {
  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '28px', textAlign: 'center' }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: '0 0 24px rgba(236, 72, 153, 0.4)'
        }}>
          <MapPin size={26} color="#fff" />
        </div>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '8px' }}>AuraMart Store Location</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.98rem' }}>
          Find us at Noida Sector 58
        </p>
      </div>
      <StoresMap />
    </div>
  );
};
