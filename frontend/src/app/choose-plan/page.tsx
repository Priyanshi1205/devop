'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../store/useStore';
import { Shield, Check, Sparkles, Zap, Globe, Layers } from 'lucide-react';

export default function ChoosePlanPage() {
  const router = useRouter();
  const user = useStore((state) => state.user);
  const token = useStore((state) => state.token);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState('');

  const plans = [
    {
      id: 'free_trial',
      name: 'Free Trial',
      price: '₹0',
      period: '15 Days',
      features: [
        '1 Project',
        '1 Tracked Domain',
        'Basic GSC & GA4 Sync',
        'Standard Audit Health Checks',
      ],
      cta: 'Continue with Trial',
      color: 'from-slate-600 to-slate-700',
      icon: Layers,
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '₹2,999',
      period: 'per month',
      features: [
        '3 Projects',
        '2 Tracked Domains',
        'Full GSC, GA4 & GTM Pipeline',
        'AI Content Studio (5 articles/mo)',
        'Keyword Discovery (100 queries/mo)',
      ],
      cta: 'Select Starter',
      color: 'from-blue-500 to-indigo-600',
      icon: Globe,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '₹5,999',
      period: 'per month',
      recommended: true,
      features: [
        '10 Projects',
        '3 Tracked Domains',
        'GSC + GA4 + GTM + GBP Maps Sync',
        'Live LLM Visibility (Claude, ChatGPT)',
        'Competitor Gap Analysis',
        'GEO Engine Optimization',
        'AI Content Studio (20 articles/mo)',
        'Keyword Research (500 queries/mo)',
      ],
      cta: 'Select Pro',
      color: 'from-indigo-500 to-pink-500',
      icon: Sparkles,
    },
    {
      id: 'agency',
      name: 'Agency',
      price: '₹12,999',
      period: 'per month',
      features: [
        'Unlimited Projects',
        '10 Tracked Domains',
        'All Premium Features',
        'White Label Client Dashboards',
        'Automated PDF Executive Reports',
        'Priority 24/7 Account Manager',
      ],
      cta: 'Select Agency',
      color: 'from-purple-600 to-pink-600',
      icon: Zap,
    },
  ];

  const handlePlanSelect = async (planId: string) => {
    if (planId === 'free_trial') {
      router.push('/dashboard');
      return;
    }

    setLoadingPlan(planId);
    setError('');

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
        router.push(data.checkoutUrl);
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to initialize checkout.');
        setLoadingPlan(null);
      }
    } catch (err) {
      setError('Could not connect to checkout service.');
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a13] px-4 py-16 overflow-y-auto relative">
      {/* Background Decorators */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 blur-[150px] rounded-full glow-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/5 blur-[150px] rounded-full glow-glow" style={{ animationDelay: '2s' }} />

      <div className="max-w-6xl mx-auto z-10 relative">
        <div className="flex flex-col items-center text-center mb-16">
          <div className="flex items-center gap-2 p-3 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-2xl shadow-xl shadow-indigo-500/10 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
            Choose Your Subscription Plan
          </h1>
          <p className="text-lg text-slate-400 mt-4 max-w-2xl">
            Unlock the power of Optimora AI and dominate search rankings with real-time audit intelligence.
          </p>
          {error && (
            <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl max-w-md">
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`glass-panel rounded-3xl border relative flex flex-col justify-between overflow-hidden transition-all duration-300 ${
                  plan.recommended
                    ? 'border-indigo-500/50 shadow-[0_0_50px_-12px_rgba(99,102,241,0.25)] ring-2 ring-indigo-500/20 scale-[1.03] md:scale-[1.05]'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-[10px] font-bold uppercase tracking-wider text-center py-1.5">
                    Most Popular
                  </div>
                )}

                <div className="p-8">
                  <div className="flex items-center justify-between mb-4 mt-2">
                    <span className="text-lg font-bold text-slate-200">{plan.name}</span>
                    <div className="p-2 bg-slate-900 rounded-lg text-indigo-400">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="flex items-baseline mb-6">
                    <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                    <span className="text-xs text-slate-400 ml-2 font-medium">{plan.period}</span>
                  </div>

                  <div className="border-t border-slate-800/80 my-6" />

                  <ul className="space-y-3.5 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-xs text-slate-400">
                        <Check className="w-4 h-4 text-indigo-400 mr-2.5 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-8 pt-0">
                  <button
                    onClick={() => handlePlanSelect(plan.id)}
                    disabled={loadingPlan !== null}
                    className={`w-full py-3 px-4 rounded-xl font-bold transition-all duration-300 text-xs flex items-center justify-center gap-2 ${
                      plan.recommended
                        ? 'bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-90 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {loadingPlan === plan.id ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      plan.cta
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
