'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '../../../../store/useStore';
import { ChevronLeft, Loader2, Calendar, CreditCard, ShieldAlert, Award, RefreshCw, Trash2, Check } from 'lucide-react';
import Link from 'next/link';

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

interface Payment {
  id: string;
  amount: number;
  dueDate: string;
  paidOn?: string;
  status: string;
  paymentMethod: string;
}

export default function SubscriberDetail() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const token = useStore((state) => state.token);

  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Actions states
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Starter');
  const [extending, setExtending] = useState(false);
  const [extendValue, setExtendValue] = useState('1');
  const [extendUnit, setExtendUnit] = useState<'months' | 'days'>('months');
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/subscribers/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSubscriber(data.user);
        setPayments(data.payments);
        setSelectedPlan(data.user.plan);
      }
    } catch (err) {
      console.error('Error fetching subscriber detail:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    if (token && userId) {
      fetchDetail();
    }
  }, [fetchDetail, token, userId]);

  const handleChangePlan = async () => {
    setUpdatingPlan(true);
    try {
      const res = await fetch(`/api/admin/subscribers/${userId}/plan`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ planName: selectedPlan })
      });
      if (res.ok) {
        alert('Plan updated successfully!');
        fetchDetail();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update plan.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handleExtend = async () => {
    setExtending(true);
    const count = parseInt(extendValue, 10);
    const payload = extendUnit === 'months' ? { months: count } : { days: count };

    try {
      const res = await fetch(`/api/admin/subscribers/${userId}/extend`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Subscription duration extended successfully!');
        fetchDetail();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to extend subscription.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setExtending(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to suspend/cancel this subscription?')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/subscribers/${userId}/cancel`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert('Subscription cancelled successfully!');
        fetchDetail();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setCancelling(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('WARNING: This will permanently delete the user account and all workspace domains! This action cannot be undone. Are you sure?')) return;
    if (!window.confirm('Type CONFIRM in the next box to verify deletion.')) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/subscribers/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert('User account permanently deleted.');
        router.push('/admin/subscribers');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkPaymentPaid = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/mark-paid`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert('Payment marked as paid successfully!');
        fetchDetail();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!subscriber) {
    return (
      <div className="text-center py-20">
        <h3 className="text-lg font-bold text-white">Subscriber not found</h3>
        <Link href="/admin/subscribers" className="text-indigo-400 hover:text-indigo-300 text-xs font-bold mt-2 inline-block">
          Go back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link href="/admin/subscribers" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors font-semibold">
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Registry</span>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight font-sans">
          {subscriber.firstName} {subscriber.lastName}
        </h1>
        <p className="text-sm text-slate-400 mt-1">{subscriber.email}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Overview & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription profile card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-[#0d1222]/80 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Subscription Ledger</h3>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Plan Tier</span>
                <span className="text-sm font-bold text-white">{subscriber.plan}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border mt-1 ${
                  subscriber.status === 'active' 
                    ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20' 
                    : subscriber.status === 'trial' 
                    ? 'text-yellow-400 bg-yellow-500/5 border-yellow-500/20'
                    : 'text-red-400 bg-red-500/5 border-red-500/20'
                }`}>
                  {subscriber.status.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Renewal Date</span>
                <span className="text-sm font-semibold text-slate-300">{new Date(subscriber.endDate).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Billing Cycle</span>
                <span className="text-sm font-semibold text-slate-300">₹{subscriber.amount.toLocaleString('en-IN')} Monthly</span>
              </div>
            </div>
          </div>

          {/* Payment ledger history */}
          <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden bg-[#080c16]/30">
            <div className="px-6 py-4 border-b border-slate-800/40 bg-slate-900/10">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Invoices & Receipts Ledger</h3>
            </div>
            
            {payments.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No past invoices on subscription ledger.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-500 font-semibold bg-slate-900/10">
                      <th className="px-6 py-3">Due Date</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Paid Date</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="px-6 py-3 text-slate-400">
                          {new Date(pay.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 font-mono font-bold text-white">
                          ₹{pay.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-3 text-slate-400">
                          {pay.paidOn ? new Date(pay.paidOn).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            pay.status === 'paid' 
                              ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20' 
                              : pay.status === 'overdue'
                              ? 'text-red-400 bg-red-500/5 border-red-500/20'
                              : 'text-yellow-400 bg-yellow-500/5 border-yellow-500/20'
                          }`}>
                            {pay.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          {pay.status !== 'paid' && (
                            <button
                              onClick={() => handleMarkPaymentPaid(pay.id)}
                              className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Mark Received
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Action Panel Controls */}
        <div className="space-y-6">
          {/* Plan override panel */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-[#080c16]/50 space-y-4">
            <div className="flex items-center gap-1.5 text-indigo-400">
              <Award className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Plan Override</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1.5">Select Tier</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-slate-700"
                >
                  <option value="Free Trial">Free Trial</option>
                  <option value="Starter">Starter</option>
                  <option value="Pro">Pro</option>
                  <option value="Agency">Agency</option>
                </select>
              </div>

              <button
                onClick={handleChangePlan}
                disabled={updatingPlan || selectedPlan === subscriber.plan}
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-900 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                {updatingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Apply Plan Override</span>
              </button>
            </div>
          </div>

          {/* Extend subscription panel */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-[#080c16]/50 space-y-4">
            <div className="flex items-center gap-1.5 text-indigo-400">
              <Calendar className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Extend Subscription</h3>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1.5">Duration</label>
                  <input
                    type="number"
                    min="1"
                    value={extendValue}
                    onChange={(e) => setExtendValue(e.target.value)}
                    className="w-full bg-[#030712] border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1.5">Unit</label>
                  <select
                    value={extendUnit}
                    onChange={(e) => setExtendUnit(e.target.value as any)}
                    className="w-full bg-[#030712] border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
                  >
                    <option value="months">Months</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleExtend}
                disabled={extending}
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                {extending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Extend Validity</span>
              </button>
            </div>
          </div>

          {/* Danger zone controls */}
          <div className="glass-panel p-6 rounded-2xl border border-red-900/20 bg-[#0c0508]/40 space-y-4">
            <div className="flex items-center gap-1.5 text-red-400">
              <ShieldAlert className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Danger Zone</h3>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleCancel}
                disabled={cancelling || subscriber.status === 'cancelled'}
                className="w-full py-2 border border-yellow-500/20 hover:bg-yellow-500/5 text-yellow-500 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? 'Suspending...' : 'Suspend / Cancel Subscription'}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="w-full py-2 border border-red-500/20 hover:bg-red-500/5 text-red-500 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
