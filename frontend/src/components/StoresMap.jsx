import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';

const AURA_NOIDA = {
  name: 'AuraMart - Noida Sector 58',
  address: 'Sector 58, Noida, Uttar Pradesh 201301, India',
  phone: '+91-XXXXXXXXXX',
  lat: 28.6050,
  lng: 77.3560
};

export const StoresMap = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [AURA_NOIDA.lat, AURA_NOIDA.lng],
      zoom: 15,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    const icon = L.divIcon({
      className: 'aura-map-pin',
      html: `<div style="background: linear-gradient(135deg, #ec4899, #f43f5e); color: white; width: 38px; height: 38px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 18px rgba(236, 72, 153, 0.7); border: 2px solid white;"><div style="transform: rotate(45deg);"><svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z'/><circle cx='12' cy='10' r='3'/></svg></div></div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 38]
    });

    const marker = L.marker([AURA_NOIDA.lat, AURA_NOIDA.lng], { icon }).addTo(map);
    marker.bindPopup(
      `<div style="font-family: inherit;">
        <b style="font-size: 14px;">${AURA_NOIDA.name}</b><br/>
        <span style="font-size: 12px;">${AURA_NOIDA.address}</span>
      </div>`,
      { closeButton: false }
    ).openPopup();

    mapInstanceRef.current = map;
    markerRef.current = marker;
    setLoaded(true);
  }, []);

  const handleFocus = () => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([AURA_NOIDA.lat, AURA_NOIDA.lng], 16);
      markerRef.current.openPopup();
    }
  };

  const handleDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${AURA_NOIDA.lat},${AURA_NOIDA.lng}&destination_place_id=`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <MapPin size={18} color="var(--primary)" /> AuraMart Location
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{AURA_NOIDA.address}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={handleFocus} className="btn btn-secondary btn-sm">
            <Navigation size={14} /> Recenter Map
          </button>
          <button type="button" onClick={handleDirections} className="btn btn-primary btn-sm">
            Get Directions
          </button>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <div
          ref={mapRef}
          style={{
            width: '100%',
            height: '420px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass)',
            overflow: 'hidden',
            zIndex: 1
          }}
        />
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 12px',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          zIndex: 10,
          display: 'flex',
          gap: '10px'
        }}>
          <span>Lat: {AURA_NOIDA.lat.toFixed(4)}</span>
          <span>•</span>
          <span>Lng: {AURA_NOIDA.lng.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
};
