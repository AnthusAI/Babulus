'use client';

import React, { useState } from 'react';
import { LogIn, TriangleAlert } from 'lucide-react';
import { startGoogleSignIn } from '../../lib/auth';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      window.location.href = await startGoogleSignIn();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start sign-in.');
      setLoading(false);
    }
  };

  return (
    <div className="console-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '2rem', background: 'var(--card)', borderRadius: '12px' }}>
        <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Operator Sign In</h2>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.875rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          Sign in with Google. Only people an administrator has made operators can use the console.
        </p>

        {error && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="button button-primary"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', width: '100%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 600, border: 'none', borderRadius: '8px' }}
        >
          <LogIn size={18} />
          {loading ? 'Redirecting...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
}
