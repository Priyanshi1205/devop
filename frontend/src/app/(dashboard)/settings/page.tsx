'use client';

import React, { useState, useEffect } from 'react';
import { useStore, Website } from '../../../store/useStore';
import { 
  Settings, 
  User, 
  Building, 
  Key, 
  Users, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Loader2, 
  Copy,
  Eye,
  EyeOff,
  Folder
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'WRITER' | 'CLIENT';
  joined: string;
}

interface ApiKey {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  status: 'Active' | 'Revoked';
}

const initialTeam: TeamMember[] = [
  { id: 'tm-1', name: 'Anshul Dev', email: 'agency@seoaios.com', role: 'OWNER', joined: 'Jun 2025' },
  { id: 'tm-2', name: 'Liam Sterling', email: 'liam@seoaios.com', role: 'MANAGER', joined: 'Nov 2025' },
  { id: 'tm-3', name: 'Elena Rostova', email: 'elena@seoaios.com', role: 'WRITER', joined: 'Jan 2026' }
];

const initialKeys: ApiKey[] = [
  { id: 'key-1', name: 'Production Crawler Node', token: 'sk_live_a1b2c3d4e5f6g7h8i9j0', createdAt: '2 months ago', status: 'Active' },
  { id: 'key-2', name: 'Slack Alerts Integrations', token: 'sk_live_z9y8x7w6v5u4t3s2r1q0', createdAt: '3 weeks ago', status: 'Active' }
];

