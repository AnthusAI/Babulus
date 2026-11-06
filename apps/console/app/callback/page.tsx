'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { completeGoogleSignIn, getStoredSession } from '../../lib/auth';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const isExchanging = useRef<boolean>(false);

  useEffect(() => {
    // If a valid session is already present, transition directly to dashboard
    const existing = getStoredSession();
    if (existing?.accessToken) {
      router.replace('/');
      return;
    }

    const code = searchParams ? searchParams.get('code') : null;
    const urlError = searchParams ? searchParams.get('error') : null;

    if (urlError) {
      setError(searchParams ? searchParams.get('error_description') || urlError : urlError);
      return;
    }

    if (!code) {
      setError('No authorization code received from Google sign-in.');
      return;
    }

    // In React 18 / Next.js dev StrictMode, effects execute twice. Prevent duplicate code exchange.
    if (isExchanging.current) {
      return;
    }
    isExchanging.current = true;

    async function processCode(authCode: string) {
      try {
        await completeGoogleSignIn(authCode, searchParams ? searchParams.get('state') : null);
        router.replace('/');
      } catch (err: any) {
        // If an active session was already stored, do not flash error
        if (getStoredSession()?.accessToken) {
          router.replace('/');
          return;
        }
        setError(err.message || 'Failed to complete Google sign-in.');
      }
    }

    processCode(code);
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="console-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ maxWidth: '450px', padding: '2rem', textAlign: 'center', background: 'var(--card)', borderRadius: '12px' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Authentication Failed</h2>
          <p style={{ color: 'var(--ink-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</p>
          <button onClick={() => router.push('/login')} className="button button-primary" style={{ width: '100%' }}>
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="console-container" style={{ padding: '5rem 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
      Completing Google sign-in...
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="console-container" style={{ padding: '5rem 0', textAlign: 'center' }}>Loading...</div>}>
      <CallbackContent />
    </Suspense>
  );
}
