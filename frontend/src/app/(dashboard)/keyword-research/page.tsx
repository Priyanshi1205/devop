'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { 
  Plus, 
  Search, 
  Tag, 
  Database, 
  BarChart2, 
  Filter, 
  Loader2, 
  Trash2, 
  Sparkles,
  Info,
  ArrowRight,
  ExternalLink,
  Layers,
  TrendingUp,
  FolderSync,
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';

interface KeywordItem {
  id: string;
  text: string;
  volume: number;
  difficulty: number;
  cpc: number;
  intent: string | null;
  opportunityScore: number | null;
  serpData: any;
  seed?: string | null;
  gscRank?: number | null;
  cluster?: {
    name: string;
    siloName: string | null;
  } | null;
}

interface ClusterItem {
  id: string;
  name: string;
  siloName: string | null;
  keywords: KeywordItem[];
}

interface RankTrackerItem {
  id: string;
  text: string;
  currentRank: number | null;
  previousRank: number | null;
  change: number | null;
  history: { date: string; position: number }[];
}

export default function KeywordResearchPage() {
  const currentWebsite = useStore((state) => state.currentWebsite);
  const token = useStore((state) => state.token);

  const [mounted, setMounted] = useState(false);
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  
  // Forms & Actions
  const [seedKeyword, setSeedKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'clusters' | 'silos' | 'rank-tracker'>('list');

  const [discoveryMode, setDiscoveryMode] = useState<'manual' | 'ai'>('manual');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestedSeeds, setSuggestedSeeds] = useState<string[]>([]);
  const [selectedSeeds, setSelectedSeeds] = useState<string[]>([]);
  const [expandedSeeds, setExpandedSeeds] = useState<Record<string, boolean>>({});

  const toggleSeedExpand = (seed: string) => {
    setExpandedSeeds(prev => ({
      ...prev,
      [seed]: prev[seed] === false ? true : false
    }));
  };

  // Manual Add Form
  const [newKeyword, setNewKeyword] = useState('');
  const [volume, setVolume] = useState('1000');
  const [difficulty, setDifficulty] = useState('30');
  const [cpc, setCpc] = useState('1.50');
  const [showForm, setShowForm] = useState(false);
  
  // Loading & Selection
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSerpKw, setSelectedSerpKw] = useState<KeywordItem | null>(null);

  // Rank Tracker state
  const [rankTrackerData, setRankTrackerData] = useState<RankTrackerItem[]>([]);
  const [rankTrackerLoading, setRankTrackerLoading] = useState(false);
  const [selectedHistoryKw, setSelectedHistoryKw] = useState<RankTrackerItem | null>(null);
  const [syncingGsc, setSyncingGsc] = useState(false);
  const [sortBy, setSortBy] = useState<'opportunity' | 'gscRank'>('opportunity');

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchKeywordsAndClusters = async () => {
    if (!currentWebsite) {
      setKeywords([]);
      setClusters([]);
      setLoading(false);
      return;
    }
    const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!token || token === 'mock-jwt-token-xyz' || !isUuid(currentWebsite.id)) {
      // Offline fallback seeds
      setKeywords(getMockKeywords());
      setClusters(getMockClusters());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 1. Fetch Keywords
      const kwRes = await fetch(`/api/websites/${currentWebsite.id}/keywords`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (kwRes.ok) {
        const kwData = await kwRes.json();
        setKeywords(kwData);
      }

      // 2. Fetch Clusters
      const clRes = await fetch(`/api/websites/${currentWebsite.id}/keywords/clusters`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (clRes.ok) {
        const clData = await clRes.json();
        setClusters(clData);
      }
    } catch (err) {
      console.error('Error fetching keywords:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRankTrackerData = async () => {
    if (!currentWebsite) {
      setRankTrackerData([]);
      return;
    }
    const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!token || token === 'mock-jwt-token-xyz' || !isUuid(currentWebsite.id)) {
      const mockData = getMockRankTrackerData();
      setRankTrackerData(mockData);
      if (mockData.length > 0) {
        setSelectedHistoryKw(mockData[0]);
      }
      return;
    }

    try {
      setRankTrackerLoading(true);
      const res = await fetch(`/api/websites/${currentWebsite.id}/keywords/rank-tracker`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRankTrackerData(data);
        if (data.length > 0) {
          setSelectedHistoryKw(data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching rank tracker data:', err);
    } finally {
      setRankTrackerLoading(false);
    }
  };

  const handleTriggerGscSync = async () => {
    if (!currentWebsite || !token) return;
    
    const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (token === 'mock-jwt-token-xyz' || !isUuid(currentWebsite.id)) {
      setSyncingGsc(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSyncingGsc(false);
      alert('Mock GSC sync triggered successfully! Fresh rankings calculated.');
      fetchKeywordsAndClusters();
      if (activeTab === 'rank-tracker') {
        fetchRankTrackerData();
      }
      return;
    }

    try {
      setSyncingGsc(true);
      const res = await fetch(`/api/websites/${currentWebsite.id}/sync/gsc`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('GSC Sync triggered successfully!');
        fetchKeywordsAndClusters();
        if (activeTab === 'rank-tracker') {
          fetchRankTrackerData();
        }
      } else {
        alert('Failed to sync Search Console data.');
      }
    } catch (err) {
      console.error(err);
      alert('Error triggering GSC sync.');
    } finally {
      setSyncingGsc(false);
    }
  };

  const handleExportCsv = async () => {
    if (!currentWebsite) return;
    
    const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!token || token === 'mock-jwt-token-xyz' || !isUuid(currentWebsite.id)) {
      const data = getMockRankTrackerData();
      let csvContent = 'Keyword,Current Rank (GSC),Previous Rank (GSC),Rank Change\n';
      for (const item of data) {
        const kwText = `"${item.text.replace(/"/g, '""')}"`;
        const currentRank = item.currentRank !== null ? item.currentRank : 'N/A';
        const previousRank = item.previousRank !== null ? item.previousRank : 'N/A';
        let change = 'N/A';
        if (item.change !== null) {
          change = item.change > 0 ? `+${item.change}` : `${item.change}`;
        }
        csvContent += `${kwText},${currentRank},${previousRank},${change}\n`;
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `rank-tracker-mock-${currentWebsite.id}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    try {
      const res = await fetch(`/api/websites/${currentWebsite.id}/keywords/rank-tracker/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const text = await res.text();
        const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `rank-tracker-${currentWebsite.domain || currentWebsite.id}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Failed to export CSV rank data');
      }
    } catch (err) {
      console.error(err);
      alert('Error exporting CSV.');
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchKeywordsAndClusters();
      if (activeTab === 'rank-tracker') {
        fetchRankTrackerData();
      }
    }
  }, [currentWebsite?.id, token, activeTab, mounted]);

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seedKeyword || !currentWebsite || !token) return;

    setSearching(true);
    try {
      const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
      
      if (token === 'mock-jwt-token-xyz' || !isUuid(currentWebsite.id)) {
        // Simulated response delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        alert('Seed keyword processed in Local Development Mode!');
        
        // Split seeds and generate mock variations for each
        const seeds = seedKeyword.split(',').map(s => s.trim()).filter(Boolean);
        const newMockKeywords: KeywordItem[] = [];
        seeds.forEach(seed => {
          const variations = [
            seed,
            `best ${seed}`,
            `${seed} price`,
            `top ${seed} reviews`
          ];
          variations.forEach(text => {
            newMockKeywords.push({
              id: `mock-kw-${Math.random()}`,
              text,
              volume: Math.floor(Math.random() * 2000) + 100,
              difficulty: Math.floor(Math.random() * 70) + 20,
              cpc: parseFloat((Math.random() * 3.5 + 0.5).toFixed(2)),
              intent: Math.random() > 0.5 ? 'commercial' : 'informational',
              opportunityScore: Math.floor(Math.random() * 800) + 100,
              serpData: [],
              seed: seed,
              cluster: { name: 'TOPIC CLUSTER', siloName: 'General Silo' }
            });
          });
        });
        
        setKeywords(prev => [...newMockKeywords, ...prev]);
        setSeedKeyword('');
        return;
      }

      const res = await fetch(`/api/websites/${currentWebsite.id}/keywords/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ keyword: seedKeyword })
      });

      if (res.ok) {
        await fetchKeywordsAndClusters();
        setSeedKeyword('');
      } else {
        alert('Keyword research discovery failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to Keyword Research API.');
    } finally {
      setSearching(false);
    }
  };

  const handleAiSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt || !currentWebsite || !token) return;

    setAiLoading(true);
    try {
      const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
      if (token === 'mock-jwt-token-xyz' || !isUuid(currentWebsite.id)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        let seeds = [
          'real estate company in indore',
          'luxury plots in indore',
          'premium villas in indore',
          'best property broker in indore'
        ];
        if (aiPrompt.toLowerCase().includes('boot') || aiPrompt.toLowerCase().includes('hiking') || aiPrompt.toLowerCase().includes('shoe')) {
          seeds = [
            'best hiking boots',
            'waterproof outdoor shoes',
            'trail running gear',
            'durable footwear reviews'
          ];
        }
        setSuggestedSeeds(seeds);
        setSelectedSeeds(seeds);
        return;
      }

      const res = await fetch(`/api/websites/${currentWebsite.id}/keywords/ai-suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestedSeeds(data.seeds || []);
        setSelectedSeeds(data.seeds || []);
      } else {
        alert('AI suggestion generation failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to AI Suggestion API.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDiscoverSelectedSeeds = async () => {
    if (selectedSeeds.length === 0 || !currentWebsite || !token) return;

    setSearching(true);
    try {
      const seedsQuery = selectedSeeds.join(', ');
      const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
      
      if (token === 'mock-jwt-token-xyz' || !isUuid(currentWebsite.id)) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        alert('Seeds processed in Local Development Mode!');
        
        const newMockKeywords: KeywordItem[] = [];
        selectedSeeds.forEach(seed => {
          const variations = [
            seed,
            `best ${seed}`,
            `${seed} price`,
            `top ${seed} reviews`
          ];
          variations.forEach(text => {
            newMockKeywords.push({
              id: `mock-kw-${Math.random()}`,
              text,
              volume: Math.floor(Math.random() * 2000) + 100,
              difficulty: Math.floor(Math.random() * 70) + 20,
              cpc: parseFloat((Math.random() * 3.5 + 0.5).toFixed(2)),
              intent: Math.random() > 0.5 ? 'commercial' : 'informational',
              opportunityScore: Math.floor(Math.random() * 800) + 100,
              serpData: [],
              seed: seed,
              cluster: { name: 'TOPIC CLUSTER', siloName: 'General Silo' }
            });
          });
        });
        
        setKeywords(prev => [...newMockKeywords, ...prev]);
        setSuggestedSeeds([]);
        setSelectedSeeds([]);
        setAiPrompt('');
        return;
      }

      const res = await fetch(`/api/websites/${currentWebsite.id}/keywords/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ keyword: seedsQuery })
      });

      if (res.ok) {
        await fetchKeywordsAndClusters();
        setSuggestedSeeds([]);
        setSelectedSeeds([]);
        setAiPrompt('');
      } else {
        alert('Keyword discovery failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to Keyword Discovery API.');
    } finally {
      setSearching(false);
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword || !currentWebsite || !token) return;

    setSaving(true);
    try {
      const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
      if (token === 'mock-jwt-token-xyz' || !isUuid(currentWebsite.id)) {
        const item: KeywordItem = {
          id: `kw-${Math.random()}`,
          text: newKeyword,
          volume: parseInt(volume) || 0,
          difficulty: parseInt(difficulty) || 0,
          cpc: parseFloat(cpc) || 0.0,
          intent: 'informational',
          opportunityScore: Math.round((parseInt(volume) * (100 - parseInt(difficulty))) / 100),
          serpData: [],
          cluster: { name: 'GENERAL', siloName: 'General Silo' }
        };
        setKeywords(prev => [item, ...prev]);
        setNewKeyword('');
        setShowForm(false);
        return;
      }

      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          websiteId: currentWebsite.id,
          text: newKeyword,
          volume: parseInt(volume) || 0,
          difficulty: parseInt(difficulty) || 0,
          cpc: parseFloat(cpc) || 0.00
        })
      });

      if (res.ok) {
        await fetchKeywordsAndClusters();
        setNewKeyword('');
        setShowForm(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Stop tracking this keyword?')) return;
    if (token === 'mock-jwt-token-xyz') {
      setKeywords(prev => prev.filter(k => k.id !== id));
      return;
    }
    try {
      const res = await fetch(`/api/keywords/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setKeywords(prev => prev.filter(k => k.id !== id));
        fetchKeywordsAndClusters();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getDifficultyColor = (diff: number) => {
    if (diff < 35) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (diff < 65) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const getIntentColor = (intent: string | null) => {
    const val = intent?.toLowerCase() || 'informational';
    if (val === 'transactional') return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    if (val === 'commercial') return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
    if (val === 'navigational') return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
    return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
  };

  const getOpportunityColor = (score: number | null) => {
    const val = score || 0;
    if (val > 600) return 'text-emerald-400 font-extrabold';
    if (val > 200) return 'text-indigo-400 font-bold';
    return 'text-slate-400';
  };

  const getMockKeywords = (): KeywordItem[] => [
    { id: '1', text: 'best winter boots', volume: 2400, difficulty: 45, cpc: 1.80, intent: 'commercial', opportunityScore: 1320, serpData: getMockSerp('best winter boots'), seed: 'winter boots', gscRank: 12.4, cluster: { name: 'WINTER BOOTS', siloName: 'Products & Commercial Silo' } },
    { id: '2', text: 'buy waterproof boots', volume: 1800, difficulty: 60, cpc: 2.50, intent: 'transactional', opportunityScore: 720, serpData: getMockSerp('buy waterproof boots'), seed: 'winter boots', gscRank: 24.2, cluster: { name: 'WATERPROOF BOOTS', siloName: 'Products & Commercial Silo' } },
    { id: '3', text: 'how to clean hiking gear', volume: 900, difficulty: 25, cpc: 0.40, intent: 'informational', opportunityScore: 675, serpData: getMockSerp('how to clean hiking gear'), seed: 'hiking gear', gscRank: 4.1, cluster: { name: 'HIKING GEAR', siloName: 'Pillar & Informational Silo' } },
    { id: '4', text: 'hiking boots vs trail running shoes', volume: 500, difficulty: 30, cpc: 1.10, intent: 'commercial', opportunityScore: 350, serpData: getMockSerp('hiking boots vs trail running shoes'), seed: 'hiking gear', gscRank: 8.3, cluster: { name: 'BOOTS VS SHOES', siloName: 'Topic Guides & Research Silo' } },
    { id: '5', text: 'cheap leather boots near me', volume: 300, difficulty: 55, cpc: 1.60, intent: 'transactional', opportunityScore: 135, serpData: getMockSerp('cheap leather boots near me'), seed: 'leather boots', gscRank: 42.0, cluster: { name: 'LEATHER BOOTS', siloName: 'Products & Commercial Silo' } }
  ];

  const getMockClusters = (): ClusterItem[] => [
    {
      id: 'c-1',
      name: 'WINTER BOOTS',
      siloName: 'Products & Commercial Silo',
      keywords: [
        { id: '1', text: 'best winter boots', volume: 2400, difficulty: 45, cpc: 1.80, intent: 'commercial', opportunityScore: 1320, serpData: [], cluster: null }
      ]
    },
    {
      id: 'c-2',
      name: 'HIKING GEAR',
      siloName: 'Pillar & Informational Silo',
      keywords: [
        { id: '3', text: 'how to clean hiking gear', volume: 900, difficulty: 25, cpc: 0.40, intent: 'informational', opportunityScore: 675, serpData: [], cluster: null }
      ]
    }
  ];

  const getMockSerp = (kw: string) => [
    { rank: 1, url: `https://www.outdoorgearlab.com/${kw.replace(/\s+/g, '-')}`, title: `Best Top Guide for ${kw} reviewed`, domainAuthority: 88 },
    { rank: 2, url: `https://www.amazon.com/s?k=${kw.replace(/\s+/g, '+')}`, title: `Shop online for ${kw}`, domainAuthority: 95 },
    { rank: 3, url: `https://www.reddit.com/r/hiking`, title: `Reddit discussion on ${kw}`, domainAuthority: 91 },
    { rank: 4, url: `https://www.backlinko.com`, title: `SEO analysis of ${kw}`, domainAuthority: 84 }
  ];

  const getMockRankTrackerData = (): RankTrackerItem[] => {
    const keywordsList = [
      { text: 'best winter boots', baseRank: 12 },
      { text: 'buy waterproof boots', baseRank: 24 },
      { text: 'how to clean hiking gear', baseRank: 4 },
      { text: 'hiking boots vs trail running shoes', baseRank: 8 },
      { text: 'cheap leather boots near me', baseRank: 42 }
    ];

    return keywordsList.map((kw, idx) => {
      const history = [];
      const now = Date.now();
      
      // Let's generate 90 daily snapshots
      for (let i = 90; i >= 0; i--) {
        const dateStr = new Date(now - i * 24 * 3600 * 1000).toISOString().split('T')[0];
        
        // Random walk for ranking
        const change = (Math.sin(i / 5) * 2) + ((idx % 2 === 0 ? 1 : -1) * (i / 15)) + (Math.random() * 2 - 1);
        const position = Math.max(1, Math.min(100, parseFloat((kw.baseRank + change).toFixed(1))));
        history.push({ date: dateStr, position });
      }

      const latestAvg = parseFloat((history.slice(-7).reduce((sum, s) => sum + s.position, 0) / 7).toFixed(1));
      const prevAvg = parseFloat((history.slice(-14, -7).reduce((sum, s) => sum + s.position, 0) / 7).toFixed(1));
      const rankChange = parseFloat((prevAvg - latestAvg).toFixed(1));

      return {
        id: `mock-rt-${idx}`,
        text: kw.text,
        currentRank: latestAvg,
        previousRank: prevAvg,
        change: rankChange,
        history
      };
    });
  };

  // Silos classification
  const silos: Record<string, ClusterItem[]> = {};
  clusters.forEach(c => {
    const silo = c.siloName || 'General Silo';
    if (!silos[silo]) {
      silos[silo] = [];
    }
    silos[silo].push(c);
  });

  // Sort keywords
  const sortedKeywords = [...keywords].sort((a, b) => {
    if (sortBy === 'gscRank') {
      const aRank = a.gscRank !== undefined && a.gscRank !== null ? a.gscRank : 999;
      const bRank = b.gscRank !== undefined && b.gscRank !== null ? b.gscRank : 999;
      if (aRank !== bRank) return aRank - bRank;
      return (b.opportunityScore || 0) - (a.opportunityScore || 0); // fallback
    } else {
      return (b.opportunityScore || 0) - (a.opportunityScore || 0);
    }
  });

  // Group keywords by seed keyword
  const groupedKeywords: Record<string, KeywordItem[]> = {};
  sortedKeywords.forEach((kw) => {
    const seed = kw.seed || 'Manual / Others';
    if (!groupedKeywords[seed]) {
      groupedKeywords[seed] = [];
    }
    groupedKeywords[seed].push(kw);
  });

  const maxOpportunity = keywords.length > 0 
    ? Math.max(...keywords.map(k => k.opportunityScore || 0)) 
    : 0;

  const avgCpc = keywords.length > 0 
    ? keywords.reduce((sum, k) => sum + Number(k.cpc), 0) / keywords.length 
    : 0;

  const avgDiff = keywords.length > 0 
    ? keywords.reduce((sum, k) => sum + (k.difficulty || 0), 0) / keywords.length 
    : 0;

  if (!mounted) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Campaign Metrics</span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">Keyword Research</h1>
            <p className="text-sm text-slate-400 mt-1">Loading keyword metrics studio...</p>
          </div>
        </div>
        <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <span className="text-sm text-slate-400 font-semibold">Loading keyword console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/40 pb-5">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Campaign Keyword Studio</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">Enterprise Keyword Research</h1>
          <p className="text-sm text-slate-400 mt-1">
            Discover traffic ideas, detect intent groups, build semantic content silos, and target high-opportunity keywords for <span className="text-slate-200 font-semibold">{currentWebsite?.domain || 'your domain'}</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerGscSync}
            disabled={syncingGsc}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0d1222]/80 border border-slate-850 hover:border-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-all disabled:opacity-50"
          >
            {syncingGsc ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin text-indigo-400" />
            ) : (
              <FolderSync className="w-4.5 h-4.5 text-indigo-400" />
            )}
            <span>Sync Search Console</span>
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0d1222]/80 border border-slate-850 hover:border-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Keyword</span>
          </button>
        </div>
      </div>

      {/* Discovery Search Bar */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Seed Keyword Discovery Engine
            </h3>
            <p className="text-[11px] text-slate-500">Query DataForSEO database to pull related ideas, search difficulty, and organic SERPs</p>
          </div>
          
          {/* Discovery Mode Switcher */}
          <div className="flex bg-slate-950/80 border border-slate-850 p-1 rounded-xl">
            <button
              onClick={() => setDiscoveryMode('manual')}
              className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                discoveryMode === 'manual' 
                  ? 'bg-indigo-500 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-3 h-3" />
              <span>Search Seeds</span>
            </button>
            <button
              onClick={() => setDiscoveryMode('ai')}
              className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                discoveryMode === 'ai' 
                  ? 'bg-indigo-500 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>AI Prompt Mode</span>
            </button>
          </div>
        </div>

        {discoveryMode === 'manual' ? (
          <form onSubmit={handleDiscover} className="flex gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={seedKeyword}
                onChange={(e) => setSeedKeyword(e.target.value)}
                placeholder="Enter seed terms (comma-separated, e.g. hiking gear, custom boots)..."
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button 
              type="submit" 
              disabled={searching}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors shadow-lg"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Discover Ideas</span>
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handleAiSuggest} className="flex gap-3 max-w-2xl">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe what you're looking for (e.g. real estate website in Indore targeting luxury buyers)..."
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button 
                type="submit" 
                disabled={aiLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors"
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Generate Seeds</span>
              </button>
            </form>

            {suggestedSeeds.length > 0 && (
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3 max-w-2xl animate-fadeIn">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI Suggested Seed Keywords:</span>
                  <span className="text-[9px] text-slate-550">{selectedSeeds.length} of {suggestedSeeds.length} selected</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedSeeds.map(seed => {
                    const isSelected = selectedSeeds.includes(seed);
                    return (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSeeds(prev => prev.filter(s => s !== seed));
                          } else {
                            setSelectedSeeds(prev => [...prev, seed]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' 
                            : 'bg-slate-900/60 border-slate-850 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {seed}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-850/60">
                  <button
                    onClick={handleDiscoverSelectedSeeds}
                    disabled={selectedSeeds.length === 0 || searching}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-all cursor-pointer shadow-md"
                  >
                    {searching ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Discover Variations & Clusters</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Form Popup */}
      {showForm && (
        <form onSubmit={handleAddManual} className="glass-panel p-6 rounded-2xl border border-slate-850 space-y-4 max-w-md animate-fadeIn">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Track Manual Keyword</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Keyword Phrase</label>
              <input 
                type="text" 
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="e.g. leather hiking boots"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1.5">Volume</label>
                <input 
                  type="number" 
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1.5">Diff (0-100)</label>
                <input 
                  type="number" 
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1.5">CPC ($)</label>
                <input 
                  type="text" 
                  value={cpc}
                  onChange={(e) => setCpc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button 
              type="submit" 
              disabled={saving}
              className="px-3.5 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Save Term
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3.5 py-2 bg-slate-900 border border-slate-850 text-slate-400 text-xs font-bold rounded-xl cursor-pointer">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Tracked Keywords</span>
            <h3 className="text-xl font-bold text-white font-mono mt-0.5">{keywords.length}</h3>
          </div>
          <Tag className="w-7 h-7 text-indigo-400 opacity-60" />
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Max Opportunity</span>
            <h3 className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{maxOpportunity}</h3>
          </div>
          <TrendingUp className="w-7 h-7 text-emerald-400 opacity-60" />
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Avg CPC Value</span>
            <h3 className="text-xl font-bold text-white font-mono mt-0.5">${avgCpc.toFixed(2)}</h3>
          </div>
          <Database className="w-7 h-7 text-sky-400 opacity-60" />
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Avg Difficulty</span>
            <h3 className="text-xl font-bold text-white font-mono mt-0.5">{avgDiff.toFixed(1)}%</h3>
          </div>
          <BarChart2 className="w-7 h-7 text-pink-400 opacity-60" />
        </div>
      </div>

      {/* Segmented Controls / Tabs */}
      <div className="flex gap-2.5 border-b border-slate-850 pb-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'list' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Discovered Keywords
        </button>
        <button
          onClick={() => setActiveTab('rank-tracker')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'rank-tracker' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Rank Tracker
        </button>
        <button
          onClick={() => setActiveTab('clusters')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'clusters' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Semantic Topic Clusters
        </button>
        <button
          onClick={() => setActiveTab('silos')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'silos' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Content Silos Layout
        </button>
      </div>

      {/* Main Content Areas */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : keywords.length === 0 ? (
        <div className="glass-panel p-10 text-center rounded-2xl border border-slate-800 text-slate-500 text-xs">
          No keywords tracked. Enter a seed keyword in the Discovery search bar to get started!
        </div>
      ) : (
        <div className="animate-fadeIn">
          
          {/* TAB 1: Keywords Table Grouped by Seed */}
          {activeTab === 'list' && (
            <div className="space-y-6 animate-fadeIn">
              {Object.entries(groupedKeywords).map(([seedName, list]) => {
                const isExpanded = expandedSeeds[seedName] !== false;
                
                // Calculate metrics for this seed group
                const groupAvgDiff = list.reduce((sum, k) => sum + (k.difficulty || 0), 0) / list.length;
                const groupAvgCpc = list.reduce((sum, k) => sum + Number(k.cpc), 0) / list.length;
                const groupMaxOpp = Math.max(...list.map(k => k.opportunityScore || 0));

                return (
                  <div key={seedName} className="glass-panel rounded-2xl border border-slate-800 overflow-hidden transition-all">
                    {/* Header */}
                    <div 
                      onClick={() => toggleSeedExpand(seedName)}
                      className="px-6 py-4 bg-slate-900/40 hover:bg-slate-900/60 border-b border-slate-850 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 cursor-pointer select-none transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white uppercase tracking-wide font-mono flex items-center gap-2">
                            {seedName}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                            Source Seed Topic • {list.length} Variations
                          </span>
                        </div>
                      </div>

                      {/* Group metrics in header */}
                      <div className="flex items-center gap-6 self-stretch md:self-auto justify-between border-t border-slate-800/40 md:border-t-0 pt-2.5 md:pt-0">
                        <div className="flex gap-4 text-[10px] font-semibold text-slate-400">
                          <div>
                            <span className="text-slate-550 block text-[9px] uppercase font-bold">Max Opportunity</span>
                            <span className="text-emerald-400 font-mono font-bold">{groupMaxOpp}</span>
                          </div>
                          <div>
                            <span className="text-slate-550 block text-[9px] uppercase font-bold">Avg Difficulty</span>
                            <span className="text-white font-mono">{groupAvgDiff.toFixed(0)}%</span>
                          </div>
                          <div>
                            <span className="text-slate-550 block text-[9px] uppercase font-bold">Avg CPC</span>
                            <span className="text-white font-mono">${groupAvgCpc.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="text-slate-400 p-1 hover:text-white rounded-lg bg-slate-950/40 border border-slate-850/50">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Table Body (collapsible) */}
                    {isExpanded && (
                      <div className="overflow-x-auto animate-fadeIn">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800/60 text-slate-500 font-semibold bg-slate-900/10">
                               <th className="px-6 py-3.5">Keyword Phrase</th>
                               <th className="px-6 py-3.5">Intent</th>
                               <th 
                                 onClick={() => setSortBy('opportunity')}
                                 className={`px-6 py-3.5 cursor-pointer hover:text-white select-none flex items-center gap-1 ${sortBy === 'opportunity' ? 'text-indigo-400 font-bold' : ''}`}
                               >
                                 <span>Opportunity</span>
                                 {sortBy === 'opportunity' && <ChevronDown className="w-3.5 h-3.5" />}
                               </th>
                               <th className="px-6 py-3.5">Monthly Vol</th>
                               <th className="px-6 py-3.5">Difficulty</th>
                               <th className="px-6 py-3.5">CPC ($)</th>
                               <th 
                                 onClick={() => setSortBy('gscRank')}
                                 className={`px-6 py-3.5 cursor-pointer hover:text-white select-none flex items-center gap-1 ${sortBy === 'gscRank' ? 'text-indigo-400 font-bold' : ''}`}
                               >
                                 <span>GSC Rank</span>
                                 {sortBy === 'gscRank' && <ChevronUp className="w-3.5 h-3.5" />}
                               </th>
                               <th className="px-6 py-3.5">Cluster Group</th>
                               <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40 text-slate-350 font-medium">
                            {list.map((kw) => (
                              <tr key={kw.id} className="hover:bg-slate-900/10 transition-colors">
                                <td className="px-6 py-4 font-semibold text-white">{kw.text}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase ${getIntentColor(kw.intent)}`}>
                                    {kw.intent || 'informational'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono">
                                  <span className={getOpportunityColor(kw.opportunityScore)}>
                                    {kw.opportunityScore || 0}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono">{kw.volume.toLocaleString()}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getDifficultyColor(kw.difficulty)}`}>
                                    {kw.difficulty}%
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono">${Number(kw.cpc).toFixed(2)}</td>
                                <td className="px-6 py-4 font-mono">
                                  {kw.gscRank !== undefined && kw.gscRank !== null ? (
                                    <div className="flex flex-col gap-1">
                                      <span className="text-indigo-400 font-bold">#{kw.gscRank.toFixed(1)}</span>
                                      {kw.gscRank >= 4 && kw.gscRank <= 10 && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 uppercase w-max">
                                          Quick Win
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-550 font-semibold italic">Not ranking yet</span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 border border-slate-850 text-indigo-400">
                                    {kw.cluster?.name || 'General'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                  <button 
                                    onClick={() => setSelectedSerpKw(kw)}
                                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                                  >
                                    <span>SERP</span>
                                    <ExternalLink className="w-3 h-3 text-slate-500" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(kw.id)}
                                    className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/5 cursor-pointer"
                                    title="Delete Keyword"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: Semantic Topic Clusters */}
          {activeTab === 'clusters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clusters.map((cluster) => (
                <div key={cluster.id} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="border-b border-slate-850 pb-2 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">{cluster.name}</h4>
                      <span className="text-[10px] text-slate-500 font-semibold">Silo: {cluster.siloName || 'General Silo'}</span>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      {cluster.keywords.length} keywords
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {cluster.keywords.map((kw) => (
                      <div key={kw.id} className="flex justify-between items-center text-xs p-2.5 bg-slate-950/40 border border-slate-900 rounded-xl hover:border-slate-800 transition-colors">
                        <div>
                          <span className="font-semibold text-white block">{kw.text}</span>
                          <span className="text-[9px] text-slate-500 font-medium block mt-0.5">Vol: {kw.volume.toLocaleString()} • Difficulty: {kw.difficulty}%</span>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div className="font-mono text-right">
                            <span className="text-[9px] text-slate-500 uppercase block font-bold">Opportunity</span>
                            <span className={`text-[11px] block font-bold ${getOpportunityColor(kw.opportunityScore)}`}>
                              {kw.opportunityScore || 0}
                            </span>
                          </div>
                          <button 
                            onClick={() => setSelectedSerpKw(kw)}
                            className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg hover:border-slate-700 cursor-pointer"
                            title="SERP Analysis"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Content Silos Layout */}
          {activeTab === 'silos' && (
            <div className="space-y-6">
              {Object.entries(silos).map(([siloName, clusterList]) => (
                <div key={siloName} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
                    <Layers className="w-4.5 h-4.5 text-indigo-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">{siloName}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {clusterList.map((cluster) => (
                      <div key={cluster.id} className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-3">
                        <span className="block text-[10px] font-bold text-indigo-300 tracking-wider font-mono">{cluster.name}</span>
                        <div className="space-y-2">
                          {cluster.keywords.map((kw) => (
                            <div key={kw.id} className="flex justify-between items-center text-[11px] p-2 bg-slate-950/80 border border-slate-900 rounded-lg">
                              <span className="text-slate-300 font-semibold truncate max-w-[130px]" title={kw.text}>{kw.text}</span>
                              <span className={`font-mono font-bold ${getOpportunityColor(kw.opportunityScore)}`}>
                                {kw.opportunityScore || 0}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: GSC Rank Tracker */}
          {activeTab === 'rank-tracker' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/30 border border-slate-850 p-5 rounded-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    Google Search Console Ranking Tracker
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Monitor keyword performance trends directly using organic query metrics from your connected GSC property.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportCsv}
                    className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-350 hover:text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4 text-indigo-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {rankTrackerLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
              ) : rankTrackerData.length === 0 ? (
                <div className="glass-panel p-10 text-center rounded-2xl border border-slate-800 text-slate-500 text-xs">
                  No GSC ranking snapshots found. Click "Sync Search Console" in the header to pull rankings.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Panel: Top 20 keywords */}
                  <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-850 bg-slate-950/20">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Top Discovered Rankings</span>
                    </div>
                    <div className="divide-y divide-slate-850/60 overflow-y-auto max-h-[500px]">
                      {rankTrackerData.slice(0, 20).map((item) => {
                        const isSelected = selectedHistoryKw?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedHistoryKw(item)}
                            className={`p-4 flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-500/10 border-l-2 border-indigo-500'
                                : 'hover:bg-slate-900/20 border-l-2 border-transparent'
                            }`}
                          >
                            <div className="space-y-1">
                              <span className={`text-xs font-bold block ${isSelected ? 'text-indigo-300' : 'text-white'}`}>
                                {item.text}
                              </span>
                              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                                <span>Prev: #{item.previousRank !== null ? item.previousRank.toFixed(1) : '—'}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-slate-500 block text-[8px] uppercase font-semibold">Current Rank</span>
                                <span className="font-mono text-xs font-bold text-white">
                                  #{item.currentRank !== null ? item.currentRank.toFixed(1) : '—'}
                                </span>
                              </div>

                              {item.change !== null ? (
                                <span
                                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.change > 0
                                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                      : item.change < 0
                                      ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                                      : 'text-slate-400 bg-slate-500/10 border border-slate-500/20'
                                  }`}
                                >
                                  {item.change > 0 ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : item.change < 0 ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    '—'
                                  )}
                                  {item.change !== 0 ? Math.abs(item.change).toFixed(1) : ''}
                                </span>
                              ) : (
                                <span className="text-slate-600 font-bold text-xs px-2">—</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Panel: Chart */}
                  <div className="lg:col-span-7 space-y-6">
                    {selectedHistoryKw ? (
                      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-850 pb-4">
                          <div>
                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Position History</span>
                            <h4 className="text-sm font-extrabold text-white mt-0.5 font-mono">
                              {selectedHistoryKw.text}
                            </h4>
                          </div>
                          <div className="flex gap-4 text-xs font-mono">
                            <div className="bg-slate-950/40 border border-slate-850/60 p-2 rounded-xl text-center min-w-[70px]">
                              <span className="text-[9px] text-slate-500 uppercase block font-semibold">Latest Rank</span>
                              <span className="font-bold text-white block mt-0.5">
                                #{selectedHistoryKw.currentRank !== null ? selectedHistoryKw.currentRank.toFixed(1) : '—'}
                              </span>
                            </div>
                            <div className="bg-slate-950/40 border border-slate-850/60 p-2 rounded-xl text-center min-w-[70px]">
                              <span className="text-[9px] text-slate-550 uppercase block font-semibold">90d High</span>
                              <span className="font-bold text-emerald-400 block mt-0.5">
                                #{Math.min(...selectedHistoryKw.history.map(h => h.position)).toFixed(1)}
                              </span>
                            </div>
                            <div className="bg-slate-950/40 border border-slate-850/60 p-2 rounded-xl text-center min-w-[70px]">
                              <span className="text-[9px] text-slate-550 uppercase block font-semibold">90d Low</span>
                              <span className="font-bold text-rose-450 block mt-0.5">
                                #{Math.max(...selectedHistoryKw.history.map(h => h.position)).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Inverted Chart */}
                        <div className="h-72">
                          <RankHistoryChart history={selectedHistoryKw.history} />
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-slate-500 justify-end">
                          <Info className="w-3.5 h-3.5" />
                          <span>Graph is inverted: position #1 is at the top. Data derived from Google Search Console queries.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-panel p-10 text-center rounded-2xl border border-slate-800 text-slate-500 text-xs h-full flex flex-col items-center justify-center">
                        Select a keyword from the list to view its position history.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* SERP Analysis Drawer Modal */}
      {selectedSerpKw && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl animate-slideLeft">
            
            <div className="space-y-5 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-850 pb-4">
                <div>
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">SERP Inspector</span>
                  <h3 className="text-sm font-extrabold text-white uppercase truncate max-w-[300px] mt-0.5 font-mono" title={selectedSerpKw.text}>
                    {selectedSerpKw.text}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedSerpKw(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-900 p-1.5 rounded-xl cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Keyword Stats summary in Drawer */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950/50 border border-slate-850 rounded-xl text-center text-xs">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Volume</span>
                  <span className="font-mono text-white font-bold block mt-0.5">{selectedSerpKw.volume.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Difficulty</span>
                  <span className="font-mono text-white font-bold block mt-0.5">{selectedSerpKw.difficulty}%</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">CPC</span>
                  <span className="font-mono text-white font-bold block mt-0.5">${Number(selectedSerpKw.cpc).toFixed(2)}</span>
                </div>
              </div>

              {/* SERP Listing Results */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Organic Search Page Listings</h4>
                
                {(!selectedSerpKw.serpData || selectedSerpKw.serpData.length === 0) ? (
                  <div className="text-center py-8 text-slate-550 text-xs">
                    No organic SERP list indexed for this term.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {(selectedSerpKw.serpData as any[]).map((serp) => (
                      <div key={serp.rank} className="p-3 bg-slate-950/30 border border-slate-900 rounded-xl space-y-1.5 hover:border-slate-800 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-indigo-500/10 text-indigo-400 font-mono text-[10px] font-bold rounded-lg">
                            {serp.rank}
                          </span>
                          <span className="text-[9px] text-emerald-400 font-mono font-bold bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/15 rounded-full">
                            DA: {serp.domainAuthority}
                          </span>
                        </div>
                        <a 
                          href={serp.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-xs font-semibold text-white hover:text-indigo-300 transition-colors line-clamp-1"
                        >
                          {serp.title}
                        </a>
                        <span className="block text-[10px] text-slate-500 font-mono truncate">{serp.url}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-850 flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Domain Authority estimates based on links index.</span>
              </span>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}

interface RankHistoryChartProps {
  history: { date: string; position: number }[];
}

function RankHistoryChart({ history }: RankHistoryChartProps) {
  if (!history || history.length === 0) return null;

  // Let's filter history to have at most 90 days, sorted by date asc
  const data = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Dimensions of SVG
  const width = 600;
  const height = 280;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const positions = data.map((d) => d.position);
  let minPos = Math.min(...positions);
  let maxPos = Math.max(...positions);

  // Pad the range slightly so lines don't hit the border
  if (minPos === maxPos) {
    minPos = Math.max(1, minPos - 5);
    maxPos = maxPos + 5;
  } else {
    minPos = Math.max(1, Math.floor(minPos - 2));
    maxPos = Math.ceil(maxPos + 2);
  }

  // Inverted mapping functions:
  // X: Index to X-coordinate
  const getX = (index: number) => {
    return paddingLeft + (index / (data.length - 1)) * (width - paddingLeft - paddingRight);
  };

  // Y: Position to Y-coordinate (Inverted: minPos is at top, maxPos is at bottom)
  const getY = (pos: number) => {
    const range = maxPos - minPos;
    return paddingTop + ((pos - minPos) / range) * (height - paddingTop - paddingBottom);
  };

  // Build the path definition
  const points = data.map((d, i) => `${getX(i).toFixed(1)},${getY(d.position).toFixed(1)}`);
  const pathD = `M ${points.join(' L ')}`;

  // Area under path (going to the bottom of the chart: height - paddingBottom)
  const areaD = `${pathD} L ${getX(data.length - 1).toFixed(1)},${(height - paddingBottom).toFixed(1)} L ${getX(0).toFixed(1)},${(height - paddingBottom).toFixed(1)} Z`;

  // Dynamic Gridlines (let's pick 5 horizontal positions)
  const gridLines = [];
  const step = (maxPos - minPos) / 4;
  for (let i = 0; i <= 4; i++) {
    const pos = parseFloat((minPos + step * i).toFixed(1));
    gridLines.push(pos);
  }

  // Generate x-axis labels (let's pick 4 dates)
  const xLabelsCount = 4;
  const xLabelsIndices = [];
  const indexStep = Math.floor((data.length - 1) / (xLabelsCount - 1));
  for (let i = 0; i < xLabelsCount - 1; i++) {
    xLabelsIndices.push(i * indexStep);
  }
  xLabelsIndices.push(data.length - 1);

  return (
    <div className="relative w-full h-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid lines and Y Labels */}
        {gridLines.map((gl, i) => {
          const yVal = getY(gl);
          return (
            <g key={i} className="opacity-40">
              <line
                x1={paddingLeft}
                y1={yVal}
                x2={width - paddingRight}
                y2={yVal}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={paddingLeft - 8}
                y={yVal + 3}
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                #{gl.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Vertical X Labels */}
        {xLabelsIndices.map((idxVal, i) => {
          const xVal = getX(idxVal);
          const dateStr = data[idxVal].date;
          // Format Date to MMM DD
          const parts = dateStr.split('-');
          let label = dateStr;
          if (parts.length === 3) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const m = parseInt(parts[1]) - 1;
            label = `${months[m]} ${parts[2]}`;
          }
          return (
            <text
              key={i}
              x={xVal}
              y={height - 8}
              fill="#64748b"
              fontSize="9"
              textAnchor="middle"
              className="opacity-80"
            >
              {label}
            </text>
          );
        })}

        {/* Gradient fill */}
        <path d={areaD} fill="url(#chartGradient)" />

        {/* Smooth line */}
        <path
          d={pathD}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Endpoint dots */}
        {data.map((d, i) => {
          const shouldShowDot = i === 0 || i === data.length - 1 || i % 15 === 0;
          if (!shouldShowDot) return null;
          return (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(d.position)}
              r="4"
              fill="#1e1b4b"
              stroke="#6366f1"
              strokeWidth="2"
            />
          );
        })}
      </svg>
    </div>
  );
}
