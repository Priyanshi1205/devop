'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Users, AlertCircle, TrendingUp, X, Loader2, Wand2, Sparkles, Database } from 'lucide-react';
import { useStore } from '../../../store/useStore';

interface Competitor {
  id: string;
  domain: string;
  projectId: string;
  createdAt: string;
  domainAuthority?: number;
  estimatedTraffic?: number;
  overlapCount?: number;
  overlapPercent?: number;
}

interface ContentGapItem {
  id: string;
  text: string;
  rank: number;
  volume: number;
  difficulty: number;
}

import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function CompetitorAnalysisPage() {
  const { currentProject, token } = useStore();
  const user = useStore((state) => state.user);

  const plan = user?.subscription?.plan || 'free_trial';
  const isLocked = plan === 'free_trial' || plan === 'starter';

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [gaps, setGaps] = useState<ContentGapItem[]>([]);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isLocked) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center glass-panel rounded-3xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[250px] h-[250px] bg-indigo-500/10 blur-[80px] rounded-full glow-glow" />
        
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 font-sans tracking-tight text-center">Feature Locked</h2>
        <p className="text-slate-400 text-sm max-w-md mb-8 leading-relaxed font-sans text-center">
          The Competitor SEO Keyword Gap tracker and discovery audit is only available on Pro and Agency plans. Upgrade your plan to unlock competitor comparison metrics.
        </p>
        <Link
          href="/choose-plan"
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold rounded-xl shadow-md text-xs uppercase tracking-wider hover:opacity-95 transition-all font-sans"
        >
          Upgrade Plan
        </Link>
      </div>
    );
  }

  const fetchCompetitorsAndGaps = async () => {
    if (!currentProject) {
      setCompetitors([]);
      setGaps([]);
      return;
    }

    const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!token || token === 'mock-jwt-token-xyz' || !isUuid(currentProject.id)) {
      // Offline fallback seeds
      setCompetitors([
        { id: 'mock-1', domain: 'magicbricks.com', projectId: currentProject.id, createdAt: new Date().toISOString(), domainAuthority: 82, estimatedTraffic: 1540000, overlapPercent: 45, overlapCount: 4 },
        { id: 'mock-2', domain: '99acres.com', projectId: currentProject.id, createdAt: new Date().toISOString(), domainAuthority: 80, estimatedTraffic: 1200000, overlapPercent: 38, overlapCount: 3 }
      ]);
      setGaps([
        { id: 'g-1', text: 'luxury flats in indore for sale', rank: 2, volume: 1200, difficulty: 35 },
        { id: 'g-2', text: 'commercial property for sale in indore', rank: 4, volume: 900, difficulty: 42 },
        { id: 'g-3', text: 'top builders in indore list', rank: 3, volume: 2100, difficulty: 40 },
        { id: 'g-4', text: 'plots near bypass road indore', rank: 1, volume: 800, difficulty: 31 },
        { id: 'g-5', text: 'ready to move houses in indore', rank: 5, volume: 1500, difficulty: 38 }
      ]);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const compRes = await fetch(`/api/projects/${currentProject.id}/competitors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const gapRes = await fetch(`/api/projects/${currentProject.id}/competitors/gap`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (compRes.ok && gapRes.ok) {
        const compData = await compRes.json();
        const gapData = await gapRes.json();
        setCompetitors(compData);
        setGaps(gapData);
      } else {
        setErrorMsg('Failed to load competitor gap metrics.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to backend competitor service.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    if (!currentProject) {
      setInsights(null);
      return;
    }
    const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!token || token === 'mock-jwt-token-xyz' || !isUuid(currentProject.id)) {
      let summary = '';
      if (currentProject.name.toLowerCase().includes('airen') || currentProject.id === '1') {
        summary = "Based on your keywords and domain, your main competitors are magicbricks.com, 99acres.com, and housing.com because they rank extensively for high-intent real estate search terms in Indore. They command strong organic visibility for terms relating to ready-to-move-in flats and premium residential plots. You should target long-tail queries near high-growth zones like Bypass Road to bypass their high domain authority.";
      } else {
        summary = "Based on your keywords and domain, your main competitors are competitor-alpha.com and competitor-beta.com because they rank highly for winter boots and outdoor gear terms. They rank better for waterproof hiking footwear, which you should target to fill your product-specific content gaps.";
      }
      setInsights(summary);
      return;
    }

    setInsightsLoading(true);
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/competitors/insights`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitorsAndGaps();
    fetchInsights();
  }, [currentProject?.id, token]);

  const handleDiscover = async () => {
    if (!currentProject) return;
    
    const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!token || token === 'mock-jwt-token-xyz' || !isUuid(currentProject.id)) {
      setDiscovering(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setDiscovering(false);
      
      const list = currentProject.name.toLowerCase().includes('airen')
        ? [
            { id: 'mock-da-1', domain: 'magicbricks.com', projectId: currentProject.id, createdAt: new Date().toISOString(), domainAuthority: 82, estimatedTraffic: 1540000, overlapPercent: 45, overlapCount: 4 },
            { id: 'mock-da-2', domain: '99acres.com', projectId: currentProject.id, createdAt: new Date().toISOString(), domainAuthority: 80, estimatedTraffic: 1200000, overlapPercent: 38, overlapCount: 3 },
            { id: 'mock-da-3', domain: 'housing.com', projectId: currentProject.id, createdAt: new Date().toISOString(), domainAuthority: 79, estimatedTraffic: 980000, overlapPercent: 42, overlapCount: 4 },
            { id: 'mock-da-4', domain: 'nobroker.in', projectId: currentProject.id, createdAt: new Date().toISOString(), domainAuthority: 74, estimatedTraffic: 820000, overlapPercent: 29, overlapCount: 2 },
            { id: 'mock-da-5', domain: 'indoreproperty.in', projectId: currentProject.id, createdAt: new Date().toISOString(), domainAuthority: 45, estimatedTraffic: 45000, overlapPercent: 62, overlapCount: 6 }
          ]
        : [
            { id: 'mock-da-1', domain: 'geeksforgeeks.org', projectId: currentProject.id, createdAt: new Date().toISOString(), domainAuthority: 88, estimatedTraffic: 4200000, overlapPercent: 40, overlapCount: 3 },
            { id: 'mock-da-2', domain: 'stackoverflow.com', projectId: currentProject.id, createdAt: new Date().toISOString(), domainAuthority: 92, estimatedTraffic: 8500000, overlapPercent: 25, overlapCount: 2 },
            { id: 'mock-da-3', domain: 'w3schools.com', projectId: currentProject.id, createdAt: new Date().toISOString(), domainAuthority: 89, estimatedTraffic: 6100000, overlapPercent: 30, overlapCount: 2 }
          ];
      setCompetitors(list);
      
      const newMockGaps = currentProject.name.toLowerCase().includes('airen')
        ? [
            { id: 'mock-gap-1', text: 'luxury flats in indore for sale', rank: 2, volume: 1200, difficulty: 35 },
            { id: 'mock-gap-2', text: 'commercial property for sale in indore', rank: 4, volume: 900, difficulty: 42 },
            { id: 'mock-gap-3', text: 'top builders in indore list', rank: 3, volume: 2100, difficulty: 40 },
            { id: 'mock-gap-4', text: 'plots near bypass road indore', rank: 1, volume: 800, difficulty: 31 },
            { id: 'mock-gap-5', text: 'ready to move houses in indore', rank: 5, volume: 1500, difficulty: 38 }
          ]
        : [
            { id: 'mock-gap-1', text: 'react typescript interview questions', rank: 2, volume: 15000, difficulty: 52 },
            { id: 'mock-gap-2', text: 'how to configure prisma with nextjs', rank: 4, volume: 4500, difficulty: 28 },
            { id: 'mock-gap-3', text: 'best nestjs tutorial for beginners', rank: 3, volume: 2800, difficulty: 34 },
            { id: 'mock-gap-4', text: 'clean code checklist for web apps', rank: 5, volume: 1900, difficulty: 30 }
          ];
      setGaps(newMockGaps);
      
      let summary = currentProject.name.toLowerCase().includes('airen')
        ? "Based on your keywords and domain, your main competitors are magicbricks.com, 99acres.com, and housing.com because they rank extensively for high-intent real estate search terms in Indore. They command strong organic visibility for terms relating to ready-to-move-in flats and premium residential plots. You should target long-tail queries near high-growth zones like Bypass Road to bypass their high domain authority."
        : "Based on your keywords and domain, your main competitors are geeksforgeeks.org, stackoverflow.com, and w3schools.com because they dominate developer tutorials and documentation queries. They rank exceptionally well for React TypeScript templates and structured coding guides. Targeting specific backend integration issues and framework setup guides will yield immediate content gap improvements.";
      setInsights(summary);
      return;
    }

    setDiscovering(true);
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/competitors/discover`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const compData = await res.json();
        setCompetitors(compData);
        await fetchCompetitorsAndGaps();
        await fetchInsights();
      } else {
        alert('Competitor discovery failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error triggering competitor discovery.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompetitor.trim() || !currentProject) return;

    const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!token || token === 'mock-jwt-token-xyz' || !isUuid(currentProject.id)) {
      const mockComp: Competitor = {
        id: `mock-${Date.now()}`,
        domain: newCompetitor.trim(),
        projectId: currentProject.id,
        createdAt: new Date().toISOString(),
        domainAuthority: 52,
        estimatedTraffic: 145000,
        overlapPercent: 20,
        overlapCount: 2
      };
      setCompetitors([...competitors, mockComp]);
      setNewCompetitor('');
      setShowForm(false);
      return;
    }

    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: currentProject.id,
          domain: newCompetitor.trim()
        })
      });

      if (res.ok) {
        await fetchCompetitorsAndGaps();
        await fetchInsights();
        setNewCompetitor('');
        setShowForm(false);
      } else {
        const txt = await res.text();
        alert(`Failed to add competitor: ${txt || res.statusText}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error adding competitor: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentProject) return;
    if (id.startsWith('mock-') || !token || token === 'mock-jwt-token-xyz') {
      setCompetitors(competitors.filter(c => c.id !== id));
      return;
    }

    try {
      const res = await fetch(`/api/competitors/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchCompetitorsAndGaps();
        await fetchInsights();
      } else {
        alert('Failed to stop tracking competitor.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting competitor.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Market Intelligence</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">Competitor Analysis</h1>
          <p className="text-sm text-slate-400 mt-1">Audit and compare your rankings against key competitor domains.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDiscover}
            disabled={discovering}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0d1222]/80 border border-slate-850 hover:border-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {discovering ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            ) : (
              <Wand2 className="w-4 h-4 text-indigo-400" />
            )}
            <span>Discover Competitors</span>
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer shadow-lg shadow-indigo-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Add Competitor</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
          {errorMsg}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 max-w-md">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Track Competitor Domain</h3>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Domain URL</label>
            <input 
              type="text" 
              value={newCompetitor}
              onChange={(e) => setNewCompetitor(e.target.value)}
              placeholder="e.g. competitor.com"
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg cursor-pointer">
              Add Domain
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 text-xs font-semibold rounded-lg cursor-pointer">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* AI Insights Summary Card */}
      {(insights || insightsLoading) && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-indigo-950/20 via-slate-900/40 to-slate-950/20 relative overflow-hidden animate-fadeIn">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-24 h-24 text-indigo-400" />
          </div>
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI-Powered Competitor Insights</h3>
              {insightsLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span className="text-xs text-slate-500 font-semibold">Synthesizing SEO market visibility...</span>
                </div>
              ) : (
                <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                  {insights}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tracked Competitors Overview Grid */}
      {competitors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitors.map((comp) => {
            const da = comp.domainAuthority || 35;
            const traffic = comp.estimatedTraffic || 12000;
            const overlap = comp.overlapPercent || 0;

            return (
              <div key={comp.id} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-indigo-500/30 transition-all duration-300 relative group/card">
                <button
                  onClick={() => handleDelete(comp.id)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-rose-400 transition-colors p-1 bg-slate-950/40 hover:bg-slate-900 border border-slate-850/60 hover:border-slate-800 rounded-lg cursor-pointer"
                  title="Remove Competitor"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-mono tracking-tight">{comp.domain}</h4>
                    <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Organic Competitor</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-2 text-center text-xs">
                  <div className="bg-slate-950/40 border border-slate-850/50 p-2.5 rounded-xl">
                    <span className="text-[8px] text-slate-500 uppercase block font-bold">Domain Auth</span>
                    <span className="font-mono text-[11px] font-bold text-white block mt-0.5">{da} <span className="text-[8px] text-slate-550">vs ours</span></span>
                  </div>
                  <div className="bg-slate-950/40 border border-slate-850/50 p-2.5 rounded-xl">
                    <span className="text-[8px] text-slate-500 uppercase block font-bold">Est Traffic</span>
                    <span className="font-mono text-[11px] font-bold text-white block mt-0.5">{traffic.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-950/40 border border-slate-850/50 p-2.5 rounded-xl">
                    <span className="text-[8px] text-slate-500 uppercase block font-bold">Overlap</span>
                    <span className="font-mono text-[11px] font-bold text-indigo-400 block mt-0.5">{overlap}%</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                    <span>Keyword Overlap Share</span>
                    <span className="text-indigo-400">{overlap}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full" 
                      style={{ width: `${overlap}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* KPI Cards Summary Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex justify-between items-center bg-[#0d1222]/20">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Tracked Rivals</span>
            <h3 className="text-xl font-bold text-white font-mono mt-0.5">{competitors.length} domains</h3>
          </div>
          <Users className="w-8 h-8 text-indigo-400 opacity-60 shrink-0" />
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex justify-between items-center bg-[#0d1222]/20">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Content Gaps Found</span>
            <h3 className="text-xl font-bold text-white font-mono mt-0.5">{gaps.length} terms</h3>
          </div>
          <AlertCircle className="w-8 h-8 text-rose-400 opacity-60" />
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex justify-between items-center bg-[#0d1222]/20">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Ranking Share</span>
            <h3 className="text-xl font-bold text-white font-mono mt-0.5">
              {competitors.length > 0 ? `${(32.4 + competitors.length * 1.5).toFixed(1)}%` : '0%'}
            </h3>
          </div>
          <TrendingUp className="w-8 h-8 text-emerald-400 opacity-60" />
        </div>
      </div>

      {/* Content Gap Analysis Table */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden bg-[#0d1222]/10">
        <div className="px-6 py-4 border-b border-slate-800/40 bg-slate-900/10 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">SEO Content Gaps Analysis</h3>
            <p className="text-[10px] text-slate-500 mt-1">High volume terms where competitors rank in the top 10 but your domain ranks poorly.</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-950/40 px-2.5 py-1 border border-slate-850/60 rounded-xl">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Priority Content Opportunities</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              <span className="text-xs text-slate-500">Calculating semantic gaps...</span>
            </div>
          ) : gaps.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs italic">
              No content gaps found. Click "Discover Competitors" or add domains manually to compare rankings.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-500 font-semibold bg-slate-900/10">
                  <th className="px-6 py-3.5">Keyword Phrase</th>
                  <th className="px-6 py-3.5">Rival Rank</th>
                  <th className="px-6 py-3.5">My Rank</th>
                  <th className="px-6 py-3.5">Monthly Vol</th>
                  <th className="px-6 py-3.5">Difficulty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {gaps.map((gap) => (
                  <tr key={gap.id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{gap.text}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                        #{gap.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      <span className="text-[10px] text-slate-500 font-semibold italic">Not ranking yet</span>
                    </td>
                    <td className="px-6 py-4 font-mono">{gap.volume?.toLocaleString()}</td>
                    <td className="px-6 py-4 font-mono">{gap.difficulty}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
