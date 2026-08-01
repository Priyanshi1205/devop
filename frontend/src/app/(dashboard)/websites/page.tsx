'use client';

import React, { useState, useEffect } from 'react';
import { useStore, Website } from '../../../store/useStore';
import { 
  Plus, 
  Globe, 
  Trash2, 
  CheckCircle, 
  RefreshCw, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  BarChart2,
  Settings,
  Unlink,
  X
} from 'lucide-react';

interface ConnectedWebsite extends Website {
  googleAccessToken?: string | null;
  googleRefreshToken?: string | null;
  googleTokenExpiry?: string | null;
  gscPropertyUrl?: string | null;
  gtmContainerId?: string | null;
  ga4Properties?: { id: string; propertyId: string; displayName: string }[];
}

const safeParseJson = async (res: Response): Promise<any> => {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  const text = await res.text();
  throw new Error(text || `HTTP ${res.status}`);
};

const safeGetError = async (res: Response): Promise<string> => {
  try {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const body = await res.json().catch(() => ({}));
      return body.message || `HTTP error ${res.status}`;
    }
    const text = await res.text();
    return text || `HTTP error ${res.status}`;
  } catch (e) {
    return `HTTP error ${res.status}`;
  }
};

export default function WebsitesPage() {
  const rawWebsites = useStore((state) => state.websites);
  const websites = rawWebsites as ConnectedWebsite[];
  const addWebsite = useStore((state) => state.addWebsite);
  const currentProject = useStore((state) => state.currentProject);
  const token = useStore((state) => state.token);
  const user = useStore((state) => state.user);
  const plan = user?.subscription?.plan || 'free_trial';

  const [mounted, setMounted] = useState(false);
  const [domain, setDomain] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ [id: string]: string }>({});

  const projects = useStore((state) => state.projects);
  const addProject = useStore((state) => state.addProject);
  const setCurrentProject = useStore((state) => state.setCurrentProject);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  useEffect(() => {
    if (showForm && currentProject) {
      setSelectedProjectId(currentProject.id);
    }
  }, [showForm, currentProject]);
  
  // OAuth URL Query indicators
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [connectedDomain, setConnectedDomain] = useState<string | null>(null);

  // GSC Property configuration wizard modal state
  const [selectedWebId, setSelectedWebId] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [properties, setProperties] = useState<string[]>([]);
  const [fetchingProperties, setFetchingProperties] = useState(false);
  const [savingProperty, setSavingProperty] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');

  // GA4 Property configuration wizard modal state
  const [showGa4ConfigModal, setShowGa4ConfigModal] = useState(false);
  const [ga4Props, setGa4Props] = useState<any[]>([]);
  const [fetchingGa4Props, setFetchingGa4Props] = useState(false);
  const [savingGa4Prop, setSavingGa4Prop] = useState(false);
  const [selectedGa4Prop, setSelectedGa4Prop] = useState<any | null>(null);

  const [googleConfig, setGoogleConfig] = useState<{ isConfigured: boolean; clientId: string } | null>(null);

  // GTM Container Configuration Modal state
  const [showGtmModal, setShowGtmModal] = useState(false);
  const [gtmContainerId, setGtmContainerId] = useState('');
  const [savingGtm, setSavingGtm] = useState(false);
  const [gtmDetails, setGtmDetails] = useState<Record<string, any>>({});
  const [fetchingGtmDetails, setFetchingGtmDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (token && token !== 'mock-jwt-token-xyz') {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/config/google`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `HTTP error ${res.status}`);
        }
        return safeParseJson(res);
      })
      .then(data => setGoogleConfig(data))
      .catch(err => {
        console.error('Error fetching Google config:', err);
        setGoogleConfig({ isConfigured: false, clientId: 'Not Configured' });
      });
    }
  }, [token]);
  const openGtmModal = (websiteId: string) => {
    if (plan === 'free_trial') {
      alert('Google Tag Manager Sync is a premium feature. Please upgrade your plan to connect GTM.');
      window.location.href = '/choose-plan';
      return;
    }
    setSelectedWebId(websiteId);
    const web = websites.find(w => w.id === websiteId);
    setGtmContainerId(web?.gtmContainerId || '');
    setShowGtmModal(true);
  };

  const handleConnectGtm = async () => {
    if (!selectedWebId) return;
    if (!/^GTM-[A-Z0-9]{5,10}$/.test(gtmContainerId)) {
      alert('Invalid GTM Container ID format. Format should be: GTM-XXXXXXX');
      return;
    }

    setSavingGtm(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${selectedWebId}/google/gtm/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ gtmContainerId })
      });

      if (res.ok) {
        const data = await safeParseJson(res);
        setShowGtmModal(false);
        if (data && data.message) {
          alert(data.message);
        } else {
          alert('GTM Container ID saved. Full verification available after reconnecting Google account.');
        }
        // Refresh domain details
        await refreshWebsites();

        // Immediately fetch detail metrics
        setFetchingGtmDetails(prev => ({ ...prev, [selectedWebId]: true }));
        const detailsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${selectedWebId}/google/gtm/details`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (detailsRes.ok) {
          const detailData = await safeParseJson(detailsRes);
          setGtmDetails(prev => ({ ...prev, [selectedWebId]: detailData }));
        }
      } else {
        const errorMsg = await safeGetError(res);
        alert(`Verification failed: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Connection failed: ${err.message}`);
    } finally {
      setSavingGtm(false);
    }
  };

  const handleDisconnectGtm = async (websiteId: string) => {
    if (!confirm('Are you sure you want to disconnect GTM container from this website?')) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${websiteId}/google/gtm/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setGtmDetails(prev => {
          const updated = { ...prev };
          delete updated[websiteId];
          return updated;
        });
        await refreshWebsites();
      } else {
        const errorMsg = await safeGetError(res);
        alert(`Disconnect failed: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Disconnect failed: ${err.message}`);
    }
  };

  useEffect(() => {
    const fetchAllGtmDetails = async () => {
      if (!token || token === 'mock-jwt-token-xyz') return;
      const projectWebs = websites.filter(w => w.projectId === currentProject?.id);
      for (const web of projectWebs) {
        if (web.googleAccessToken && web.gtmContainerId && !gtmDetails[web.id] && !fetchingGtmDetails[web.id]) {
          setFetchingGtmDetails(prev => ({ ...prev, [web.id]: true }));
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${web.id}/google/gtm/details`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await safeParseJson(res);
              setGtmDetails(prev => ({ ...prev, [web.id]: data }));
            }
          } catch (e) {
            console.error('Failed to fetch GTM details for:', web.domain, e);
          } finally {
            setFetchingGtmDetails(prev => ({ ...prev, [web.id]: false }));
          }
        }
      }
    };
    fetchAllGtmDetails();
  }, [websites, currentProject?.id, token]);
  useEffect(() => {
    // Check URL parameters for successful GSC OAuth return redirect
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('gsc_connected') === 'true') {
        setConnectionSuccess(true);
        const websiteId = urlParams.get('websiteId');
        if (websiteId) {
          const web = websites.find(w => w.id === websiteId);
          if (web) setConnectedDomain(web.domain);
        }
        // Clean up URL query parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [websites]);

  if (!mounted) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Campaign Assets</span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">Tracked Domains</h1>
            <p className="text-sm text-slate-400 mt-1">Configure and manage active domains tracked in your campaign.</p>
          </div>
        </div>
        <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <span className="text-sm text-slate-400 font-medium font-semibold">Loading tracked domains...</span>
        </div>
      </div>
    );
  }

  const projectWebsites = websites.filter(w => w.projectId === currentProject?.id);

  // Add website tracked domain
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain) return;

    let targetProjectId = selectedProjectId;

    // Handle new project creation first
    if (selectedProjectId === '__NEW__') {
      if (!newProjectName.trim()) {
        alert('Please enter a campaign project name');
        return;
      }
      setCreatingProject(true);
      try {
        const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
        if (!token || token === 'mock-jwt-token-xyz') {
          // offline mock project creation
          const mockProj = {
            id: `proj-${Math.random().toString(36).substring(7)}`,
            name: newProjectName.trim(),
            description: newProjectDesc.trim() || undefined
          };
          addProject(mockProj);
          setCurrentProject(mockProj);
          targetProjectId = mockProj.id;
        } else {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: newProjectName.trim(),
              description: newProjectDesc.trim() || undefined
            })
          });
          if (res.ok) {
            const newProj = await res.json();
            addProject(newProj);
            setCurrentProject(newProj);
            targetProjectId = newProj.id;
          } else {
            const errorMsg = await res.text();
            alert(`Failed to create project: ${errorMsg}`);
            setCreatingProject(false);
            return;
          }
        }
      } catch (err: any) {
        alert(`Error creating project: ${err.message}`);
        setCreatingProject(false);
        return;
      } finally {
        setCreatingProject(false);
      }
    }

    if (!targetProjectId) return;

    // Local Mock Fallback
    const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!token || token === 'mock-jwt-token-xyz' || !isUuid(targetProjectId)) {
      const mockWeb = {
        id: `web-${Math.random().toString(36).substring(7)}`,
        domain,
        projectId: targetProjectId,
      };
      addWebsite(mockWeb);
      
      const targetProjObj = projects.find(p => p.id === targetProjectId);
      if (targetProjObj) {
        setCurrentProject(targetProjObj);
      }

      setDomain('');
      setNewProjectName('');
      setNewProjectDesc('');
      setSelectedProjectId('');
      setShowForm(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          domain,
          projectId: targetProjectId
        })
      });

      if (res.ok) {
        const newWeb = await safeParseJson(res);
        addWebsite(newWeb);

        const targetProjObj = projects.find(p => p.id === targetProjectId);
        if (targetProjObj) {
          setCurrentProject(targetProjObj);
        }

        setDomain('');
        setNewProjectName('');
        setNewProjectDesc('');
        setSelectedProjectId('');
        setShowForm(false);
      } else {
        const errorMsg = await safeGetError(res);
        alert(`Failed to add website: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('Error adding website to database:', err);
      alert(`Error adding website: ${err.message}`);
    }
  };

  // Delete website
  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this website domain and all associated audits?')) return;

    if (!token || token === 'mock-jwt-token-xyz') {
      const updated = websites.filter(w => w.id !== id);
      useStore.setState({ websites: updated });
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const updated = websites.filter(w => w.id !== id);
        useStore.setState({ websites: updated });
      } else {
        const errorMsg = await safeGetError(res);
        alert(`Failed to delete website: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('Error deleting website:', err);
      alert(`Error deleting website: ${err.message}`);
    }
  };

  // Google Search Console OAuth Connect
  const handleConnectGsc = async (websiteId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${websiteId}/google/oauth/url`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await safeParseJson(res);
        if (data.url) {
          window.location.href = data.url; // Redirect to Google OAuth consent
        }
      } else {
        const errorMsg = await safeGetError(res);
        console.error('Failed to initialize Google OAuth. Status:', res.status, 'Message:', errorMsg);
        alert(`Failed to initialize Google OAuth: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('GSC OAuth Init failure:', err);
      alert(`Could not connect to Google API auth server: ${err.message}`);
    }
  };

  // Trigger manual GSC crawl sync
  const handleSyncGsc = async (websiteId: string) => {
    setSyncingId(websiteId);
    setSyncStatus(prev => ({ ...prev, [websiteId]: 'Syncing GSC data...' }));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${websiteId}/sync/gsc`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const result = await safeParseJson(res);
        setSyncStatus(prev => ({ 
          ...prev, 
          [websiteId]: `Synced ${result.recordsSynced} records! (${result.source})` 
        }));
        
        // Refresh local store websites values (to reload connected statuses)
        if (currentProject) {
          const webRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${currentProject.id}/websites`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (webRes.ok) {
            const websitesList = await safeParseJson(webRes);
            useStore.setState({ websites: websitesList });
          }
        }
      } else {
        const errorMsg = await safeGetError(res);
        setSyncStatus(prev => ({ ...prev, [websiteId]: `Sync failed: ${errorMsg}` }));
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus(prev => ({ ...prev, [websiteId]: `Connection error: ${err.message}` }));
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async (websiteId: string) => {
    setSyncingId(websiteId);
    setSyncStatus(prev => ({ ...prev, [websiteId]: 'Syncing Console + GA4 + GBP...' }));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${websiteId}/google/sync-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setSyncStatus(prev => ({ 
          ...prev, 
          [websiteId]: 'Google services successfully refreshed!' 
        }));
        
        if (currentProject) {
          const webRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${currentProject.id}/websites`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (webRes.ok) {
            const websitesList = await safeParseJson(webRes);
            useStore.setState({ websites: websitesList });
          }
        }
      } else {
        const errorMsg = await safeGetError(res);
        setSyncStatus(prev => ({ ...prev, [websiteId]: `Refresh failed: ${errorMsg}` }));
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus(prev => ({ ...prev, [websiteId]: `Refresh error: ${err.message}` }));
    } finally {
      setSyncingId(null);
    }
  };

  // Helper to refresh local store list of websites from database
  const refreshWebsites = async () => {
    if (currentProject && token && token !== 'mock-jwt-token-xyz') {
      try {
        const webRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${currentProject.id}/websites`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (webRes.ok) {
          const websitesList = await safeParseJson(webRes);
          useStore.setState({ websites: websitesList });
        }
      } catch (err) {
        console.error('Failed to refresh websites:', err);
      }
    }
  };

  // Open the configuration wizard modal and fetch GSC properties
  const openConfigureModal = async (websiteId: string) => {
    setSelectedWebId(websiteId);
    setShowConfigModal(true);
    setFetchingProperties(true);
    setProperties([]);
    setGoogleEmail('');
    setSelectedProperty('');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${websiteId}/google/gsc-properties`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await safeParseJson(res);
        console.log('GSC properties API response payload:', data);
        const propList = data.properties || [];
        setProperties(propList);
        setGoogleEmail(data.email || 'unknown@google.com');
        
        // Pre-select mapped property URL if present, or guess a domain match
        const currentWeb = websites.find(w => w.id === websiteId);
        if (currentWeb?.gscPropertyUrl && propList.includes(currentWeb.gscPropertyUrl)) {
          setSelectedProperty(currentWeb.gscPropertyUrl);
        } else if (propList.length > 0) {
          const match = propList.find((p: string) => p.includes(currentWeb?.domain || ''));
          setSelectedProperty(match || propList[0]);
        }
      } else {
        const errorMsg = await safeGetError(res);
        console.error('Failed to fetch GSC properties. Status:', res.status, 'Message:', errorMsg);
        alert(`Failed to fetch GSC properties: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('Error fetching GSC properties in wizard:', err);
      alert(`Error fetching GSC properties: ${err.message}`);
    } finally {
      setFetchingProperties(false);
    }
  };

  // Map GSC property URL to current website tracked domain
  const handleSaveProperty = async () => {
    if (!selectedWebId || !selectedProperty) return;
    setSavingProperty(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${selectedWebId}/google/gsc-property`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ gscPropertyUrl: selectedProperty })
      });
      if (res.ok) {
        await refreshWebsites();
        setShowConfigModal(false);
      } else {
        const errorMsg = await safeGetError(res);
        alert(`Failed to map GSC property: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error mapping GSC property: ${err.message}`);
    } finally {
      setSavingProperty(false);
    }
  };

  // Disconnect GSC integration & property mapping
  const handleDisconnectGsc = async (websiteId: string) => {
    if (!window.confirm('Are you sure you want to disconnect Google Search Console? This will remove saved credentials and property mapping.')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${websiteId}/google/gsc-disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        await refreshWebsites();
      } else {
        const errorMsg = await safeGetError(res);
        alert(`Failed to disconnect GSC: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('Error disconnecting GSC:', err);
      alert(`Error disconnecting GSC: ${err.message}`);
    }
  };

  // Open the GA4 configuration wizard modal
  const openGa4ConfigureModal = async (websiteId: string) => {
    setSelectedWebId(websiteId);
    setShowGa4ConfigModal(true);
    setFetchingGa4Props(true);
    setGa4Props([]);
    setSelectedGa4Prop(null);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${websiteId}/google/ga4-properties`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await safeParseJson(res);
        console.log('GA4 properties API response payload:', data);
        setGa4Props(data);
        // Pre-select mapped property if present
        const currentWeb = websites.find(w => w.id === websiteId);
        const mapped = currentWeb?.ga4Properties?.[0];
        if (mapped) {
          const match = data.find((p: any) => p.propertyId === mapped.propertyId);
          if (match) setSelectedGa4Prop(match);
        } else if (data.length > 0) {
          setSelectedGa4Prop(data[0]);
        }
      } else {
        const errorMsg = await safeGetError(res);
        console.error('Failed to fetch GA4 properties. Status:', res.status, 'Message:', errorMsg);
        alert(`Failed to fetch GA4 properties: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('Error fetching GA4 properties in wizard:', err);
      alert(`Error fetching GA4 properties: ${err.message}`);
    } finally {
      setFetchingGa4Props(false);
    }
  };

  // Map GA4 property to current website
  const handleSaveGa4Property = async () => {
    if (!selectedWebId || !selectedGa4Prop) return;
    setSavingGa4Prop(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          websiteId: selectedWebId,
          propertyId: selectedGa4Prop.propertyId,
          displayName: selectedGa4Prop.displayName
        })
      });
      if (res.ok) {
        await refreshWebsites();
        setShowGa4ConfigModal(false);
      } else {
        const errorMsg = await safeGetError(res);
        alert(`Failed to map GA4 property: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error mapping GA4 property: ${err.message}`);
    } finally {
      setSavingGa4Prop(false);
    }
  };

  // Disconnect GA4 property mapping
  const handleDisconnectGa4 = async (websiteId: string) => {
    if (!window.confirm('Are you sure you want to disconnect Google Analytics 4? This will remove the mapped property association.')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${websiteId}/google/ga4-disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        await refreshWebsites();
      } else {
        const errorMsg = await safeGetError(res);
        alert(`Failed to disconnect GA4: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('Error disconnecting GA4:', err);
      alert(`Error disconnecting GA4: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Campaign Assets</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">Tracked Domains</h1>
          <p className="text-sm text-slate-400 mt-1">Configure and manage active domains tracked in your campaign.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer shadow-lg shadow-indigo-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Add Website</span>
        </button>
      </div>

      {/* OAuth Connection Success Alert Banner */}
      {connectionSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-4 text-xs text-emerald-400 animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-bold text-white">Google Search Console connected successfully.</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Successfully authorized Google integration for <span className="text-white font-semibold">{connectedDomain || 'your domain'}</span>. Click the Sync button to fetch search console clicks.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setConnectionSuccess(false)}
            className="text-[11px] text-slate-400 hover:text-white cursor-pointer font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 max-w-md animate-fadeIn bg-[#0d1222]/40">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Add New Website</h3>
          
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Domain Name</label>
            <input 
              type="text" 
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. acmestore.com"
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Campaign Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value="__NEW__">+ Create new campaign</option>
            </select>
          </div>

          {selectedProjectId === '__NEW__' && (
            <div className="space-y-4 p-3.5 bg-slate-900/40 border border-slate-805 rounded-xl animate-fadeIn">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">New Campaign Name</label>
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">New Campaign Description</label>
                <textarea 
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="e.g. SEO campaign description"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 h-16 resize-none"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button 
              type="submit" 
              disabled={creatingProject}
              className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-60 flex items-center gap-1"
            >
              {creatingProject && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Add Domain</span>
            </button>
            <button 
              type="button" 
              onClick={() => setShowForm(false)} 
              className="px-3 py-1.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Connection Wizard Informational Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 mt-1">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white uppercase tracking-wide">Google Search Console Integration</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sync real-time search queries, keyword impressions, click-through rates (CTR), and average positions directly from your Google search webmaster account. Click the **Connect GSC** button next to any tracked domain to authorize.
            </p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center gap-3">
          <HelpCircle className="w-8 h-8 text-slate-500 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">OAuth Client ID</span>
            <span className="text-xs text-slate-300 font-mono mt-0.5 truncate block max-w-[180px]" title={googleConfig?.clientId || 'Not Configured'}>
              {googleConfig?.clientId || 'Not Configured'}
            </span>
          </div>
        </div>
      </div>

      {/* Website Listings Card Table */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/40 bg-slate-900/10 flex justify-between items-center">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Tracked Domains</h3>
          <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg">{projectWebsites.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 text-slate-500 font-semibold bg-slate-900/10">
                <th className="px-6 py-3.5">Domain</th>
                <th className="px-6 py-3.5">Google Services Integration Status</th>
                <th className="px-6 py-3.5">Crawl Status</th>
                <th className="px-6 py-3.5">Sync Status Message</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {projectWebsites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No domains connected. Add one using the button above!
                  </td>
                </tr>
              ) : (
                projectWebsites.map((web) => (
                  <tr key={web.id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-2">
                       <Globe className="w-4 h-4 text-indigo-400" />
                       <span>{web.domain}</span>
                    </td>
                    
                    {/* Unified Google Services Integration Status */}
                    <td className="px-6 py-4">
                      {web.googleAccessToken ? (
                        <div className="flex flex-col gap-3 py-1">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-xl text-[10px] uppercase tracking-wider">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Google Connected</span>
                            </span>
                            <button 
                              onClick={() => handleDisconnectGsc(web.id)}
                              className="text-[10px] text-rose-400 hover:text-rose-350 hover:underline cursor-pointer flex items-center gap-1 font-bold"
                              title="Disconnect Google Account"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                              <span>Disconnect</span>
                            </button>
                          </div>
                          
                          <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-900/60 max-w-sm">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-semibold">Search Console:</span>
                              {web.gscPropertyUrl ? (
                                <code className="text-indigo-400 font-mono text-[9px] max-w-[170px] truncate" title={web.gscPropertyUrl}>
                                  {web.gscPropertyUrl}
                                </code>
                              ) : (
                                <span className="text-amber-400 italic">Auto-Mapping...</span>
                              )}
                            </div>

                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-semibold">GA4 Analytics:</span>
                              {web.ga4Properties && web.ga4Properties.length > 0 ? (
                                <code className="text-indigo-400 font-mono text-[9px] max-w-[170px] truncate" title={web.ga4Properties[0].displayName}>
                                  {web.ga4Properties[0].displayName}
                                </code>
                              ) : (
                                <span className="text-amber-400 italic">Auto-Mapping...</span>
                              )}
                            </div>

                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-semibold">Business Profile:</span>
                              <span className="text-emerald-400 font-medium">Enabled</span>
                            </div>

                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-semibold">Tag Manager:</span>
                              {web.gtmContainerId ? (
                                <div className="flex items-center gap-1">
                                  <code className="text-indigo-400 font-mono text-[9px]">
                                    {web.gtmContainerId}
                                  </code>
                                  <button 
                                    onClick={() => handleDisconnectGtm(web.id)} 
                                    className="text-rose-400 hover:text-rose-350 cursor-pointer"
                                    title="Disconnect GTM Container"
                                  >
                                    <Unlink className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-amber-400 italic">Not Connected</span>
                              )}
                            </div>
                          </div>

                          {/* Live GTM container details card */}
                          {web.gtmContainerId && gtmDetails[web.id] && (
                            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-900/80 space-y-2.5 max-w-sm">
                              <div className="flex items-center justify-between border-b border-slate-900/60 pb-1.5">
                                <span className="text-[10px] text-white font-bold flex items-center gap-1.5">
                                  <Settings className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>GTM Container Metrics</span>
                                </span>
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${
                                  gtmDetails[web.id].healthCheck.status === 'HEALTHY' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {gtmDetails[web.id].healthCheck.status === 'HEALTHY' ? 'Healthy' : 'Attention'}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-1.5">
                                <div className="p-1.5 rounded-lg bg-slate-900/40 border border-slate-900/60 flex flex-col items-center">
                                  <span className="text-[8px] text-slate-500 uppercase tracking-wider font-bold">Tags</span>
                                  <span className="text-white font-semibold text-xs">{gtmDetails[web.id].tagsCount}</span>
                                </div>
                                <div className="p-1.5 rounded-lg bg-slate-900/40 border border-slate-900/60 flex flex-col items-center">
                                  <span className="text-[8px] text-slate-500 uppercase tracking-wider font-bold">Triggers</span>
                                  <span className="text-white font-semibold text-xs">{gtmDetails[web.id].triggersCount}</span>
                                </div>
                                <div className="p-1.5 rounded-lg bg-slate-900/40 border border-slate-900/60 flex flex-col items-center">
                                  <span className="text-[8px] text-slate-500 uppercase tracking-wider font-bold">Variables</span>
                                  <span className="text-white font-semibold text-xs">{gtmDetails[web.id].variablesCount}</span>
                                </div>
                              </div>

                              <div className="flex justify-between text-[9px] bg-slate-900/20 px-2 py-1 rounded border border-slate-900/40">
                                <span className="text-slate-400">Live Version</span>
                                <span className="text-slate-200 font-mono">v{gtmDetails[web.id].versionId}</span>
                              </div>

                              <div className="flex justify-between text-[9px] bg-slate-900/20 px-2 py-1 rounded border border-slate-900/40">
                                <span className="text-slate-400">Workspace Status</span>
                                <span className={`${gtmDetails[web.id].unpublishedChanges > 0 ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>
                                  {gtmDetails[web.id].unpublishedChanges} changes
                                </span>
                              </div>

                              <div className="flex justify-between text-[9px] bg-slate-900/20 px-2 py-1 rounded border border-slate-900/40">
                                <span className="text-slate-400">Published At</span>
                                <span className="text-slate-200">{new Date(gtmDetails[web.id].lastPublished).toLocaleDateString()}</span>
                              </div>

                              <div className="p-2 rounded bg-slate-900/30 border border-slate-900/50 space-y-1">
                                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Health Status Audit</div>
                                <p className="text-slate-300 leading-relaxed text-[9px]">{gtmDetails[web.id].healthCheck.message}</p>
                                <div className="flex gap-2 pt-0.5 text-[8px] font-bold">
                                  <span className={gtmDetails[web.id].healthCheck.ga4TagPresent ? 'text-emerald-400' : 'text-slate-500 line-through'}>✓ GA4 Config Tag</span>
                                  <span className={gtmDetails[web.id].healthCheck.conversionTrackingPresent ? 'text-emerald-400' : 'text-slate-500 line-through'}>✓ Conversions Tag</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {web.gtmContainerId && !gtmDetails[web.id] && (
                            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-505 space-y-1.5 max-w-sm">
                              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px]">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Verification Pending</span>
                              </div>
                              <p className="text-[9px] text-slate-400 leading-normal">
                                GTM Container ID saved. Please reconnect your Google account to grant Tag Manager permissions and unlock live metrics.
                              </p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleSyncAll(web.id)}
                              disabled={syncingId === web.id}
                              className="flex items-center gap-1.5 text-[10px] bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-xl border border-indigo-400/20 cursor-pointer disabled:opacity-50 transition-colors font-bold shadow-sm"
                            >
                              {syncingId === web.id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-white" />
                              ) : (
                                <RefreshCw className="w-3 h-3 text-white" />
                              )}
                              <span>Sync All Google Data</span>
                            </button>
                            <button 
                              onClick={() => openConfigureModal(web.id)}
                              className="text-[10px] bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl border border-slate-805 cursor-pointer transition-colors font-medium"
                            >
                              Configure GSC
                            </button>
                            <button 
                              onClick={() => openGa4ConfigureModal(web.id)}
                              className="text-[10px] bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl border border-slate-805 cursor-pointer transition-colors font-medium"
                            >
                              Configure GA4
                            </button>
                            <button 
                              onClick={() => openGtmModal(web.id)}
                              className="text-[10px] bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl border border-slate-805 cursor-pointer transition-colors font-medium flex items-center gap-1"
                            >
                              {plan === 'free_trial' && <span>🔒</span>}
                              <span>Configure GTM</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 py-1">
                          <span className="inline-flex items-center gap-1 text-slate-500 font-semibold bg-slate-800/30 px-2.5 py-0.5 rounded-full border border-slate-800/50 text-[10px] w-fit">
                            <span>Not Connected</span>
                          </span>
                          <button 
                            onClick={() => handleConnectGsc(web.id)}
                            className="flex items-center gap-2 text-[10px] bg-white hover:bg-slate-100 text-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 font-extrabold cursor-pointer transition-colors shadow-sm w-fit"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                            </svg>
                            <span>Connect Google Account</span>
                          </button>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Idle</span>
                      </span>
                    </td>
 
                    <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                      {syncStatus[web.id] || (web.googleAccessToken ? 'All services mapped' : 'Not Connected')}
                    </td>
 
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(web.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                        title="Delete Website"
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
      </div>

      {/* Configure GSC Property Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-all">
          <div className="glass-panel max-w-md w-full p-6 border border-slate-800 rounded-2xl space-y-5 shadow-2xl relative">
            
            {/* Close button */}
            <button 
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-slate-900 p-1.5 rounded-xl cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div>
              <h3 className="text-base font-extrabold text-white">Google Search Console Property Wizard</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select a verified Search Console property to associate with your tracking domain:
                <span className="text-white font-semibold block mt-0.5 text-sm">
                  {websites.find(w => w.id === selectedWebId)?.domain}
                </span>
              </p>
            </div>

            {/* Modal Content */}
            <div className="space-y-4">
              {fetchingProperties ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                  <span className="text-xs text-slate-400 font-semibold">Fetching verified properties from Google...</span>
                </div>
              ) : properties.length === 0 ? (
                <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <AlertCircle className="w-4 h-4" />
                    <span>No Verified Properties Found</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Google reported zero verified properties matching your account credentials. Please verify your domain in Google Search Console first.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Verified Site/Domain
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-slate-850 rounded-xl divide-y divide-slate-850 bg-slate-950">
                    {properties.map((prop) => (
                      <label 
                        key={prop} 
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-900 transition-colors text-xs text-slate-300 font-medium ${
                          selectedProperty === prop ? 'bg-indigo-500/5 text-white' : ''
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="gscProperty"
                          value={prop}
                          checked={selectedProperty === prop}
                          onChange={(e) => setSelectedProperty(e.target.value)}
                          className="text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 border-slate-800 bg-slate-900 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="block truncate font-mono text-[11px]">{prop}</span>
                          <span className="text-[9px] text-slate-500">
                            {prop.startsWith('sc-domain:') ? 'Domain-level Property' : 'URL Prefix Property'}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Debug Section */}
              {!fetchingProperties && (
                <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-2 text-[11px] text-slate-400">
                  <span className="font-bold text-slate-350 block uppercase tracking-wider text-[9px] border-b border-slate-800 pb-1">
                    Debug Information
                  </span>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Google Account:</span>
                    <span className="font-mono text-indigo-400 truncate max-w-[200px]" title={googleEmail || 'Not Connected'}>
                      {googleEmail || 'Not Connected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Properties Returned:</span>
                    <span className="font-mono text-indigo-400">{properties.length}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-400 block">Raw Property URLs:</span>
                    {properties.length === 0 ? (
                      <span className="text-slate-500 italic text-[10px]">No properties returned</span>
                    ) : (
                      <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[9px] bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                        {properties.map((p, idx) => (
                          <div key={idx} className="truncate select-all text-slate-300 hover:text-white" title={p}>
                            {p}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button 
                type="button" 
                onClick={() => setShowConfigModal(false)}
                className="px-3.5 py-2 bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-400 hover:text-slate-350 text-xs font-bold rounded-xl cursor-pointer transition-all duration-150"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveProperty}
                disabled={fetchingProperties || !selectedProperty || savingProperty}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-indigo-500/10"
              >
                {savingProperty && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Mapping</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Configure GA4 Property Modal */}
      {showGa4ConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-all">
          <div className="glass-panel max-w-md w-full p-6 border border-slate-800 rounded-2xl space-y-5 shadow-2xl relative">
            
            {/* Close button */}
            <button 
              onClick={() => setShowGa4ConfigModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-slate-900 p-1.5 rounded-xl cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div>
              <h3 className="text-base font-extrabold text-white">Google Analytics 4 Property Wizard</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select an accessible Google Analytics 4 property to associate with your tracking domain:
                <span className="text-white font-semibold block mt-0.5 text-sm">
                  {websites.find(w => w.id === selectedWebId)?.domain}
                </span>
              </p>
            </div>

            {/* Modal Content */}
            <div className="space-y-4">
              {fetchingGa4Props ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                  <span className="text-xs text-slate-400 font-semibold">Fetching properties from Google account...</span>
                </div>
              ) : ga4Props.length === 0 ? (
                <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <AlertCircle className="w-4 h-4" />
                    <span>No GA4 Properties Found</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    We retrieved zero Google Analytics 4 properties connected to your Google Account. Please create a property in Google Analytics console first.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select GA4 Property
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-slate-850 rounded-xl divide-y divide-slate-850 bg-slate-950">
                    {ga4Props.map((prop) => (
                      <label 
                        key={prop.propertyId} 
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-900 transition-colors text-xs text-slate-300 font-medium ${
                          selectedGa4Prop?.propertyId === prop.propertyId ? 'bg-indigo-500/5 text-white' : ''
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="ga4Property"
                          value={prop.propertyId}
                          checked={selectedGa4Prop?.propertyId === prop.propertyId}
                          onChange={() => setSelectedGa4Prop(prop)}
                          className="text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 border-slate-800 bg-slate-900 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="block truncate font-semibold text-[11px] text-white">{prop.displayName}</span>
                          <span className="text-[9px] text-slate-500">
                            {prop.accountName} • {prop.propertyId}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button 
                type="button" 
                onClick={() => setShowGa4ConfigModal(false)}
                className="px-3.5 py-2 bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-400 hover:text-slate-350 text-xs font-bold rounded-xl cursor-pointer transition-all duration-150"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveGa4Property}
                disabled={fetchingGa4Props || !selectedGa4Prop || savingGa4Prop}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-indigo-500/10"
              >
                {savingGa4Prop && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save GA4 Mapping</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Configure GTM Property Modal */}
      {showGtmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-all">
          <div className="glass-panel max-w-md w-full p-6 border border-slate-800 rounded-2xl space-y-5 shadow-2xl relative">
            
            {/* Close button */}
            <button 
              onClick={() => setShowGtmModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-slate-900 p-1.5 rounded-xl cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div>
              <h3 className="text-base font-extrabold text-white">Google Tag Manager Integration</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your Google Tag Manager Container ID to establish link tracking and health status check for:
                <span className="text-white font-semibold block mt-0.5 text-sm">
                  {websites.find(w => w.id === selectedWebId)?.domain}
                </span>
              </p>
            </div>

            {/* Modal Content */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Container ID
                </label>
                <input 
                  type="text"
                  placeholder="GTM-XXXXXXX"
                  value={gtmContainerId}
                  onChange={(e) => setGtmContainerId(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-600 font-mono tracking-wider focus:outline-none transition-colors"
                />
                <span className="text-[10px] text-slate-500 leading-normal block">
                  Find this ID in your GTM account interface (e.g. GTM-AB12CD3).
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button 
                type="button" 
                onClick={() => setShowGtmModal(false)}
                className="px-3.5 py-2 bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-400 hover:text-slate-350 text-xs font-bold rounded-xl cursor-pointer transition-all duration-150"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleConnectGtm}
                disabled={savingGtm || !gtmContainerId}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-indigo-500/10"
              >
                {savingGtm && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Verify & Connect</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
