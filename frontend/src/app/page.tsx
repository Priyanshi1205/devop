'use client';

import React, { useState } from 'react';
import { 
  Shield, 
  Sparkles, 
  Check, 
  ArrowRight, 
  Zap, 
  Globe, 
  Layers, 
  Eye, 
  Target, 
  Share2, 
  Search, 
  Users, 
  BarChart3, 
  MessageSquare, 
  MapPin, 
  Star, 
  FileText, 
  CheckCircle, 
  Play, 
  Clock, 
  TrendingUp, 
  HelpCircle,
  Building,
  Lock
} from 'lucide-react';
import Link from 'next/link';

export default function OptimoraAiHomePage() {
  const [activeTab, setActiveTab] = useState<'seo' | 'gmb' | 'ai'>('seo');

  const features = [
    {
      title: 'GSC + GA4 + GTM Integration',
      desc: 'Seamlessly sync Google Search Console clicks, GA4 conversion events, and GTM container health checks in one unified pipeline.',
      icon: Search,
      tag: 'Data Pipeline'
    },
    {
      title: 'AI Content Studio',
      desc: 'Generate SERP-matched, high-ranking blog drafts and landing page copy using Anthropic Claude 3.5 Sonnet & Gemini engines.',
      icon: Sparkles,
      tag: 'AI Generator'
    },
    {
      title: 'GBP Local SEO Management',
      desc: 'Sync Google Business Profiles across multi-location campaigns with 1-click verification audit & AI review responder.',
      icon: MapPin,
      tag: 'Local Pack'
    },
    {
      title: 'LLM & GEO Visibility',
      desc: 'Track your brand and clients\' share-of-voice and citation rankings inside Google AI Overviews, ChatGPT, Claude, and Perplexity.',
      icon: Eye,
      tag: 'Generative Engine'
    },
    {
      title: 'Competitor Analysis',
      desc: 'Run side-by-side domain keyword gap audits to discover high-value search terms your competitors rank for.',
      icon: Users,
      tag: 'Market Intelligence'
    },
    {
      title: 'Automated SEO Audit',
      desc: 'Instant technical crawling, schema tag validation, mobile responsiveness, and page-speed optimization recommendations.',
      icon: Zap,
      tag: 'Technical Audit'
    },
  ];

  const plans = [
    {
      id: 'free_trial',
      name: 'Free Trial',
      price: '₹0',
      period: '15 Days',
      desc: 'Evaluate the full power of Optimora AI with zero commitment.',
      badge: '15-Day Free Trial',
      features: [
        '1 Project Context',
        '1 Tracked Domain',
        'Basic GSC & GA4 Sync',
        'Standard Audit Health Checks',
      ],
      cta: 'Start Free Trial',
      link: '/signup',
      highlighted: false
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '₹2,999',
      period: 'per month',
      desc: 'Ideal for independent consultants & boutique SEO freelancers.',
      badge: '15-Day Free Trial',
      features: [
        '3 Projects',
        '2 Tracked Domains',
        'Full GSC, GA4 & GTM Pipeline',
        'AI Content Studio (5 articles/mo)',
        'Keyword Discovery (100 queries/mo)',
      ],
      cta: 'Start 15-Day Trial',
      link: '/signup',
      highlighted: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '₹5,999',
      period: 'per month',
      desc: 'Built for fast-growing performance marketing agencies.',
      badge: '15-Day Free Trial',
      popularTag: 'Most Popular',
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
      cta: 'Start 15-Day Trial',
      link: '/signup',
      highlighted: true
    },
    {
      id: 'agency',
      name: 'Agency',
      price: '₹12,999',
      period: 'per month',
      desc: 'Unrestricted scale for enterprise multi-client management.',
      badge: '15-Day Free Trial',
      features: [
        'Unlimited Projects',
        '10 Tracked Domains',
        'All Premium Features',
        'White Label Client Dashboards',
        'Automated PDF Executive Reports',
        'Priority 24/7 Account Manager',
      ],
      cta: 'Start 15-Day Trial',
      link: '/signup',
      highlighted: false
    },
  ];

  const testimonials = [
    {
      quote: "Optimora AI transformed how our agency delivers client reporting. The AI Review Responder alone saves our team 15+ hours every week across our real estate accounts.",
      author: "Vikramaditya Sharma",
      role: "Founder & CEO, Apex Growth Marketing",
      location: "Mumbai, India",
      avatar: "VS"
    },
    {
      quote: "The LLM & GEO visibility index gives us an unfair advantage. We can now show clients exactly how their brand ranks inside ChatGPT and Google AI Overviews.",
      author: "Priya Nair",
      role: "Head of SEO, Digital Elevate Agency",
      location: "Bengaluru, India",
      avatar: "PN"
    },
    {
      quote: "Combining Search Console, GA4, and Google Business Profile audits into a single dark dashboard is brilliant. Our client retention jumped 40% in two quarters.",
      author: "Rohan Kapoor",
      role: "Managing Director, Spectrum Media",
      location: "New Delhi, India",
      avatar: "RK"
    }
  ];

  return (
    <div className="min-h-screen bg-[#070a13] text-foreground font-sans overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Glow Elements */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-pink-500/5 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* 1. Header Navigation */}
      <header className="border-b border-slate-800/60 bg-[#070a13]/80 backdrop-blur-xl sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white font-sans">Optimora AI</span>
              <span className="text-[9px] text-indigo-400 font-mono font-bold uppercase tracking-wider -mt-1">Agency SEO OS</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-xs font-bold text-slate-300 hover:text-white transition-colors px-3 py-2"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 text-white text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-indigo-500/20 border border-indigo-400/20 flex items-center gap-1.5"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-20 pb-20 md:pt-28 md:pb-28 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-xs font-bold text-indigo-300 uppercase tracking-wider mb-8 shadow-sm">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>Built for Modern SEO Agencies & Consultants</span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] max-w-5xl mx-auto font-sans">
            AI-Powered SEO Platform for <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Agencies & Consultants</span>
          </h1>
          
          <p className="text-base sm:text-lg text-slate-400 mt-6 max-w-3xl mx-auto leading-relaxed font-normal">
            Manage all your clients' SEO, GBP, Content & LLM Visibility from one dashboard
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-500/25 text-sm uppercase tracking-wider"
            >
              <span>Start 15-Day Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            
            <a
              href="#mockup-demo"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Play className="w-4 h-4 fill-slate-200 text-slate-200" />
              <span>Watch Demo</span>
            </a>
          </div>

          {/* Hero Interactive Dashboard Mockup Preview */}
          <div id="mockup-demo" className="mt-16 relative max-w-5xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            
            <div className="relative glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden bg-[#0a0e1a]">
              {/* Mockup Header Bar */}
              <div className="bg-slate-950/80 px-6 py-3 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs text-slate-500 ml-2 font-mono">optimora-ai.com/dashboard/airengroup.in</span>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveTab('seo')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      activeTab === 'seo' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    GSC & GA4 Sync
                  </button>
                  <button 
                    onClick={() => setActiveTab('gmb')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      activeTab === 'gmb' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    GBP AI Responder
                  </button>
                  <button 
                    onClick={() => setActiveTab('ai')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      activeTab === 'ai' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    AI Content Studio
                  </button>
                </div>
              </div>

              {/* Mockup Content Area */}
              <div className="p-6 md:p-8 text-left space-y-6">
                {activeTab === 'seo' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-950/60 p-4 border border-slate-900 rounded-2xl">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Total Clicks</span>
                        <h4 className="text-2xl font-black text-white font-mono mt-1">48,290</h4>
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-1">
                          <TrendingUp className="w-3 h-3" /> +24.8% vs last month
                        </span>
                      </div>
                      <div className="bg-slate-950/60 p-4 border border-slate-900 rounded-2xl">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Impressions</span>
                        <h4 className="text-2xl font-black text-indigo-400 font-mono mt-1">1.24M</h4>
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-1">
                          <TrendingUp className="w-3 h-3" /> +18.2% vs last month
                        </span>
                      </div>
                      <div className="bg-slate-950/60 p-4 border border-slate-900 rounded-2xl">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Avg Position</span>
                        <h4 className="text-2xl font-black text-yellow-400 font-mono mt-1">3.8</h4>
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-1">
                          Top 3 Map Pack
                        </span>
                      </div>
                      <div className="bg-slate-950/60 p-4 border border-slate-900 rounded-2xl">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">LLM Citation Score</span>
                        <h4 className="text-2xl font-black text-pink-400 font-mono mt-1">94/100</h4>
                        <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-0.5 mt-1">
                          ChatGPT & Claude Cited
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-white block">Google Search Console & GA4 Active Sync</strong>
                          <span className="text-slate-500 text-[10px]">Property: sc-domain:airengroup.in (Verified siteOwner)</span>
                        </div>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-lg font-bold text-[10px]">
                        Live Connected
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === 'gmb' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs">
                            PP
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-white">Pankaj Patel</span>
                            <span className="block text-[10px] text-slate-500">Google Business Profile Review</span>
                          </div>
                        </div>
                        <div className="flex gap-0.5 text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 italic">"Airen Woodlands is a very peaceful and premium township on Indore Bicholi Hapsi road. Infrastructure and security are top notch."</p>

                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold text-emerald-400 uppercase">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Replied ✓ (Anthropic Claude Draft)
                          </span>
                          <span className="text-slate-500">Live on Google</span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium">"Dear Pankaj Patel, thank you for the wonderful feedback regarding Airen Woodlands! We invite you to explore our other premier developments in Indore like Safal Repose."</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'ai' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          AI Article Generation Blueprint
                        </span>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2.5 py-0.5 rounded font-mono">SERP Models Matched</span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-xl border border-slate-850">
                        Topic: "Top Gated Community Villas in Indore Bypass Road 2026"<br />
                        Word Count: 1,850 Words | Key Terms Matched: 18/18 | Schema: FAQ & RealEstateListing Included
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Stats Bar */}
      <section className="py-12 bg-slate-950/60 border-y border-slate-800/60 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x-0 md:divide-x divide-slate-800/60">
            <div className="p-4">
              <h3 className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">500+</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Keywords Tracked</p>
            </div>
            <div className="p-4">
              <h3 className="text-3xl sm:text-4xl font-black text-indigo-400 font-mono tracking-tight">50+</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">GBP Profiles</p>
            </div>
            <div className="p-4">
              <h3 className="text-3xl sm:text-4xl font-black text-purple-400 font-mono tracking-tight">15-Day</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Free Trial</p>
            </div>
            <div className="p-4">
              <h3 className="text-3xl sm:text-4xl font-black text-pink-400 font-mono tracking-tight">No GST</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Required</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Features Grid */}
      <section id="features" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Complete Feature Stack</span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-2 font-sans">
              Everything Your Agency Needs to Win SEO
            </h2>
            <p className="text-slate-400 text-sm mt-3 max-w-2xl mx-auto">
              Optimora AI consolidates rank tracking, local maps optimization, AI content generation, and generative LLM search visibility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div key={idx} className="glass-panel p-8 rounded-3xl border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 shadow-xl">
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-slate-900 text-indigo-300 border border-slate-800 px-2.5 py-1 rounded-full uppercase">
                        {feat.tag}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2.5 group-hover:text-indigo-300 transition-colors">{feat.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-normal">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-950/40 border-t border-slate-800/60 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Transparent Investment</span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-2 font-sans">
              Simple Plans for Any Agency Scale
            </h2>
            <p className="text-slate-400 text-sm mt-3 max-w-xl mx-auto">
              All plans include full 15-day free trial. Upgrade or cancel anytime with zero lock-in contracts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`glass-panel rounded-3xl border flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                  plan.highlighted
                    ? 'border-indigo-500/60 shadow-[0_0_50px_-12px_rgba(99,102,241,0.3)] ring-2 ring-indigo-500/30 scale-[1.03] bg-[#0c1020]'
                    : 'border-slate-800 bg-[#080c16]'
                }`}
              >
                {plan.popularTag && (
                  <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-wider text-center py-1.5">
                    {plan.popularTag}
                  </div>
                )}

                <div className="p-8">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold text-white">{plan.name}</span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                      {plan.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 min-h-[32px] font-normal leading-relaxed">{plan.desc}</p>

                  <div className="flex items-baseline my-6">
                    <span className="text-4xl font-black text-white font-mono">{plan.price}</span>
                    <span className="text-xs text-slate-400 ml-2 font-medium">{plan.period}</span>
                  </div>

                  <div className="border-t border-slate-800/80 my-6" />

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start text-xs text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 mr-2 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-8 pt-0">
                  <Link
                    href={plan.link}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 uppercase tracking-wider ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow-lg hover:opacity-95'
                        : 'bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    <span>{plan.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Testimonials Section */}
      <section id="testimonials" className="py-24 border-t border-slate-800/60 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Client Success</span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-2 font-sans mb-16">
            Trusted by Top SEO Agencies
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {testimonials.map((test, idx) => (
              <div key={idx} className="glass-panel p-8 rounded-3xl border border-slate-800 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex gap-1 text-yellow-400 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium italic">
                    "{test.quote}"
                  </p>
                </div>

                <div className="mt-8 flex items-center gap-3.5 pt-6 border-t border-slate-900">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white shadow-md">
                    {test.avatar}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{test.author}</h4>
                    <span className="block text-[10px] text-slate-400">{test.role}</span>
                    <span className="block text-[9px] text-indigo-400 font-mono">{test.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Final CTA Section */}
      <section className="py-20 relative z-10 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-panel p-10 md:p-16 rounded-3xl border border-indigo-500/30 text-center relative overflow-hidden bg-gradient-to-b from-indigo-950/40 to-[#070a13]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
            
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight font-sans relative">
              Ready to grow your clients' SEO?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-4 max-w-xl mx-auto font-normal relative">
              Start your 15-day free trial today. Manage keywords, GSC, GA4, GTM, GMB Map Pack, and Generative LLM visibility from one dashboard.
            </p>

            <div className="mt-8 flex justify-center relative">
              <Link
                href="/signup"
                className="px-9 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white font-extrabold rounded-2xl transition-all shadow-xl shadow-indigo-500/25 text-sm uppercase tracking-wider flex items-center gap-2"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer id="about" className="border-t border-slate-800/80 bg-[#05070f] py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-900">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-black text-white">Optimora AI</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enterprise AI-powered SEO & Geographic Engine Optimization Operating System for agencies and consultants.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">GSC & GA4 Sync</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">GBP Local SEO</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">AI Content Studio</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">LLM Visibility Index</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Pricing Plans</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><Link href="/signup" className="hover:text-white transition-colors">15-Day Free Trial (₹0)</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Starter (₹2,999/mo)</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Pro (₹5,999/mo)</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Agency (₹12,999/mo)</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Account & Support</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><Link href="/login" className="hover:text-white transition-colors">Client Login</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Create Agency Account</Link></li>
                <li><a href="mailto:support@optimora-ai.com" className="hover:text-white transition-colors">Contact Support</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>&copy; {new Date().getFullYear()} Optimora AI Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-300">Privacy Policy</a>
              <a href="#" className="hover:text-slate-300">Terms of Service</a>
              <a href="#" className="hover:text-slate-300">Security Audit</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
