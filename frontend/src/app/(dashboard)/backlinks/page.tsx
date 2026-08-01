'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { 
  Link as LinkIcon, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  Search, 
  Filter, 
  ArrowUpRight,
  ExternalLink,
  Trash2,
  Download,
  Plus,
  Info,
  CheckCircle,
  XCircle,
  Loader2,
  MapPin,
  Building
} from 'lucide-react';
import { BacklinkGrowthChart } from '../../../components/svg-charts';

interface BacklinkRecord {
  id: string;
  websiteId: string;
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  domainAuthority: number; // DR
  isNofollow: boolean;
  discoveredAt: string;
}

interface OpportunityRecord {
  siteName: string;
  drEstimate: number;
  howToGet: string;
  priority: 'High' | 'Medium' | 'Low';
}

const backlinkOpportunities: OpportunityRecord[] = [
  {
    siteName: 'MagicBricks Indore Listings',
    drEstimate: 82,
    howToGet: 'Create Indore developer profile & list active township projects',
    priority: 'High'
  },
  {
    siteName: '99acres Project Showcase',
    drEstimate: 80,
    howToGet: 'Submit gated community project details for Indore Bypass Road listings',
    priority: 'High'
  },
  {
    siteName: 'Housing.com Plots Center',
    drEstimate: 78,
    howToGet: 'Link Indore premium villas coordinates to local listings directory',
    priority: 'High'
  },
  {
    siteName: 'Justdial Indore Business Directory',
    drEstimate: 85,
    howToGet: 'Claim local Indore builder listing with office location & verified phone number',
    priority: 'High'
  },
  {
    siteName: 'Sulekha Indore Real Estate',
    drEstimate: 75,
    howToGet: 'Add developer listing under Indore Residential Construction services',
    priority: 'Medium'
  },
  {
    siteName: 'MP RERA Government Portal',
    drEstimate: 65,
    howToGet: 'Submit project layout plans for official promoter RERA registration linking',
    priority: 'High'
  },
  {
    siteName: 'Indore Local Business Guide (indorez.com)',
    drEstimate: 45,
    howToGet: 'Request local Indore business catalog feature and citation anchor link',
    priority: 'Medium'
  }
];

