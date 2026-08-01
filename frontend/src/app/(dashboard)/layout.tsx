'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '../../store/useStore';
import { 
  LayoutDashboard, 
  Globe, 
  ShieldAlert, 
  Key, 
  Users, 
  LineChart, 
  Eye, 
  Sparkles, 
  FileText, 
  Settings, 
  CreditCard, 
  MapPin, 
  LogOut, 
  Bell, 
  ChevronDown, 
  Menu, 
  X,
  Search,
  BarChart2,
  User,
  Shield,
  FileBox,
  Plus,
  Loader2,
  Lock
} from 'lucide-react';
import Link from 'next/link';

const menuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Websites', path: '/websites', icon: Globe },
  { label: 'SEO Performance', path: '/analytics', icon: BarChart2 },
  { label: 'SEO Audit', path: '/seo-audit', icon: ShieldAlert },
  { label: 'Keyword Research', path: '/keyword-research', icon: Key },
  { label: 'Competitor Analysis', path: '/competitor-analysis', icon: Users },
  { label: 'GEO Optimization', path: '/geo-optimization', icon: Sparkles },
  { label: 'LLM Visibility', path: '/llm-visibility', icon: Eye },
  { label: 'Content Studio', path: '/content-studio', icon: FileBox },
  { label: 'Backlinks', path: '/backlinks', icon: LineChart },
  { label: 'Local SEO', path: '/local-seo', icon: MapPin },
  { label: 'Reports', path: '/reports', icon: FileText },
  { label: 'Billing', path: '/billing', icon: CreditCard },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const isLoggedIn = useStore((state) => state.isLoggedIn);
  const user = useStore((state) => state.user);
  const token = useStore((state) => state.token);
  const logout = useStore((state) => state.logout);
  const projects = useStore((state) => state.projects);
  const currentProject = useStore((state) => state.currentProject);
  const setCurrentProject = useStore((state) => state.setCurrentProject);
  
  const notifications = useStore((state) => state.notifications);
  const markAllRead = useStore((state) => state.markAllNotificationsRead);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // New campaign state
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreatingProject(true);
    try {
      const activeToken = useStore.getState().token;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDesc.trim() || undefined
        })
      });

      if (res.ok) {
        const newProj = await res.json();
        
        // Add to Zustand store
        const addProject = useStore.getState().addProject;
        const setCurrentProject = useStore.getState().setCurrentProject;
        
        addProject(newProj);
        setCurrentProject(newProj);
        
        setNewProjectName('');
        setNewProjectDesc('');
        setNewProjectModalOpen(false);
      } else {
        const errorText = await res.text();
        alert(`Failed to create project: ${errorText || res.statusText}`);
      }
    } catch (err: any) {
      console.error('Error creating project:', err);
      alert(`Error creating project: ${err.message}`);
    } finally {
      setCreatingProject(false);
    }
  };

  useEffect(() => {
    const loginTriggerTimeStr = sessionStorage.getItem('login_trigger_time');
    const startOffset = loginTriggerTimeStr ? Date.now() - parseInt(loginTriggerTimeStr) : null;
    console.log(`[Dashboard Layout Mount] Mounted. Time elapsed since login trigger: ${startOffset !== null ? startOffset + 'ms' : 'N/A'}`);

    // 1. Initialize from localStorage on client-side mount to avoid SSR hydration mismatches
    const savedToken = localStorage.getItem('accessToken');
    const savedUserStr = localStorage.getItem('user');
    let activeToken = useStore.getState().token;

    if (savedToken && savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        useStore.setState({
          token: savedToken,
          user: savedUser,
          isLoggedIn: true
        });
        activeToken = savedToken;
      } catch (e) {
        console.error('Error parsing stored session:', e);
      }
    }

    if (!useStore.getState().isLoggedIn) {
      router.push('/login');
      return;
    }

    const syncDatabase = async () => {
      const syncStart = performance.now();
      console.log('[Dashboard Layout Sync] Starting database synchronization...');
      try {
        const lastLoggedInEmail = localStorage.getItem('lastLoggedInEmail');
        const isAgencyUser = !lastLoggedInEmail || lastLoggedInEmail === 'agency@seoaios.com';

        // Auto-login with seeded credentials only if token is default or missing and we're not using another account
        if (!activeToken || activeToken === 'mock-jwt-token-xyz') {
          if (!isAgencyUser) {
            console.log('[Dashboard Layout Sync] Active token expired for non-agency user. Redirecting to login.');
            useStore.setState({ token: null, isLoggedIn: false, user: null });
            router.push('/login');
            return;
          }
          console.log('[Dashboard Layout Sync] No active token. Performing auto-login...');
          const authRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'agency@seoaios.com', password: 'password123' })
          });
          
          if (!authRes.ok) return;
          const authData = await authRes.json();
          activeToken = authData.accessToken;
          
          useStore.setState({ 
            token: activeToken,
            user: {
              id: authData.user.id,
              email: authData.user.email,
              firstName: 'Anshul',
              lastName: 'Dev',
              role: authData.user.role
            },
            isLoggedIn: true
          });
        }
        
        console.log('[Dashboard Layout Sync] Fetching /api/organization...');
        const orgResStart = performance.now();
        const orgRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization`, {
          headers: { 'Authorization': `Bearer ${activeToken}` }
        });
        const orgResEnd = performance.now();
        console.log(`[Dashboard Layout Sync] /api/organization returned status ${orgRes.status} in ${(orgResEnd - orgResStart).toFixed(2)}ms`);

        if (orgRes.ok) {
          const orgData = await orgRes.json();
          if (orgData.projects && orgData.projects.length > 0) {
            useStore.setState({ projects: orgData.projects });
            
            const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
            const activeProj = (currentProject && isUuid(currentProject.id)) ? currentProject : orgData.projects[0];
            useStore.setState({ currentProject: activeProj });
            
            console.log(`[Dashboard Layout Sync] Fetching websites for project ${activeProj.id}...`);
            const webResStart = performance.now();
            const webRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${activeProj.id}/websites`, {
              headers: { 'Authorization': `Bearer ${activeToken}` }
            });
            const webResEnd = performance.now();
            console.log(`[Dashboard Layout Sync] /api/projects/:id/websites returned status ${webRes.status} in ${(webResEnd - webResStart).toFixed(2)}ms`);

            if (webRes.ok) {
              const websitesList = await webRes.json();
              useStore.setState({ 
                websites: websitesList,
                currentWebsite: websitesList[0] || null
              });
            }
          }
        }
        const totalSyncTime = performance.now() - syncStart;
        console.log(`[Dashboard Layout Sync] Completed database synchronization in ${totalSyncTime.toFixed(2)}ms`);
        if (loginTriggerTimeStr) {
          const totalElapsed = Date.now() - parseInt(loginTriggerTimeStr);
          console.log(`[Dashboard Layout Sync] TOTAL LOGIN FLOW TIMELINE (Click to Ready): ${totalElapsed}ms`);
          sessionStorage.removeItem('login_trigger_time');
        }
      } catch (err) {
        console.error('Local PostgreSQL API server is not running or not reachable yet:', err);
      }
    };

    syncDatabase();
  }, [isLoggedIn]);

  useEffect(() => {
    const token = useStore.getState().token;
    const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!token || !currentProject || token === 'mock-jwt-token-xyz' || !isUuid(currentProject.id)) return;

    const fetchProjectWebsites = async () => {
      try {
        const webRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${currentProject.id}/websites`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (webRes.ok) {
          const websitesList = await webRes.json();
          useStore.setState({ 
            websites: websitesList,
            currentWebsite: websitesList[0] || null
          });
        }
      } catch (err) {
        console.error('Error fetching websites for current project:', err);
      }
    };
    fetchProjectWebsites();
  }, [currentProject]);

  useEffect(() => {
    if (!token || token === 'mock-jwt-token-xyz') return;
    const fetchSub = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/subscription`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const sub = await res.json();
          const currentUser = useStore.getState().user;
          if (currentUser) {
            useStore.setState({
              user: {
                ...currentUser,
                subscription: {
                  plan: sub.plan,
                  status: sub.status,
                  trialEndDate: sub.trialEndDate,
                  paid: sub.paid
                }
              }
            });
          }
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
      }
    };
    fetchSub();
  }, [token]);

  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070a13]">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const sub = user?.subscription;
  const planName = sub?.plan || 'free_trial';

  let badgeText = 'Free Trial';
  let trialDaysLeft = 0;
  let isExpired = false;

  if (planName === 'free_trial') {
    const end = sub?.trialEndDate ? new Date(sub.trialEndDate).getTime() : Date.now() + 15 * 24 * 60 * 60 * 1000;
    const diff = end - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
    badgeText = `Trial: ${trialDaysLeft} days left`;
    if (trialDaysLeft <= 0) {
      isExpired = true;
    }
  } else {
    badgeText = planName.charAt(0).toUpperCase() + planName.slice(1) + ' Plan';
    const end = sub?.trialEndDate ? new Date(sub.trialEndDate).getTime() : 0;
    const isCancelledOrPastDue = sub?.status === 'expired' || sub?.status === 'cancelled';
    if (isCancelledOrPastDue || (end > 0 && end < Date.now() && !sub?.paid)) {
      isExpired = true;
    }
  }

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const isItemLocked = (label: string) => {
    if (planName === 'free_trial' || planName === 'starter') {
      if (['Local SEO', 'LLM Visibility', 'GEO Optimization', 'Competitor Analysis'].includes(label)) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="min-h-screen flex bg-[#070a13] font-sans">
      {/* 1. SIDEBAR (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0d1222] border-r border-slate-800/60 shrink-0">
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-800/40">
          <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">SEO AI OS</span>
        </div>

        {/* Project Tenant Selector */}
        <div className="px-4 py-4 relative">
          <button 
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/60 rounded-xl text-left cursor-pointer transition-colors"
          >
            <div className="truncate">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Active Campaign</span>
              <span className="block text-sm font-semibold text-white truncate">{currentProject?.name}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {projectDropdownOpen && (
            <div className="absolute top-16 left-4 right-4 bg-[#111728] border border-slate-800 rounded-xl shadow-xl z-30 py-1.5 font-sans">
              <div className="max-h-60 overflow-y-auto">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setCurrentProject(p);
                      setProjectDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800/50 transition-colors ${currentProject?.id === p.id ? 'text-indigo-400 font-semibold' : 'text-slate-300'}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-800/60 my-1"></div>
              <button
                onClick={() => {
                  setNewProjectModalOpen(true);
                  setProjectDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-indigo-400 hover:bg-slate-800/50 transition-colors font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Campaign
              </button>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${isActive ? 'bg-indigo-500/10 text-indigo-400 font-semibold border-l-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {isItemLocked(item.label) && (
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800/40 bg-[#0d1222]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="truncate">
                <span className="block text-xs font-semibold text-white truncate">{user.firstName} {user.lastName}</span>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">{user.role}</span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN LAYOUT CONTAINER */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 flex items-center justify-between px-6 bg-[#070a13] border-b border-slate-800/40 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-lg lg:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900/40 border border-slate-800/60 rounded-xl w-80">
              <Search className="w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search keywords, domains, audits..." 
                className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification System */}
            <div className="relative">
              <button 
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-slate-800/40 rounded-xl cursor-pointer relative"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-[#111728] border border-slate-800 rounded-2xl shadow-xl z-30 p-4">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Alerts Center</h4>
                    <button 
                      onClick={() => {
                        markAllRead();
                        setNotifDropdownOpen(false);
                      }}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="text-xs">
                        <span className="font-semibold text-slate-200 block">{n.title}</span>
                        <p className="text-slate-400 mt-0.5">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Subscription Badge */}
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                planName === 'free_trial' 
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' 
                  : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
              }`}>
                {badgeText}
              </span>
              
              {(planName === 'free_trial' || !sub?.paid) && (
                <Link
                  href="/choose-plan"
                  className="px-2.5 py-1 bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-95 text-white text-[10px] font-bold rounded-full transition-all uppercase tracking-wider"
                >
                  Upgrade
                </Link>
              )}
            </div>

            {/* Profile */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold border border-indigo-500/20">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content View */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#070a13]">
          {children}
        </main>
      </div>

      {/* 3. MOBILE SIDEBAR OVERLAY DRAWER */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden">
          <aside className="w-64 bg-[#0d1222] h-full flex flex-col border-r border-slate-800">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <span className="text-lg font-bold text-white">SEO AI OS</span>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Campaign Selector (Mobile) */}
            <div className="px-4 py-4 relative">
              <button 
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/60 rounded-xl text-left cursor-pointer transition-colors"
              >
                <div className="truncate">
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">Active Campaign</span>
                  <span className="block text-sm font-semibold text-white truncate">{currentProject?.name}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {projectDropdownOpen && (
                <div className="absolute top-16 left-4 right-4 bg-[#111728] border border-slate-800 rounded-xl shadow-xl z-30 py-1.5 font-sans">
                  <div className="max-h-40 overflow-y-auto">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setCurrentProject(p);
                          setProjectDropdownOpen(false);
                          setSidebarOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800/50 transition-colors ${currentProject?.id === p.id ? 'text-indigo-400 font-semibold' : 'text-slate-300'}`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-800/60 my-1"></div>
                  <button
                    onClick={() => {
                      setNewProjectModalOpen(true);
                      setProjectDropdownOpen(false);
                      setSidebarOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-indigo-400 hover:bg-slate-800/50 transition-colors font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Campaign
                  </button>
                </div>
              )}
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? 'bg-indigo-500/10 text-indigo-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/20'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {isItemLocked(item.label) && (
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800/40">
              <button 
                onClick={() => {
                  logout();
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Campaign Creation Modal Popup */}
      {newProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0d1222] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <button
              onClick={() => setNewProjectModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-bold text-white uppercase tracking-wider mb-4">Create New Campaign</h3>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Campaign / Client Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GoCodeTech"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description (Optional)</label>
                <textarea
                  placeholder="e.g. SEO optimization for tech agency site"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setNewProjectModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProject || !newProjectName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-500/10"
                >
                  {creatingProject ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>{creatingProject ? 'Creating...' : 'Create Campaign'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Fullscreen Subscription Expired blocking overlay */}
      {isExpired && (
        <div className="fixed inset-0 bg-[#070a13]/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-2 font-sans tracking-tight">Subscription Expired</h2>
          <p className="text-slate-400 text-sm max-w-md mb-8 leading-relaxed font-sans">
            Your free trial or premium subscription period has ended. Upgrade your plan to restore access to your client SEO dashboards.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm justify-center">
            <Link
              href="/choose-plan"
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 text-xs hover:opacity-95 text-center flex-1 uppercase tracking-wider transition-all"
            >
              Upgrade Now
            </Link>
            <button
              onClick={logout}
              className="px-6 py-3 bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:text-white text-center flex-1 uppercase tracking-wider transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