export default function SettingsPage() {
  const user = useStore((state) => state.user);
  const currentWebsite = useStore((state) => state.currentWebsite);
  const projects = useStore((state) => state.projects);
  const currentProject = useStore((state) => state.currentProject);
  const token = useStore((state) => state.token);
  
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'api' | 'projects'>('profile');

  // Projects Manager tab states
  const [allWebsites, setAllWebsites] = useState<Website[]>([]);
  const [loadingWebsites, setLoadingWebsites] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectSuccess, setProjectSuccess] = useState<string | null>(null);
  const [movingWebId, setMovingWebId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moveSuccess, setMoveSuccess] = useState<string | null>(null);

  // Fetch all websites for all projects when projects tab active
  useEffect(() => {
    if (activeTab !== 'projects') return;

    if (!token || token === 'mock-jwt-token-xyz') {
      // offline mode fallback
      setAllWebsites(useStore.getState().websites);
      return;
    }

    const fetchAllWebsites = async () => {
      setLoadingWebsites(true);
      try {
        const projectsList = useStore.getState().projects;
        const promises = projectsList.map(async (p) => {
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${p.id}/websites`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              return await res.json();
            }
          } catch (err) {
            console.error(`Error fetching websites for project ${p.id}:`, err);
          }
          return [];
        });

        const results = await Promise.all(promises);
        const combined = results.flat();
        setAllWebsites(combined);
      } catch (err) {
        console.error('Error fetching websites for projects:', err);
      } finally {
        setLoadingWebsites(false);
      }
    };

    fetchAllWebsites();
  }, [activeTab, projects, token]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    setCreatingProject(true);
    setProjectError(null);
    setProjectSuccess(null);

    const addProject = useStore.getState().addProject;

    try {
      const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
      if (!token || token === 'mock-jwt-token-xyz') {
        const mockProj = {
          id: `proj-${Math.random().toString(36).substring(7)}`,
          name: newProjName.trim(),
          description: newProjDesc.trim() || undefined
        };
        addProject(mockProj);
        setProjectSuccess(`Project "${mockProj.name}" created successfully (Offline mode).`);
        setNewProjName('');
        setNewProjDesc('');
      } else {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: newProjName.trim(),
            description: newProjDesc.trim() || undefined
          })
        });

        if (res.ok) {
          const newProj = await res.json();
          addProject(newProj);
          setProjectSuccess(`Project "${newProj.name}" created successfully.`);
          setNewProjName('');
          setNewProjDesc('');
        } else {
          const errText = await res.text();
          setProjectError(`Failed to create project: ${errText}`);
        }
      }
    } catch (err: any) {
      setProjectError(`Error creating project: ${err.message}`);
    } finally {
      setCreatingProject(false);
    }
  };

  const handleMoveWebsite = async (websiteId: string, domain: string, targetProjectId: string) => {
    setMovingWebId(websiteId);
    setMoveError(null);
    setMoveSuccess(null);

    try {
      const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
      if (!token || token === 'mock-jwt-token-xyz' || !isUuid(websiteId)) {
        setAllWebsites(prev => prev.map(w => w.id === websiteId ? { ...w, projectId: targetProjectId } : w));
        
        const storeWebsites = useStore.getState().websites;
        const updatedStoreWebsites = storeWebsites.map(w => w.id === websiteId ? { ...w, projectId: targetProjectId } : w);
        
        const filtered = updatedStoreWebsites.filter(w => w.projectId === currentProject?.id);
        useStore.setState({ 
          websites: filtered,
          currentWebsite: filtered.find(w => w.id === currentWebsite?.id) || filtered[0] || null
        });

        const targetProjObj = projects.find(p => p.id === targetProjectId);
        setMoveSuccess(`Moved "${domain}" to project "${targetProjObj?.name || 'Unknown'}" (Offline).`);
      } else {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/websites/${websiteId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ projectId: targetProjectId })
        });

        if (res.ok) {
          const updatedWeb = await res.json();
          
          setAllWebsites(prev => prev.map(w => w.id === websiteId ? updatedWeb : w));
          
          if (currentProject) {
            const webRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${currentProject.id}/websites`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (webRes.ok) {
              const websitesList = await webRes.json();
              useStore.setState({ 
                websites: websitesList,
                currentWebsite: websitesList.find((w: any) => w.id === currentWebsite?.id) || websitesList[0] || null
              });
            }
          }

          const targetProjObj = projects.find(p => p.id === targetProjectId);
          setMoveSuccess(`Moved "${domain}" to project "${targetProjObj?.name || 'Unknown'}" successfully.`);
        } else {
          const errText = await res.text();
          setMoveError(`Failed to move domain: ${errText}`);
        }
      }
    } catch (err: any) {
      setMoveError(`Error moving domain: ${err.message}`);
    } finally {
      setMovingWebId(null);
    }
  };

  // Profile Form States
  const [firstName, setFirstName] = useState(user?.firstName || 'Anshul');
  const [lastName, setLastName] = useState(user?.lastName || 'Dev');
  const [orgName, setOrgName] = useState('Acme SEO Agency');
  const [timezone, setTimezone] = useState('America/New_York');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Team Member list state
  const [team, setTeam] = useState<TeamMember[]>(initialTeam);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'OWNER' | 'ADMIN' | 'MANAGER' | 'WRITER' | 'CLIENT'>('WRITER');
  const [addingMember, setAddingMember] = useState(false);

  // API Tokens state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialKeys);
  const [newTokenName, setNewTokenName] = useState('');
  const [createdTokenVal, setCreatedTokenVal] = useState<string | null>(null);
  const [creatingToken, setCreatingToken] = useState(false);
  const [revealKeyId, setRevealKeyId] = useState<string | null>(null);

  // Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(false);

    setTimeout(() => {
      setSavingProfile(false);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }, 1200);
  };

  // Add Member
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberEmail) return;

    setAddingMember(true);
    setTimeout(() => {
      const newMember: TeamMember = {
        id: `tm-${Math.random().toString(36).substring(7)}`,
        name: newMemberName,
        email: newMemberEmail,
        role: newMemberRole,
        joined: 'Just now'
      };

      setTeam([...team, newMember]);
      setAddingMember(false);
      setNewMemberName('');
      setNewMemberEmail('');
    }, 1200);
  };

  // Remove Member
  const handleRemoveMember = (id: string) => {
    setTeam(team.filter(t => t.id !== id));
  };

  // Generate Token
  const handleCreateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName) return;

    setCreatingToken(true);
    setTimeout(() => {
      const securePart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const fullToken = `sk_live_${securePart}`;
      
      const newKey: ApiKey = {
        id: `key-${Math.random().toString(36).substring(7)}`,
        name: newTokenName,
        token: fullToken,
        createdAt: 'Just now',
        status: 'Active'
      };

      setApiKeys([newKey, ...apiKeys]);
      setCreatedTokenVal(fullToken);
      setCreatingToken(false);
      setNewTokenName('');
    }, 1200);
  };

  // Revoke Token
  const handleRevokeToken = (id: string) => {
    setApiKeys(apiKeys.map(k => k.id === id ? { ...k, status: 'Revoked' as const } : k));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">System Settings</span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">Control Panel Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure agency-wide setups, delegate user access controls, and manage API keys credentials.
        </p>
      </div>

      {/* Main settings split grids */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Tab Navigations */}
        <div className="lg:col-span-1 glass-panel p-4 rounded-2xl border border-slate-800 space-y-1.5 h-fit">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'profile' ? 'bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile & Agency</span>
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'team' ? 'bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team Roles & RBAC</span>
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'api' ? 'bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>API Credentials</span>
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'projects' ? 'bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Campaign Projects</span>
          </button>
        </div>

        {/* Right Side: Tab details */}
        <div className="lg:col-span-3 space-y-6">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
              <div className="border-b border-slate-800/60 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Profile & Organization Profile</h3>
                  <p className="text-xs text-slate-400">Configure parameters for active users and global campaign defaults</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">First Name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full text-xs bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full text-xs bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Organization / Agency Name</label>
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full text-xs bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Preferred Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full text-xs bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Asia/Calcutta">Asia/Kolkata (IST)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-800/40">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/10 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Profiles...</span>
                      </>
                    ) : (
                      <span>Save Settings</span>
                    )}
                  </button>

                  {profileSuccess && (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Settings updated successfully.
                    </span>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: TEAM & RBAC */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              {/* Member Creator Form */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2.5">
                  Invite New Member
                </h3>
                
                <form onSubmit={handleAddMember} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div className="sm:col-span-1.5">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Liam Sterling"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="w-full text-xs bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                    />
                  </div>
                  <div className="sm:col-span-1.5">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. liam@acme.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="w-full text-xs bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Access Role</label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as any)}
                      className="w-full text-xs bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="WRITER">WRITER</option>
                      <option value="CLIENT">CLIENT</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={addingMember}
                    className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
                  >
                    {addingMember ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>Invite</span>
                  </button>
                </form>
              </div>

              {/* Members List */}
              <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800/40 bg-slate-900/10 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Agency Members</h3>
                  <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-semibold">
                    {team.length} Members
                  </span>
                </div>
                
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-500 font-semibold bg-slate-900/10">
                      <th className="px-6 py-3.5">Name</th>
                      <th className="px-6 py-3.5">Email Address</th>
                      <th className="px-6 py-3.5">Role Permission</th>
                      <th className="px-6 py-3.5">Joined Date</th>
                      <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {team.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="px-6 py-4 font-semibold text-white">{t.name}</td>
                        <td className="px-6 py-4 font-mono text-slate-400">{t.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            t.role === 'OWNER' 
                              ? 'text-pink-400 bg-pink-500/5 border-pink-500/20' 
                              : t.role === 'ADMIN' 
                              ? 'text-indigo-400 bg-indigo-500/5 border-indigo-500/20'
                              : t.role === 'MANAGER'
                              ? 'text-purple-400 bg-purple-500/5 border-purple-500/20'
                              : 'text-slate-400 bg-slate-800 border-slate-700/60'
                          }`}>
                            {t.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{t.joined}</td>
                        <td className="px-6 py-4 text-right">
                          {t.role !== 'OWNER' ? (
                            <button
                              onClick={() => handleRemoveMember(t.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors ml-auto"
                              title="Remove access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-semibold px-2">Protected</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: API KEYS */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              {/* Creator Form */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2.5">
                  Generate API Access Token
                </h3>

                <form onSubmit={handleCreateToken} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5 font-bold">Key Reference Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Next.js Frontend Deployment"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                      className="w-full text-xs bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creatingToken}
                    className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    {creatingToken ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-white" />
                        <span>Generate Key</span>
                      </>
                    )}
                  </button>
                </form>

                {createdTokenVal && (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-xs space-y-1.5">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Key Created Successfully
                    </span>
                    <p className="text-slate-300 font-medium">Please copy this API key now. It won't be shown again.</p>
                    <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-905">
                      <span className="font-mono text-emerald-400 font-bold break-all flex-1">{createdTokenVal}</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(createdTokenVal)}
                        className="p-1.5 text-slate-500 hover:text-white bg-slate-900 border border-slate-800 rounded hover:border-slate-700 cursor-pointer"
                        title="Copy to Clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* API Keys Log */}
              <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800/40 bg-slate-900/10 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active System API Credentials</h3>
                  <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-semibold">
                    {apiKeys.length} Keys
                  </span>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-500 font-semibold bg-slate-900/10">
                      <th className="px-6 py-3.5">Credential Name</th>
                      <th className="px-6 py-3.5">API Access Secret Token</th>
                      <th className="px-6 py-3.5">Created Date</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {apiKeys.map((key) => (
                      <tr key={key.id} className={`hover:bg-slate-900/10 transition-colors ${key.status === 'Revoked' ? 'opacity-40' : ''}`}>
                        <td className="px-6 py-4 font-semibold text-white">{key.name}</td>
                        <td className="px-6 py-4 font-mono text-slate-400">
                          <div className="flex items-center gap-2">
                            <span>
                              {revealKeyId === key.id 
                                ? key.token 
                                : `${key.token.slice(0, 8)}••••••••••••••••••••`}
                            </span>
                            <button
                              onClick={() => setRevealKeyId(revealKeyId === key.id ? null : key.id)}
                              className="text-slate-500 hover:text-slate-300 font-semibold cursor-pointer"
                            >
                              {revealKeyId === key.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{key.createdAt}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            key.status === 'Active' 
                              ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20' 
                              : 'text-slate-500 bg-slate-800/50 border-slate-700/50'
                          }`}>
                            {key.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {key.status === 'Active' ? (
                            <button
                              onClick={() => handleRevokeToken(key.id)}
                              className="text-xs text-rose-400 hover:text-rose-300 font-bold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/10 px-2.5 py-1 rounded-xl cursor-pointer"
                            >
                              Revoke Key
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-semibold uppercase px-2">Revoked</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PROJECTS MANAGER */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              {/* Project Creator Form */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2.5">
                  Create New Campaign Project
                </h3>
                
                <form onSubmit={handleCreateProject} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div className="sm:col-span-1.5">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Project Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Skyarenaa India"
                      value={newProjName}
                      onChange={(e) => setNewProjName(e.target.value)}
                      className="w-full text-xs bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                    />
                  </div>
                  <div className="sm:col-span-1.5">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Description (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Hospitality Client"
                      value={newProjDesc}
                      onChange={(e) => setNewProjDesc(e.target.value)}
                      className="w-full text-xs bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creatingProject}
                    className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
                  >
                    {creatingProject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>Create Project</span>
                  </button>
                </form>

                {projectSuccess && (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-xs flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>{projectSuccess}</span>
                  </div>
                )}
                {projectError && (
                  <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-xs flex items-center gap-1.5 text-rose-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span>{projectError}</span>
                  </div>
                )}
              </div>

              {/* Status messages for website movement */}
              {(moveSuccess || moveError) && (
                <div className="space-y-2">
                  {moveSuccess && (
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-xs flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>{moveSuccess}</span>
                    </div>
                  )}
                  {moveError && (
                    <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-xs flex items-center gap-1.5 text-rose-400">
                      <ShieldAlert className="w-4 h-4" />
                      <span>{moveError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Projects Card List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campaign Projects List</h3>
                  {loadingWebsites && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading website mappings...</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {projects.map((project) => {
                    const projectWebsites = allWebsites.filter(w => w.projectId === project.id);
                    return (
                      <div key={project.id} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex justify-between items-start border-b border-slate-850 pb-3">
                          <div>
                            <h4 className="text-sm font-bold text-white">{project.name}</h4>
                            {project.description && (
                              <p className="text-xs text-slate-400 mt-0.5">{project.description}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-semibold">
                            {projectWebsites.length} Domains
                          </span>
                        </div>

                        {projectWebsites.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-2">No domains assigned to this project yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {projectWebsites.map((web) => (
                              <div key={web.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-900/40 border border-slate-850 rounded-xl gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-white font-mono">{web.domain}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {movingWebId === web.id ? (
                                    <div className="flex items-center gap-1.5 text-xs text-indigo-400">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>Moving...</span>
                                    </div>
                                  ) : (
                                    <>
                                      <label className="text-[10px] uppercase font-bold text-slate-500">Move to:</label>
                                      <select
                                        value=""
                                        onChange={(e) => {
                                          const targetProjId = e.target.value;
                                          if (targetProjId) {
                                            handleMoveWebsite(web.id, web.domain, targetProjId);
                                          }
                                        }}
                                        className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                                      >
                                        <option value="" disabled>Select Project...</option>
                                        {projects
                                          .filter(p => p.id !== project.id)
                                          .map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                          ))}
                                      </select>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
