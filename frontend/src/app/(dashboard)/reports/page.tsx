'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { 
  FileText, 
  Plus, 
  Download, 
  Mail, 
  Search, 
  Clock, 
  CheckCircle, 
  Loader2, 
  Sparkles,
  ArrowRight,
  Filter,
  Eye,
  Trash2
} from 'lucide-react';

interface CompiledReport {
  id: string;
  name: string;
  config: {
    type?: string;
  };
  pdfUrl?: string;
  createdAt: string;
}

export default function ReportsPage() {
  const currentWebsite = useStore((state) => state.currentWebsite);
  const currentProject = useStore((state) => state.currentProject);
  const token = useStore((state) => state.token);

  const [reports, setReports] = useState<CompiledReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom compiler form state
  const [showBuilder, setShowBuilder] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState<string>('Executive Summary');
  const [compiling, setCompiling] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    if (!currentProject || !token || token === 'mock-jwt-token-xyz') {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${currentProject.id}/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentProject) {
      fetchReports();
    } else {
      setReports([]);
      setLoading(false);
    }
  }, [currentProject, token]);

  // Form submit handler
  const handleCompile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportName || !currentProject || !token) return;

    setCompiling(true);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: currentProject.id,
          name: reportName,
          config: { type: reportType }
        })
      });

      if (res.ok) {
        await fetchReports();
        setShowBuilder(false);
        setReportName('');
      } else {
        alert('Failed to compile report');
      }
    } catch (err) {
      console.error('Error compiling report:', err);
      alert('Error connecting to backend reporting service');
    } finally {
      setCompiling(false);
    }
  };

  const handleDownload = async (id: string, name: string) => {
    if (!token) return;

    try {
      const res = await fetch(`/api/reports/${id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to download report PDF');
      }
    } catch (err) {
      console.error('Download report error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setReports(prev => prev.filter(r => r.id !== id));
      } else {
        alert('Failed to delete report');
      }
    } catch (err) {
      console.error('Error deleting report:', err);
    }
  };

  const filteredReports = reports.filter(rep => 
    rep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (rep.config?.type || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Campaign Deliverables</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">Automated Reporting Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Build, compile, and schedule executive PDF reports for clients tracking campaign stats on <span className="text-slate-200 font-semibold">{currentWebsite?.domain || 'your domain'}</span>.
          </p>
        </div>

        {!showBuilder && (
          <button 
            onClick={() => setShowBuilder(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 transition-all cursor-pointer animate-pulse"
          >
            <Plus className="w-4 h-4" />
            <span>Compile Custom Report</span>
          </button>
        )}
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive PDF compiler */}
        {showBuilder && (
          <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-slate-800 space-y-5 h-fit relative">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Report Builder
              </h3>
              <button 
                onClick={() => setShowBuilder(false)}
                className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCompile} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Report Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Monthly Performance Insights"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="w-full text-xs bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Report Type/Template</label>
                <select 
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full text-xs bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="Executive Summary">Executive Summary</option>
                  <option value="Technical SEO Audit">Technical SEO Audit</option>
                  <option value="GEO Visibility Report">GEO Visibility Report</option>
                  <option value="Competitor Gap Analysis">Competitor Gap Analysis</option>
                </select>
              </div>

              {/* Checkbox matrix */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2">
                <span className="block text-[9px] uppercase font-semibold text-indigo-400 tracking-wider">Metrics Data Modules</span>
                
                <label className="flex items-center gap-2 text-[10px] text-slate-300">
                  <input type="checkbox" defaultChecked className="accent-indigo-500 rounded" />
                  <span>Crawl Health Score & Core Web Vitals</span>
                </label>
                <label className="flex items-center gap-2 text-[10px] text-slate-300">
                  <input type="checkbox" defaultChecked className="accent-indigo-500 rounded" />
                  <span>Organic Traffic & Keywords Grid</span>
                </label>
                <label className="flex items-center gap-2 text-[10px] text-slate-300">
                  <input type="checkbox" defaultChecked className="accent-indigo-500 rounded" />
                  <span>LLM citations & Share of Voice</span>
                </label>
                <label className="flex items-center gap-2 text-[10px] text-slate-300">
                  <input type="checkbox" defaultChecked className="accent-indigo-500 rounded" />
                  <span>Backlink referring domains profile</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={compiling}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-opacity"
              >
                {compiling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Compiling PDF Elements...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>Assemble & Compile PDF</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Right: Reports Log list */}
        <div className={`${showBuilder ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
          <div className="flex gap-4 items-center bg-[#0d1222]/40 p-4 border border-slate-800/60 rounded-xl">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl w-full">
              <Search className="w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search generated report history..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              />
            </div>
          </div>

          <div className="glass-panel rounded-xl border border-slate-800/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800/40 bg-slate-900/10">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Generated Report Logs</h3>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No reports compiled yet for this campaign.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-500 font-semibold bg-slate-900/10">
                      <th className="px-6 py-3.5">Report Title</th>
                      <th className="px-6 py-3.5">Template Type</th>
                      <th className="px-6 py-3.5 font-mono">File Size</th>
                      <th className="px-6 py-3.5">Compiled Date</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {filteredReports.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-white block">{rep.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-400">{rep.config?.type || 'Executive Summary'}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-300">1.2 MB</td>
                        <td className="px-6 py-4 text-slate-500">{new Date(rep.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border text-indigo-400 bg-indigo-500/5 border-indigo-500/20">
                            Ready
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2.5">
                            <button 
                              onClick={() => handleDownload(rep.id, rep.name)}
                              className="p-1.5 text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800/80 rounded-lg hover:border-slate-700 transition-colors cursor-pointer" 
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button 
                              onClick={() => handleDelete(rep.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900/60 border border-slate-800/80 rounded-lg hover:border-rose-950/40 transition-colors cursor-pointer" 
                              title="Delete Report"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
