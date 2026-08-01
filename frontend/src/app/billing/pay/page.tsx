'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, CheckCircle, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function CheckoutSimulatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'starter';
  const userId = searchParams.get('userId');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const pricingMap: Record<string, { name: string; price: string }> = {
    starter: { name: 'Starter Plan', price: '₹2,999/mo' },
    pro: { name: 'Pro Plan', price: '₹5,999/mo' },
    agency: { name: 'Agency Plan', price: '₹12,999/mo' },
  };

  const planDetails = pricingMap[plan] || pricingMap.starter;

  const handlePay = async () => {
    if (!userId) {
      setError('Missing userId in checkout context.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Construct Lemon Squeezy subscription webhook payload
      const payload = {
        meta: {
          event_name: 'subscription_created',
        },
        data: {
          id: `sub_ls_${Math.random().toString(36).substring(7)}`,
          type: 'subscriptions',
          attributes: {
            variant_name: planDetails.name,
            status: 'active',
            custom_data: {
              user_id: userId,
            },
            trial_ends_at: null,
            renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      };

      // Call our backend webhook
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        setError('Payment simulator webhook failed to update subscription.');
      }
    } catch (err) {
      setError('Could not connect to payment processor simulator.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl relative text-center">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Simulated Checkout Success!</h2>
        <p className="text-sm text-slate-400 mb-6">
          Lemon Squeezy simulation completed. Webhook dispatched and subscription activated.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-90 text-white font-bold rounded-xl transition-all duration-300 text-sm shadow-lg shadow-indigo-500/20"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Order Summary */}
      <div className="lg:col-span-5 glass-panel p-8 rounded-3xl border border-slate-800 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-200 mb-6">Order Summary</h2>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-400">{planDetails.name} Subscription</span>
            <span className="text-sm font-semibold text-white">{planDetails.price}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Billing frequency</span>
            <span>Monthly (Auto-renews)</span>
          </div>
        </div>

        <div className="border-t border-slate-800/80 my-6 pt-6">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm font-bold text-white">Total due today</span>
            <span className="text-2xl font-black text-white">{planDetails.price.split('/')[0]}</span>
          </div>
          <span className="text-[10px] text-slate-400">Includes mock VAT & Merchant of Record processing fees</span>
        </div>
      </div>

      {/* Credit Card mockup form */}
      <div className="lg:col-span-7 glass-panel p-8 rounded-3xl border border-slate-800 relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Mock Card Details</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-400 text-xs font-semibold">Test Sandbox</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handlePay(); }} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Card Number</label>
            <input
              type="text"
              defaultValue="4242 •••• •••• 4242"
              disabled
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 focus:outline-none text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Expires</label>
              <input
                type="text"
                defaultValue="12 / 28"
                disabled
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 focus:outline-none text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">CVC</label>
              <input
                type="text"
                defaultValue="123"
                disabled
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 focus:outline-none text-sm font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 text-sm shadow-md"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              `Pay ${planDetails.price.split('/')[0]}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CheckoutSimulatorPage() {
  return (
    <div className="min-h-screen bg-[#070a13] px-4 py-16 overflow-y-auto relative flex flex-col justify-center">
      {/* Background Decorators */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 blur-[150px] rounded-full glow-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/5 blur-[150px] rounded-full glow-glow" style={{ animationDelay: '2s' }} />

      <div className="max-w-4xl mx-auto w-full z-10 relative">
        <div className="mb-8">
          <Link href="/choose-plan" className="inline-flex items-center text-slate-400 hover:text-white transition-colors text-xs font-semibold gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Plans</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white mt-4 tracking-tight">Lemon Squeezy Checkout Simulator</h1>
          <p className="text-slate-400 text-xs mt-1">Merchant of Record sandbox simulation interface</p>
        </div>

        <Suspense fallback={
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl relative text-center py-8">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-white">Loading...</h2>
          </div>
        }>
          <CheckoutSimulatorContent />
        </Suspense>
      </div>
    </div>
  );
}
