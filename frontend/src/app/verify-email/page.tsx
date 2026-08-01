'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '../../store/useStore';
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useStore((state) => state.login);
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token provided.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          const data = await res.json();
          // Update Zustand store
          login(
            {
              id: data.user.id,
              email: data.user.email,
              firstName: data.user.firstName || 'New',
              lastName: data.user.lastName || 'User',
              role: data.user.role,
            },
            data.accessToken
          );
          setStatus('success');
          // Redirect to pricing page after 2 seconds
          setTimeout(() => {
            router.push('/pricing');
          }, 2000);
        } else {
          const errData = await res.json();
          setStatus('error');
          setErrorMsg(errData.message || 'Verification failed. The token may be invalid or expired.');
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg('Could not connect to the server.');
      }
    };

    verify();
  }, [token, login, router]);

  return (
    <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl relative text-center">
      {status === 'loading' && (
        <div className="py-8">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-white mb-2">Verifying your email...</h2>
          <p className="text-sm text-slate-400">Please wait while we activate your account.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="py-8">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-white mb-2">Email Verified Successfully!</h2>
          <p className="text-sm text-slate-400">Your account is active. Redirecting you to pricing plans...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="py-8">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-white mb-2">Verification Failed</h2>
          <p className="text-sm text-slate-400 mb-6">{errorMsg}</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 text-sm"
          >
            Go to Login
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#070a13] px-4 py-12 overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full glow-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pink-500/5 blur-[120px] rounded-full glow-glow" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 p-3 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-2xl shadow-xl shadow-indigo-500/10 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Optimora AI</h1>
        </div>

        <Suspense fallback={
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl relative text-center py-8">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-white">Loading...</h2>
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
