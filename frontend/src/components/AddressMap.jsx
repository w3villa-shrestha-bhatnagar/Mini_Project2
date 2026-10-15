import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Navigation, CheckCircle } from 'lucide-react';
import L from 'leaflet';

export const AddressMap = ({ initialAddress, onAddressChange }) => {
  const [query, setQuery] = useState(initialAddress?.formatted_address || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [addressData, setAddressData] = useState(initialAddress || {
    formatted_address: '',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    lat: 28.6139,
    lng: 77.2090
  });

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Sync initial address
  useEffect(() => {
    if (initialAddress && initialAddress.formatted_address) {
      setAddressData(initialAddress);
      setQuery(initialAddress.formatted_address);
    }
  }, [initialAddress]);

  // Debounced auto-suggestion search using OpenStreetMap Nominatim
  useEffect(() => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`;
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en' }
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.error("Auto-suggest error:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const lat = addressData.lat || 28.6139;
    const lng = addressData.lng || 77.2090;

    if (!mapInstanceRef.current) {
      // Create map
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 13,
        zoomControl: true,
        attributionControl: false
      });

      // Light map tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map);

      // Custom marker icon
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background: #ec4899; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(236, 72, 153, 0.6); border: 2px solid white;"><svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z'/><circle cx='12' cy='10' r='3'/></svg></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34]
      });

      const marker = L.marker([lat, lng], { icon: customIcon, draggable: true }).addTo(map);
      
      // On marker drag
      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        await reverseGeocode(pos.lat, pos.lng);
      });

      // On map click
      map.on('click', async (e) => {
        marker.setLatLng(e.latlng);
        await reverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      mapInstanceRef.current.setView([lat, lng], 13);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }
  }, [addressData.lat, addressData.lng]);

  const reverseGeocode = async (lat, lng) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const newAddr = {
          formatted_address: data.display_name,
          street: addr.road || addr.suburb || '',
          city: addr.city || addr.town || addr.county || '',
          state: addr.state || '',
          postal_code: addr.postcode || '',
          country: addr.country || '',
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        };
        setAddressData(newAddr);
        setQuery(data.display_name);
        onAddressChange(newAddr);
      }
    } catch (err) {
      console.error("Reverse geocoding error:", err);
    }
  };

  const handleSelectSuggestion = (item) => {
    const addr = item.address || {};
    const newAddr = {
      formatted_address: item.display_name,
      street: addr.road || addr.suburb || '',
      city: addr.city || addr.town || addr.county || '',
      state: addr.state || '',
      postal_code: addr.postcode || '',
      country: addr.country || '',
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon)
    };
    setAddressData(newAddr);
    setQuery(item.display_name);
    setSuggestions([]);
    onAddressChange(newAddr);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await reverseGeocode(latitude, longitude);
        },
        (error) => {
          alert("Could not retrieve your location. Please type your address manually.");
        }
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Search Input with Auto Suggestions */}
      <div style={{ position: 'relative' }}>
        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Search Address (Auto-Suggestions)</span>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Navigation size={13} /> Use Current Location
          </button>
        </label>

        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-subtle)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '42px' }}
            placeholder="Start typing your street, city, or landmark..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loadingSuggestions && (
            <span style={{ position: 'absolute', right: '14px', top: '14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Searching...
            </span>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 15px 30px rgba(0,0,0,0.7)',
            zIndex: 100,
            marginTop: '6px',
            maxHeight: '220px',
            overflowY: 'auto'
          }}>
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(item)}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border-glass)',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--text-main)',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <MapPin size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.display_name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Map View */}
      <div style={{ position: 'relative' }}>
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '240px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-glass)',
            overflow: 'hidden',
            zIndex: 1
          }}
        />
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 10px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          zIndex: 10,
          display: 'flex',
          gap: '8px'
        }}>
          <span>Lat: {addressData.lat?.toFixed(4) || 'N/A'}</span>
          <span>•</span>
          <span>Lng: {addressData.lng?.toFixed(4) || 'N/A'}</span>
        </div>
      </div>

      {/* Selected Address Breakdown */}
      <div className="grid-2" style={{ gap: '12px' }}>
        <div>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>City</label>
          <input
            type="text"
            className="form-input"
            style={{ padding: '8px 12px', fontSize: '0.88rem' }}
            value={addressData.city || ''}
            onChange={(e) => {
              const updated = { ...addressData, city: e.target.value };
              setAddressData(updated);
              onAddressChange(updated);
            }}
            placeholder="City"
          />
        </div>
        <div>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>State / Province</label>
          <input
            type="text"
            className="form-input"
            style={{ padding: '8px 12px', fontSize: '0.88rem' }}
            value={addressData.state || ''}
            onChange={(e) => {
              const updated = { ...addressData, state: e.target.value };
              setAddressData(updated);
              onAddressChange(updated);
            }}
            placeholder="State"
          />
        </div>
        <div>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>Postal Code</label>
          <input
            type="text"
            className="form-input"
            style={{ padding: '8px 12px', fontSize: '0.88rem' }}
            value={addressData.postal_code || ''}
            onChange={(e) => {
              const updated = { ...addressData, postal_code: e.target.value };
              setAddressData(updated);
              onAddressChange(updated);
            }}
            placeholder="ZIP / Postal code"
          />
        </div>
        <div>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>Country</label>
          <input
            type="text"
            className="form-input"
            style={{ padding: '8px 12px', fontSize: '0.88rem' }}
            value={addressData.country || ''}
            onChange={(e) => {
              const updated = { ...addressData, country: e.target.value };
              setAddressData(updated);
              onAddressChange(updated);
            }}
            placeholder="Country"
          />
        </div>
      </div>
    </div>
  );
};
