'use client';

import React, { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { 
  CreditCard, 
  Check, 
  HelpCircle, 
  ExternalLink, 
  ArrowUpRight, 
  Download, 
  Loader2, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface Invoice {
  id: string;
  number: string;
  amount: string;
  date: string;
  status: 'Paid' | 'Unpaid';
}

const initialInvoices: Invoice[] = [
  { id: 'inv-1', number: 'INV-2026-003', amount: '₹5,999.00', date: 'Jun 1, 2026', status: 'Paid' },
  { id: 'inv-2', number: 'INV-2026-002', amount: '₹5,999.00', date: 'May 1, 2026', status: 'Paid' },
  { id: 'inv-3', number: 'INV-2026-001', amount: '₹5,999.00', date: 'Apr 1, 2026', status: 'Paid' }
];

export default function BillingPage() {
  const user = useStore((state) => state.user);
  const token = useStore((state) => state.token);
  const websites = useStore((state) => state.websites);
  const planName = user?.subscription?.plan || 'free_trial';

  const planDisplayNames: Record<string, string> = {
    free_trial: 'Free Trial',
    starter: 'Starter',
    pro: 'Pro',
    agency: 'Agency'
  };

  const currentPlanLabel = planDisplayNames[planName] || 'Free Trial';
  
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

  const planFeatures = {
    Starter: [
      '3 Projects',
      '2 Tracked Domains',
      'Full GSC, GA4 & GTM Pipeline',
      'AI Content Studio (5 articles/mo)',
      'Keyword Discovery (100 queries/mo)'
    ],
    Pro: [
      '10 Projects',
      '3 Tracked Domains',
      'GSC + GA4 + GTM + GBP Maps Sync',
      'Live LLM Visibility (Claude, ChatGPT)',
      'Competitor Gap Analysis',
      'GEO Engine Optimization',
      'AI Content Studio (20 articles/mo)',
      'Keyword Research (500 queries/mo)'
    ],
    Agency: [
      'Unlimited Projects',
      '10 Tracked Domains',
      'All Premium Features',
      'White Label Client Dashboards',
      'Automated PDF Executive Reports',
      'Priority 24/7 Account Manager'
    ]
  };

  const planPrices: Record<string, number> = {
    Starter: 2999,
    Pro: 5999,
    Agency: 12999
  };

  const domainLimits: Record<string, string> = {
    free_trial: '1',
    starter: '2',
    pro: '3',
    agency: '10'
  };

  const handleUpgrade = async (plan: 'Starter' | 'Pro' | 'Agency') => {
    const planId = plan.toLowerCase();
    if (planId === planName) return;
    
    setUpgradingPlan(plan);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId: `price_${planId}`, plan: planId }),
      });

      if (res.ok) {
        const data = await res.json();
        // Redirect to Lemon Squeezy mockup payment page
        window.location.href = data.checkoutUrl;
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to initialize checkout.');
      }
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setUpgradingPlan(null);
    }
  };

  const currentPriceDisplay = planName === 'free_trial' ? '₹0' : planPrices[currentPlanLabel] ? `₹${planPrices[currentPlanLabel].toLocaleString('en-IN')}` : '₹0';
  const websitesLimitStr = domainLimits[planName] || '1';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Account Billing & Subscriptions</span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">Billing & SaaS Subscription</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your plan settings, billing intervals, card profiles, and historical receipts for SEO AI OS.
        </p>
      </div>

      {/* Subscription Active Info Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active plan card */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between relative overflow-hidden bg-[#0d1222]">
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-indigo-500/10 blur-2xl rounded-full" />
          
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Active Plan tier</span>
                <div className="flex items-center gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-white tracking-tight">{currentPlanLabel} Plan</h3>
                  <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Cost</span>
                <span className="block text-xl font-bold text-white font-mono mt-0.5">
                  {currentPriceDisplay}{planName !== 'free_trial' ? '/mo' : ''}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/60">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Websites Used</span>
                <span className="text-sm font-semibold text-white mt-0.5">{websites.length} of {websitesLimitStr} domains</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">AI Writing Credits</span>
                <span className="text-sm font-semibold text-white mt-0.5">
                  {planName === 'free_trial' ? '0' : planName === 'starter' ? '5' : planName === 'pro' ? '20' : 'Unlimited'} monthly articles
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Billing Period</span>
                <span className="text-sm font-semibold text-white mt-0.5">Renews Jul 1, 2026</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
              <span>View Invoices PDF</span>
            </button>
          </div>
        </div>

        {/* Quick summary credit info */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between bg-[#080c16]">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Estimated Invoicing</h3>
            <p className="text-xs text-slate-400 mb-5">Next billing calculation breakdown</p>
          </div>
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between border-b border-slate-850 pb-2">
              <span className="text-slate-400">Base subscription</span>
              <span className="text-white font-mono font-semibold">{currentPriceDisplay}</span>
            </div>
            <div className="flex justify-between pb-1 text-indigo-400 font-bold">
              <span>Total calculated charges</span>
              <span className="font-mono">{currentPriceDisplay}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Pricing excludes local taxes and VAT where applicable.</span>
          </div>
        </div>
      </div>

      {/* Plans Pricing Grid */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Flexible Plans for Every Scale</h2>
          <p className="text-xs text-slate-400">Upgrade or downgrade anytime. No long term contracts.</p>
          
          <div className="inline-flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl mt-3">
            <button 
              onClick={() => setBillingInterval('monthly')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${billingInterval === 'monthly' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingInterval('yearly')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${billingInterval === 'yearly' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}
            >
              Yearly <span className="text-[9px] text-emerald-400 font-bold ml-0.5">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['Starter', 'Pro', 'Agency'] as const).map((plan) => {
            const planId = plan.toLowerCase();
            const isSelected = planName === planId;
            const price = planPrices[plan];
            const finalPrice = billingInterval === 'yearly' ? Math.floor(price * 0.8) : price;
            const features = planFeatures[plan];
            const isUpgrading = upgradingPlan === plan;

            return (
              <div 
                key={plan} 
                className={`glass-panel p-6 rounded-2xl border relative flex flex-col justify-between bg-[#080c16] ${
                  isSelected ? 'border-indigo-500 shadow-xl shadow-indigo-500/5 bg-[#0e1428]' : 'border-slate-800'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 right-6 -translate-y-1/2 bg-indigo-500 text-white px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                    Current Plan
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">{plan}</h4>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-extrabold text-white font-mono">₹{finalPrice.toLocaleString('en-IN')}</span>
                      <span className="text-xs text-slate-500 font-semibold uppercase">/ month</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-xs pt-4 border-t border-slate-800/60">
                    {features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/40">
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={isSelected || isUpgrading}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-slate-900 border border-slate-850 text-slate-500 cursor-not-allowed' 
                        : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/10'
                    } flex items-center justify-center gap-1.5`}
                  >
                    {isUpgrading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Connecting checkout...</span>
                      </>
                    ) : isSelected ? (
                      <span>Active Plan</span>
                    ) : (
                      <span>Select {plan} Plan</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice History Table */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden bg-[#080c16]/50">
        <div className="px-6 py-4 border-b border-slate-800/40 bg-slate-900/10">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Invoice History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 text-slate-500 font-semibold bg-slate-900/10">
                <th className="px-6 py-3.5">Invoice ID</th>
                <th className="px-6 py-3.5">Billing Date</th>
                <th className="px-6 py-3.5 font-mono">Amount Paid</th>
                <th className="px-6 py-3.5">Payment Status</th>
                <th className="px-6 py-3.5 text-right">Receipt Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-900/10 transition-colors">
                  <td className="px-6 py-4 font-semibold text-white">{inv.number}</td>
                  <td className="px-6 py-4 text-slate-400">{inv.date}</td>
                  <td className="px-6 py-4 font-mono font-bold">{inv.amount}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border text-emerald-400 bg-emerald-500/5 border-emerald-500/20">
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800/80 rounded-lg hover:border-slate-700 transition-colors cursor-pointer ml-auto flex items-center gap-1 font-bold">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
