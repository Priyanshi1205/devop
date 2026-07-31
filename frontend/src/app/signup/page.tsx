'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../store/useStore';
import { Shield, Lock, Mail, User, Building, Sparkles, ArrowRight, RefreshCw, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agencyName, setAgencyName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [simulatedLink, setSimulatedLink] = useState('');
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
        setResendSuccess('Verification email resent successfully! Check your inbox.');
      } else {
        setError(data.message || 'Failed to resend verification link.');
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

    const names = fullName.trim().split(/\s+/);
    const firstName = names[0] || 'Agency';
    const lastName = names.slice(1).join(' ') || 'User';

    try {
     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          organizationName: agencyName || `${firstName}'s Agency`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setRegistered(true);
        setSimulatedLink(data.verificationLink || '');
        setLoading(false);
      } else {
        const errData = await res.json();
        setError(errData.message || 'Registration failed. Please check your details.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Could not connect to the authentication server.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#070a13] px-4 py-12 overflow-hidden text-foreground font-sans">
      {/* Background Glow Blobs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pink-500/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-8">
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-3 group mb-4">
            <div className="p-3 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-xl shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-black text-white tracking-tight">Optimora AI</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Start your 15-Day Free Trial</p>
        </div>

        {/* Card Panel */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl bg-[#0a0e1a]/80 backdrop-blur-xl space-y-6">
          
          {registered ? (
            /* POST SIGNUP EMAIL VERIFICATION FLOW */
            <div className="text-center py-4 space-y-6 animate-fadeIn">
              <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
                <Mail className="w-8 h-8 animate-bounce" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Check your email</h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  We've sent an activation link to <span className="text-white font-semibold">{email}</span>. Click the link to verify your account and activate your 15-day trial.
                </p>
              </div>

              {resendSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{resendSuccess}</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                  {error}
                </div>
              )}

              <div className="pt-2 flex flex-col gap-3">
                {simulatedLink && (
                  <a
                    href={simulatedLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 text-indigo-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Click to Verify (Local Test Mode)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-800 transition-colors"
                >
                  {resending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Resend Email Verification</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-900">
                <Link href="/login" className="text-xs text-indigo-400 hover:text-indigo-300 font-bold">
                  Already verified? Proceed to Sign In →
                </Link>
              </div>
            </div>
          ) : (
            /* SIGNUP FORM */
            <>
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-bold">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Anshul Airen"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Agency / Organization Name
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="Airen Digital Marketing"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="anshul@agency.com"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Password (Min 8 Characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-indigo-500/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Creating Trial Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Start 15-Day Free Trial</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="border-t border-slate-800/80 pt-5 text-center">
                <p className="text-xs text-slate-400 font-medium">
                  Already have an account?{' '}
                  <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                    Sign In
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium">
            ← Back to Optimora AI Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
