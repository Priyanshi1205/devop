'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../../store/useStore';
import { Shield, Lock, Mail, Eye, EyeOff, Sparkles, ArrowRight, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const login = useStore((state) => state.login);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  const handleResendVerification = async () => {
    setResending(true);
    setResendSuccess('');
    setError('');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setResendSuccess('Verification email resent successfully! Please check your inbox.');
      } else {
        setError(data.message || 'Failed to resend verification email.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to the authentication server.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResendSuccess('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const data = await res.json();
        login(
          {
            id: data.user.id,
            email: data.user.email,
            firstName: data.user.firstName || 'Authorized',
            lastName: data.user.lastName || 'User',
            role: data.user.role,
          },
          data.accessToken
        );
        
        if (data.user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        const errData = await res.json();
        setError(errData.message || 'Invalid email or password.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Could not connect to the authentication server.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#070a13] px-4 py-12 overflow-hidden text-foreground font-sans">
      {/* Decorative Glow Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pink-500/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-8">
        {/* Logo Header */}
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-3 group mb-4">
            <div className="p-3 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-xl shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-black text-white tracking-tight">Optimora AI</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Sign in to your agency operating system</p>
        </div>

        {/* Form Panel */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl bg-[#0a0e1a]/80 backdrop-blur-xl space-y-6">
          
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-400 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-bold">{error}</span>
              </div>
              {error.toLowerCase().includes('verify') && email && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="text-[11px] bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors flex items-center gap-1 mt-1"
                >
                  {resending ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                  <span>Resend Verification Email</span>
                </button>
              )}
            </div>
          )}

          {resendSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{resendSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@agency.com"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link href="/forgot-password" className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-10 pr-10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-indigo-500/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="border-t border-slate-800/80 pt-5 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Don't have an account?{' '}
              <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                Start 15-Day Free Trial
              </Link>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium">
            ← Back to Optimora AI Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
