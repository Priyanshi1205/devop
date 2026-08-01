'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { 
  Eye, 
  Share2, 
  Search, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter, 
  Sparkles, 
  ExternalLink,
  MessageSquare,
  TrendingUp,
  Cpu,
  Loader2,
  Play
} from 'lucide-react';
import { AiVisibilityLineChart } from '../../../components/svg-charts';

interface KeywordItem {
  id: string;
  text: string;
}

interface VisibilityRecord {
  engine: string;
  visibilityPercent: number;
  hasMention: boolean;
  isVerified: boolean;
  snippet?: string;
  url?: string;
  checkedAt: string;
}

import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function LlmVisibilityPage() {
  const currentWebsite = useStore((state) => state.currentWebsite);
  const token = useStore((state) => state.token);
  const user = useStore((state) => state.user);

  const plan = user?.subscription?.plan || 'free_trial';
  const isLocked = plan === 'free_trial' || plan === 'starter';

  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>('');
  const [records, setRecords] = useState<VisibilityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [engineFilter, setEngineFilter] = useState('All');

  if (isLocked) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center glass-panel rounded-3xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[250px] h-[250px] bg-indigo-500/10 blur-[80px] rounded-full glow-glow" />
        
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 font-sans tracking-tight text-center">Feature Locked</h2>
        <p className="text-slate-400 text-sm max-w-md mb-8 leading-relaxed font-sans text-center">
          The LLM Visibility Citation tracker is only available on Pro and Agency plans. Upgrade your plan to track search share-of-voice.
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

  // Fetch keywords for current website
  useEffect(() => {
    const fetchKeywords = async () => {
      const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
      if (!currentWebsite || !token || token === 'mock-jwt-token-xyz' || !isUuid(currentWebsite.id)) {
        setKeywords([]);
        setSelectedKeywordId('');
        setRecords([]);
        return;
      }
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${currentWebsite.id}/keywords`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setKeywords(data);
          if (data.length > 0) {
            setSelectedKeywordId(data[0].id);
          } else {
            setSelectedKeywordId('');
            setRecords([]);
          }
        }
      } catch (err) {
        console.error('Error fetching keywords:', err);
      }
    };
    fetchKeywords();
  }, [currentWebsite, token]);

  // Fetch visibility details
  const fetchVisibilityData = async (kwId: string) => {
    if (!kwId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/keywords/${kwId}/llm-visibility`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const { visibilityScores, mentions, citations, apiKeysConfigured } = data;

        // Map database tables to UI structure
        const mappedRecords: VisibilityRecord[] = ['Perplexity', 'ChatGPT Search', 'Google AI Overview', 'Claude'].map(engine => {
          const scoreRecord = visibilityScores.find((v: any) => v.engine === engine);
          const mentionRecord = mentions.find((m: any) => m.engine === engine);
          const citationRecord = citations.find((c: any) => c.engine === engine);

          // Determine key presence
          let isVerified = false;
          if (engine === 'Perplexity' && apiKeysConfigured?.perplexity) isVerified = true;
          if (engine === 'ChatGPT Search' && apiKeysConfigured?.openai) isVerified = true;
          if (engine === 'Google AI Overview' && apiKeysConfigured?.gemini) isVerified = true;
          if (engine === 'Claude' && apiKeysConfigured?.claude) isVerified = true;

          // Force "Not Cited" (false) if keys are not configured to prevent fake citations
          const finalHasMention = isVerified ? (mentionRecord ? !!mentionRecord.mentioned : false) : false;

          return {
            engine,
            visibilityPercent: scoreRecord ? Number(scoreRecord.visibilityPercent) : 0,
            hasMention: finalHasMention,
            isVerified,
            snippet: isVerified 
              ? (mentionRecord?.snippet || '') 
              : `Estimation (Unverified/Mock): No live ${engine} API key configured.`,
            url: isVerified ? (citationRecord?.url || '') : '',
            checkedAt: scoreRecord?.checkedAt || new Date().toISOString()
          };
        });

        setRecords(mappedRecords);
      }
    } catch (err) {
      console.error('Error fetching visibility:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedKeywordId) {
      fetchVisibilityData(selectedKeywordId);
    } else {
      setRecords([]);
    }
  }, [selectedKeywordId]);

  // Trigger live scan
  const handleTriggerAudit = async () => {
    if (!selectedKeywordId || !token) return;
    setAuditing(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/keywords/${selectedKeywordId}/llm-visibility/trigger`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchVisibilityData(selectedKeywordId);
      } else {
        alert('Failed to trigger generative search crawl');
      }
    } catch (err) {
      console.error('Crawl trigger error:', err);
    } finally {
      setAuditing(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesEngine = engineFilter === 'All' || r.engine === engineFilter;
    const matchesSearch = r.snippet?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.engine.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEngine && matchesSearch;
  });

  const getScoreInfo = (engine: string) => {
    const r = records.find(x => x.engine === engine);
    if (!r) return { score: 'N/A', status: '' };
    if (!r.isVerified) return { score: 'N/A', status: 'Key Required' };
    return {
      score: `${r.visibilityPercent}%`,
      status: 'Verified'
    };
  };

  const verifiedRecords = records.filter(r => r.isVerified);
  const aggregateScoreText = verifiedRecords.length > 0 
    ? `${Math.round(verifiedRecords.reduce((sum, r) => sum + r.visibilityPercent, 0) / verifiedRecords.length)}%` 
    : 'N/A';

  const allVerified = records.length > 0 && records.every(r => r.isVerified);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">AI Search Footprint</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">LLM Visibility & Share of Voice</h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor your brand's citations, recommendations, and overall Share of Voice (SOV) across generative search interfaces for <span className="text-slate-200 font-semibold">{currentWebsite?.domain || 'all websites'}</span>.
          </p>
        </div>

        {/* Dropdowns & Trigger in header */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase font-semibold mb-1">Select Keyword</span>
            <select
              value={selectedKeywordId}
              onChange={(e) => setSelectedKeywordId(e.target.value)}
              className="text-xs bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 w-48"
            >
              {keywords.map((kw) => (
                <option key={kw.id} value={kw.id}>{kw.text}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col pt-4">
            <button
              onClick={handleTriggerAudit}
              disabled={auditing || !selectedKeywordId}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-500/10 disabled:opacity-50"
            >
              {auditing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning Citations...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Scan AI Citations</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-indigo-500/5 blur-2xl rounded-full" />
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Aggregate Share of Voice</span>
          <h3 className="text-2xl font-bold text-indigo-400 font-mono mt-1">{aggregateScoreText}</h3>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2">
            <span>Average footprint (Verified engines)</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-pink-500/5 blur-2xl rounded-full" />
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Google AI Overviews (SOV)</span>
          <h3 className="text-2xl font-bold text-pink-400 font-mono mt-1">
            {getScoreInfo('Google AI Overview').score}
            <span className="text-[10px] text-slate-500 ml-1.5 font-sans font-normal">
              ({getScoreInfo('Google AI Overview').status})
            </span>
          </h3>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2">
            <span>Indexed reference visibility</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-purple-500/5 blur-2xl rounded-full" />
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Perplexity Citations</span>
          <h3 className="text-2xl font-bold text-purple-400 font-mono mt-1">
            {getScoreInfo('Perplexity').score}
            <span className="text-[10px] text-slate-500 ml-1.5 font-sans font-normal">
              ({getScoreInfo('Perplexity').status})
            </span>
          </h3>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2">
            <span>Citations index references</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-cyan-500/5 blur-2xl rounded-full" />
          <span className="text-[10px] text-slate-500 uppercase font-semibold">ChatGPT Search Footprint</span>
          <h3 className="text-2xl font-bold text-cyan-400 font-mono mt-1">
            {getScoreInfo('ChatGPT Search').score}
            <span className="text-[10px] text-slate-500 ml-1.5 font-sans font-normal">
              ({getScoreInfo('ChatGPT Search').status})
            </span>
          </h3>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2">
            <span>Conversational list recommendations</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-orange-500/5 blur-2xl rounded-full" />
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Claude (Anthropic) Footprint</span>
          <h3 className="text-2xl font-bold text-orange-400 font-mono mt-1">
            {getScoreInfo('Claude').score}
            <span className="text-[10px] text-slate-500 ml-1.5 font-sans font-normal">
              ({getScoreInfo('Claude').status})
            </span>
          </h3>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2">
            <span>Direct assistant mentions & citations</span>
          </div>
        </div>
      </div>

      {/* Main Graph Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visibility Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Search Engine Visibility Trend</h3>
              <p className="text-xs text-slate-400">Share of voice percentage tracking over the past 7 weeks</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <span className="w-2.5 h-2.5 rounded bg-purple-500" />
                SOV % ({allVerified ? 'Verified' : 'Estimated'})
              </span>
            </div>
          </div>
          <div className="h-56 flex items-end">
            <AiVisibilityLineChart />
          </div>
        </div>

        {/* Engine Breakdown */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Engine Citations Count</h3>
            <p className="text-xs text-slate-400 mb-5">Indexed reference status by engine model</p>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-pink-400" /> Google AI Overviews
                </span>
                <span className="text-white font-semibold font-mono">
                  {records.find(x => x.engine === 'Google AI Overview')?.isVerified 
                    ? (records.find(x => x.engine === 'Google AI Overview')?.hasMention ? 'Cited' : 'Not Cited') 
                    : 'Not Cited (Estimated)'}
                </span>
              </div>
              <div className="w-full bg-slate-800/60 rounded-full h-2 overflow-hidden">
                <div className="bg-pink-500 h-full rounded-full" style={{ width: records.find(x => x.engine === 'Google AI Overview')?.hasMention ? '100%' : '0%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" /> Perplexity AI
                </span>
                <span className="text-white font-semibold font-mono">
                  {records.find(x => x.engine === 'Perplexity')?.isVerified 
                    ? (records.find(x => x.engine === 'Perplexity')?.hasMention ? 'Cited' : 'Not Cited') 
                    : 'Not Cited (Estimated)'}
                </span>
              </div>
              <div className="w-full bg-slate-800/60 rounded-full h-2 overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: records.find(x => x.engine === 'Perplexity')?.hasMention ? '100%' : '0%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> ChatGPT Search
                </span>
                <span className="text-white font-semibold font-mono">
                  {records.find(x => x.engine === 'ChatGPT Search')?.isVerified 
                    ? (records.find(x => x.engine === 'ChatGPT Search')?.hasMention ? 'Cited' : 'Not Cited') 
                    : 'Not Cited (Estimated)'}
                </span>
              </div>
              <div className="w-full bg-slate-800/60 rounded-full h-2 overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: records.find(x => x.engine === 'ChatGPT Search')?.hasMention ? '100%' : '0%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-orange-400" /> Claude (Anthropic)
                </span>
                <span className="text-white font-semibold font-mono">
                  {records.find(x => x.engine === 'Claude')?.isVerified 
                    ? (records.find(x => x.engine === 'Claude')?.hasMention ? 'Cited' : 'Not Cited') 
                    : 'Not Cited (Estimated)'}
                </span>
              </div>
              <div className="w-full bg-slate-800/60 rounded-full h-2 overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full" style={{ width: records.find(x => x.engine === 'Claude')?.hasMention ? '100%' : '0%' }} />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/60 text-[10px] text-slate-400">
            * Citations are fetched hourly by crawling active LLM response payloads.
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#0d1222]/40 p-4 border border-slate-800/80 rounded-2xl">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search brand mentions and contexts..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Filter className="w-4 h-4 text-slate-500" />
          <div className="flex gap-1 bg-slate-950/60 p-1 border border-slate-800 rounded-xl overflow-hidden text-xs">
            {['All', 'Google AI Overview', 'Perplexity', 'ChatGPT Search', 'Claude'].map((engine) => (
              <button
                key={engine}
                onClick={() => setEngineFilter(engine)}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${engineFilter === engine ? 'bg-indigo-500 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {engine === 'Google AI Overview' ? 'AI Overview' : engine}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Citations Grid/Table */}
      <div className="glass-panel rounded-2xl border border-slate-800/85 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/40 bg-slate-900/10 flex justify-between items-center">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Indexed LLM Citations</h3>
          <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold px-2 py-0.5 rounded-full">
            {filteredRecords.length} Matches
          </span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No citation logs recorded yet for this keyword. Click "Scan AI Citations" to audit.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-500 font-semibold bg-slate-900/10">
                  <th className="px-6 py-3.5">AI Engine</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Share of Voice</th>
                  <th className="px-6 py-3.5">Sentiment</th>
                  <th className="px-6 py-3.5">Response Snapshot</th>
                  <th className="px-6 py-3.5 text-right">Citation Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {filteredRecords.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-900/10 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        m.engine === 'Google AI Overview' 
                          ? 'text-pink-400 bg-pink-500/5 border-pink-500/20' 
                          : m.engine === 'Perplexity' 
                          ? 'text-purple-400 bg-purple-500/5 border-purple-500/20' 
                          : m.engine === 'Claude'
                          ? 'text-orange-400 bg-orange-500/5 border-orange-500/20'
                          : 'text-cyan-400 bg-cyan-500/5 border-cyan-500/20'
                      }`}>
                        {m.engine}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {m.isVerified && m.hasMention ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Cited
                        </span>
                      ) : m.isVerified ? (
                        <span className="text-slate-500 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Not Cited
                        </span>
                      ) : (
                        <span className="text-amber-500/80 flex items-center gap-1 font-medium">
                          <XCircle className="w-3.5 h-3.5" /> Key Required
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold">
                      {m.isVerified ? `${m.visibilityPercent}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        m.isVerified && m.hasMention ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-400 bg-slate-800/50'
                      }`}>
                        {m.isVerified ? (m.hasMention ? 'Positive' : 'Neutral') : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-[300px] truncate text-slate-400 italic">
                      {m.snippet ? `"${m.snippet}"` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">
                      {m.url ? (
                        <a 
                          href={m.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          Source <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
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