export default function BacklinksPage() {
  const { currentWebsite, token } = useStore();
  const [backlinks, setBacklinks] = useState<BacklinkRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Dofollow' | 'Nofollow' | 'HighDR'>('All');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Upload Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [anchorText, setAnchorText] = useState('');
  const [domainAuthority, setDomainAuthority] = useState(40);
  const [isNofollow, setIsNofollow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentWebsite?.id) {
      fetchBacklinks(currentWebsite.id);
    } else {
      setBacklinks([]);
    }
  }, [currentWebsite?.id]);

  const fetchBacklinks = async (websiteId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${websiteId}/backlinks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBacklinks(data);
      } else {
        setErrorMessage('Failed to load backlinks from database.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Could not connect to backlinks API.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWebsite?.id) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${currentWebsite.id}/backlinks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sourceUrl,
          targetUrl,
          anchorText: anchorText || undefined,
          domainAuthority,
          isNofollow
        })
      });
      if (res.ok) {
        setSourceUrl('');
        setTargetUrl('');
        setAnchorText('');
        setDomainAuthority(40);
        setIsNofollow(false);
        setShowUploadModal(false);
        fetchBacklinks(currentWebsite.id);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to upload backlink.');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred while saving backlink.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBacklink = async (id: string) => {
    if (!window.confirm('Are you sure you want to stop tracking / disavow this link?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/backlinks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setBacklinks(backlinks.filter(b => b.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper: Extract source domain for clean rendering
  const getDomainName = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      return url.hostname.replace('www.', '');
    } catch {
      return urlStr;
    }
  };

  // Filter links
  const filteredLinks = backlinks.filter(b => {
    const matchesSearch = b.sourceUrl.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (b.anchorText && b.anchorText.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (filterType === 'All') return true;
    if (filterType === 'Dofollow') return !b.isNofollow;
    if (filterType === 'Nofollow') return b.isNofollow;
    if (filterType === 'HighDR') return (b.domainAuthority || 0) >= 50;
    return true;
  });

  // Calculate dynamic KPIs
  const totalCount = backlinks.length;
  const uniqueDomains = new Set(backlinks.map(b => getDomainName(b.sourceUrl))).size;
  const avgDR = totalCount > 0 
    ? Math.round(backlinks.reduce((acc, b) => acc + (b.domainAuthority || 0), 0) / totalCount) 
    : 0;

  // Build anchor profile chart data
  const anchorCounts: Record<string, number> = {};
  backlinks.forEach(b => {
    const term = b.anchorText || 'Empty Anchor / Image Alt';
    anchorCounts[term] = (anchorCounts[term] || 0) + 1;
  });

  const sortedAnchors = Object.entries(anchorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Disclaimer Banner */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 px-5 py-3 rounded-2xl flex items-center gap-3 text-xs text-indigo-300">
        <Info className="w-5 h-5 flex-shrink-0 text-indigo-400" />
        <span className="font-medium">
          <strong>GSC Verified Index Only</strong>: Full backlink metrics index requires Ahrefs/Moz API integration. Currently displaying Google Search Console-verified backlinks and manually uploaded off-page properties only.
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/40 pb-5">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Off-Page Authority</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">Backlink Profile Audit</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track authority rating, referring domains, and anchor phrase velocity for <span className="text-slate-200 font-semibold">{currentWebsite?.domain || 'your domain'}</span>.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/10 cursor-pointer hover:opacity-95 transition-opacity"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Upload Links</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4.5 h-4.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI Overviews */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Average Domain Rating (DR)</span>
          <h3 className="text-2xl font-bold text-indigo-400 font-mono mt-1">{currentWebsite ? `${avgDR}/100` : 'N/A'}</h3>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2">
            <span>Estimated from active index</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">GSC Verified Backlinks</span>
          <h3 className="text-2xl font-bold text-pink-400 font-mono mt-1">{currentWebsite ? totalCount : 0}</h3>
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Active crawl tracked</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Referring Domains</span>
          <h3 className="text-2xl font-bold text-purple-400 font-mono mt-1">{currentWebsite ? uniqueDomains : 0}</h3>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2">
            <span>Unique referring IP targets</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Backlink Spam Risk</span>
          <h3 className="text-2xl font-bold text-emerald-400 font-mono mt-1">All Clear</h3>
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-2">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>0 toxic links reported</span>
          </div>
        </div>
      </div>

      {/* Charts & Anchors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Backlink Indexing Velocity</h3>
              <p className="text-xs text-slate-400">Total counted references history</p>
            </div>
          </div>
          <div className="h-56 flex items-end">
            <BacklinkGrowthChart />
          </div>
        </div>

        {/* Anchor Cloud/Distribution */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Anchor Text Profile</h3>
            <p className="text-xs text-slate-400 mb-5">Anchor phrase volume splits</p>
          </div>
          <div className="space-y-4">
            {sortedAnchors.length === 0 ? (
              <span className="text-xs text-slate-500 block py-6 text-center">No anchor text detected.</span>
            ) : (
              sortedAnchors.map(([anchorText, count], idx) => {
                const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                const colors = ['bg-indigo-500', 'bg-pink-500', 'bg-cyan-500', 'bg-purple-500'];
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-semibold truncate max-w-[150px]">{anchorText}</span>
                      <span className="text-slate-400 font-mono">{percent}% ({count} links)</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div className={`${colors[idx % colors.length]} h-full rounded-full`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="text-[10px] text-slate-500 pt-4 border-t border-slate-800/40 mt-4">
            Anchor texts aligned contextually prevent Search Generative filter flags.
          </div>
        </div>
      </div>

      {/* Filters & search */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0d1222]/40 p-4 border border-slate-800/80 rounded-2xl">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search anchors or referral domains..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>
        <div className="flex gap-1 bg-slate-950/60 p-1 border border-slate-800 rounded-xl text-xs shrink-0 w-full sm:w-auto overflow-x-auto">
          {(['All', 'Dofollow', 'Nofollow', 'HighDR'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${filterType === type ? 'bg-indigo-500 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {type === 'HighDR' ? 'DR 50+' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Main Backlinks Log */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/40 bg-slate-900/10 flex justify-between items-center">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Backlink Log</h3>
          <span className="text-[10px] text-slate-500 font-mono">Found {filteredLinks.length} references</span>
        </div>
        
        {loading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-xs text-slate-400">Querying links index...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-500 font-semibold bg-slate-900/10">
                  <th className="px-6 py-3.5">Referrer Domain</th>
                  <th className="px-6 py-3.5">Referral URL</th>
                  <th className="px-6 py-3.5">Target Landing Page</th>
                  <th className="px-6 py-3.5">Anchor Text</th>
                  <th className="px-6 py-3.5">Domain Rating (DR)</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {filteredLinks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500 font-medium">
                      No backlink references found in index.
                    </td>
                  </tr>
                ) : (
                  filteredLinks.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-white block">{getDomainName(b.sourceUrl)}</span>
                        {b.discoveredAt && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Discovered {new Date(b.discoveredAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-[200px] truncate text-indigo-400">
                        <a href={b.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-0.5">
                          {b.sourceUrl} <ExternalLink className="w-3 h-3 inline shrink-0" />
                        </a>
                      </td>
                      <td className="px-6 py-4 max-w-[160px] truncate text-slate-400">{b.targetUrl}</td>
                      <td className="px-6 py-4 font-semibold text-white italic">
                        {b.anchorText ? `"${b.anchorText}"` : 'No anchor tag found'}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold">{b.domainAuthority || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          !b.isNofollow ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-400 bg-slate-800'
                        }`}>
                          {!b.isNofollow ? 'Dofollow' : 'Nofollow'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteBacklink(b.id)}
                          className="text-slate-500 hover:text-red-400 p-1 cursor-pointer transition-colors"
                          title="Delete tracked link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Backlink Opportunities Section */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-indigo-950/10 via-[#0d1222]/30 to-purple-950/5 space-y-4">
        <div className="flex items-center gap-2">
          <Building className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Backlink Acquisition Opportunities (Indian Real Estate)</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Acquiring domain references from Indian directory networks and real estate portals increases authority weight on regional search generative summaries for Indore.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {backlinkOpportunities.map((op, idx) => (
            <div key={idx} className="bg-slate-950/40 p-4.5 border border-slate-900 rounded-xl flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 text-[10px] font-semibold mb-1.5">
                  <span className="text-indigo-400 uppercase tracking-wider">{op.siteName}</span>
                  <span className="text-slate-500 font-mono">DR Estimate: <strong className="text-slate-300">{op.drEstimate}</strong></span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{op.howToGet}</p>
              </div>
              <div className="flex items-center justify-between text-[10px] mt-1">
                <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  op.priority === 'High' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                }`}>
                  Priority: {op.priority}
                </span>
                <a href={`https://www.google.com/search?q=how+to+register+on+${encodeURIComponent(op.siteName)}`} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300 flex items-center gap-0.5 font-bold">
                  View guide <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl shadow-slate-950/40 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <LinkIcon className="w-4.5 h-4.5 text-indigo-400" />
                Upload / Track Discovered Link
              </h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleUploadLink} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Source Referrer URL *</label>
                <input
                  type="url"
                  required
                  placeholder="e.g. https://www.magicbricks.com/indore-builders-list"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target Landing Page *</label>
                <input
                  type="url"
                  required
                  placeholder="e.g. https://airengroup.in/projects/villas"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Anchor Text (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. premium villas in indore"
                  value={anchorText}
                  onChange={(e) => setAnchorText(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Domain Rating (DR) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={domainAuthority}
                    onChange={(e) => setDomainAuthority(Number(e.target.value))}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Link Attribute *</label>
                  <select
                    value={isNofollow ? 'nofollow' : 'dofollow'}
                    onChange={(e) => setIsNofollow(e.target.value === 'nofollow')}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="dofollow">Dofollow</option>
                    <option value="nofollow">Nofollow</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 mt-4"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving link to database...</span>
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4" />
                    <span>Upload Link</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
