'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../../store/useStore';
import { CreditCard, Download, Loader2, ArrowUpDown, HelpCircle } from 'lucide-react';

interface Payment {
  id: string;
  clientName: string;
  email: string;
  plan: string;
  amount: number;
  dueDate: string;
  paidOn?: string;
  status: string;
  paymentMethod: string;
  invoiceUrl?: string;
}

export default function AdminPayments() {
  const token = useStore((state) => state.token);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/admin/payments?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      console.error('Error fetching admin payments:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, token]);

  useEffect(() => {
    if (token) {
      fetchPayments();
    }
  }, [fetchPayments, token]);

  const handleMarkPaid = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/mark-paid`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert('Payment marked as paid successfully!');
        fetchPayments();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleExportCSV = () => {
    if (payments.length === 0) return;

    // Header row
    const headers = ['Payment ID', 'Client Name', 'Email', 'Plan', 'Amount', 'Due Date', 'Paid Date', 'Status', 'Method'];
    const rows = payments.map(p => [
      p.id,
      p.clientName,
      p.email,
      p.plan,
      p.amount,
      p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '',
      p.paidOn ? new Date(p.paidOn).toLocaleDateString() : '',
      p.status,
      p.paymentMethod
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `optimora_payments_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Accounting Ledger</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5 font-sans font-sans">Payment Transactions</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track and reconcile invoice receipts, identify overdue accounts, and export transaction logs for bookkeeping.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={payments.length === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Filter tab bar */}
      <div className="flex bg-slate-900/40 p-1 border border-slate-800/80 rounded-xl max-w-lg">
        {['', 'paid', 'due', 'overdue', 'failed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors cursor-pointer ${
              statusFilter === status 
                ? 'bg-indigo-500 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {status === '' ? 'All' : status}
          </button>
        ))}
      </div>

      {/* Table view */}
      <div className="glass-panel border border-slate-800/80 rounded-2xl overflow-hidden bg-[#080c16]/30">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <CreditCard className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm font-semibold">No payments found</p>
            <p className="text-slate-500 text-xs">There are no records matching the selected status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-500 font-semibold bg-slate-900/10">
                  <th className="px-6 py-3.5">Subscriber</th>
                  <th className="px-6 py-3.5">Plan</th>
                  <th className="px-6 py-3.5">Due Date</th>
                  <th className="px-6 py-3.5">Paid Date</th>
                  <th className="px-6 py-3.5 font-mono">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {payments.map((p) => {
                  const isOverdue = p.status === 'overdue';
                  return (
                    <tr key={p.id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-bold text-white block">{p.clientName}</span>
                          <span className="text-[10px] text-slate-500 block">{p.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-white">{p.plan}</span>
                      </td>
                      <td className={`px-6 py-4 font-semibold ${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
                        {new Date(p.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {p.paidOn ? new Date(p.paidOn).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-white">
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          p.status === 'paid' 
                            ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20' 
                            : isOverdue 
                            ? 'text-red-400 bg-red-500/5 border-red-500/20'
                            : 'text-yellow-400 bg-yellow-500/5 border-yellow-500/20'
                        }`}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {p.status !== 'paid' && (
                          <button
                            onClick={() => handleMarkPaid(p.id)}
                            className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
                          >
                            Mark Received
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
