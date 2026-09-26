import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('auramart_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('auramart_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Fetch / Refresh current user profile
  const refreshUser = async (authToken = token) => {
    if (!authToken) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const res = await fetch(`${API_URL}/profile/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('auramart_user', JSON.stringify(userData));
        return userData;
      } else if (res.status === 401) {
        logout();
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    } finally {
      setLoading(false);
    }
    return null;
  };

  useEffect(() => {
    if (token) {
      refreshUser(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.detail || 'Login failed');
      error.status = res.status;
      error.isUnverified = res.headers.get('X-Account-Unverified') === 'true' || res.status === 403;
      throw error;
    }
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('auramart_token', data.access_token);
    localStorage.setItem('auramart_user', JSON.stringify(data.user));
    return data;
  };

  const signup = async (name, email, password) => {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Signup failed');
    }
    return data;
  };

  const socialLogin = async (provider, tokenOrPayload) => {
    let payload = { provider };
    if (typeof tokenOrPayload === 'string') {
      payload.token = tokenOrPayload;
    } else {
      payload = { ...payload, ...tokenOrPayload };
    }

    const res = await fetch(`${API_URL}/auth/social-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || `Social login with ${provider} failed`);
    }
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('auramart_token', data.access_token);
    localStorage.setItem('auramart_user', JSON.stringify(data.user));
    return data;
  };

  const verifyEmail = async (tokenParam) => {
    const res = await fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(tokenParam)}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Email verification failed');
    }
    if (data.access_token) {
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('auramart_token', data.access_token);
      localStorage.setItem('auramart_user', JSON.stringify(data.user));
    }
    return data;
  };

  const resendVerification = async (email) => {
    const res = await fetch(`${API_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to resend verification');
    }
    return data;
  };

  const updateProfile = async (profileData) => {
    const res = await fetch(`${API_URL}/profile/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to update profile');
    }
    setUser(data.user);
    localStorage.setItem('auramart_user', JSON.stringify(data.user));
    return data.user;
  };

  const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/profile/upload-avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to upload profile picture');
    }
    await refreshUser();
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auramart_token');
    localStorage.removeItem('auramart_user');
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      loading,
      login,
      signup,
      socialLogin,
      verifyEmail,
      resendVerification,
      updateProfile,
      uploadAvatar,
      refreshUser,
      logout,
      isAuthenticated: !!token && !!user,
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
