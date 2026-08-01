'use client';

import React, { useState } from 'react';
import { Shield, Mail, ArrowLeft, Sparkles, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setResetLink('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(data.message || 'Reset link generated.');
        if (data.resetLink) {
          setResetLink(data.resetLink);
        }
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to request reset link.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Could not connect to the authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#070a13] px-4 py-12 overflow-hidden">
      {/* Decorative Blur Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pink-500/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 p-3 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-2xl shadow-xl shadow-indigo-500/10 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SEO AI OS</h1>
          <p className="text-sm text-slate-400 mt-1">Enterprise Optimization & Search AI Dashboard</p>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl relative">
          <h2 className="text-xl font-semibold text-white mb-2">Forgot Password</h2>
          <p className="text-xs text-slate-400 mb-6">Enter your email and we'll generate a password reset link for your account.</p>

          {error && (
            <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">Reset link generated</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{success}</p>
              </div>
            </div>
          )}

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@agency.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Generate Reset Link</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            resetLink && (
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-2.5 animate-fadeIn">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Developer Helper Toolbar</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  In a real deployment, a reset email is dispatched. Below is the local link generated by the API:
                </p>
                <Link 
                  href={resetLink.substring(resetLink.indexOf('/reset-password'))}
                  className="inline-block px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 rounded-xl text-xs text-indigo-400 font-bold transition-all duration-150 cursor-pointer"
                >
                  Reset Password Now →
                </Link>
              </div>
            )
          )}

          <div className="mt-8 text-center">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
