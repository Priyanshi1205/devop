'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../../store/useStore';
import { 
  Plus, 
  Sparkles, 
  Search, 
  PenTool, 
  Loader2, 
  TrendingUp, 
  CheckCircle, 
  FileText,
  AlertCircle,
  Clock,
  ArrowRight,
  ChevronLeft,
  Save,
  Download,
  RefreshCw,
  Copy,
  Globe,
  Languages,
  Bold,
  Italic,
  List,
  Heading1,
  Heading2,
  Trash2,
  ExternalLink,
  Settings,
  Image,
  Share2,
  Link,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface ContentAsset {
  id: string;
  projectId: string;
  websiteId: string | null;
  title: string;
  url: string | null;
  body: string;
  keyword: string | null;
  contentType: string | null;
  targetCountry: string | null;
  targetLanguage: string | null;
  seoTitle: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  h1: string | null;
  h2Structure: any; // string[]
  faqSection: any; // {question, answer}[]
  internalLinking: any; // {pageTitle, url, anchorText, recommendationReason}[]
  imageSuggestions: any; // {alt, filename, placement, searchQuery}[]
  geoOptimizedContent: string | null;
  llmOptimizedContent: string | null;
  publishUrl: string | null;
  isDraft: boolean;
  history: any; // {timestamp, action, section?, instruction?}[]
  createdAt: string;
  updatedAt: string;
}

interface CmsConnection {
  id: string;
  projectId: string;
  cmsType: string;
  siteUrl: string | null;
  username: string | null;
  defaultStatus: string;
  createdAt: string;
}

interface BlogSuggestion {
  title: string;
  keyword: string;
  trafficPotential: string;
  reason: string;
}

// Markdown to HTML Parser
const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  let html = markdown;
  
  // Clean raw carriage returns
  html = html.replace(/\r\n/g, '\n');

  // Check if it already has HTML headers to avoid double parsing
  if (/<h[1-6]>/i.test(markdown) || /<p>/i.test(markdown)) {
    return html;
  }

  // Headers
  html = html.replace(/^#\s+(.*?)$/gm, '<h1>$1</h1>');
  html = html.replace(/^##\s+(.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^###\s+(.*?)$/gm, '<h3>$1</h3>');
  
  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Bullet lists
  html = html.replace(/^\-\s+(.*?)$/gm, '<li>$1</li>');
  
  // Paragraphs (wrap blocks of text that aren't tags)
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<p') || trimmed.startsWith('<table') || trimmed.startsWith('<tr') || trimmed.startsWith('<td') || trimmed.startsWith('<th') || trimmed.startsWith('</')) {
      return line;
    }
    return `<p>${trimmed}</p>`;
  });
  
  return processedLines.filter(l => l !== '').join('\n');
};

