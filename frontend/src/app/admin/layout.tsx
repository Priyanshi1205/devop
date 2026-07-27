'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../store/useStore';
import { LayoutDashboard, Users, CreditCard, LogOut, Loader2, Shield, Globe } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isLoggedIn = useStore((state) => state.isLoggedIn);
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const [authorized, setAuthorized] = useState(false);

  // 1. Session Hydration: only runs ONCE on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('accessToken');
    const savedUserStr = localStorage.getItem('user');

    if (savedToken && savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        const currentState = useStore.getState();

        // Prevent setting state if values are identical to avoid triggering renders
        if (
          currentState.token !== savedToken ||
          !currentState.isLoggedIn ||
          JSON.stringify(currentState.user) !== savedUserStr
        ) {
          useStore.setState({
            token: savedToken,
            user: savedUser,
            isLoggedIn: true
          });
        }
      } catch (e) {
        console.error('Error parsing stored session:', e);
      }
    }
  }, []);

  // 2. Authorization and Redirect checking: runs when values modify
  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'ADMIN') {
      setAuthorized(false);
    } else {
      setAuthorized(true);
    }
  }, [isLoggedIn, user?.role, router]);

  if (!authorized) {
    const checkState = useStore.getState();
    if (checkState.isLoggedIn && checkState.user?.role !== 'ADMIN') {
      return (
        <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6">
          <div className="glass-panel p-8 rounded-2xl border border-red-500/20 max-w-md text-center space-y-4 bg-[#0a0f1d]">
            <Shield className="w-16 h-16 text-red-500 mx-auto" />
            <h1 className="text-xl font-bold text-white">Access Denied</h1>
            <p className="text-sm text-slate-400">
              You do not have administrative privileges to access the admin portal.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Go to Client Dashboard
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-[#080c18] flex flex-col justify-between shrink-0">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-500/10 p-1.5 rounded-lg border border-indigo-500/20">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-white tracking-wider uppercase">Optimora Admin</span>
              <span className="block text-[10px] text-slate-400 font-mono">Super Admin Dashboard</span>
            </div>
          </div>

          <nav className="space-y-1.5 pt-4">
            <Link 
              href="/admin" 
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-900 text-slate-300 hover:text-white transition-all"
            >
              <LayoutDashboard className="w-4.5 h-4.5 text-indigo-400" />
              <span>Overview</span>
            </Link>
            <Link 
              href="/admin/subscribers" 
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-900 text-slate-300 hover:text-white transition-all"
            >
              <Users className="w-4.5 h-4.5 text-indigo-400" />
              <span>Subscribers</span>
            </Link>
            <Link 
              href="/admin/payments" 
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-900 text-slate-300 hover:text-white transition-all"
            >
              <CreditCard className="w-4.5 h-4.5 text-indigo-400" />
              <span>Payments</span>
            </Link>
          </nav>
        </div>

        <div className="p-6 border-t border-slate-800 space-y-3 bg-[#060a14]">
          <Link 
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors w-full"
          >
            <Globe className="w-4 h-4 text-slate-500" />
            <span>Client Dashboard</span>
          </Link>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors w-full cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* Main content pane */}
      <main className="flex-1 overflow-y-auto p-8 bg-[#030712]">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
