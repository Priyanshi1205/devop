'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { Sparkles, Compass, CheckCircle2, ChevronRight, Award, Bookmark, Loader2, Play } from 'lucide-react';

interface KeywordItem {
  id: string;
  text: string;
}

interface GeoScoreRecord {
  id: string;
  engine: string;
  overallScore: number;
  semanticDensity: number;
  citationStrength: number;
  factualPrecision: number;
  informationGain: number;
  checkedAt: string;
}

import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function GeoOptimizationPage() {
  const currentWebsite = useStore((state) => state.currentWebsite);
  const token = useStore((state) => state.token);
  const user = useStore((state) => state.user);

  const plan = user?.subscription?.plan || 'free_trial';
  const isLocked = plan === 'free_trial' || plan === 'starter';

  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>('');
  const [selectedEngine, setSelectedEngine] = useState<string>('Gemini');
  const [geoScores, setGeoScores] = useState<GeoScoreRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  // New state variables for Auto-Generated GEO Files
  const [geoFiles, setGeoFiles] = useState<{
    llmsText: string;
    llmsFullText: string;
    schemaMarkup: string;
    checklist: string;
  } | null>(null);
  const [generatingFiles, setGeneratingFiles] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [activeTab, setActiveTab] = useState<'audit' | 'files'>('audit');
  const [selectedFileTab, setSelectedFileTab] = useState<'llms' | 'llmsFull' | 'schema' | 'checklist'>('llms');

  if (isLocked) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center glass-panel rounded-3xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[250px] h-[250px] bg-indigo-500/10 blur-[80px] rounded-full glow-glow" />
        
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 font-sans tracking-tight text-center">Feature Locked</h2>
        <p className="text-slate-400 text-sm max-w-md mb-8 leading-relaxed font-sans text-center">
          The GEO Optimization Engine and llms.txt auto-generator is only available on Pro and Agency plans. Upgrade your plan to unlock AI Search Engine Optimization audits.
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

  // Fetch keywords for the current website
  useEffect(() => {
    const fetchKeywords = async () => {
      const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
      if (!currentWebsite || !token || token === 'mock-jwt-token-xyz' || !isUuid(currentWebsite.id)) {
        setKeywords([]);
        setSelectedKeywordId('');
        setGeoScores([]);
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
            setGeoScores([]);
          }
        }
      } catch (err) {
        console.error('Error fetching keywords:', err);
      }
    };
    fetchKeywords();
  }, [currentWebsite, token]);

  // Fetch GEO scores for the selected keyword
  const fetchGeoScores = async (kwId: string) => {
    if (!kwId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/keywords/${kwId}/geo-scores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGeoScores(data);
      }
    } catch (err) {
      console.error('Error fetching geo scores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedKeywordId) {
      fetchGeoScores(selectedKeywordId);
    } else {
      setGeoScores([]);
    }
  }, [selectedKeywordId]);

  // Fetch GEO files
  const fetchGeoFiles = async () => {
    if (!currentWebsite?.projectId || !token) return;
    setLoadingFiles(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${currentWebsite.projectId}/geo-files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGeoFiles(data);
      }
    } catch (err) {
      console.error('Error fetching geo files:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (currentWebsite?.projectId) {
      fetchGeoFiles();
    } else {
      setGeoFiles(null);
    }
  }, [currentWebsite, token]);

  // Trigger GEO score evaluation
  const handleEvaluate = async () => {
    if (!selectedKeywordId || !token) return;
    setEvaluating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/geo-scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          keywordId: selectedKeywordId,
          engine: selectedEngine
        })
      });
      if (res.ok) {
        await fetchGeoScores(selectedKeywordId);
      } else {
        alert('Failed to evaluate GEO metrics');
      }
    } catch (err) {
      console.error('Error evaluating GEO metrics:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleGenerateFiles = async () => {
    if (!currentWebsite?.projectId || !token) return;
    setGeneratingFiles(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${currentWebsite.projectId}/geo-files/generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGeoFiles(data);
        alert('GEO files generated successfully!');
      } else {
        alert('Failed to generate GEO files');
      }
    } catch (err) {
      console.error('Error generating geo files:', err);
    } finally {
      setGeneratingFiles(false);
    }
  };

  const handleDownloadFile = (fileName: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const latestScore = geoScores[0];

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">AI Search Engine Optimization</span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">GEO Optimization Engine</h1>
        <p className="text-sm text-slate-400 mt-1">
          Tune your content to rank in generative search engines (Gemini, ChatGPT Search, Perplexity) for website <span className="text-slate-200 font-semibold">{currentWebsite?.domain || 'your domain'}</span>.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800/80">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'border-indigo-500 text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Generative Search Audit
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'files'
              ? 'border-indigo-500 text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          LLM Crawler & GEO Files
        </button>
      </div>

      {activeTab === 'audit' && (
        <div className="space-y-8">
          {/* Selector & Evaluation Trigger Bar */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#0d1222]/40">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Target Keyword</span>
                {keywords.length === 0 ? (
                  <span className="text-xs text-slate-500 bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800">No keywords tracked</span>
                ) : (
                  <select
                    value={selectedKeywordId}
                    onChange={(e) => setSelectedKeywordId(e.target.value)}
                    className="text-xs bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 w-52"
                  >
                    {keywords.map((kw) => (
                      <option key={kw.id} value={kw.id}>{kw.text}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Audit Model Engine</span>
                <select
                  value={selectedEngine}
                  onChange={(e) => setSelectedEngine(e.target.value)}
                  className="text-xs bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 w-40"
                >
                  <option value="Gemini">Gemini-2.5-Flash</option>
                  <option value="ChatGPT">GPT-4o-Mini</option>
                  <option value="Perplexity">Perplexity Sonar</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleEvaluate}
              disabled={evaluating || !selectedKeywordId}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-500/10 disabled:opacity-50"
            >
              {evaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Analyzing Semantic Nodes...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-white fill-white" />
                  <span>Audit Generative Score</span>
                </>
              )}
            </button>
          </div>

          {/* Main GEO Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Overall GEO Index</span>
              <h3 className="text-2xl font-bold text-pink-400 font-mono mt-1">
                {latestScore ? `${latestScore.overallScore}/100` : 'N/A'}
              </h3>
              <span className="text-[10px] text-slate-400 mt-2 block">
                {latestScore ? `Last checked ${new Date(latestScore.checkedAt).toLocaleDateString()}` : 'No evaluations run'}
              </span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Semantic Density</span>
              <h3 className="text-2xl font-bold text-indigo-400 font-mono mt-1">
                {latestScore ? `${latestScore.semanticDensity}%` : 'N/A'}
              </h3>
              <span className="text-[10px] text-slate-400 mt-2 block">Direct query response match</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Factual Precision</span>
              <h3 className="text-2xl font-bold text-teal-400 font-mono mt-1">
                {latestScore ? `${latestScore.factualPrecision}%` : 'N/A'}
              </h3>
              <span className="text-[10px] text-slate-400 mt-2 block">Zero hallucination match</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Information Gain</span>
              <h3 className="text-2xl font-bold text-purple-400 font-mono mt-1">
                {latestScore ? `${latestScore.informationGain}%` : 'N/A'}
              </h3>
              <span className="text-[10px] text-slate-400 mt-2 block">Unique data & quotes density</span>
            </div>
          </div>

          {/* Historical Logs */}
          <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800/40 bg-slate-900/10">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Evaluation History</h3>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
              ) : geoScores.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No historical GEO records found for this keyword.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-500 font-semibold bg-slate-900/10">
                      <th className="px-6 py-3.5">Audit Date</th>
                      <th className="px-6 py-3.5">Model Engine</th>
                      <th className="px-6 py-3.5">GEO Index</th>
                      <th className="px-6 py-3.5">Semantic Density</th>
                      <th className="px-6 py-3.5">Citation Strength</th>
                      <th className="px-6 py-3.5">Factual Score</th>
                      <th className="px-6 py-3.5">Info Gain</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {geoScores.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="px-6 py-4 font-semibold text-white">
                          {new Date(m.checkedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-indigo-300 border border-slate-700">
                            {m.engine}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-pink-400">{m.overallScore}/100</td>
                        <td className="px-6 py-4 font-mono">{m.semanticDensity}%</td>
                        <td className="px-6 py-4 font-mono">{m.citationStrength}%</td>
                        <td className="px-6 py-4 font-mono text-teal-400">{m.factualPrecision}%</td>
                        <td className="px-6 py-4 font-mono">{m.informationGain}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Optimization Rules Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">High Priority Fixes</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-slate-300">Inject structured Q&A formats inside article landing nodes. ChatGPT indexes headers containing direct "What/How/Why" phrases 4.2x more frequently.</p>
                </div>
                <div className="flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-slate-300">Convert lists inside boot pages to tables. Generative crawlers favor tables for side-by-side data summarizations.</p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-pink-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Engine Specific Rules</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 font-semibold">Google AI Overviews</span>
                  <span className="text-white font-medium">Requires Authoritative Schema & E-E-A-T signals</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 font-semibold">Perplexity AI</span>
                  <span className="text-white font-medium">Requires dense citations & structured bullet summaries</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400 font-semibold">ChatGPT Search</span>
                  <span className="text-white font-medium">Favors conversational Q&A & direct informational gains</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#0d1222]/40 p-5 rounded-2xl border border-slate-800/80 glass-panel gap-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Auto-Generate GEO Files</h3>
              <p className="text-xs text-slate-400 mt-1">Compile AI crawler files and structural schema listings optimized for LLMs.</p>
            </div>
            <button
              onClick={handleGenerateFiles}
              disabled={generatingFiles}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              {generatingFiles ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generating Files...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white fill-white" />
                  <span>Generate GEO Files</span>
                </>
              )}
            </button>
          </div>

          {loadingFiles ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : !geoFiles ? (
            <div className="glass-panel p-10 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
              No GEO files generated yet for this campaign. Click the "Generate GEO Files" button above to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* File Selection Sidebar */}
              <div className="lg:col-span-1 space-y-2">
                <button
                  onClick={() => setSelectedFileTab('llms')}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    selectedFileTab === 'llms'
                      ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                      : 'bg-[#0d1222]/40 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>llms.txt</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedFileTab('llmsFull')}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    selectedFileTab === 'llmsFull'
                      ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                      : 'bg-[#0d1222]/40 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>llms-full.txt</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedFileTab('schema')}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    selectedFileTab === 'schema'
                      ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                      : 'bg-[#0d1222]/40 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>JSON-LD Schema</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedFileTab('checklist')}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    selectedFileTab === 'checklist'
                      ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                      : 'bg-[#0d1222]/40 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>GEO Checklist</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* File Preview and Download Pane */}
              <div className="lg:col-span-3 glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col bg-[#070b19]/60">
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0d1222]/40">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      {selectedFileTab === 'llms' && 'llms.txt File Preview'}
                      {selectedFileTab === 'llmsFull' && 'llms-full.txt File Preview'}
                      {selectedFileTab === 'schema' && 'JSON-LD Schema Suggestions'}
                      {selectedFileTab === 'checklist' && 'Indore Real Estate GEO Checklist'}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
                      {selectedFileTab === 'llms' && 'Summary index for LLM agents.'}
                      {selectedFileTab === 'llmsFull' && 'Detailed website context data.'}
                      {selectedFileTab === 'schema' && 'Structured JSON-LD schema blocks.'}
                      {selectedFileTab === 'checklist' && 'Optimization directions.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (selectedFileTab === 'llms') handleDownloadFile('llms.txt', geoFiles.llmsText);
                      else if (selectedFileTab === 'llmsFull') handleDownloadFile('llms-full.txt', geoFiles.llmsFullText);
                      else if (selectedFileTab === 'schema') handleDownloadFile('schema-markup.json', geoFiles.schemaMarkup);
                      else if (selectedFileTab === 'checklist') handleDownloadFile('geo-checklist.md', geoFiles.checklist);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    <span>Download</span>
                  </button>
                </div>
                <div className="p-6 flex-1 font-mono text-[11px] text-slate-300 overflow-y-auto max-h-[450px] leading-relaxed whitespace-pre-wrap select-text bg-[#030712]/50">
                  {selectedFileTab === 'llms' && geoFiles.llmsText}
                  {selectedFileTab === 'llmsFull' && geoFiles.llmsFullText}
                  {selectedFileTab === 'schema' && geoFiles.schemaMarkup}
                  {selectedFileTab === 'checklist' && geoFiles.checklist}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
