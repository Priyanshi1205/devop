'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { KpiWidget } from '../../../components/dashboard-widgets';
import { 
  TrafficAreaChart
} from '../../../components/svg-charts';
import { 
  Calendar, 
  Globe, 
  FolderGit2, 
  ShieldCheck, 
  TrendingUp, 
  ArrowRight,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface RecentAudit {
  site: string;
  score: number;
  issues: number;
  status: string;
  date: string;
}

interface TrafficPoint {
  date: string;
  sessions: number;
  conversions: number;
}

interface DashboardStats {
  activeProjectsCount: number;
  trackedDomainsCount: number;
  avgSeoHealth: number;
  llmCitationsSov: number;
  seoScore: number;
  geoScore: number;
  aiVisibility: number;
  domainAuthority: number;
  revenueImpact: number;
  recentAudits: RecentAudit[];
  trafficData: TrafficPoint[];
}

export default function DashboardLandingPage() {
  const { projects, websites, currentProject, currentWebsite, token } = useStore();
  
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (currentProject?.id) {
      fetchDashboardStats();
    } else {
      setStats(null);
      setLoading(false);
    }
  }, [currentProject?.id, currentWebsite?.id, token]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const websiteParam = currentWebsite?.id ? `?websiteId=${currentWebsite.id}` : '';
      const res = await fetch(`/api/projects/${currentProject?.id}/dashboard/stats${websiteParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load live dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const recentAuditsList = stats?.recentAudits || [];

  if (!mounted) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">SEO AI OS Portal</span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">Dashboard Overview</h1>
            <p className="text-sm text-slate-400 mt-1">
              Analyzing campaign performance, active crawl states, and search footprints for your enterprise workspace.
            </p>
          </div>
        </div>
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-xs text-slate-400 font-semibold">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">SEO AI OS Portal</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">Dashboard Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Analyzing campaign performance, active crawl states, and search footprints for your enterprise workspace.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/80 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span>Last sync: Just now</span>
        </div>
      </div>

      {loading && !stats ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-xs text-slate-400">Fetching live database metrics...</span>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          {/* Overview stats layout */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Active Projects</span>
                <h3 className="text-xl font-bold text-white font-mono mt-0.5">
                  {stats?.activeProjectsCount ?? projects.length} Campaigns
                </h3>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden flex items-center gap-4">
              <div className="p-3 rounded-xl bg-pink-500/10 text-pink-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Tracked Domains</span>
                <h3 className="text-xl font-bold text-white font-mono mt-0.5">
                  {stats?.trackedDomainsCount ?? websites.length} Websites
                </h3>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Avg SEO Health</span>
                <h3 className="text-xl font-bold text-white font-mono mt-0.5">
                  {stats?.avgSeoHealth !== null && stats?.avgSeoHealth !== undefined ? `${stats.avgSeoHealth}/100` : 'N/A'}
                </h3>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">LLM citations SOV</span>
                <h3 className="text-xl font-bold text-white font-mono mt-0.5">
                  {stats?.llmCitationsSov !== null && stats?.llmCitationsSov !== undefined ? `${stats.llmCitationsSov}%` : 'N/A'}
                </h3>
              </div>
            </div>
          </div>

          {/* Main KPI widgets grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            <KpiWidget 
              title="SEO Score" 
              value={stats?.seoScore !== null && stats?.seoScore !== undefined ? `${stats.seoScore}/100` : 'N/A'} 
              change="" 
              isPositive={true} 
              subtitle="Technical site health score" 
              icon="seo" 
            />
            <KpiWidget 
              title="GEO Score" 
              value={stats?.geoScore !== null && stats?.geoScore !== undefined ? `${stats.geoScore}/100` : 'N/A'} 
              change="" 
              isPositive={true} 
              subtitle="AI engine optimization score" 
              icon="geo" 
            />
            <KpiWidget 
              title="AI Visibility" 
              value={stats?.aiVisibility !== null && stats?.aiVisibility !== undefined ? `${stats.aiVisibility}%` : 'N/A'} 
              change="" 
              isPositive={true} 
              subtitle="Share of Voice in LLMs" 
              icon="visibility" 
            />
            <KpiWidget 
              title="Domain Authority" 
              value={stats?.domainAuthority !== null && stats?.domainAuthority !== undefined ? `${stats.domainAuthority}` : 'N/A'} 
              change="" 
              isPositive={true} 
              subtitle="Predictive backlink strength" 
              icon="da" 
            />
            <KpiWidget 
              title="Revenue Impact" 
              value={stats?.revenueImpact ? `$${stats.revenueImpact.toLocaleString()}` : '$0'} 
              change="" 
              isPositive={true} 
              subtitle="Estimated traffic value" 
              icon="revenue" 
            />
          </div>

          {/* Charts & Recent Audits Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Core Charts */}
            <div className="xl:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Organic Traffic Development</h3>
                  <p className="text-xs text-slate-400">Live GA4 page sessions history synced from database</p>
                </div>
              </div>
              <div className="h-52 flex items-end justify-center">
                {stats?.trafficData && stats.trafficData.length > 0 ? (
                  <TrafficAreaChart 
                    data={stats.trafficData.map(d => d.sessions)} 
                    labels={stats.trafficData.map(d => d.date)}
                    height={180} 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20 py-8">
                    <span className="text-xs font-semibold text-slate-400">No live traffic data available</span>
                    <span className="text-[10px] text-slate-500 text-center max-w-sm px-4">
                      Connect a Google Analytics 4 property in Websites settings to sync and view organic traffic development.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Crawl Audits List */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-slate-850 pb-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Crawler Audits</h3>
                  <p className="text-xs text-slate-400">Last technical inspection cycles completed</p>
                </div>

                <div className="space-y-3.5">
                  {recentAuditsList.length > 0 ? (
                    recentAuditsList.map((aud, i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-2.5 bg-slate-950/20 border border-slate-900 rounded-xl">
                        <div>
                          <span className="font-semibold text-white block">{aud.site}</span>
                          <span className="text-[10px] text-slate-500 block font-medium mt-0.5">Finished {aud.date}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-indigo-400 block font-mono">{aud.score}/100</span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded mt-1 inline-block ${
                            aud.status === 'FAILED' ? 'text-rose-400 bg-rose-500/5' : 'text-emerald-400 bg-emerald-500/5'
                          }`}>
                            {aud.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-xs text-slate-500 font-semibold border border-dashed border-slate-800 rounded-xl">
                      No crawler audits completed yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/40">
                <Link 
                  href="/seo-audit"
                  className="w-full py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <span>View Audit Engine</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
