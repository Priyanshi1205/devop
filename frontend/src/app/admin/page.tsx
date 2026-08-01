'use client';
export const runtime = 'edge';
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Users, TrendingUp, AlertTriangle, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  activeSubscribers: number;
  totalRevenueThisMonth: number;
  mrr: number;
  upcomingRenewals: number;
  expiredSubscribers: number;
  revenueTrend: Array<{ label: string; value: number }>;
  subscriberGrowth: Array<{ label: string; value: number }>;
}

export default function AdminOverview() {
  const token = useStore((state) => state.token);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/stats`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchStats();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const mrrFormatted = stats ? `₹${stats.mrr.toLocaleString('en-IN')}` : '₹0';
  const monthlyRevFormatted = stats ? `₹${stats.totalRevenueThisMonth.toLocaleString('en-IN')}` : '₹0';

  // SVG Chart Helpers
  const maxRevenue = stats?.revenueTrend.reduce((max, r) => Math.max(max, r.value), 1) || 1;
  const maxGrowth = stats?.subscriberGrowth.reduce((max, g) => Math.max(max, g.value), 1) || 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Super Administrator Overview</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5 font-sans">Admin Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time insights on subscription metrics, platform revenue, renewals, and subscriber growth.
          </p>
        </div>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Subscribers */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-[#0d1222]/80 relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Subscribers</span>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{stats?.activeSubscribers || 0}</h3>
            </div>
            <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <Link href="/admin/subscribers" className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 mt-auto">
            <span>Manage accounts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* MRR / Monthly Revenue */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-[#0d1222]/80 relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Monthly Recurring Revenue</span>
              <h3 className="text-2xl font-bold text-indigo-400 mt-1 font-mono">{mrrFormatted}</h3>
            </div>
            <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20 text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <span className="text-[10px] text-slate-500 block">
            This month: <span className="font-bold text-slate-300 font-mono">{monthlyRevFormatted}</span>
          </span>
        </div>

        {/* Upcoming Renewals */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-[#0d1222]/80 relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Renewals (Next 7 Days)</span>
              <h3 className="text-2xl font-bold text-yellow-500 mt-1">{stats?.upcomingRenewals || 0}</h3>
            </div>
            <div className="bg-yellow-500/10 p-2 rounded-xl border border-yellow-500/20 text-yellow-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <span className="text-[10px] text-slate-500 block">Requires attention</span>
        </div>

        {/* Expired Subscribers */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-[#0d1222]/80 relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Expired/Cancelled</span>
              <h3 className="text-2xl font-bold text-red-500 mt-1">{stats?.expiredSubscribers || 0}</h3>
            </div>
            <div className="bg-red-500/10 p-2 rounded-xl border border-red-500/20 text-red-500">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <span className="text-[10px] text-slate-500 block">In past month</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-[#080c16]/50 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Revenue Trend (INR)</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Calculated based on actual monthly manual/automatic deposits</p>
          </div>
          
          <div className="h-56 flex items-end gap-3 pt-6 relative border-b border-l border-slate-800 px-2 pb-1">
            {stats?.revenueTrend.map((r, i) => {
              const heightPct = Math.max(10, Math.floor((r.value / maxRevenue) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end cursor-pointer">
                  <div className="relative w-full flex items-end justify-center h-full">
                    {/* Tooltip */}
                    <span className="absolute -top-6 bg-slate-900 border border-slate-700 text-white text-[9px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 font-bold">
                      ₹{r.value.toLocaleString('en-IN')}
                    </span>
                    <div 
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-indigo-600 to-purple-500 rounded-t-lg group-hover:from-indigo-500 group-hover:to-purple-400 transition-all shadow-lg shadow-indigo-500/5"
                    />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 group-hover:text-white uppercase transition-colors">{r.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscriber Growth Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-[#080c16]/50 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">New Subscriber Growth</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Count of user accounts created monthly</p>
          </div>

          <div className="h-56 flex items-end gap-3 pt-6 relative border-b border-l border-slate-800 px-2 pb-1">
            {stats?.subscriberGrowth.map((g, i) => {
              const heightPct = Math.max(10, Math.floor((g.value / maxGrowth) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end cursor-pointer">
                  <div className="relative w-full flex items-end justify-center h-full">
                    {/* Tooltip */}
                    <span className="absolute -top-6 bg-slate-900 border border-slate-700 text-white text-[9px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 font-bold">
                      +{g.value} users
                    </span>
                    <div 
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-emerald-600 to-teal-500 rounded-t-lg group-hover:from-emerald-500 group-hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/5"
                    />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 group-hover:text-white uppercase transition-colors">{g.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
