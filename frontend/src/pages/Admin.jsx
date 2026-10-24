import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users, ShieldCheck, Search, Filter, ChevronLeft, ChevronRight,
  MoreVertical, CheckCircle, XCircle, Crown, Sparkles, Clock,
  DollarSign, UserCheck, UserX, Trash2, Edit, AlertCircle, RefreshCw
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const Admin = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query params to persist state across refreshes (per FAQ requirement)
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const searchParam = searchParams.get('search') || '';
  const roleParam = searchParams.get('role') || 'all';
  const verifiedParam = searchParams.get('is_verified') || 'all';
  const planParam = searchParams.get('plan') || 'all';
  const planStatusParam = searchParams.get('plan_status') || 'all';
  const limitParam = parseInt(searchParams.get('limit') || '10', 10);

  // States
  const [usersList, setUsersList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total_count: 0 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Search input local state for smooth typing
  const [searchInput, setSearchInput] = useState(searchParam);

  // Selected User Modal for manual plan grant / role edit
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null); // 'plan', 'role'
  const [planChoice, setPlanChoice] = useState('gold');
  const [durationChoice, setDurationChoice] = useState(12);
  const [roleChoice, setRoleChoice] = useState('admin');

  // Debounce search input to URL query param
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== searchParam) {
        updateQuery({ search: searchInput || undefined, page: '1' });
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const updateQuery = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    const merged = { ...current, ...newParams };
    // Clean undefined/empty
    Object.keys(merged).forEach(k => {
      if (!merged[k] || merged[k] === 'all') delete merged[k];
    });
    setSearchParams(merged);
  };

  // Fetch Stats & Users
  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('auramart_token');
    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }

      // 2. Fetch Users with search, filters, pagination
      const queryParams = new URLSearchParams({
        page: pageParam.toString(),
        limit: limitParam.toString(),
        search: searchParam,
        role: roleParam,
        is_verified: verifiedParam,
        plan: planParam,
        plan_status: planStatusParam
      });

      const usersRes = await fetch(`${API_URL}/admin/users?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData.users || []);
        setPagination(usersData.pagination || { page: 1, total_pages: 1, total_count: 0 });
      }
    } catch (err) {
      console.error("Admin fetch error:", err);
      setToast({ type: 'error', message: err.message || 'Failed to load admin data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [pageParam, limitParam, searchParam, roleParam, verifiedParam, planParam, planStatusParam, isAdmin]);

  // Actions
  const handleToggleVerify = async (userId, currentVerified) => {
    const token = localStorage.getItem('auramart_token');
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_verified: !currentVerified })
      });
      if (!res.ok) throw new Error('Failed to update verification');
      setToast({ type: 'success', message: `User marked as ${!currentVerified ? 'Verified' : 'Unverified'}` });
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  const handleApplyPlanOverride = async () => {
    if (!selectedUser) return;
    const token = localStorage.getItem('auramart_token');
    try {
      const res = await fetch(`${API_URL}/admin/users/${selectedUser.id}/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_name: planChoice,
          duration_hours: parseInt(durationChoice, 10)
        })
      });
      if (!res.ok) throw new Error('Failed to update plan');
      setToast({ type: 'success', message: `Assigned ${planChoice.toUpperCase()} plan to ${selectedUser.name}` });
      setSelectedUser(null);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  const handleApplyRoleChange = async () => {
    if (!selectedUser) return;
    const token = localStorage.getItem('auramart_token');
    try {
      const res = await fetch(`${API_URL}/admin/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: roleChoice })
      });
      if (!res.ok) throw new Error('Failed to update role');
      setToast({ type: 'success', message: `Role updated to ${roleChoice.toUpperCase()}` });
      setSelectedUser(null);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This cannot be undone.`)) return;
    const token = localStorage.getItem('auramart_token');
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete user');
      setToast({ type: 'success', message: 'User deleted successfully' });
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  if (!isAdmin) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <ShieldCheck size={56} color="#fb7185" style={{ margin: '0 auto 20px' }} />
        <h1 style={{ fontSize: '2rem', marginBottom: '12px' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          This area is strictly restricted to administrator accounts.
        </p>
        <button onClick={() => navigate('/login')} className="btn btn-primary">
          Log In as Administrator
        </button>
      </div>
    );
  }

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

      {/* Admin Title Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="badge badge-gold" style={{ fontSize: '0.8rem' }}>ADMIN CONSOLE</span>
            <span style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>Automated Cron Worker: 30s Active</span>
          </div>
          <h1 style={{ fontSize: '2.4rem', marginTop: '6px' }}>Platform Administration</h1>
        </div>

        <button onClick={fetchData} className="btn btn-secondary btn-sm" title="Refresh User Data">
          <RefreshCw size={15} /> Refresh Data
        </button>
      </div>

      {/* Metrics Cards Grid */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '36px'
        }}>
          <div className="glass-panel" style={{ padding: '20px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', marginBottom: '10px' }}>
              <Users size={22} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Registered</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.total_users}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Users</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-green)', marginBottom: '10px' }}>
              <UserCheck size={22} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Active</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.verified_users}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verified Accounts</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-gold)', marginBottom: '10px' }}>
              <Crown size={22} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Subscribers</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.active_plans}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active VIP Passes</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#E11D48', marginBottom: '10px' }}>
              <Clock size={22} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Expired</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.expired_plans}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cron Expired Plans</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', marginBottom: '10px' }}>
              <DollarSign size={22} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Razorpay</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>₹{stats.total_revenue_inr.toLocaleString()}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Revenue</div>
          </div>
        </div>
      )}

      {/* User Listing Section (6.2 - 6.5) */}
      <div className="glass-panel" style={{ padding: '28px', background: '#FFFFFF', boxShadow: '0 4px 20px rgba(220, 150, 175, 0.08)' }}>
        {/* Search and Filters Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Search Input (6.4) */}
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-subtle)' }} />
            <input
              type="text"
              className="form-input"
              style={{ padding: '8px 14px 8px 36px', fontSize: '0.88rem' }}
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {/* Filters (6.2) */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Role Filter */}
            <select
              value={roleParam}
              onChange={(e) => updateQuery({ role: e.target.value, page: '1' })}
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="all">Role: All</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>

            {/* Verification Filter */}
            <select
              value={verifiedParam}
              onChange={(e) => updateQuery({ is_verified: e.target.value, page: '1' })}
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="all">Verified: All</option>
              <option value="true">Verified Only</option>
              <option value="false">Unverified Only</option>
            </select>

            {/* Plan Filter */}
            <select
              value={planParam}
              onChange={(e) => updateQuery({ plan: e.target.value, page: '1' })}
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="all">Plan: All</option>
              <option value="free">Free</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
            </select>

            {/* Plan Status Filter */}
            <select
              value={planStatusParam}
              onChange={(e) => updateQuery({ plan_status: e.target.value, page: '1' })}
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="all">Status: All</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>

            {/* Reset Filters button */}
            {(searchParam || roleParam !== 'all' || verifiedParam !== 'all' || planParam !== 'all' || planStatusParam !== 'all') && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchParams({});
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* User Table (6.3) */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>User / Avatar</th>
                <th style={{ padding: '12px 16px' }}>Email Address</th>
                <th style={{ padding: '12px 16px' }}>Role</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Membership Plan</th>
                <th style={{ padding: '12px 16px' }}>Expiration</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading users...
                  </td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                usersList.map((u) => {
                  const sub = u.subscription || { plan: 'free', status: 'active' };
                  const isGold = sub.plan === 'gold';
                  const isSilver = sub.plan === 'silver';

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }}>
                      {/* Avatar & Name (4.1 visible thumbnail) */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={u.avatar_thumb || u.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                            alt={u.name}
                            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-glass)' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>ID: {u.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        {u.email}
                      </td>

                      {/* Role */}
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${u.role === 'admin' ? 'badge-gold' : 'badge-free'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>

                      {/* Verified Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${u.is_verified ? 'badge-active' : 'badge-expired'}`}>
                          {u.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>

                      {/* Plan */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge ${isGold ? 'badge-gold' : isSilver ? 'badge-silver' : 'badge-free'}`}>
                            {sub.plan.toUpperCase()}
                          </span>
                          <span className={`badge ${sub.status === 'active' ? 'badge-active' : 'badge-expired'}`} style={{ fontSize: '0.68rem' }}>
                            {sub.status}
                          </span>
                        </div>
                      </td>

                      {/* Expiration */}
                      <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {sub.expires_at ? (
                          <span>
                            {new Date(sub.expires_at).toLocaleDateString()} {new Date(sub.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-subtle)' }}>Perpetual</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {/* Toggle verification */}
                          <button
                            onClick={() => handleToggleVerify(u.id, u.is_verified)}
                            className="btn btn-secondary btn-sm"
                            title={u.is_verified ? "Revoke Verification" : "Verify Account"}
                            style={{ padding: '6px 8px' }}
                          >
                            {u.is_verified ? <XCircle size={14} color="#fb7185" /> : <CheckCircle size={14} color="var(--accent-green)" />}
                          </button>

                          {/* Override Plan */}
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setModalType('plan');
                              setPlanChoice(u.subscription?.plan || 'gold');
                            }}
                            className="btn btn-secondary btn-sm"
                            title="Assign or Extend Subscription Plan"
                            style={{ padding: '6px 8px' }}
                          >
                            <Crown size={14} color="var(--accent-gold)" />
                          </button>

                          {/* Change Role */}
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setModalType('role');
                              setRoleChoice(u.role);
                            }}
                            className="btn btn-secondary btn-sm"
                            title="Change Role"
                            style={{ padding: '6px 8px' }}
                          >
                            <Edit size={14} />
                          </button>

                          {/* Delete user */}
                          {u.email !== 'admin@auramart.com' && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="btn btn-danger btn-sm"
                              title="Delete User"
                              style={{ padding: '6px 8px' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls (6.5) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-glass)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing <b>{usersList.length}</b> of <b>{pagination.total_count}</b> registered users (Page {pagination.page} of {pagination.total_pages})
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => updateQuery({ page: (pagination.page - 1).toString() })}
              disabled={pagination.page <= 1}
              className="btn btn-secondary btn-sm"
            >
              <ChevronLeft size={16} /> Prev
            </button>

            {/* Page number indicators */}
            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).slice(
              Math.max(0, pagination.page - 3),
              Math.min(pagination.total_pages, pagination.page + 2)
            ).map((p) => (
              <button
                key={p}
                onClick={() => updateQuery({ page: p.toString() })}
                style={{
                  background: pagination.page === p ? 'linear-gradient(135deg, #F472B6, #FB7185)' : '#FFFFFF',
                  color: pagination.page === p ? '#FFFFFF' : 'var(--text-main)',
                  border: pagination.page === p ? 'none' : '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  width: '32px',
                  height: '32px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: pagination.page === p ? '0 2px 8px rgba(244, 114, 182, 0.35)' : undefined
                }}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => updateQuery({ page: (pagination.page + 1).toString() })}
              disabled={pagination.page >= pagination.total_pages}
              className="btn btn-secondary btn-sm"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Plan Management Modal */}
      {selectedUser && modalType === 'plan' && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Manage User Subscription</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Assign or extend time-limited membership for <b>{selectedUser.name}</b> ({selectedUser.email}).
            </p>

            <div className="form-group">
              <label className="form-label">Select Plan Tier</label>
              <select
                value={planChoice}
                onChange={(e) => setPlanChoice(e.target.value)}
                className="form-input"
              >
                <option value="free">Free Tier (Perpetual)</option>
                <option value="silver">Silver Club (10% Discount)</option>
                <option value="gold">Gold VIP Elite (25% Discount)</option>
              </select>
            </div>

            {planChoice !== 'free' && (
              <div className="form-group">
                <label className="form-label">Duration</label>
                <select
                  value={durationChoice}
                  onChange={(e) => setDurationChoice(parseInt(e.target.value, 10))}
                  className="form-input"
                >
                  <option value={1}>1 Hour Sprint</option>
                  <option value={6}>6 Hours Pass</option>
                  <option value={12}>12 Hours VIP Pass</option>
                </select>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: '4px', display: 'block' }}>
                  The backend cron job will automatically expire this pass after duration ends.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setSelectedUser(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleApplyPlanOverride} className="btn btn-primary">
                Apply Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {selectedUser && modalType === 'role' && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Change User Role</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Update access level for <b>{selectedUser.name}</b>.
            </p>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                value={roleChoice}
                onChange={(e) => setRoleChoice(e.target.value)}
                className="form-input"
              >
                <option value="user">User (Standard customer)</option>
                <option value="admin">Admin (Full administrative privileges)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setSelectedUser(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleApplyRoleChange} className="btn btn-primary">
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
