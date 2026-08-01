'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { 
  BarChart2, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Globe, 
  HelpCircle,
  Calendar,
  Sparkles,
  MousePointer,
  Eye,
  Percent,
  Compass,
  Activity,
  Award,
  DollarSign
} from 'lucide-react';

interface Property {
  id: string;
  propertyId: string;
  displayName: string;
  websiteId: string | null;
  accountName: string;
}

interface SeoMetricPoint {
  date: string;
  dateStr: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  users: number;
  sessions: number;
  conversions: number;
  revenue: number;
}

interface Kpis {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  users: number;
  sessions: number;
  conversions: number;
  revenue: number;
}

interface GrowthRates {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  users: number;
  sessions: number;
  conversions: number;
  revenue: number;
}

interface GrowthDigest {
  weekly: GrowthRates;
  monthly: GrowthRates;
}

interface ForecastPoint {
  date: string;
  expected: number;
  lowerBound: number;
  upperBound: number;
}

interface ForecastSeries {
  days30: ForecastPoint[];
  days60: ForecastPoint[];
  days90: ForecastPoint[];
  confidenceScore: number;
}

interface ForecastGroup {
  clicks: ForecastSeries;
  sessions: ForecastSeries;
  revenue: ForecastSeries;
}

interface LandingPageItem {
  pagePath: string;
  sessions: number;
  activeUsers: number;
  conversions: number;
  bounceRate: number;
}

interface PerformanceResponse {
  seoPerformanceData: SeoMetricPoint[];
  kpis: Kpis;
  growthDigest: GrowthDigest;
  forecast: ForecastGroup;
  trafficSources: Record<string, number>;
  deviceBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
  landingPages: LandingPageItem[];
}