export default function ContentStudioPage() {
  const { 
    currentProject, 
    currentWebsite, 
    projects, 
    websites, 
    token 
  } = useStore();

  const [articles, setArticles] = useState<ContentAsset[]>([]);
  const [suggestions, setSuggestions] = useState<BlogSuggestion[]>([]);
  const [cmsConnections, setCmsConnections] = useState<CmsConnection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active View States: 'catalog' | 'creator' | 'editor'
  const [view, setView] = useState<'catalog' | 'creator' | 'editor'>('catalog');
  const [catalogTab, setCatalogTab] = useState<'drafts' | 'cms'>('drafts');
  const [activeArticle, setActiveArticle] = useState<ContentAsset | null>(null);

  // Creator Form States
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedWebsiteId, setSelectedWebsiteId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [contentType, setContentType] = useState('Blog');
  const [targetCountry, setTargetCountry] = useState('India');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [customTitle, setCustomTitle] = useState('');
  const [generating, setGenerating] = useState(false);

  // Editor States
  const [editorTitle, setEditorTitle] = useState('');
  const [editorBody, setEditorBody] = useState('');
  const [editorSeoTitle, setEditorSeoTitle] = useState('');
  const [editorMetaDescription, setEditorMetaDescription] = useState('');
  const [editorH1, setEditorH1] = useState('');
  const [editorTab, setEditorTab] = useState<'seo' | 'structure' | 'images' | 'optimizations'>('seo');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  // Section Regeneration States
  const [regenSection, setRegenSection] = useState<string | null>(null);
  const [regenInstruction, setRegenInstruction] = useState('');
  const [isRegeneratingSection, setIsRegeneratingSection] = useState(false);

  // CMS Connections Panel Form States
  const [connCmsType, setConnCmsType] = useState('WordPress');
  const [connSiteUrl, setConnSiteUrl] = useState('');
  const [connUsername, setConnUsername] = useState('');
  const [connApiKey, setConnApiKey] = useState('');
  const [connDefaultStatus, setConnDefaultStatus] = useState('draft');
  const [addingConnection, setAddingConnection] = useState(false);

  // Publishing Workflow Modal States
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [publishStatus, setPublishStatus] = useState('draft');
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  // Initial Sync from useStore
  useEffect(() => {
    if (currentProject) {
      setSelectedProjectId(currentProject.id);
    }
    if (currentWebsite) {
      setSelectedWebsiteId(currentWebsite.id);
    }
  }, [currentProject, currentWebsite]);

  // Synchronize targetCountry & targetLanguage based on campaign context
  useEffect(() => {
    if (currentProject?.name?.toLowerCase().includes('airen') || currentWebsite?.domain?.endsWith('.in')) {
      setTargetCountry('India');
      setTargetLanguage('English (India)');
    } else {
      setTargetCountry('United States');
      setTargetLanguage('English');
    }
  }, [currentProject, currentWebsite]);

  // Fetch all initial data
  useEffect(() => {
    if (currentProject?.id) {
      fetchArticles(currentProject.id);
      fetchSuggestions(currentProject.id);
      fetchCmsConnections(currentProject.id);
    } else {
      setArticles([]);
      setSuggestions([]);
      setCmsConnections([]);
      setActiveArticle(null);
      setView('catalog');
    }
  }, [currentProject?.id]);

  // Synchronize Editor fields when activeArticle changes
  useEffect(() => {
    if (activeArticle) {
      setEditorTitle(activeArticle.title);
      setEditorBody(activeArticle.body);
      setEditorSeoTitle(activeArticle.seoTitle || '');
      setEditorMetaDescription(activeArticle.metaDescription || '');
      setEditorH1(activeArticle.h1 || '');
      setHistoryLogs(Array.isArray(activeArticle.history) ? activeArticle.history : []);
      if (editorRef.current) {
        editorRef.current.innerHTML = markdownToHtml(activeArticle.body);
      }
    }
  }, [activeArticle]);

  // Fetch articles
  const fetchArticles = async (projId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projId}/content`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Could not connect to NestJS content API.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Daily Suggestions
  const fetchSuggestions = async (projId: string) => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projId}/content/suggestions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (err) {
      console.error('Error fetching blog suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Fetch CMS Connections
  const fetchCmsConnections = async (projId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projId}/cms-connections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCmsConnections(data);
        if (data.length > 0) {
          setSelectedConnectionId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching CMS connections:', err);
    }
  };

  // Link CMS Connection
  const handleAddConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setAddingConnection(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${selectedProjectId}/cms-connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          cmsType: connCmsType,
          siteUrl: connSiteUrl || undefined,
          username: connUsername || undefined,
          apiKey: connApiKey || undefined,
          defaultStatus: connDefaultStatus
        })
      });
      if (res.ok) {
        setConnSiteUrl('');
        setConnUsername('');
        setConnApiKey('');
        fetchCmsConnections(selectedProjectId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingConnection(false);
    }
  };

  // Delete CMS Connection
  const handleDeleteConnection = async (id: string) => {
    if (!window.confirm('Delete this CMS connection?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cms-connections/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok && currentProject) {
        fetchCmsConnections(currentProject.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger CMS Publish
  const handlePublishToCms = async () => {
    if (!activeArticle || !selectedConnectionId) return;
    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/content/${activeArticle.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          connectionId: selectedConnectionId,
          status: publishStatus
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setArticles(articles.map(art => art.id === updated.id ? updated : art));
        setActiveArticle(updated);
        setPublishResult({ success: true, url: updated.publishUrl });
      } else {
        const data = await res.json();
        setPublishResult({ success: false, error: data.message || 'CMS Publishing failed.' });
      }
    } catch (err: any) {
      setPublishResult({ success: false, error: err.message || 'Failed to connect to publishing API.' });
    } finally {
      setPublishing(false);
    }
  };

  // Generate new article
  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword) return;

    setGenerating(true);
    setErrorMessage(null);

    const payload = {
      projectId: selectedProjectId,
      websiteId: selectedWebsiteId || undefined,
      keyword,
      contentType,
      targetCountry,
      targetLanguage,
      title: customTitle || undefined
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${selectedProjectId}/content/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newAsset = await res.json();
        setArticles([newAsset, ...articles]);
        setActiveArticle(newAsset);
        setView('editor');
        setKeyword('');
        setCustomTitle('');
      } else {
        const errData = await res.json();
        setErrorMessage(errData.message || 'Failed to generate content draft.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to connect to content generation engine.');
    } finally {
      setGenerating(false);
    }
  };

  // Save current editor state to draft
  const handleSaveDraft = async (publish: boolean = false) => {
    if (!activeArticle) return;
    setSaveStatus('saving');

    const bodyHtml = editorRef.current ? editorRef.current.innerHTML : editorBody;

    const payload = {
      title: editorTitle,
      body: bodyHtml,
      seoTitle: editorSeoTitle,
      metaDescription: editorMetaDescription,
      h1: editorH1,
      isDraft: !publish
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/content/${activeArticle.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        setArticles(articles.map(art => art.id === updated.id ? updated : art));
        setActiveArticle(updated);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  };

  // Delete an article
  const handleDeleteArticle = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this content asset?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/content/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setArticles(articles.filter(art => art.id !== id));
        if (activeArticle?.id === id) {
          setView('catalog');
          setActiveArticle(null);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete article.');
    }
  };

  // Trigger Section Regeneration via LLM API
  const handleRegenerateSection = async () => {
    if (!activeArticle || !regenSection) return;
    setIsRegeneratingSection(true);

    const payload = {
      section: regenSection,
      instruction: regenInstruction
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/content/${activeArticle.id}/regenerate-section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        setActiveArticle(updated);
        setArticles(articles.map(art => art.id === updated.id ? updated : art));
        
        if (regenSection === 'body' && editorRef.current) {
          editorRef.current.innerHTML = markdownToHtml(updated.body);
        }

        setRegenSection(null);
        setRegenInstruction('');
      } else {
        alert('Regeneration failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Could not connect to regeneration endpoint.');
    } finally {
      setIsRegeneratingSection(false);
    }
  };

  // Client side exports
  const exportHtml = () => {
    if (!activeArticle) return;
    const bodyHtml = editorRef.current ? editorRef.current.innerHTML : editorBody;
    const htmlContent = `<!DOCTYPE html>
<html lang="${activeArticle.targetLanguage === 'Spanish' ? 'es' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${editorSeoTitle || activeArticle.title}</title>
  <meta name="description" content="${editorMetaDescription || ''}">
</head>
<body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.6;">
  <header style="margin-bottom: 40px; border-bottom: 1px solid #eee; padding-bottom: 20px;">
    <h1 style="font-size: 2.5em; margin-bottom: 10px;">${editorH1 || activeArticle.title}</h1>
    <p style="color: #666; font-size: 0.9em;">
      <strong>Target Keyword:</strong> ${activeArticle.keyword || 'None'} | 
      <strong>Region:</strong> ${activeArticle.targetCountry || 'Global'} | 
      <strong>Language:</strong> ${activeArticle.targetLanguage || 'English'}
    </p>
  </header>
  <article>
    ${bodyHtml}
  </article>
  ${Array.isArray(activeArticle.faqSection) && activeArticle.faqSection.length > 0 ? `
  <section style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px;">
    <h2>Frequently Asked Questions</h2>
    ${activeArticle.faqSection.map((faq: any) => `
      <div style="margin-bottom: 20px;">
        <p><strong>Q: ${faq.question}</strong></p>
        <p>A: ${faq.answer}</p>
      </div>
    `).join('')}
  </section>` : ''}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeArticle.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = () => {
    if (!activeArticle) return;
    const bodyHtml = editorRef.current ? editorRef.current.innerHTML : editorBody;
    
    let markdown = `# ${editorH1 || activeArticle.title}\n\n`;
    markdown += `**SEO Title:** ${editorSeoTitle || ''}\n`;
    markdown += `**Meta Description:** ${editorMetaDescription || ''}\n`;
    markdown += `**Target Keyword:** ${activeArticle.keyword || ''}\n`;
    markdown += `**Target Region:** ${activeArticle.targetCountry || ''}\n\n`;
    markdown += `---\n\n`;

    let cleanBody = bodyHtml
      .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i>(.*?)<\/i>/gi, '*$1*')
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li>(.*?)<\/li>/gi, '- $1')
      .replace(/<ul>(.*?)<\/ul>/gi, '$1\n')
      .replace(/<ol>(.*?)<\/ol>/gi, '$1\n')
      .replace(/<[^>]+>/g, '');

    markdown += cleanBody;

    if (Array.isArray(activeArticle.faqSection) && activeArticle.faqSection.length > 0) {
      markdown += `\n\n## Frequently Asked Questions\n\n`;
      activeArticle.faqSection.forEach((faq: any) => {
        markdown += `### Q: ${faq.question}\n`;
        markdown += `A: ${faq.answer}\n\n`;
      });
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeArticle.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Editor toolbar actions
  const applyStyle = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setEditorBody(editorRef.current.innerHTML);
    }
  };

  // Word count utility
  const getWordCount = (html: string) => {
    const text = html.replace(/<[^>]+>/g, ' ');
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.length;
  };

  // Copy helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const filteredArticles = articles.filter(art => {
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.keyword && art.keyword.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesWebsite = !currentWebsite || art.websiteId === currentWebsite.id;
    return matchesSearch && matchesWebsite;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/40 pb-5">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">AI Content Studio</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">Content Studio</h1>
          <p className="text-sm text-slate-400 mt-1">
            Build, optimize, and publish SEO & LLM optimized content for <span className="text-slate-200 font-semibold">{currentWebsite?.domain || 'all websites'}</span>.
          </p>
        </div>

        {view === 'catalog' && (
          <button 
            onClick={() => setView('creator')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Generate Article Brief</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-xs text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* --- CATALOG VIEW --- */}
      {view === 'catalog' && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* DAILY SUGGESTIONS PANEL */}
          {catalogTab === 'drafts' && suggestions.length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-indigo-950/15 via-[#0d1222]/30 to-purple-950/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Today's Recommended Articles</h3>
                </div>
                <span className="text-[10px] bg-indigo-500/15 text-indigo-400 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                  Daily AI suggestions
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.map((sug, idx) => (
                  <div key={idx} className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl flex flex-col justify-between gap-3 hover:border-slate-800 transition-colors">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-500 mb-1">
                        <span>Keyword: <strong>{sug.keyword}</strong></span>
                        <span className="text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded-full">{sug.trafficPotential}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white leading-snug">{sug.title}</h4>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{sug.reason}</p>
                    </div>
                    <button
                      onClick={() => {
                        setKeyword(sug.keyword);
                        setCustomTitle(sug.title);
                        setView('creator');
                      }}
                      className="mt-1 flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold self-start cursor-pointer"
                    >
                      Write Article Now <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Catalog Tab Selectors */}
          <div className="flex gap-4 border-b border-slate-800/40">
            <button 
              onClick={() => setCatalogTab('drafts')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                catalogTab === 'drafts' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              All Article Drafts
            </button>
            <button 
              onClick={() => setCatalogTab('cms')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                catalogTab === 'cms' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              CMS Connections Settings
            </button>
          </div>

          {/* DRAFTS LIST VIEW */}
          {catalogTab === 'drafts' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="glass-panel p-4.5 rounded-xl border border-slate-800 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Generated Articles</span>
                    <span className="text-xl font-bold text-white font-mono">{filteredArticles.length}</span>
                  </div>
                </div>
                
                <div className="glass-panel p-4.5 rounded-xl border border-slate-800 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Target Countries</span>
                    <span className="text-xl font-bold text-white font-mono">
                      {new Set(filteredArticles.map(a => a.targetCountry).filter(Boolean)).size}
                    </span>
                  </div>
                </div>

                <div className="glass-panel p-4.5 rounded-xl border border-slate-800 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Words Drafted</span>
                    <span className="text-xl font-bold text-white font-mono">
                      {filteredArticles.reduce((acc, art) => acc + getWordCount(art.body), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-4 items-center bg-[#0d1222]/30 p-4 border border-slate-800/40 rounded-xl">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl w-full">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search articles by title or keyword..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none text-xs text-white placeholder-slate-600 focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Table List */}
              <div className="glass-panel rounded-xl border border-slate-800/80 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800/40 bg-slate-900/10 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Content Briefs & Articles</h3>
                  <span className="text-[10px] text-slate-500 font-mono">Active Project: {currentProject?.name}</span>
                </div>
                
                {loading ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <span className="text-xs text-slate-400">Loading Content Studio Briefs...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800/60 text-slate-500 font-semibold bg-slate-900/10">
                          <th className="px-6 py-3.5">Title</th>
                          <th className="px-6 py-3.5">Keyword</th>
                          <th className="px-6 py-3.5">Type</th>
                          <th className="px-6 py-3.5">Geo Target</th>
                          <th className="px-6 py-3.5">Publish Status</th>
                          <th className="px-6 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-slate-300">
                        {filteredArticles.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                              No articles found. Generate your first brief to get started!
                            </td>
                          </tr>
                        ) : (
                          filteredArticles.map((art) => (
                            <tr key={art.id} className="hover:bg-slate-900/10 transition-colors">
                              <td className="px-6 py-4 max-w-[280px]">
                                <span 
                                  onClick={() => {
                                    setActiveArticle(art);
                                    setView('editor');
                                  }}
                                  className="font-semibold text-white block truncate hover:text-indigo-400 cursor-pointer"
                                >
                                  {art.title}
                                </span>
                                <span className="text-[10px] text-slate-500 block mt-0.5">
                                  Created {new Date(art.createdAt).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono text-slate-400">{art.keyword || 'N/A'}</td>
                              <td className="px-6 py-4">{art.contentType}</td>
                              <td className="px-6 py-4 text-slate-400">{art.targetCountry || 'Global'}</td>
                              <td className="px-6 py-4">
                                {art.publishUrl ? (
                                  <a 
                                    href={art.publishUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="inline-flex items-center gap-1 text-emerald-400 hover:underline text-[10px]"
                                  >
                                    Live CMS <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                ) : (
                                  <span className="text-amber-500 text-[10px] font-semibold">
                                    Local Draft
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <button 
                                    onClick={() => {
                                      setActiveArticle(art);
                                      setView('editor');
                                    }}
                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer"
                                  >
                                    Edit brief
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteArticle(art.id)}
                                    className="text-slate-500 hover:text-red-400 cursor-pointer"
                                    title="Delete article"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CMS CONNECTIONS SETTINGS VIEW */}
          {catalogTab === 'cms' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              {/* Linked Connections */}
              <div className="lg:col-span-2 space-y-4">
                <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Link className="w-4 h-4 text-slate-500" />
                    Linked CMS Configurations
                  </h3>
                  {cmsConnections.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      No active CMS connections linked to this project yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cmsConnections.map((conn) => (
                        <div key={conn.id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center justify-between gap-4">
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase">
                              {conn.cmsType}
                            </span>
                            <h4 className="text-xs font-bold text-white mt-1.5">{conn.siteUrl || 'Webflow collection api'}</h4>
                            {conn.username && (
                              <span className="text-[10px] text-slate-500 block mt-0.5">Auth: {conn.username}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400">Default: <strong className="uppercase">{conn.defaultStatus}</strong></span>
                            <button
                              onClick={() => handleDeleteConnection(conn.id)}
                              className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Add Connection */}
              <div className="lg:col-span-1">
                <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Settings className="w-4 h-4 text-indigo-400" />
                    New CMS Connection
                  </h3>
                  <form onSubmit={handleAddConnection} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">CMS Engine Type</label>
                      <select
                        value={connCmsType}
                        onChange={(e) => setConnCmsType(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="WordPress">WordPress REST API</option>
                        <option value="Webflow">Webflow CMS API</option>
                        <option value="Custom">Custom webhook</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                        {connCmsType === 'Custom' ? 'Webhook Endpoint URL' : 'Site Base URL'}
                      </label>
                      <input
                        type="url"
                        required
                        placeholder={connCmsType === 'Custom' ? 'https://acme.com/webhook' : 'https://airengroup.in'}
                        value={connSiteUrl}
                        onChange={(e) => setConnSiteUrl(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700"
                      />
                    </div>

                    {connCmsType === 'WordPress' && (
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Username</label>
                        <input
                          type="text"
                          required
                          placeholder="wordpress-username"
                          value={connUsername}
                          onChange={(e) => setConnUsername(e.target.value)}
                          className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                        {connCmsType === 'WordPress' ? 'Application Password' : connCmsType === 'Webflow' ? 'API Token' : 'Webhook Secret'}
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••••••"
                        value={connApiKey}
                        onChange={(e) => setConnApiKey(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Default Publish Status</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-slate-300">
                          <input
                            type="radio"
                            name="defaultStatus"
                            value="draft"
                            checked={connDefaultStatus === 'draft'}
                            onChange={() => setConnDefaultStatus('draft')}
                          />
                          <span>Draft</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-300">
                          <input
                            type="radio"
                            name="defaultStatus"
                            value="publish"
                            checked={connDefaultStatus === 'publish'}
                            onChange={() => setConnDefaultStatus('publish')}
                          />
                          <span>Published</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={addingConnection}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {addingConnection ? 'Linking API...' : 'Link CMS Connection'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- CREATOR VIEW --- */}
      {view === 'creator' && (
        <div className="max-w-2xl mx-auto glass-panel p-8 rounded-2xl border border-slate-800 space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                AI Content Brief Creator
              </h2>
              <p className="text-xs text-slate-400 mt-1">Configure your target guidelines, and the AI will research and write an optimized SEO document outline.</p>
            </div>
            <button 
              onClick={() => setView('catalog')}
              className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateArticle} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Project Context</label>
                <select 
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full text-xs bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Website Context</label>
                <select 
                  value={selectedWebsiteId}
                  onChange={(e) => setSelectedWebsiteId(e.target.value)}
                  className="w-full text-xs bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">No Website Context</option>
                  {websites.filter(w => w.projectId === selectedProjectId).map(w => (
                    <option key={w.id} value={w.id}>{w.domain}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Target Keyword *</label>
              <input 
                type="text" 
                required
                placeholder="e.g. luxury plots in indore"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full text-xs bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Custom Title (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. Why Gated Communities in Indore Bypass Road Are the Best Long-Term Investment"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full text-xs bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Content Type</label>
                <select 
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full text-xs bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Blog">Blog Post</option>
                  <option value="Service Page">Service Page</option>
                  <option value="Landing Page">Landing Page</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Target Country</label>
                <select 
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value)}
                  className="w-full text-xs bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="India">India</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Target Language</label>
                <select 
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full text-xs bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="English">English</option>
                  <option value="English (India)">English (India)</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-opacity mt-4 shadow-lg shadow-indigo-500/10"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin text-white" />
                  <span>Researching Keywords & Generating Brief...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4.5 h-4.5 text-white" />
                  <span>Generate Article Outline & GEO Content</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* --- EDITOR VIEW --- */}
      {view === 'editor' && activeArticle && (
        <div className="space-y-6 animate-fadeIn">
          {/* Editor Sub-Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/25 p-4 border border-slate-800/40 rounded-xl">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setView('catalog');
                  setActiveArticle(null);
                }}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div>
                <input 
                  type="text" 
                  value={editorTitle}
                  onChange={(e) => setEditorTitle(e.target.value)}
                  className="bg-transparent border-none text-base font-bold text-white focus:outline-none focus:border-b focus:border-indigo-500/50 w-full"
                />
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                  <span className="font-mono">{activeArticle.keyword}</span>
                  <span>•</span>
                  <span>{activeArticle.contentType}</span>
                  <span>•</span>
                  <span>{activeArticle.targetCountry}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-[10px] text-slate-400 font-mono">
                {getWordCount(editorBody)} words
              </div>

              <button 
                onClick={() => handleSaveDraft(false)}
                disabled={saveStatus === 'saving'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                {saveStatus === 'saving' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{saveStatus === 'saved' ? 'Saved Draft!' : 'Save Draft'}</span>
              </button>

              <button 
                onClick={() => {
                  setPublishResult(null);
                  setShowPublishModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white cursor-pointer animate-pulse"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Publish to CMS</span>
              </button>

              <div className="h-6 w-px bg-slate-800" />

              <button 
                onClick={exportHtml}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>HTML</span>
              </button>

              <button 
                onClick={exportMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Markdown</span>
              </button>
            </div>
          </div>

          {/* Main Grid: Editor on Left, GenAI Panel on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Editor Container */}
            <div className="lg:col-span-2 space-y-4">
              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col min-h-[500px]">
                {/* Editor Toolbar */}
                <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-1.5 flex-wrap">
                  <button 
                    onClick={() => applyStyle('bold')}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded cursor-pointer" 
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => applyStyle('italic')}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded cursor-pointer" 
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <div className="w-px h-5 bg-slate-800 mx-1" />
                  <button 
                    onClick={() => applyStyle('formatBlock', '<h1>')}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded cursor-pointer" 
                    title="H1 Header"
                  >
                    <Heading1 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => applyStyle('formatBlock', '<h2>')}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded cursor-pointer" 
                    title="H2 Header"
                  >
                    <Heading2 className="w-4 h-4" />
                  </button>
                  <div className="w-px h-5 bg-slate-800 mx-1" />
                  <button 
                    onClick={() => applyStyle('insertUnorderedList')}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded cursor-pointer" 
                    title="Unordered List"
                  >
                    <List className="w-4 h-4" />
                  </button>

                  <div className="ml-auto flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setRegenSection('body');
                        setRegenInstruction('');
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded text-[10px] font-bold border border-purple-500/20 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Regenerate Body</span>
                    </button>
                  </div>
                </div>

                {/* Editor Content Area */}
                <div 
                  ref={editorRef}
                  contentEditable
                  onInput={(e) => setEditorBody(e.currentTarget.innerHTML)}
                  className="flex-1 p-6 text-sm text-slate-300 focus:outline-none prose prose-invert max-w-none overflow-y-auto min-h-[380px] leading-relaxed"
                  style={{ minHeight: '380px' }}
                />
              </div>

              {/* Version History Log */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Generation & Version History
                </h3>
                {historyLogs.length === 0 ? (
                  <p className="text-[11px] text-slate-500">No edits recorded for this document.</p>
                ) : (
                  <div className="space-y-3 pl-2 border-l border-slate-800">
                    {historyLogs.map((log, index) => (
                      <div key={index} className="relative pl-4">
                        <div className="absolute -left-[13px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 border border-slate-900" />
                        <span className="text-[10px] text-slate-500 block">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <p className="text-xs text-slate-300 font-medium">
                          {log.action === 'generate' ? 'Initial Article Draft Generated' : log.action === 'publish_cms' ? `Published to ${log.cmsType} (${log.status})` : `Regenerated Section: ${log.section}`}
                        </p>
                        {log.publishUrl && (
                          <a href={log.publishUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline block mt-0.5">
                            Post Link: {log.publishUrl}
                          </a>
                        )}
                        {log.instruction && log.instruction !== 'None provided' && (
                          <span className="text-[10px] text-slate-400 italic block mt-0.5">
                            Instruction: "{log.instruction}"
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Controls Area */}
            <div className="space-y-4 lg:col-span-1">
              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-fit">
                {/* Tabs Selector */}
                <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/20 text-center">
                  <button 
                    onClick={() => setEditorTab('seo')}
                    className={`py-3 text-[9px] font-bold uppercase tracking-wider border-b-2 cursor-pointer ${
                      editorTab === 'seo' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    SEO Meta
                  </button>
                  <button 
                    onClick={() => setEditorTab('structure')}
                    className={`py-3 text-[9px] font-bold uppercase tracking-wider border-b-2 cursor-pointer ${
                      editorTab === 'structure' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Structure
                  </button>
                  <button 
                    onClick={() => setEditorTab('images')}
                    className={`py-3 text-[9px] font-bold uppercase tracking-wider border-b-2 cursor-pointer ${
                      editorTab === 'images' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Images
                  </button>
                  <button 
                    onClick={() => setEditorTab('optimizations')}
                    className={`py-3 text-[9px] font-bold uppercase tracking-wider border-b-2 cursor-pointer ${
                      editorTab === 'optimizations' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    AI Engines
                  </button>
                </div>

                {/* Tab Contents */}
                <div className="p-5 space-y-4">
                  {/* SEO Metadata Tab */}
                  {editorTab === 'seo' && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-[10px] uppercase font-bold text-slate-400">H1 Header</label>
                          <button 
                            onClick={() => {
                              setRegenSection('h1');
                              setRegenInstruction('');
                            }}
                            className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold"
                          >
                            Regen H1
                          </button>
                        </div>
                        <input 
                          type="text" 
                          value={editorH1}
                          onChange={(e) => setEditorH1(e.target.value)}
                          className="w-full text-xs bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-[10px] uppercase font-bold text-slate-400">SEO Title Tag</label>
                          <button 
                            onClick={() => {
                              setRegenSection('seoTitle');
                              setRegenInstruction('');
                            }}
                            className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold"
                          >
                            Regen Title
                          </button>
                        </div>
                        <input 
                          type="text" 
                          value={editorSeoTitle}
                          onChange={(e) => setEditorSeoTitle(e.target.value)}
                          className="w-full text-xs bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Meta Description</label>
                          <button 
                            onClick={() => {
                              setRegenSection('metaDescription');
                              setRegenInstruction('');
                            }}
                            className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold"
                          >
                            Regen Desc
                          </button>
                        </div>
                        <textarea 
                          rows={4}
                          value={editorMetaDescription}
                          onChange={(e) => setEditorMetaDescription(e.target.value)}
                          className="w-full text-xs bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Structure Tab */}
                  {editorTab === 'structure' && (
                    <div className="space-y-5">
                      {/* H2 Outlines */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400">H2 Structure Outline</span>
                          <button 
                            onClick={() => {
                              setRegenSection('h2Structure');
                              setRegenInstruction('');
                            }}
                            className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold"
                          >
                            Regen Outline
                          </button>
                        </div>
                        <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5">
                          {Array.isArray(activeArticle.h2Structure) && activeArticle.h2Structure.length > 0 ? (
                            activeArticle.h2Structure.map((h2: string, idx: number) => (
                              <div key={idx} className="text-xs text-slate-300 flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500 font-mono">{idx + 1}.</span>
                                <span className="font-semibold">{h2}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-500">No outlines available.</span>
                          )}
                        </div>
                      </div>

                      {/* FAQs Section */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400">FAQ Section</span>
                          <button 
                            onClick={() => {
                              setRegenSection('faqSection');
                              setRegenInstruction('');
                            }}
                            className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold"
                          >
                            Regen FAQs
                          </button>
                        </div>
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {Array.isArray(activeArticle.faqSection) && activeArticle.faqSection.length > 0 ? (
                            activeArticle.faqSection.map((faq: any, idx: number) => (
                              <div key={idx} className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                                <span className="block text-[10px] text-indigo-400 font-semibold">Q: {faq.question}</span>
                                <span className="block text-[10px] text-slate-400">{faq.answer}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-500">No FAQ block created.</span>
                          )}
                        </div>
                      </div>

                      {/* Internal Linking Suggestions */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Internal Linking Recs</span>
                          <button 
                            onClick={() => {
                              setRegenSection('internalLinking');
                              setRegenInstruction('');
                            }}
                            className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold"
                          >
                            Regen Links
                          </button>
                        </div>
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {Array.isArray(activeArticle.internalLinking) && activeArticle.internalLinking.length > 0 ? (
                            activeArticle.internalLinking.map((rec: any, idx: number) => (
                              <div key={idx} className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                                <div className="flex items-center justify-between gap-1 text-[10px] text-slate-300">
                                  <span className="font-bold truncate">{rec.pageTitle}</span>
                                  <a href={rec.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5">
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                                <span className="block text-[9px] text-slate-500 font-mono">Anchor: "{rec.anchorText}"</span>
                                <span className="block text-[9px] text-slate-400 italic mt-0.5">Reason: {rec.recommendationReason}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-500">No suggestions generated.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image Suggestions Tab */}
                  {editorTab === 'images' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400">SEO Image Recommendations</span>
                        <span className="text-[9px] text-slate-500">3-5 Suggestions</span>
                      </div>
                      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                        {Array.isArray(activeArticle.imageSuggestions) && activeArticle.imageSuggestions.length > 0 ? (
                          activeArticle.imageSuggestions.map((img: any, idx: number) => (
                            <div key={idx} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 relative overflow-hidden">
                              <div className="absolute top-2 right-2 p-1.5 bg-slate-900 rounded-lg text-slate-500 hover:text-white cursor-pointer" title="Copy Stock Query" onClick={() => copyToClipboard(img.searchQuery)}>
                                <Copy className="w-3 h-3" />
                              </div>
                              <span className="inline-flex items-center gap-1 text-[9px] text-indigo-400 font-semibold uppercase">
                                <Image className="w-3 h-3" /> Image {idx + 1}
                              </span>
                              <div className="text-[10px] text-slate-300">
                                <strong>Alt Tag:</strong> <span className="text-slate-400">{img.alt}</span>
                              </div>
                              <div className="text-[10px] text-slate-300">
                                <strong>Filename:</strong> <span className="text-slate-400 font-mono">{img.filename}</span>
                              </div>
                              <div className="text-[10px] text-slate-300">
                                <strong>Placement:</strong> <span className="text-slate-400 italic">{img.placement}</span>
                              </div>
                              <div className="text-[10px] text-indigo-400 font-medium">
                                <strong>Stock Query:</strong> <span className="italic">"{img.searchQuery}"</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-slate-500 text-xs">
                            No image recommendations generated.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Optimizations Tab */}
                  {editorTab === 'optimizations' && (
                    <div className="space-y-4">
                      {/* GEO Block */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase font-bold text-slate-400">GEO Optimized Body Draft</label>
                          <button 
                            onClick={() => copyToClipboard(activeArticle.geoOptimizedContent || '')}
                            className="text-[9px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl max-h-[150px] overflow-y-auto text-[11px] text-slate-400 font-mono whitespace-pre-wrap">
                          {activeArticle.geoOptimizedContent || 'No GEO content generated.'}
                        </div>
                      </div>

                      {/* LLM Block */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase font-bold text-slate-400">LLM Optimized Snippets</label>
                          <button 
                            onClick={() => copyToClipboard(activeArticle.llmOptimizedContent || '')}
                            className="text-[9px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl max-h-[150px] overflow-y-auto text-[11px] text-slate-400 font-mono whitespace-pre-wrap">
                          {activeArticle.llmOptimizedContent || 'No LLM content generated.'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISHING WORKFLOW MODAL */}
      {showPublishModal && activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Share2 className="w-4.5 h-4.5 text-indigo-400" />
                Publish to connected CMS
              </h3>
              <button 
                onClick={() => setShowPublishModal(false)}
                className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>

            {cmsConnections.length === 0 ? (
              <div className="space-y-4 py-4 text-center">
                <p className="text-xs text-slate-400">You must first link a CMS connection on the homepage Connections tab before publishing.</p>
                <button
                  onClick={() => {
                    setShowPublishModal(false);
                    setCatalogTab('cms');
                    setView('catalog');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Configure CMS Connections
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Select CMS Connection</label>
                  <select
                    value={selectedConnectionId}
                    onChange={(e) => setSelectedConnectionId(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {cmsConnections.map((conn) => (
                      <option key={conn.id} value={conn.id}>{conn.cmsType} ({conn.siteUrl})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Publishing Mode</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-slate-300">
                      <input
                        type="radio"
                        name="publishStatus"
                        value="draft"
                        checked={publishStatus === 'draft'}
                        onChange={() => setPublishStatus('draft')}
                      />
                      <span>Draft post</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-300">
                      <input
                        type="radio"
                        name="publishStatus"
                        value="publish"
                        checked={publishStatus === 'publish'}
                        onChange={() => setPublishStatus('publish')}
                      />
                      <span>Live post</span>
                    </label>
                  </div>
                </div>

                {publishResult && (
                  <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                    publishResult.success 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}>
                    {publishResult.success ? (
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-bold">{publishResult.success ? 'Post Published Successfully!' : 'Publishing Failed'}</p>
                      {publishResult.url && (
                        <a 
                          href={publishResult.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="underline flex items-center gap-1 mt-1 font-semibold"
                        >
                          View post on website <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {publishResult.error && <p className="mt-0.5">{publishResult.error}</p>}
                    </div>
                  </div>
                )}

                <button
                  onClick={handlePublishToCms}
                  disabled={publishing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transmitting Post Content...</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Confirm & Publish</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section Regeneration Modal / Dialog */}
      {regenSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-purple-400" />
              Regenerate Section: {regenSection}
            </h3>
            <p className="text-xs text-slate-400">
              Provide guidance or style directives to steer the AI generator. E.g. "make the tone professional" or "add comparative references for the target country".
            </p>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Editing Instruction</label>
              <textarea 
                rows={3}
                placeholder="E.g., rewrite with an authoritative, technical tone."
                value={regenInstruction}
                onChange={(e) => setRegenInstruction(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none placeholder-slate-700"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setRegenSection(null)}
                className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleRegenerateSection}
                disabled={isRegeneratingSection}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                {isRegeneratingSection ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Regenerating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
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
