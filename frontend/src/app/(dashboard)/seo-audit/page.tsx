'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../../store/useStore';
import { 
  Play, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ChevronRight, 
  ChevronDown,
  Loader2, 
  ArrowRight,
  RefreshCw,
  Info,
  ExternalLink,
  Copy,
  Download
} from 'lucide-react';

interface SeoIssue {
  type: string;
  severity: 'critical' | 'warning';
  priorityScore: number;
  impactScore: number;
  recommendedFix: string;
  details?: any;
}

interface CrawlPage {
  id: string;
  url: string;
  statusCode: number;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  wordCount: number;
  issues: SeoIssue[];
}

interface SeoAudit {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  score: number | null;
  pagesCrawled: number;
  startedAt: string;
  completedAt: string | null;
}

export default function SeoAuditPage() {
  const { currentWebsite, token } = useStore();
  
  const [audits, setAudits] = useState<SeoAudit[]>([]);
  const [activeAudit, setActiveAudit] = useState<SeoAudit | null>(null);
  const [pages, setPages] = useState<CrawlPage[]>([]);
  
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [expandedPageId, setExpandedPageId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Record<string, 'issues' | 'llm'>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentWebsite?.id) {
      fetchAudits();
    } else {
      setAudits([]);
      setActiveAudit(null);
      setPages([]);
      setCrawling(false);
      setCrawlProgress(0);
      stopPolling();
    }
    return () => stopPolling();
  }, [currentWebsite?.id, token]);

  useEffect(() => {
    if (activeAudit?.id) {
      fetchPages(activeAudit.id);
    } else {
      setPages([]);
    }
  }, [activeAudit?.id]);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startPolling = (websiteId: string) => {
    stopPolling();
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/websites/${websiteId}/audits`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAudits(data);
          
          const latest = data[0];
          if (latest) {
            if (latest.status === 'RUNNING' || latest.status === 'PENDING') {
              const progress = Math.min(95, Math.round(((latest.pagesCrawled || 1) / 30) * 100));
              setCrawlProgress(progress);
              setCrawling(true);
            } else {
              // Completed or Failed
              stopPolling();
              setCrawling(false);
              setCrawlProgress(100);
              setActiveAudit(latest);
            }
          }
        }
      } catch (err) {
        console.error('Polling audits failed:', err);
      }
    }, 3000);
  };

  const fetchAudits = async () => {
    if (!currentWebsite?.id) return;
    setLoadingAudits(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/websites/${currentWebsite.id}/audits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAudits(data);
        
        const latest = data[0];
        if (latest) {
          setActiveAudit(latest);
          if (latest.status === 'RUNNING' || latest.status === 'PENDING') {
            setCrawling(true);
            const progress = Math.min(95, Math.round(((latest.pagesCrawled || 1) / 30) * 100));
            setCrawlProgress(progress);
            startPolling(currentWebsite.id);
          } else {
            setCrawling(false);
            setCrawlProgress(100);
          }
        } else {
          setActiveAudit(null);
          setCrawling(false);
        }
      } else {
        setErrorMsg('Failed to retrieve website crawl logs.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Could not establish connection to the audit server.');
    } finally {
      setLoadingAudits(false);
    }
  };

  const fetchPages = async (auditId: string) => {
    setLoadingPages(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/pages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      }
    } catch (err) {
      console.error('Failed to load audit pages:', err);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleRunCrawl = async () => {
    if (!currentWebsite?.id) return;
    setCrawling(true);
    setCrawlProgress(10);
    setErrorMsg(null);
    
    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          websiteId: currentWebsite.id,
          maxPages: 30,
          crawlJS: false
        })
      });

      if (res.ok) {
        startPolling(currentWebsite.id);
      } else {
        setCrawling(false);
        setErrorMsg('Failed to initiate a new SEO audit session.');
      }
    } catch (err) {
      console.error(err);
      setCrawling(false);
      setErrorMsg('Error triggering backend crawler.');
    }
  };

  const togglePageExpand = (pageId: string) => {
    setExpandedPageId(expandedPageId === pageId ? null : pageId);
  };

  const calculatePriorityScore = (page: CrawlPage) => {
    let score = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let lcpPenalty = 0;
    let inpPenalty = 0;
    let clsPenalty = 0;

    page.issues.forEach(issue => {
      if (issue.severity === 'critical') {
        criticalCount++;
      } else if (issue.severity === 'warning') {
        warningCount++;
      }

      if (issue.type === 'poor_lcp') {
        lcpPenalty = 15;
      } else if (issue.type === 'poor_inp') {
        inpPenalty = 10;
      } else if (issue.type === 'poor_cls') {
        clsPenalty = 10;
      }
    });

    score = (criticalCount * 25) + (warningCount * 8) + lcpPenalty + inpPenalty + clsPenalty;
    return Math.min(100, score);
  };

  const getIssueExplanationAndFix = (issue: SeoIssue, page: CrawlPage) => {
    const type = issue.type;
    let explanation = '';
    let whyItMatters = '';
    let suggestionTitle = 'Recommended Fix';
    let suggestedCode = '';

    switch (type) {
      case 'missing_title':
        explanation = 'The page HTML is missing a <title> element in its head section.';
        whyItMatters = 'The title tag is the single most important on-page SEO factor. It determines the clickable blue link displayed on search engine result pages (SERPs).';
        suggestedCode = `<title>Your Desired Page Title Here</title>`;
        break;
      case 'title_too_long':
        const currentTitle = issue.details?.title || page.title || '';
        explanation = `The page title is too long (${issue.details?.length || currentTitle.length} characters, limit is 70).`;
        whyItMatters = 'Google truncates page titles longer than 70 characters in search results, which can make them look cut off and reduce click-through rates (CTR).';
        suggestedCode = `<title>${currentTitle.substring(0, 67)}...</title>`;
        break;
      case 'missing_meta_description':
        explanation = 'The page HTML is missing a <meta name="description"> tag in the head.';
        whyItMatters = 'Meta descriptions provide a summary of the page on SERPs. While not a direct ranking factor, a missing description forces Google to generate a snippet, which often hurts user CTR.';
        suggestedCode = `<meta name="description" content="Enter a brief, engaging 120-160 character summary of your page contents here." />`;
        break;
      case 'meta_description_too_long':
        const currentDesc = issue.details?.metaDescription || page.metaDescription || '';
        explanation = `The meta description exceeds 160 characters (${issue.details?.length || currentDesc.length} characters).`;
        whyItMatters = 'Descriptions exceeding 160 characters are truncated by search engines, resulting in search results with cut-off, unprofessional snippets.';
        suggestedCode = `<meta name="description" content="${currentDesc.substring(0, 155)}..." />`;
        break;
      case 'missing_h1':
        explanation = 'The page has no <h1> heading tag.';
        whyItMatters = 'The H1 tag serves as the title of your visible content. It signals the main topic of the page to search engine bots and provides structure for human readers.';
        suggestedCode = `<h1>${page.title || 'Main Page Title Here'}</h1>`;
        break;
      case 'multiple_h1_tags':
        const h1s = issue.details?.h1s || [];
        explanation = `The page contains multiple <h1> heading tags (${h1s.length} found).`;
        whyItMatters = 'Search engines expect exactly one H1 tag per page to establish content hierarchy. Multiple H1 tags dilute keyword focus and confuse crawler algorithms.';
        suggestionTitle = 'Fix: Convert secondary headings to H2/H3';
        suggestedCode = h1s.length > 0 
          ? h1s.map((h: string, i: number) => i === 0 ? `<h1>${h}</h1>` : `<h2>${h}</h2>`).join('\n')
          : `<!-- Keep first H1, change others -->\n<h1>Primary H1</h1>\n<h2>Secondary Heading</h2>`;
        break;
      case 'missing_image_alt_tags':
        const imgs = issue.details?.images || [];
        explanation = `One or more images on the page are missing the 'alt' attribute (${imgs.length || 'some'} found).`;
        whyItMatters = 'Alt tags provide descriptive context for search engine image indexers and are critical for accessibility (screen readers for visually impaired users).';
        suggestionTitle = 'Fix: Add alt attributes';
        suggestedCode = imgs.length > 0
          ? imgs.slice(0, 3).map((src: string) => `<img src="${src}" alt="Descriptive keywords here" />`).join('\n') + (imgs.length > 3 ? '\n<!-- ...and more -->' : '')
          : `<img src="/logo.png" alt="Company Logo" />`;
        break;
      case 'missing_canonical_link':
        explanation = 'The page lacks a canonical URL link tag (<link rel="canonical">).';
        whyItMatters = 'Canonical tags prevent duplicate content issues by telling search engines which URL version is the master copy to index.';
        suggestedCode = `<link rel="canonical" href="${page.url}" />`;
        break;
      case 'missing_schema_markup':
        explanation = 'No structured schema markup (JSON-LD or Microdata) was detected on the page.';
        whyItMatters = 'Schema markup clarifies page context for search engines and qualifies the page for visually rich SERP features (reviews, ratings, event details).';
        suggestedCode = `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "${page.title || 'Page Name'}",\n  "url": "${page.url}"\n}\n</script>`;
        break;
      case 'poor_lcp':
        const lcpVal = issue.details?.lcp || 'Poor';
        explanation = `The Largest Contentful Paint (LCP) is slow (${lcpVal}s, threshold is 2.5s).`;
        whyItMatters = 'LCP measures perceived load speed. A slow LCP indicates a sluggish main content render, leading to high bounce rates and lower Google rankings (Core Web Vitals).';
        suggestionTitle = 'Fix: Preload hero image & compress resources';
        suggestedCode = `<!-- Add to HTML <head> to speed up hero image download -->\n<link rel="preload" href="/path/to/hero-image.webp" as="image" />`;
        break;
      case 'poor_cls':
        const clsVal = issue.details?.cls || 'Poor';
        explanation = `The Cumulative Layout Shift (CLS) is too high (${clsVal}, threshold is 0.1).`;
        whyItMatters = 'CLS measures visual stability. Elements shifting during page load annoy visitors and degrade the User Experience (Core Web Vitals).';
        suggestionTitle = 'Fix: Set dimensions on images and dynamic frames';
        suggestedCode = `<img src="/hero.jpg" width="1200" height="630" style="aspect-ratio: 16/9; width: 100%; height: auto;" />`;
        break;
      case 'poor_inp':
        const inpVal = issue.details?.inp || 'Poor';
        explanation = `Interaction to Next Paint (INP) is slow (${inpVal}ms, threshold is 200ms).`;
        whyItMatters = 'INP measures interactivity and page responsiveness. Laggy user interactions cause user frustration and are factored into page experience ranking.';
        suggestionTitle = 'Fix: Defer non-critical JS or yield main thread';
        suggestedCode = `<!-- Defer scripts or use async to prevent blocking browser paint -->\n<script src="/analytics.js" defer></script>`;
        break;
      case 'missing_robots_txt':
        explanation = 'The website is missing a robots.txt file at the root.';
        whyItMatters = 'Robots.txt establishes the crawling boundaries, preventing search bots from wasting crawl budget on private, administrative, or low-value pages.';
        suggestedCode = `User-agent: *\nAllow: /\n\nSitemap: ${currentWebsite?.domain ? `https://${currentWebsite.domain}` : ''}/sitemap.xml`;
        break;
      case 'missing_sitemap_xml':
        explanation = 'The website has no sitemap.xml file registered at the root.';
        whyItMatters = 'A sitemap guides search engine crawlers, pointing them directly to all indexable pages so new/updated content gets discovered faster.';
        suggestedCode = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${page.url}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>`;
        break;
      case 'missing_llms_txt':
        explanation = 'The website lacks an llms.txt file at the root of the domain.';
        whyItMatters = 'An llms.txt file is the modern standard for communicating structured site context to AI, LLM search agents, and crawler bots.';
        suggestedCode = `# ${page.title || 'My Site'}\n\n> Suggested llms.txt snippet for LLM search indexing.`;
        break;
      case 'broken_internal_links':
        explanation = 'The page contains hyperlinks pointing to internal URLs that return error status codes (e.g. 404).';
        whyItMatters = 'Broken links disrupt link equity flow, trigger crawl errors, and lead to poor user experiences when pages fail to resolve.';
        suggestedCode = `<!-- Audit your internal links and replace or remove broken href tags -->\n<a href="/active-page">Active Link</a>`;
        break;
      default:
        explanation = issue.recommendedFix;
        whyItMatters = 'Resolving technical issues helps maintain compliance with search engine guidelines and improves search discovery.';
        suggestedCode = `<!-- Technical review recommended -->`;
        break;
    }

    return { explanation, whyItMatters, suggestionTitle, suggestedCode };
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    if (!activeAudit?.id) return;
    setExporting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/audits/${activeAudit.id}/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Export failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seo_audit_${currentWebsite?.domain || 'report'}_${new Date(activeAudit.startedAt).toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to export full audit report.');
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getPageTab = (pageId: string) => activeTab[pageId] || 'issues';
  const setPageTab = (pageId: string, tab: 'issues' | 'llm') => {
    setActiveTab(prev => ({ ...prev, [pageId]: tab }));
  };

  // Compute issue statistics for the active audit
  const getAuditStats = () => {
    let criticalCount = 0;
    let warningCount = 0;
    let healthyCount = 0;

    pages.forEach(p => {
      let pageCrit = 0;
      let pageWarn = 0;
      p.issues.forEach(iss => {
        if (iss.severity === 'critical') pageCrit++;
        else pageWarn++;
      });
      criticalCount += pageCrit;
      warningCount += pageWarn;
      if (pageCrit === 0 && pageWarn === 0 && p.statusCode === 200) {
        healthyCount++;
      }
    });

    return {
      criticalCount,
      warningCount,
      healthyCount
    };
  };

  const stats = getAuditStats();

  const sortedPages = [...pages].map(p => ({
    ...p,
    priorityScore: calculatePriorityScore(p)
  })).sort((a, b) => b.priorityScore - a.priorityScore);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/40 pb-5">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Engine Control</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">SEO Site Crawler</h1>
          <p className="text-sm text-slate-400 mt-1">
            Analyze technical SEO parameters, robots, sitemaps, canonicals, Core Web Vitals, and internal linking for <span className="text-slate-200 font-semibold">{currentWebsite?.domain}</span>.
          </p>
        </div>
        
        <div className="flex gap-2.5 items-center">
          {activeAudit && sortedPages.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                disabled={exporting || crawling || loadingPages}
                className="flex items-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40"
              >
                {exporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Export Report</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-950 border border-slate-850 rounded-xl shadow-2xl py-1.5 z-50 overflow-hidden animate-fadeIn">
                  <button
                    onClick={() => {
                      handleExport('pdf');
                      setExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-900 text-xs text-slate-300 hover:text-white font-medium cursor-pointer transition-colors"
                  >
                    Download PDF Report
                  </button>
                  <button
                    onClick={() => {
                      handleExport('csv');
                      setExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-900 text-xs text-slate-300 hover:text-white font-medium cursor-pointer transition-colors"
                  >
                    Download CSV Report
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={fetchAudits}
            disabled={crawling || loadingAudits}
            className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl cursor-pointer disabled:opacity-40 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button 
            onClick={handleRunCrawl}
            disabled={crawling || !currentWebsite?.id}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer shadow-lg shadow-indigo-500/10"
          >
            {crawling ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Play className="w-4 h-4 text-white fill-white" />
            )}
            <span>{crawling ? `Crawling (${crawlProgress}%)` : 'Run Crawler Audit'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-xs text-red-400 animate-fadeIn">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Crawling Progress */}
      {crawling && (
        <div className="w-full bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 animate-fadeIn">
          <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Analyzing site layout nodes & technical scripts...</span>
            <span className="font-mono text-indigo-400">{crawlProgress}%</span>
          </div>
          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full transition-all duration-300" style={{ width: `${crawlProgress}%` }} />
          </div>
        </div>
      )}

      {loadingAudits && !crawling ? (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <span className="text-sm text-slate-400 font-medium">Loading technical audit histories...</span>
        </div>
      ) : activeAudit ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Crawl Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-slate-800/80">
              <div className="p-3 rounded-xl bg-indigo-550/15 text-indigo-400 border border-indigo-500/10">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Technical Score</span>
                <h3 className="text-2xl font-black text-white font-mono mt-0.5">
                  {activeAudit.score !== null ? `${activeAudit.score}/100` : 'Pending'}
                </h3>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-slate-800/80">
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-455 border border-rose-500/10">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Critical Issues</span>
                <h3 className="text-2xl font-black text-rose-400 font-mono mt-0.5">
                  {loadingPages ? '...' : stats.criticalCount}
                </h3>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-slate-800/80">
              <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-455 border border-yellow-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Warnings</span>
                <h3 className="text-2xl font-black text-yellow-400 font-mono mt-0.5">
                  {loadingPages ? '...' : stats.warningCount}
                </h3>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-slate-800/80">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Healthy Pages</span>
                <h3 className="text-2xl font-black text-emerald-450 font-mono mt-0.5">
                  {loadingPages ? '...' : `${stats.healthyCount} / ${activeAudit.pagesCrawled}`}
                </h3>
              </div>
            </div>
          </div>

          {/* Pages Crawled Table */}
          <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-800/40 bg-slate-900/10 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Crawled Pages List</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Audit compiled on {new Date(activeAudit.startedAt).toLocaleString()}</p>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Total Pages: {activeAudit.pagesCrawled}
              </span>
            </div>
            
            {loadingPages ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
                <span className="text-xs text-slate-500">Retrieving page technical analysis log...</span>
              </div>
            ) : sortedPages.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                No crawled page records exist for this audit session.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="px-6 py-3.5">Page URL & HTML Title</th>
                      <th className="px-6 py-3.5 w-20">Status</th>
                      <th className="px-6 py-3.5 w-24 text-right">Word Count</th>
                      <th className="px-6 py-3.5 w-28 text-center">Fix Priority</th>
                      <th className="px-6 py-3.5 w-48">Issues Found</th>
                      <th className="px-6 py-3.5 text-right w-16">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-350 font-medium">
                    {sortedPages.map((page) => {
                      const isExpanded = expandedPageId === page.id;
                      
                      return (
                        <React.Fragment key={page.id}>
                          <tr 
                            onClick={() => togglePageExpand(page.id)}
                            className={`hover:bg-slate-900/20 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-950/20' : ''}`}
                          >
                            <td className="px-6 py-4 max-w-md">
                              <span className="text-indigo-400 hover:underline font-semibold block truncate break-all">
                                {page.url}
                              </span>
                              <span className="block text-[10px] text-slate-500 font-normal truncate mt-0.5">
                                {page.title || '(No Page Title Tag Detected)'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                                page.statusCode === 200 
                                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/5' 
                                  : 'text-rose-400 bg-rose-500/10 border border-rose-500/5'
                              }`}>
                                {page.statusCode}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-slate-400">
                              {page.wordCount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                page.priorityScore >= 75
                                  ? 'text-rose-400 bg-rose-500/15 border border-rose-500/10'
                                  : page.priorityScore >= 35
                                  ? 'text-yellow-400 bg-yellow-500/15 border border-yellow-500/10'
                                  : 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/10'
                              }`}>
                                {page.priorityScore}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {page.issues.length === 0 ? (
                                <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Perfect Score
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {page.issues.map((issue, idx) => (
                                    <span 
                                      key={idx} 
                                      className={`px-1.5 py-0.5 rounded text-[8.5px] uppercase font-bold ${
                                        issue.severity === 'critical' 
                                          ? 'text-rose-405 bg-rose-500/10 border border-rose-500/5' 
                                          : 'text-yellow-405 bg-yellow-500/10 border border-yellow-500/5'
                                      }`}
                                    >
                                      {issue.type.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                className="p-1 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4.5 h-4.5" />
                                ) : (
                                  <ChevronRight className="w-4.5 h-4.5" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded issues & LLM panel */}
                          {isExpanded && (
                            <tr className="bg-slate-950/40 animate-slideDown">
                              <td colSpan={6} className="px-8 py-5 border-t border-slate-900">
                                <div className="space-y-4">
                                  <div className="flex border-b border-slate-800/60 pb-2 mb-4 justify-between items-center">
                                    <div className="flex gap-4">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setPageTab(page.id, 'issues'); }}
                                        className={`pb-1.5 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                                          getPageTab(page.id) === 'issues'
                                            ? 'text-indigo-405 border-indigo-500'
                                            : 'text-slate-500 border-transparent hover:text-slate-305'
                                        }`}
                                      >
                                        Technical Issues ({page.issues.length})
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setPageTab(page.id, 'llm'); }}
                                        className={`pb-1.5 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                                          getPageTab(page.id) === 'llm'
                                            ? 'text-indigo-405 border-indigo-500'
                                            : 'text-slate-500 border-transparent hover:text-slate-305'
                                        }`}
                                      >
                                        LLM & AI Optimization
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-[10px] text-slate-500 font-mono hidden sm:flex">
                                      <span>H1 Tag: <strong className="text-slate-300 font-sans">{page.h1 || '(None)'}</strong></span>
                                      <span>•</span>
                                      <span>Meta Description: <strong className="text-slate-300 font-sans">{page.metaDescription ? `${page.metaDescription.substring(0, 40)}...` : '(None)'}</strong></span>
                                    </div>
                                  </div>

                                  {getPageTab(page.id) === 'issues' ? (
                                    page.issues.length === 0 ? (
                                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 text-emerald-450 rounded-xl text-xs flex items-center gap-2">
                                        <CheckCircle className="w-4.5 h-4.5 shrink-0" />
                                        <span>Technical health check completed successfully. Zero technical SEO issues detected on this path node.</span>
                                      </div>
                                    ) : (
                                      <div className="space-y-3.5">
                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Technical Analysis & Recommended Fixes</h4>
                                        
                                        <div className="grid grid-cols-1 gap-3.5">
                                          {page.issues.map((issue, idx) => {
                                            const info = getIssueExplanationAndFix(issue, page);
                                            return (
                                              <div 
                                                key={idx} 
                                                className="p-4 bg-slate-900/30 border border-slate-850 rounded-xl flex flex-col gap-3.5"
                                              >
                                                <div className="flex justify-between items-start">
                                                  <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${issue.severity === 'critical' ? 'bg-rose-500' : 'bg-yellow-500'}`} />
                                                    <span className="text-xs font-bold text-white uppercase tracking-wide">
                                                      {issue.type.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded-md ${
                                                      issue.severity === 'critical' ? 'text-rose-400 bg-rose-500/10' : 'text-yellow-400 bg-yellow-500/10'
                                                    }`}>
                                                      {issue.severity}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-2 font-mono text-[9px] bg-slate-950/60 px-2 py-1 rounded border border-slate-850">
                                                    <span className="text-slate-500">Priority: <strong className="text-indigo-400">{issue.priorityScore}</strong></span>
                                                    <span className="text-slate-800">|</span>
                                                    <span className="text-slate-500">Impact: <strong className="text-pink-400">{issue.impactScore}</strong></span>
                                                  </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  <div className="space-y-2.5">
                                                    <div>
                                                      <span className="text-[9.5px] text-slate-500 uppercase font-semibold block tracking-wider">What it is</span>
                                                      <p className="text-xs text-slate-300 font-normal leading-relaxed">{info.explanation}</p>
                                                    </div>
                                                    <div>
                                                      <span className="text-[9.5px] text-slate-500 uppercase font-semibold block tracking-wider">Why it matters</span>
                                                      <p className="text-xs text-slate-400 font-normal leading-relaxed">{info.whyItMatters}</p>
                                                    </div>
                                                  </div>

                                                  <div className="bg-slate-950/80 border border-slate-850 p-3 rounded-lg flex flex-col justify-between">
                                                    <div>
                                                      <span className="text-[10px] text-indigo-400 uppercase font-semibold block mb-1 tracking-wider">{info.suggestionTitle}</span>
                                                      <pre className="text-[11px] font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-32 bg-slate-950 p-2 rounded border border-slate-900">
                                                        <code>{info.suggestedCode}</code>
                                                      </pre>
                                                    </div>
                                                    <div className="flex justify-end mt-2">
                                                      <button
                                                        onClick={(e) => { e.stopPropagation(); handleCopy(`${page.id}-${issue.type}`, info.suggestedCode); }}
                                                        className="text-[10px] font-bold text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                                                      >
                                                        <Copy className="w-3 h-3" />
                                                        <span>{copiedId === `${page.id}-${issue.type}` ? 'Copied!' : 'Copy Code'}</span>
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )
                                  ) : (
                                    <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-xl space-y-5">
                                      <div>
                                        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">LLM & AI Engine Visibility Audit</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                          AI search engines (like Gemini, Perplexity, OpenAI Search) extract and digest web content differently than traditional search crawlers. Ensure your pages are structured for machine ingestion.
                                        </p>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Check 1: Schema */}
                                        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-2 flex flex-col justify-between">
                                          <div>
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] text-slate-500 uppercase font-bold">Structured Schema</span>
                                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                                                !page.issues.some(i => i.type === 'missing_schema_markup')
                                                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/5'
                                                  : 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/5'
                                              }`}>
                                                {!page.issues.some(i => i.type === 'missing_schema_markup') ? 'Detected' : 'Missing'}
                                              </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2">
                                              JSON-LD Structured data gives AI search engines explicit information about your page entity.
                                            </p>
                                          </div>
                                          <div className="pt-2">
                                            {page.issues.some(i => i.type === 'missing_schema_markup') ? (
                                              <div className="space-y-2">
                                                <pre className="text-[10px] font-mono text-slate-350 bg-slate-950 p-2 rounded border border-slate-900 overflow-x-auto max-h-24 leading-normal">
                                                  {`{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "${page.title || 'Page'}",\n  "description": "${page.metaDescription || ''}",\n  "url": "${page.url}"\n}`}
                                                </pre>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCopy(`${page.id}-schema`, `{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "${page.title || 'Page'}",\n  "description": "${page.metaDescription || ''}",\n  "url": "${page.url}"\n}`);
                                                  }}
                                                  className="w-full text-[10px] font-bold text-center text-slate-300 hover:text-white py-1.5 rounded bg-indigo-650 hover:bg-indigo-600 transition-all cursor-pointer flex items-center justify-center gap-1 border border-indigo-500/20"
                                                >
                                                  <Copy className="w-3 h-3" />
                                                  <span>{copiedId === `${page.id}-schema` ? 'Copied Schema!' : 'Generate & Copy Schema'}</span>
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 rounded text-[10px] text-emerald-450 text-center font-bold">
                                                JSON-LD Schema Detected
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Check 2: Headings & Content */}
                                        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-2 flex flex-col justify-between">
                                          <div>
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] text-slate-500 uppercase font-bold">AI Content Structure</span>
                                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                                                !page.issues.some(i => i.type === 'missing_h1' || i.type === 'multiple_h1_tags') && page.wordCount >= 250
                                                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/5'
                                                  : 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/5'
                                              }`}>
                                                {!page.issues.some(i => i.type === 'missing_h1' || i.type === 'multiple_h1_tags') && page.wordCount >= 250 ? 'Optimized' : 'Needs Work'}
                                              </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2">
                                              Clear formatting with a unique H1 heading and adequate word count allows LLMs to extract page entities with high confidence.
                                            </p>
                                          </div>
                                          <div className="pt-2 text-[10px] text-slate-400 space-y-1.5 bg-slate-950 p-2.5 rounded border border-slate-900">
                                            <div className="flex justify-between">
                                              <span>Heading Hierarchy:</span>
                                              <span className={!page.issues.some(i => i.type === 'missing_h1' || i.type === 'multiple_h1_tags') ? 'text-emerald-450 font-bold' : 'text-yellow-450 font-bold'}>
                                                {!page.issues.some(i => i.type === 'missing_h1' || i.type === 'multiple_h1_tags') ? 'Structured' : 'Review H1s'}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span>Word Count ({page.wordCount}):</span>
                                              <span className={page.wordCount >= 250 ? 'text-emerald-450 font-bold' : 'text-yellow-450 font-bold'}>
                                                {page.wordCount >= 250 ? 'Good' : 'Short Content'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Check 3: llms.txt entry */}
                                        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-2 flex flex-col justify-between">
                                          <div>
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] text-slate-500 uppercase font-bold">llms.txt Indexing</span>
                                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                                                !page.issues.some(i => i.type === 'missing_llms_txt')
                                                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/5'
                                                  : 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/5'
                                              }`}>
                                                {!page.issues.some(i => i.type === 'missing_llms_txt') ? 'Active' : 'Missing root'}
                                              </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2">
                                              Standardized llms.txt entry tells AI scrapers exactly how to summarize this URL path.
                                            </p>
                                          </div>
                                          <div className="pt-2 space-y-2">
                                            <pre className="text-[10px] font-mono text-slate-350 bg-slate-950 p-2 rounded border border-slate-900 overflow-x-auto max-h-24 leading-normal">
                                              {`- [${page.title || 'Page'}](${page.url}): ${page.metaDescription?.substring(0, 100) || 'Main page content summary.'}...`}
                                            </pre>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopy(`${page.id}-llms`, `- [${page.title || 'Page'}](${page.url}): ${page.metaDescription || 'Page content.'}`);
                                              }}
                                              className="w-full text-[10px] font-bold text-center text-slate-300 hover:text-white py-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1"
                                            >
                                              <Copy className="w-3 h-3" />
                                              <span>{copiedId === `${page.id}-llms` ? 'Copied Entry!' : 'Copy llms.txt Entry'}</span>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-panel py-20 text-center rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-4">
          <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">No Crawl Records Found</h3>
            <p className="text-xs text-slate-400 mt-1">Run an initial technical crawler cycle to index files and inspect page configurations.</p>
          </div>
          <button 
            onClick={handleRunCrawl}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-white fill-white" />
            <span>Launch Initial Scan</span>
          </button>
        </div>
      )}
    </div>
  );
}