export default function AnalyticsPage() {
  const { currentWebsite, token } = useStore();

  const [mounted, setMounted] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [performanceData, setPerformanceData] = useState<PerformanceResponse | null>(null);
  
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Split GA4 States
  const [overviewData, setOverviewData] = useState<any | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [trafficData, setTrafficData] = useState<any | null>(null);
  const [loadingTraffic, setLoadingTraffic] = useState(false);
  const [trafficError, setTrafficError] = useState<string | null>(null);

  const [landingPagesData, setLandingPagesData] = useState<any | null>(null);
  const [loadingLandingPages, setLoadingLandingPages] = useState(false);
  const [landingPagesError, setLandingPagesError] = useState<string | null>(null);

  const [conversionsData, setConversionsData] = useState<any | null>(null);
  const [loadingConversions, setLoadingConversions] = useState(false);
  const [conversionsError, setConversionsError] = useState<string | null>(null);

  // Connection Wizard toggles
  const [showWizard, setShowWizard] = useState(false);
  const [selectedWizardProp, setSelectedWizardProp] = useState<Property | null>(null);
  const [wizardProperties, setWizardProperties] = useState<Property[]>([]);
  const [loadingWizardProperties, setLoadingWizardProperties] = useState(false);

  // Chart Metric Selectors
  const [primaryMetric, setPrimaryMetric] = useState<keyof Kpis>('clicks');
  const [secondaryMetric, setSecondaryMetric] = useState<keyof Kpis>('sessions');

  // Digests Period Selectors
  const [reportPeriod, setReportPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [forecastMetric, setForecastMetric] = useState<'clicks' | 'sessions' | 'revenue'>('clicks');
  const [forecastPeriod, setForecastPeriod] = useState<30 | 60 | 90>(30);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [token]);

  useEffect(() => {
    if (currentWebsite?.id) {
      fetchSeoPerformance();
      fetchGa4Data();
    } else {
      setPerformanceData(null);
      setOverviewData(null);
      setTrafficData(null);
      setLandingPagesData(null);
      setConversionsData(null);
      setShowWizard(false);
    }
  }, [currentWebsite?.id, token]);

  useEffect(() => {
    if (showWizard && currentWebsite?.id) {
      fetchWizardProperties();
    }
  }, [showWizard, currentWebsite?.id, token]);

  const fetchWizardProperties = async () => {
    if (!currentWebsite?.id) return;
    setLoadingWizardProperties(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${currentWebsite.id}/google/ga4-properties`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setWizardProperties(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWizardProperties(false);
    }
  };

  const fetchProperties = async () => {
    setLoadingProperties(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/properties`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProperties(false);
    }
  };

  const fetchSeoPerformance = async () => {
    setLoadingData(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/seo-performance?websiteId=${currentWebsite?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPerformanceData(data);
      } else {
        setErrorMessage('Could not load unified SEO Performance metrics.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to connect to backend SEO Performance APIs.');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchGa4Data = async () => {
    if (!currentWebsite?.id) return;

    // Fetch Overview
    setLoadingOverview(true);
    setOverviewError(null);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/overview/${currentWebsite.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(async res => {
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to load GA4 overview');
      }
      return res.json();
    })
    .then(data => setOverviewData(data))
    .catch(err => {
      console.error(err);
      setOverviewError(err.message || 'GA4 Overview Error');
    })
    .finally(() => setLoadingOverview(false));

    // Fetch Traffic
    setLoadingTraffic(true);
    setTrafficError(null);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/traffic/${currentWebsite.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(async res => {
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to load GA4 traffic');
      }
      return res.json();
    })
    .then(data => setTrafficData(data))
    .catch(err => {
      console.error(err);
      setTrafficError(err.message || 'GA4 Traffic Error');
    })
    .finally(() => setLoadingTraffic(false));

    // Fetch Landing Pages
    setLoadingLandingPages(true);
    setLandingPagesError(null);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/landing-pages/${currentWebsite.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(async res => {
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to load GA4 landing pages');
      }
      return res.json();
    })
    .then(data => setLandingPagesData(data))
    .catch(err => {
      console.error(err);
      setLandingPagesError(err.message || 'GA4 Landing Pages Error');
    })
    .finally(() => setLoadingLandingPages(false));

    // Fetch Conversions
    setLoadingConversions(true);
    setConversionsError(null);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/conversions/${currentWebsite.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(async res => {
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to load GA4 conversions');
      }
      return res.json();
    })
    .then(data => setConversionsData(data))
    .catch(err => {
      console.error(err);
      setConversionsError(err.message || 'GA4 Conversions Error');
    })
    .finally(() => setLoadingConversions(false));
  };

  const handleSyncAll = async () => {
    if (!currentWebsite) return;
    setSyncing(true);
    try {
      // 1. Sync GSC
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${currentWebsite.id}/sync/gsc`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // 2. Sync GA4 (if property mapping exists)
      const mappedProp = properties.find(p => p.websiteId === currentWebsite.id);
      if (mappedProp) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ propertyId: mappedProp.id })
        });
      }

      alert('Google Search Console & GA4 synchronization completed successfully!');
      fetchSeoPerformance();
      fetchGa4Data();
    } catch (err) {
      console.error(err);
      alert('Synchronization failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectProperty = async () => {
    if (!selectedWizardProp || !currentWebsite) return;
    setConnecting(true);

    const payload = {
      websiteId: currentWebsite.id,
      propertyId: selectedWizardProp.propertyId,
      displayName: selectedWizardProp.displayName
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowWizard(false);
        fetchProperties();
        fetchSeoPerformance();
      } else {
        alert('Connection mapping failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error mapping GA4 property.');
    } finally {
      setConnecting(false);
    }
  };

  // Helper for GA4 connection alerts
  const renderGa4ConnectionPrompt = (title: string, message: string) => (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center py-12 space-y-4">
      <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
        <BarChart2 className="w-8 h-8" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          {message}
        </p>
      </div>
      <button
        onClick={() => setShowWizard(true)}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-white rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-lg mt-2"
      >
        Connect GA4 Property
      </button>
    </div>
  );

  // Helper for loading skeletons
  const renderSkeletonLoader = (message = "Fetching metrics from Google APIs...") => (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-center items-center gap-3 py-12">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      <span className="text-xs text-slate-500 font-medium">{message}</span>
    </div>
  );

  // SVG Dual Axis Line Chart Builder
  const renderDualChart = (data: SeoMetricPoint[], primKey: keyof Kpis, secKey: keyof Kpis, height = 240) => {
    if (!data || data.length === 0) return null;

    const getMinMax = (key: keyof Kpis) => {
      const vals = data.map(d => Number(d[key as keyof SeoMetricPoint]));
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      return { min, max, range: max - min || 1 };
    };

    const prim = getMinMax(primKey);
    const sec = getMinMax(secKey);

    const getScaledY = (val: number, min: number, max: number, range: number, invert = false) => {
      const ratio = (val - min) / range;
      const pct = invert ? ratio : (1 - ratio);
      return 15 + pct * 70; // Map to 15-85% height
    };

    const primPoints = data.map((d, idx) => {
      const x = (idx / (data.length - 1)) * 100;
      const y = getScaledY(Number(d[primKey as keyof SeoMetricPoint]), prim.min, prim.max, prim.range, primKey === 'position');
      return { x, y };
    });

    const secPoints = data.map((d, idx) => {
      const x = (idx / (data.length - 1)) * 100;
      const y = getScaledY(Number(d[secKey as keyof SeoMetricPoint]), sec.min, sec.max, sec.range, secKey === 'position');
      return { x, y };
    });

    const primPath = primPoints.reduce((acc, p, idx) => 
      idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ''
    );
    const primArea = `${primPath} L 100 90 L 0 90 Z`;

    const secPath = secPoints.reduce((acc, p, idx) => 
      idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ''
    );

    const primColor = '#6366f1'; // Indigo
    const secColor = '#10b981'; // Emerald

    return (
      <div className="w-full">
        <svg viewBox="0 0 100 100" className="w-full overflow-visible" style={{ height }}>
          <defs>
            <linearGradient id="primGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={primColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1="15" x2="100" y2="15" stroke="#1e293b" strokeWidth="0.2" strokeDasharray="1" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" strokeWidth="0.2" strokeDasharray="1" />
          <line x1="0" y1="85" x2="100" y2="85" stroke="#1e293b" strokeWidth="0.4" />

          {/* Primary Area Fill */}
          <path d={primArea} fill="url(#primGrad)" />

          {/* Primary Stroke */}
          <path d={primPath} fill="none" stroke={primColor} strokeWidth="1" strokeLinecap="round" />

          {/* Secondary Stroke */}
          <path d={secPath} fill="none" stroke={secColor} strokeWidth="0.85" strokeLinecap="round" strokeDasharray="1" />

          {/* Data Points */}
          {primPoints.map((p, idx) => (
            <circle key={`p-${idx}`} cx={p.x} cy={p.y} r="0.8" fill="#070a13" stroke={primColor} strokeWidth="0.5" />
          ))}
          {secPoints.map((p, idx) => (
            <circle key={`s-${idx}`} cx={p.x} cy={p.y} r="0.8" fill="#070a13" stroke={secColor} strokeWidth="0.5" />
          ))}
        </svg>

        <div className="flex justify-between text-[9px] text-slate-500 mt-2 px-1">
          <span>{data[0].dateStr}</span>
          <span>{data[Math.floor(data.length / 2)].dateStr}</span>
          <span>{data[data.length - 1].dateStr}</span>
        </div>
      </div>
    );
  };

  // Mini Sparkline Graph Builder
  const renderSparkline = (values: number[], color: string) => {
    if (!values || values.length === 0) return null;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const points = values.map((val, idx) => {
      const x = (idx / (values.length - 1)) * 100;
      const y = 25 - ((val - min) / range) * 20; // scale to height of 25px
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-16 h-6 overflow-visible" viewBox="0 0 100 25">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.25"
          points={points}
        />
      </svg>
    );
  };

  // SVG Forecast Chart Builder
  const renderForecastChart = (forecastPoints: ForecastPoint[], height = 180) => {
    if (forecastPoints.length === 0) return null;

    const values = [
      ...forecastPoints.map(p => p.expected),
      ...forecastPoints.map(p => p.lowerBound),
      ...forecastPoints.map(p => p.upperBound)
    ];

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    const points = forecastPoints.map((p, idx) => {
      const x = (idx / (forecastPoints.length - 1)) * 100;
      const y = 80 - ((p.expected - min) / range) * 55;
      const yLow = 80 - ((p.lowerBound - min) / range) * 55;
      const yHigh = 80 - ((p.upperBound - min) / range) * 55;
      return { x, y, yLow, yHigh };
    });

    const expectedPath = points.reduce((acc, p, idx) => 
      idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ''
    );

    let envelopePath = `M ${points[0].x} ${points[0].yHigh}`;
    for (let i = 1; i < points.length; i++) {
      envelopePath += ` L ${points[i].x} ${points[i].yHigh}`;
    }
    for (let i = points.length - 1; i >= 0; i--) {
      envelopePath += ` L ${points[i].x} ${points[i].yLow}`;
    }
    envelopePath += ' Z';

    return (
      <div className="w-full animate-fadeIn">
        <svg viewBox="0 0 100 100" className="w-full overflow-visible" style={{ height }}>
          <line x1="0" y1="25" x2="100" y2="25" stroke="#1e293b" strokeWidth="0.25" strokeDasharray="1" />
          <line x1="0" y1="52" x2="100" y2="52" stroke="#1e293b" strokeWidth="0.25" strokeDasharray="1" />
          <line x1="0" y1="80" x2="100" y2="80" stroke="#1e293b" strokeWidth="0.5" />

          {/* Envelope */}
          <path d={envelopePath} fill="rgba(99, 102, 241, 0.1)" />

          {/* Expected path */}
          <path d={expectedPath} fill="none" stroke="#6366f1" strokeWidth="1" strokeDasharray="1.5" />
          
          {/* Upper/Lower bounds */}
          <path d={points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.yHigh}` : `${acc} L ${p.x} ${p.yHigh}`, '')} fill="none" stroke="#4f46e5" strokeWidth="0.4" strokeDasharray="0.8" />
          <path d={points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.yLow}` : `${acc} L ${p.x} ${p.yLow}`, '')} fill="none" stroke="#4f46e5" strokeWidth="0.4" strokeDasharray="0.8" />

          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="1" fill="#6366f1" />
        </svg>
        <div className="flex justify-between text-[8px] text-slate-500 mt-2 px-1">
          <span>{forecastPoints[0].date}</span>
          <span>{forecastPoints[Math.floor(forecastPoints.length / 2)].date}</span>
          <span>{forecastPoints[forecastPoints.length - 1].date}</span>
        </div>
      </div>
    );
  };

  const getMetricName = (key: keyof Kpis) => {
    switch(key) {
      case 'clicks': return 'GSC Clicks';
      case 'impressions': return 'GSC Impressions';
      case 'ctr': return 'GSC CTR';
      case 'position': return 'Avg Position';
      case 'users': return 'GA4 Users';
      case 'sessions': return 'GA4 Sessions';
      case 'conversions': return 'Conversions';
      case 'revenue': return 'Revenue';
      default: return String(key);
    }
  };

  const activeRates = reportPeriod === 'weekly' ? performanceData?.growthDigest.weekly : performanceData?.growthDigest.monthly;
  const activeForecastSeries = performanceData?.forecast[forecastMetric];
  const activeForecastPoints = forecastPeriod === 30 
    ? activeForecastSeries?.days30 
    : forecastPeriod === 60 
    ? activeForecastSeries?.days60 
    : activeForecastSeries?.days90;

  const mappedProperty = properties.find(p => p.websiteId === currentWebsite?.id);

  if (!mounted) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/40 pb-5">
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Unified Analytics Console</span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">SEO Performance Studio</h1>
            <p className="text-sm text-slate-400 mt-1">Loading analytics configuration...</p>
          </div>
        </div>
        <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <span className="text-sm text-slate-400 font-semibold">Loading console performance...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/40 pb-5">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Unified Analytics Console</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">SEO Performance Studio</h1>
          <p className="text-sm text-slate-400 mt-1">
            Merged timeline tracking Google Search Console clicks & ranks together with Google Analytics 4 conversions & revenue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0d1222]/80 border border-slate-850 hover:border-slate-800 text-white rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-lg"
          >
            <span>Link GA4 Property</span>
          </button>
          
          <button 
            onClick={handleSyncAll}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors shadow-lg"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <RefreshCw className="w-4 h-4 text-white" />
            )}
            <span>Sync Google Data</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-xs text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loadingData && !performanceData ? (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <span className="text-sm text-slate-400">Aggregating GSC click volumes and GA4 conversions...</span>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          {/* Connected state header badge */}
          {mappedProperty && (
            <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <Globe className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-slate-400">Mapped GA4 Property: </span>
                  <span className="text-white font-bold">{mappedProperty.displayName}</span>
                  <span className="text-slate-500 font-mono ml-2 text-[10px] bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-850">
                    {mappedProperty.propertyId}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                GSC + GA4 Integrated Mirror: Online
              </span>
            </div>
          )}

          {/* 8-Card KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {/* 1. Clicks */}
            <div className="glass-panel p-4 rounded-xl border border-slate-850 flex flex-col justify-between h-28 relative overflow-hidden">
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                  <MousePointer className="w-3 h-3 text-indigo-400" />
                  Clicks
                </span>
                <span className="text-lg font-bold text-white font-mono mt-1.5 block">
                  {(performanceData?.kpis.clicks ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-end mt-2">
                <div className="text-[10px] font-mono">
                  {performanceData && (performanceData.growthDigest.weekly.clicks >= 0 ? (
                    <span className="text-emerald-400 font-bold">+{performanceData.growthDigest.weekly.clicks}%</span>
                  ) : (
                    <span className="text-rose-400 font-bold">{performanceData.growthDigest.weekly.clicks}%</span>
                  ))}
                </div>
                {performanceData && renderSparkline(performanceData.seoPerformanceData.map(d => d.clicks), '#6366f1')}
              </div>
            </div>

            {/* 2. Impressions */}
            <div className="glass-panel p-4 rounded-xl border border-slate-850 flex flex-col justify-between h-28 relative overflow-hidden">
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Eye className="w-3 h-3 text-emerald-400" />
                  Impressions
                </span>
                <span className="text-lg font-bold text-white font-mono mt-1.5 block">
                  {(performanceData?.kpis.impressions ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-end mt-2">
                <div className="text-[10px] font-mono">
                  {performanceData && (performanceData.growthDigest.weekly.impressions >= 0 ? (
                    <span className="text-emerald-400 font-bold">+{performanceData.growthDigest.weekly.impressions}%</span>
                  ) : (
                    <span className="text-rose-400 font-bold">{performanceData.growthDigest.weekly.impressions}%</span>
                  ))}
                </div>
                {performanceData && renderSparkline(performanceData.seoPerformanceData.map(d => d.impressions), '#10b981')}
              </div>
            </div>

            {/* 3. CTR */}
            <div className="glass-panel p-4 rounded-xl border border-slate-850 flex flex-col justify-between h-28 relative overflow-hidden">
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Percent className="w-3 h-3 text-pink-400" />
                  CTR
                </span>
                <span className="text-lg font-bold text-white font-mono mt-1.5 block">
                  {performanceData?.kpis.ctr ?? 0}%
                </span>
              </div>
              <div className="flex justify-between items-end mt-2">
                <div className="text-[10px] font-mono">
                  {performanceData && (performanceData.growthDigest.weekly.ctr >= 0 ? (
                    <span className="text-emerald-400 font-bold">+{performanceData.growthDigest.weekly.ctr}%</span>
                  ) : (
                    <span className="text-rose-400 font-bold">{performanceData.growthDigest.weekly.ctr}%</span>
                  ))}
                </div>
                {performanceData && renderSparkline(performanceData.seoPerformanceData.map(d => d.ctr), '#ec4899')}
              </div>
            </div>

            {/* 4. Position */}
            <div className="glass-panel p-4 rounded-xl border border-slate-850 flex flex-col justify-between h-28 relative overflow-hidden">
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Award className="w-3 h-3 text-amber-400" />
                  Avg Position
                </span>
                <span className="text-lg font-bold text-white font-mono mt-1.5 block">
                  {performanceData?.kpis.position ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-end mt-2">
                <div className="text-[10px] font-mono">
                  {performanceData && (performanceData.growthDigest.weekly.position >= 0 ? (
                    <span className="text-emerald-400 font-bold">+{performanceData.growthDigest.weekly.position}%</span>
                  ) : (
                    <span className="text-rose-400 font-bold">{performanceData.growthDigest.weekly.position}%</span>
                  ))}
                </div>
                {performanceData && renderSparkline(performanceData.seoPerformanceData.map(d => d.position), '#f59e0b')}
              </div>
            </div>

            {/* 5. Users */}
            <div className="glass-panel p-4 rounded-xl border border-slate-850 flex flex-col justify-between h-28 relative overflow-hidden">
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3 text-sky-400" />
                  GA4 Users
                </span>
                <span className="text-lg font-bold text-white font-mono mt-1.5 block">
                  {loadingOverview ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400 mt-1" />
                  ) : (!mappedProperty || overviewError) ? (
                    <span className="text-xs font-semibold text-slate-500 mt-1 block">Not Linked</span>
                  ) : (
                    (overviewData?.activeUsers ?? 0).toLocaleString()
                  )}
                </span>
              </div>
              <div className="flex justify-between items-end mt-2">
                <div className="text-[10px] font-mono">
                  {trafficData?.reports && (trafficData.reports[reportPeriod]?.trafficGrowthPercent >= 0 ? (
                    <span className="text-emerald-400 font-bold">+{trafficData.reports[reportPeriod]?.trafficGrowthPercent}%</span>
                  ) : (
                    <span className="text-rose-400 font-bold">{trafficData.reports[reportPeriod]?.trafficGrowthPercent}%</span>
                  ))}
                </div>
                {trafficData?.trafficData && renderSparkline(trafficData.trafficData.map((d: any) => d.users), '#06b6d4')}
              </div>
            </div>

            {/* 6. Sessions */}
            <div className="glass-panel p-4 rounded-xl border border-slate-850 flex flex-col justify-between h-28 relative overflow-hidden">
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Activity className="w-3 h-3 text-purple-400" />
                  Sessions
                </span>
                <span className="text-lg font-bold text-white font-mono mt-1.5 block">
                  {loadingOverview ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400 mt-1" />
                  ) : (!mappedProperty || overviewError) ? (
                    <span className="text-xs font-semibold text-slate-500 mt-1 block">Not Linked</span>
                  ) : (
                    (overviewData?.sessions ?? 0).toLocaleString()
                  )}
                </span>
              </div>
              <div className="flex justify-between items-end mt-2">
                <div className="text-[10px] font-mono">
                  {trafficData?.reports && (trafficData.reports[reportPeriod]?.trafficGrowthPercent >= 0 ? (
                    <span className="text-emerald-400 font-bold">+{trafficData.reports[reportPeriod]?.trafficGrowthPercent}%</span>
                  ) : (
                    <span className="text-rose-400 font-bold">{trafficData.reports[reportPeriod]?.trafficGrowthPercent}%</span>
                  ))}
                </div>
                {trafficData?.trafficData && renderSparkline(trafficData.trafficData.map((d: any) => d.sessions), '#a855f7')}
              </div>
            </div>

            {/* 7. Conversions */}
            <div className="glass-panel p-4 rounded-xl border border-slate-850 flex flex-col justify-between h-28 relative overflow-hidden">
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-teal-400" />
                  Conversions
                </span>
                <span className="text-lg font-bold text-white font-mono mt-1.5 block">
                  {loadingOverview ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400 mt-1" />
                  ) : (!mappedProperty || overviewError) ? (
                    <span className="text-xs font-semibold text-slate-500 mt-1 block">Not Linked</span>
                  ) : (overviewData?.conversions === 0) ? (
                    <span className="text-xs font-semibold text-slate-500 mt-1 block">No data available</span>
                  ) : (
                    (overviewData?.conversions ?? 0).toLocaleString()
                  )}
                </span>
              </div>
              <div className="flex justify-between items-end mt-2">
                <div className="text-[10px] font-mono">
                  {trafficData?.reports && (trafficData.reports[reportPeriod]?.conversionGrowthPercent >= 0 ? (
                    <span className="text-emerald-400 font-bold">+{trafficData.reports[reportPeriod]?.conversionGrowthPercent}%</span>
                  ) : (
                    <span className="text-rose-400 font-bold">{trafficData.reports[reportPeriod]?.conversionGrowthPercent}%</span>
                  ))}
                </div>
                {trafficData?.trafficData && renderSparkline(trafficData.trafficData.map((d: any) => d.conversions || 0), '#14b8a6')}
              </div>
            </div>

            {/* 8. Revenue */}
            <div className="glass-panel p-4 rounded-xl border border-slate-850 flex flex-col justify-between h-28 relative overflow-hidden">
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-500" />
                  Revenue
                </span>
                <span className="text-lg font-bold text-white font-mono mt-1.5 block">
                  {loadingOverview ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400 mt-1" />
                  ) : (!mappedProperty || overviewError) ? (
                    <span className="text-xs font-semibold text-slate-500 mt-1 block">Not Linked</span>
                  ) : (overviewData?.revenue === 0) ? (
                    <span className="text-xs font-semibold text-slate-500 mt-1 block">No data available</span>
                  ) : (
                    `$${(overviewData?.revenue ?? 0).toLocaleString()}`
                  )}
                </span>
              </div>
              <div className="flex justify-between items-end mt-2">
                <div className="text-[10px] font-mono">
                  {trafficData?.reports && (trafficData.reports[reportPeriod]?.revenueGrowthPercent >= 0 ? (
                    <span className="text-emerald-400 font-bold">+{trafficData.reports[reportPeriod]?.revenueGrowthPercent}%</span>
                  ) : (
                    <span className="text-rose-400 font-bold">{trafficData.reports[reportPeriod]?.revenueGrowthPercent}%</span>
                  ))}
                </div>
                {trafficData?.trafficData && renderSparkline(trafficData.trafficData.map((d: any) => d.revenue || 0), '#10b981')}
              </div>
            </div>
          </div>

          {/* Dual Axis Correlation Chart Widget */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">SEO Metric Correlation Graph</h3>
                  <p className="text-[11px] text-slate-500">Plot any two GSC/GA4 metrics side-by-side to discover direct correlation links</p>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#6366f1] rounded-full shrink-0" />
                    <select
                      value={primaryMetric}
                      onChange={(e) => setPrimaryMetric(e.target.value as keyof Kpis)}
                      className="bg-slate-950/60 border border-slate-850 px-2 py-1 rounded-lg text-white text-[11px] outline-none font-bold"
                    >
                      {Object.keys(performanceData?.kpis || {}).map((k) => (
                        <option key={k} value={k}>{getMetricName(k as keyof Kpis)}</option>
                      ))}
                    </select>
                  </div>

                  <span className="text-slate-500 font-bold">vs</span>

                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#10b981] border border-dashed border-[#10b981] rounded-full shrink-0" />
                    <select
                      value={secondaryMetric}
                      onChange={(e) => setSecondaryMetric(e.target.value as keyof Kpis)}
                      className="bg-slate-950/60 border border-slate-850 px-2 py-1 rounded-lg text-white text-[11px] outline-none font-bold"
                    >
                      {Object.keys(performanceData?.kpis || {}).map((k) => (
                        <option key={k} value={k}>{getMetricName(k as keyof Kpis)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="h-56 flex items-end">
                {performanceData && renderDualChart(performanceData.seoPerformanceData, primaryMetric, secondaryMetric)}
              </div>
            </div>

            {/* Growth digests tables widget */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">SEO Growth Digests</h3>
                  <p className="text-[11px] text-slate-500">Period over period delta comparison</p>
                </div>

                <div className="flex gap-1 bg-slate-950/60 p-0.5 border border-slate-850 rounded-xl">
                  <button 
                    onClick={() => setReportPeriod('weekly')}
                    className={`px-2.5 py-1 text-[9px] font-bold rounded-lg cursor-pointer ${
                      reportPeriod === 'weekly' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Weekly
                  </button>
                  <button 
                    onClick={() => setReportPeriod('monthly')}
                    className={`px-2.5 py-1 text-[9px] font-bold rounded-lg cursor-pointer ${
                      reportPeriod === 'monthly' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              {activeRates && (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 text-xs">
                  {Object.keys(activeRates).map((key) => {
                    const rateVal = activeRates[key as keyof GrowthRates];
                    const isPosMetric = key === 'position'; // For rank pos, negative delta is improvement
                    
                    return (
                      <div key={key} className="flex justify-between items-center p-2 bg-slate-950/30 border border-slate-900 rounded-lg">
                        <span className="font-semibold text-slate-400">{getMetricName(key as keyof Kpis)}</span>
                        <div className="flex items-center gap-1 font-mono">
                          {rateVal >= 0 ? (
                            <>
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-bold">+{rateVal}%</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                              <span className="text-rose-400 font-bold">{rateVal}%</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Forecasting widget */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  SEO Predictive Forecasting Suite
                </h3>
                <p className="text-[11px] text-slate-500">Calculate 30, 60, and 90 days organic trajectory with regression algorithms</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex gap-1.5 bg-slate-950/60 p-1 border border-slate-850 rounded-xl">
                  {['clicks', 'sessions', 'revenue'].map((m) => {
                    const isGa4Metric = m === 'sessions' || m === 'revenue';
                    const isDisabled = isGa4Metric && (!mappedProperty || !!overviewError);
                    return (
                      <button
                        key={m}
                        disabled={isDisabled}
                        onClick={() => setForecastMetric(m as any)}
                        className={`px-2.5 py-1 text-[9px] font-bold rounded-lg transition-colors cursor-pointer ${
                          forecastMetric === m ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                        title={isDisabled ? 'GA4 property not connected' : undefined}
                      >
                        {m.toUpperCase()}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-1.5 bg-slate-950/60 p-1 border border-slate-850 rounded-xl">
                  {[30, 60, 90].map((days) => (
                    <button 
                      key={days}
                      onClick={() => setForecastPeriod(days as any)}
                      className={`px-2.5 py-1 text-[9px] font-bold rounded-lg transition-colors cursor-pointer ${
                        forecastPeriod === days ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 h-56 flex items-end">
                {activeForecastPoints && renderForecastChart(activeForecastPoints)}
              </div>

              <div className="bg-slate-950/40 p-5 border border-slate-850 rounded-xl flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Algorithmic Confidence</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-2xl font-extrabold text-white font-mono">
                        {activeForecastSeries?.confidenceScore ?? 88}%
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">High</span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Projections summary</span>
                    <span className="text-xs text-slate-350 mt-1 block leading-relaxed">
                      Linear regression model calculates a steady forecast path based on the past 90 days of organic SEO performance data.
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-850 pt-3 flex items-center gap-2 mt-4">
                  <HelpCircle className="w-4 h-4 shrink-0 text-slate-500" />
                  <span>Shaded boundary area represents 95% confidence intervals and standard regression error envelopes.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Traffic Sources & Device Splits Grid */}
          {!mappedProperty || trafficError ? (
            renderGa4ConnectionPrompt(
              "No Google Analytics property linked",
              "Connect a Google Analytics 4 property to view visitor acquisition channels, system hardware, and geographies."
            )
          ) : loadingTraffic ? (
            renderSkeletonLoader("Fetching acquisition sources and device breakdowns...")
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {/* 1. Traffic Sources */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Traffic Acquisition Sources</h3>
                  <p className="text-[11px] text-slate-500">Sessions split by marketing channels</p>
                </div>
                <div className="space-y-3 pt-2">
                  {Object.entries((trafficData?.trafficSources || {}) as Record<string, any>).map(([source, count]) => {
                    const total = Object.values(trafficData?.trafficSources || {}).reduce((acc: number, val: any) => acc + Number(val), 0) || 1;
                    const pct = Math.round((Number(count) / total) * 100);
                    const getBarColor = (s: string) => {
                      if (s === 'organic') return 'bg-indigo-500';
                      if (s === 'direct') return 'bg-emerald-500';
                      if (s === 'referral') return 'bg-pink-500';
                      return 'bg-amber-500';
                    };
                    return (
                      <div key={source} className="space-y-1 text-xs">
                        <div className="flex justify-between font-semibold text-slate-300">
                          <span className="capitalize">{source}</span>
                          <span className="font-mono text-[11px]">{Number(count).toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                          <div className={`h-full ${getBarColor(source)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(trafficData?.trafficSources || {}).length === 0 && (
                    <span className="text-xs text-slate-500 block text-center py-4">No traffic sources recorded.</span>
                  )}
                </div>
              </div>

              {/* 2. Device Categories */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Device Breakdowns</h3>
                  <p className="text-[11px] text-slate-500">System hardware used by active visitors</p>
                </div>
                <div className="space-y-3 pt-2">
                  {Object.entries((trafficData?.devices || {}) as Record<string, any>).map(([device, pct]) => {
                    const getBarColor = (d: string) => {
                      if (d === 'mobile') return 'bg-sky-500';
                      if (d === 'desktop') return 'bg-purple-500';
                      return 'bg-teal-500';
                    };
                    return (
                      <div key={device} className="space-y-1 text-xs">
                        <div className="flex justify-between font-semibold text-slate-300">
                          <span className="capitalize">{device}</span>
                          <span className="font-mono text-[11px]">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                          <div className={`h-full ${getBarColor(device)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(trafficData?.devices || {}).length === 0 && (
                    <span className="text-xs text-slate-500 block text-center py-4">No device records.</span>
                  )}
                </div>
              </div>

              {/* 3. Top Countries */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Top Geographies</h3>
                  <p className="text-[11px] text-slate-500">Country regions driving traffic</p>
                </div>
                <div className="space-y-3 pt-2 max-h-[160px] overflow-y-auto pr-1">
                  {Object.entries((trafficData?.countries || {}) as Record<string, any>).map(([country, pct]) => (
                    <div key={country} className="flex justify-between items-center text-xs p-2 bg-slate-950/40 border border-slate-900 rounded-lg">
                      <span className="font-semibold text-slate-300 truncate max-w-[150px]">{country}</span>
                      <span className="font-mono text-indigo-400 font-bold">{pct}%</span>
                    </div>
                  ))}
                  {Object.keys(trafficData?.countries || {}).length === 0 && (
                    <span className="text-xs text-slate-500 block text-center py-4">No geography records.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Top Landing Pages Table */}
          {!mappedProperty || landingPagesError ? (
            renderGa4ConnectionPrompt(
              "No Google Analytics property linked",
              "Connect a Google Analytics 4 property to track session-level performance, bounce rates, and conversion paths per page."
            )
          ) : loadingLandingPages ? (
            renderSkeletonLoader("Fetching landing page performance data...")
          ) : (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 mt-6">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Top Landing Pages Performance</h3>
                <p className="text-[11px] text-slate-500">Live GA4 page-level sessions, active users, and bounce rate metrics</p>
              </div>
              <div className="overflow-x-auto border border-slate-850 rounded-xl divide-y divide-slate-850 bg-slate-950/30">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-500 font-semibold bg-slate-900/10">
                      <th className="px-5 py-3">Page Path</th>
                      <th className="px-5 py-3">Sessions</th>
                      <th className="px-5 py-3">Active Users</th>
                      <th className="px-5 py-3">Conversions</th>
                      <th className="px-5 py-3">Bounce Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300 font-medium">
                    {landingPagesData && landingPagesData.length > 0 ? (
                      landingPagesData.map((page: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-900/10 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-[11px] text-indigo-300">{page.pagePath}</td>
                          <td className="px-5 py-3.5 font-mono">{page.sessions.toLocaleString()}</td>
                          <td className="px-5 py-3.5 font-mono">{page.activeUsers.toLocaleString()}</td>
                          <td className="px-5 py-3.5 font-mono text-emerald-400 font-bold">{page.conversions.toLocaleString()}</td>
                          <td className="px-5 py-3.5 font-mono">{(page.bounceRate * 100).toFixed(1)}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-slate-500 font-semibold">
                          No page-level performance records synced yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connection Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-855 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 className="w-4.5 h-4.5 text-indigo-400" />
                GA4 Account Connector
              </h3>
              <button 
                onClick={() => setShowWizard(false)}
                className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-405 leading-relaxed">
              Select an authorized Google Analytics 4 property from your accounts list and connect it to your current active website: <span className="text-indigo-400 font-semibold">{currentWebsite?.domain}</span>.
            </p>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2">Properties list</label>
              
              {loadingWizardProperties ? (
                <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-550" />
                  <span>Retrieving Google Account properties...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {wizardProperties.map((prop) => (
                    <button
                      key={prop.id}
                      onClick={() => setSelectedWizardProp(prop)}
                      className={`w-full text-left p-3 border rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                        selectedWizardProp?.propertyId === prop.propertyId 
                          ? 'bg-indigo-500/10 border-indigo-500/60 text-white' 
                          : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-800'
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-semibold text-white">{prop.displayName}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">{prop.accountName} • {prop.propertyId}</span>
                      </div>
                      {prop.websiteId && (
                        <span className="text-[9px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full">
                          Connected
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowWizard(false)}
                className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleConnectProperty}
                disabled={connecting || !selectedWizardProp}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mapping...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Map Property</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
