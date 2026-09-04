import React, { useState } from "react";
import {
  GitBranch,
  FileCode,
  Layers,
  FileText,
  Activity as ActivityIcon,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Trash2,
  RefreshCw,
  FolderGit2,
  Code2,
  AlertTriangle,
  FileCheck
} from "lucide-react";
import { Repository, DashboardStats, Activity, RepositoryInsight } from "../types.js";
import { repositoryService } from "../services/api.js";
import { useToast } from "../context/ToastContext.js";

interface DashboardProps {
  stats: DashboardStats;
  repositories: Repository[];
  activities: Activity[];
  onSelectRepo: (id: string) => void;
  onOpenImportModal: () => void;
  onRefreshData: () => void;
  setCurrentPage: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  repositories,
  activities,
  onSelectRepo,
  onOpenImportModal,
  onRefreshData,
  setCurrentPage
}) => {
  const [quickUrl, setQuickUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const toast = useToast();

  const handleQuickImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;

    setImporting(true);
    try {
      const res = await repositoryService.importGitHub(quickUrl.trim());
      toast.success("Repository connected", "Started indexing and vector generation.");
      setQuickUrl("");
      onRefreshData();
      onSelectRepo(res.repository.id);
      setCurrentPage("analyzer");
    } catch (err: any) {
      toast.error("Import error", err.message);
    } finally {
      setImporting(false);
    }
  };

  const activeRepos = repositories.filter(r => r.status === "active");

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-lg bg-white/[0.02] border border-white/10 p-8 md:p-10 shadow-xl">
        <div className="absolute -top-6 -right-6 w-36 h-36 border-t border-r gold-border opacity-30 pointer-events-none" />
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#C5A059] text-[10px] uppercase tracking-[0.25em] font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Autonomous Codebase Intelligence</span>
          </div>

          <h1 className="serif-text text-3xl md:text-5xl text-white font-light tracking-wide leading-tight mb-4">
            Understand Any Codebase with Restraint & Precision
          </h1>

          <p className="text-sm md:text-base text-[#D4D4D8]/70 leading-relaxed mb-8 max-w-2xl font-light">
            Deconstruct architecture, extract semantic dependencies, generate production documentation, and assess engineering stack readiness.
          </p>

          {/* Direct GitHub URL Input */}
          <form onSubmit={handleQuickImport} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="relative flex-1">
              <GitBranch className="w-4 h-4 text-[#D4D4D8]/40 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Enter GitHub URL (e.g. https://github.com/expressjs/express)"
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                className="w-full bg-[#141417] border border-white/10 rounded pl-10 pr-4 py-2.5 text-xs text-[#D4D4D8] placeholder-[#D4D4D8]/30 font-mono focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/40"
                disabled={importing}
              />
            </div>
            <button
              type="submit"
              disabled={importing || !quickUrl.trim()}
              className="flex items-center justify-center gap-2 border gold-border gold-accent text-[10px] uppercase tracking-[0.2em] font-medium bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] disabled:opacity-40 px-6 py-2.5 rounded transition-all cursor-pointer shrink-0"
            >
              {importing ? "Connecting..." : "Analyze Repository"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </section>

      {/* Real Statistics Cards */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setCurrentPage("analyzer")}
            className="bg-white/[0.03] border border-white/10 rounded-lg p-5 shadow-sm hover:border-[#C5A059]/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[#D4D4D8]/50 group-hover:text-[#C5A059] mb-2 transition-colors">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em]">Files Indexed</span>
              <FileCode className="w-4 h-4 text-[#C5A059]" />
            </div>
            <div className="serif-text text-3xl font-light text-white group-hover:text-[#C5A059] transition-colors">
              {stats.filesIndexed.toLocaleString()}
            </div>
            <p className="text-[11px] text-[#D4D4D8]/40 mt-1">Source files stored in database</p>
          </div>

          <div
            onClick={() => setCurrentPage("analyzer")}
            className="bg-white/[0.03] border border-white/10 rounded-lg p-5 shadow-sm hover:border-[#C5A059]/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[#D4D4D8]/50 group-hover:text-[#C5A059] mb-2 transition-colors">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em]">Languages Detected</span>
              <Code2 className="w-4 h-4 text-[#C5A059]" />
            </div>
            <div className="serif-text text-3xl font-light text-white group-hover:text-[#C5A059] transition-colors">
              {stats.languagesDetected}
            </div>
            <p className="text-[11px] text-[#D4D4D8]/40 mt-1">Distinct stacks & runtimes</p>
          </div>

          <div
            onClick={() => setCurrentPage("readme")}
            className="bg-white/[0.03] border border-white/10 rounded-lg p-5 shadow-sm hover:border-[#C5A059]/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[#D4D4D8]/50 group-hover:text-[#C5A059] mb-2 transition-colors">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em]">Documentation Score</span>
              <FileCheck className="w-4 h-4 text-[#C5A059]" />
            </div>
            <div className="serif-text text-3xl font-light text-white flex items-center gap-2 group-hover:text-[#C5A059] transition-colors">
              <span>{stats.documentationScore ? `${stats.documentationScore}%` : "—"}</span>
              {stats.documentationScore > 0 && (
                <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-medium border ${
                  stats.documentationScore >= 80 ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/30'
                }`}>
                  {stats.documentationScore >= 80 ? 'Optimal' : 'Moderate'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#D4D4D8]/40 mt-1">README, typing & doc coverage</p>
          </div>

          <div
            onClick={() => setCurrentPage("analyzer")}
            className="bg-white/[0.03] border border-white/10 rounded-lg p-5 shadow-sm hover:border-[#C5A059]/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[#D4D4D8]/50 group-hover:text-[#C5A059] mb-2 transition-colors">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em]">Health Score</span>
              <Layers className="w-4 h-4 text-[#C5A059]" />
            </div>
            <div className="serif-text text-3xl font-light text-white flex items-center gap-2 group-hover:text-[#C5A059] transition-colors">
              <span>{stats.repositoryHealthScore ? `${stats.repositoryHealthScore}%` : "—"}</span>
              {stats.repositoryHealthScore > 0 && (
                <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-medium border ${
                  stats.repositoryHealthScore >= 80 ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/30'
                }`}>
                  {stats.repositoryHealthScore >= 80 ? 'Solid' : 'Review'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#D4D4D8]/40 mt-1">Modularity & hygiene index</p>
          </div>
        </div>
      </section>

      {/* Repositories Grid & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Repositories List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="serif-text text-base text-white tracking-wide uppercase flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-[#C5A059]" /> Indexed Repositories ({activeRepos.length})
            </h2>
            <button
              onClick={onOpenImportModal}
              className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059] hover:text-white font-medium flex items-center gap-1 transition-colors"
            >
              + Add Repository
            </button>
          </div>

          {activeRepos.length === 0 ? (
            <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-lg p-10 text-center">
              <FolderGit2 className="w-10 h-10 text-[#D4D4D8]/30 mx-auto mb-3" />
              <h3 className="serif-text text-lg text-white font-light mb-1">No repositories analyzed yet</h3>
              <p className="text-xs text-[#D4D4D8]/60 max-w-sm mx-auto mb-5 font-light">
                Connect a GitHub repository or upload source code to generate architecture vectors and health metrics.
              </p>
              <button
                onClick={onOpenImportModal}
                className="border gold-border gold-accent text-[10px] uppercase tracking-[0.2em] font-medium bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] px-5 py-2.5 rounded transition-all"
              >
                Analyze First Repository
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRepos.map((repo) => {
                const isComplete = repo.analysis_status === "complete";
                const isFailed = repo.analysis_status === "failed";
                const isProcessing = !isComplete && !isFailed;

                return (
                  <div
                    key={repo.id}
                    className="bg-white/[0.02] border border-white/10 hover:border-[#C5A059]/50 rounded-lg p-5 transition-all shadow-sm group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span
                            onClick={() => {
                              onSelectRepo(repo.id);
                              setCurrentPage("analyzer");
                            }}
                            className="serif-text text-lg font-light text-white hover:text-[#C5A059] cursor-pointer transition-colors"
                          >
                            {repo.github_owner}/{repo.github_repo}
                          </span>
                          <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-medium border ${
                            isComplete
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : isFailed
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : "bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/30 animate-pulse"
                          }`}>
                            {repo.analysis_status}
                          </span>
                        </div>
                        <p className="text-xs text-[#D4D4D8]/60 mt-1 line-clamp-1 font-light">{repo.description || "No description provided."}</p>
                      </div>

                      {/* Quick action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            onSelectRepo(repo.id);
                            setCurrentPage("chat");
                          }}
                          className="px-3 py-1.5 rounded border border-white/10 bg-white/[0.02] hover:border-[#C5A059]/50 text-[10px] uppercase tracking-wider text-[#D4D4D8] hover:text-[#C5A059] font-medium transition-all"
                        >
                          Ask AI
                        </button>
                        <button
                          onClick={() => {
                            onSelectRepo(repo.id);
                            setCurrentPage("analyzer");
                          }}
                          className="px-3 py-1.5 rounded border gold-border gold-accent bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] text-[10px] uppercase tracking-wider font-medium transition-all flex items-center gap-1.5"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar for ongoing ingestion */}
                    {isProcessing && (
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] font-mono text-[#D4D4D8]/60 mb-1">
                          <span>Pipeline: {repo.analysis_status}</span>
                          <span>{repo.analysis_progress}%</span>
                        </div>
                        <div className="w-full bg-[#141417] rounded-full h-1 overflow-hidden border border-white/5">
                          <div
                            className="bg-[#C5A059] h-1 rounded-full transition-all duration-500"
                            style={{ width: `${repo.analysis_progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Meta stats footer */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#D4D4D8]/50 font-mono">
                      <div className="flex items-center gap-4">
                        <span>{repo.files_count || 0} files</span>
                        <span>{repo.languages_count || 0} languages</span>
                        {repo.health_score ? (
                          <span className="text-[#C5A059] font-medium">Health: {repo.health_score}%</span>
                        ) : null}
                      </div>
                      <span className="text-[#D4D4D8]/40">
                        Indexed {new Date(repo.indexed_at || repo.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Real Activity Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="serif-text text-base text-white tracking-wide uppercase flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-[#C5A059]" /> Recent Activities
            </h2>
            <button
              onClick={onRefreshData}
              title="Refresh activity feed"
              className="text-[#D4D4D8]/40 hover:text-[#C5A059] p-1 rounded transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4 divide-y divide-white/10 shadow-sm max-h-[500px] overflow-y-auto">
            {activities.length === 0 ? (
              <div className="text-xs text-[#D4D4D8]/40 text-center py-8 italic font-light">
                No activity recorded yet. Connect a repository to start tracking.
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded border border-white/10 bg-white/[0.02] text-[#C5A059] shrink-0">
                    {act.activity_type.includes("import") ? (
                      <GitBranch className="w-3.5 h-3.5 text-[#C5A059]" />
                    ) : act.activity_type.includes("question") ? (
                      <Code2 className="w-3.5 h-3.5 text-[#C5A059]" />
                    ) : act.activity_type.includes("readme") ? (
                      <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                    ) : act.activity_type.includes("failed") ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white truncate">{act.title}</p>
                    {act.description && (
                      <p className="text-[11px] text-[#D4D4D8]/60 mt-0.5 line-clamp-2 leading-relaxed font-mono">
                        {act.description}
                      </p>
                    )}
                    <span className="text-[10px] text-[#D4D4D8]/40 font-mono mt-1 block">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(act.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
