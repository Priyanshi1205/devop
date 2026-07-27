'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../../store/useStore';
import { Search, Filter, Plus, Loader2, ArrowUpDown, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Subscriber {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
  nextDue?: string;
  amount: number;
  paymentStatus: string;
}

export default function AdminSubscribers() {
  const router = useRouter();
  const token = useStore((state) => state.token);

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Add Subscriber Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPlanName, setNewPlanName] = useState('Starter');
  const [newBillingCycle, setNewBillingCycle] = useState('monthly');
  const [submitting, setSubmitting] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (search) params.append('search', search);
      if (planFilter) params.append('plan', planFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/admin/subscribers?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Error fetching subscribers:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, planFilter, statusFilter, token]);

  useEffect(() => {
    if (token) {
      fetchSubscribers();
    }
  }, [fetchSubscribers, token]);

  const handleCreateSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName || !newLastName || !newEmail || !newPassword) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: newFirstName,
          lastName: newLastName,
          email: newEmail,
          password: newPassword,
          planName: newPlanName,
          billingCycle: newBillingCycle
        })
      });

      if (res.ok) {
        alert('Subscriber created successfully!');
        setModalOpen(false);
        setNewFirstName('');
        setNewLastName('');
        setNewEmail('');
        setNewPassword('');
        setNewPlanName('Starter');
        fetchSubscribers();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create subscriber.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Subscriber Registry</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5 font-sans">Manage Subscribers</h1>
          <p className="text-sm text-slate-400 mt-1">
            Search, filter, view billing accounts, upgrade subscription plans, and manually provision clients.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Subscriber</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#080c16]/50 p-4 border border-slate-800 rounded-2xl">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email address..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-[#030712] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-slate-700"
          />
        </div>
        {/* Plan Filter */}
        <div className="w-full md:w-44">
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
            className="w-full bg-[#030712] border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
          >
            <option value="">All Plan Tiers</option>
            <option value="Free Trial">Free Trial</option>
            <option value="Starter">Starter</option>
            <option value="Pro">Pro</option>
            <option value="Agency">Agency</option>
          </select>
        </div>
        {/* Status Filter */}
        <div className="w-full md:w-44">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full bg-[#030712] border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="glass-panel border border-slate-800/80 rounded-2xl overflow-hidden bg-[#080c16]/30">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : subscribers.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Search className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm font-semibold">No subscribers found</p>
            <p className="text-slate-500 text-xs">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-500 font-semibold bg-slate-900/10">
                  <th className="px-6 py-3.5">Client</th>
                  <th className="px-6 py-3.5">Plan</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Renewal / End Date</th>
                  <th className="px-6 py-3.5 font-mono">Amount</th>
                  <th className="px-6 py-3.5">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {subscribers.map((sub) => (
                  <tr 
                    key={sub.id} 
                    onClick={() => router.push(`/admin/subscribers/${sub.id}`)}
                    className="hover:bg-slate-900/10 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-white block">{sub.firstName} {sub.lastName}</span>
                        <span className="text-[10px] text-slate-500 block">{sub.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-white">{sub.plan}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        sub.status === 'active' 
                          ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20' 
                          : sub.status === 'trial' 
                          ? 'text-yellow-400 bg-yellow-500/5 border-yellow-500/20'
                          : sub.status === 'expired'
                          ? 'text-red-400 bg-red-500/5 border-red-500/20'
                          : 'text-slate-400 bg-slate-500/5 border-slate-500/20'
                      }`}>
                        {sub.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(sub.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      ₹{sub.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        sub.paymentStatus === 'paid' 
                          ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20' 
                          : 'text-red-400 bg-red-500/5 border-red-500/20'
                      }`}>
                        {sub.paymentStatus.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {!loading && total > 0 && (
          <div className="px-6 py-4 border-t border-slate-800/40 bg-slate-900/10 flex justify-between items-center text-xs">
            <span className="text-slate-500">
              Showing <span className="text-slate-300 font-bold">{subscribers.length}</span> of <span className="text-slate-300 font-bold">{total}</span> subscribers
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-850 hover:border-slate-700 bg-slate-950 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-850 hover:border-slate-700 bg-slate-950 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Creation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md border border-slate-800 rounded-2xl overflow-hidden bg-[#0a0f1d] shadow-2xl relative">
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleCreateSubscriber} className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Provision Offline Subscriber</h3>
                <p className="text-xs text-slate-400 mt-0.5">Manually provision a client user with an active subscription plan.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Subscription Plan</label>
                  <select
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
                  >
                    <option value="Free Trial">Free Trial</option>
                    <option value="Starter">Starter</option>
                    <option value="Pro">Pro</option>
                    <option value="Agency">Agency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Billing Cycle</label>
                  <select
                    value={newBillingCycle}
                    onChange={(e) => setNewBillingCycle(e.target.value)}
                    className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-600/50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Add Subscriber</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
