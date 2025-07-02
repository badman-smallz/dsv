import React, { useState } from 'react';
import { signOut } from 'next-auth/react';

export default function AdminResetUsersButton() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to delete ALL users and related data? This cannot be undone.')) {
      return;
    }
    setLoading(true);
    setSuccess(false);
    setError('');
    try {
      const res = await fetch('/api/admin/reset-users', {
        method: 'POST',
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          signOut({ callbackUrl: '/auth/login' });
        }, 1500); // Show success for 1.5s before redirecting
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to reset users.');
      }
    } catch (err) {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #f00', borderRadius: 8, background: '#fff0f0' }}>
      <button
        onClick={handleReset}
        disabled={loading}
        style={{
          background: '#f44336',
          color: '#fff',
          padding: '0.75rem 1.5rem',
          border: 'none',
          borderRadius: 4,
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Resetting...' : 'Reset All Users'}
      </button>
      {success && <p style={{ color: 'green', marginTop: 8 }}>All users and related data have been deleted.</p>}
      {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
      <p style={{ color: '#a00', marginTop: 8, fontWeight: 'bold' }}>
        Warning: This will permanently delete all users and their data. This action cannot be undone.
      </p>
    </div>
  );
}
