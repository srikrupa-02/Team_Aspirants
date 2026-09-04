import React from "react";
import {
  LayoutDashboard,
  GitBranch,
  MessageSquareCode,
  FileText,
  GraduationCap,
  Settings,
  LogOut,
  FolderGit2,
  Cpu,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { Repository } from "../types.js";

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  repositories: Repository[];
  selectedRepoId: string | null;
  setSelectedRepoId: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  setCurrentPage,
  repositories,
  selectedRepoId,
  setSelectedRepoId
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analyzer", label: "Repository Analyzer", icon: GitBranch },
    { id: "chat", label: "Ask My Codebase", icon: MessageSquareCode },
    { id: "readme", label: "README Generator", icon: FileText },
    { id: "skills", label: "Skill Gap Analysis", icon: GraduationCap },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  const selectedRepo = repositories.find(r => r.id === selectedRepoId);

  return (
    <aside className="w-64 bg-[#0F0F11] border-r border-white/10 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div
          onClick={() => setCurrentPage("dashboard")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg border border-[#C5A059]/40 bg-white/[0.02] p-0.5 shadow-sm group-hover:border-[#C5A059] transition-all">
            <div className="w-full h-full bg-[#0F0F11] rounded-[6px] flex items-center justify-center">
              <Cpu className="w-4 h-4 text-[#C5A059] group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="serif-text tracking-[0.15em] font-light text-white text-base uppercase">BUILDREX</span>
              <span className="text-[9px] uppercase font-medium tracking-[0.2em] px-1.5 py-0.5 rounded border border-[#C5A059]/40 text-[#C5A059] bg-[#C5A059]/10">AI</span>
            </div>
            <p className="text-[9.5px] text-[#D4D4D8]/70 font-normal tracking-tight leading-tight mt-0.5">
              Your AI engineer that reads the entire codebase.
            </p>
          </div>
        </div>
      </div>

      {/* Active Repository Switcher */}
      <div className="px-4 py-3 border-b border-white/10 bg-white/[0.01]">
        <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.2em] text-[#D4D4D8]/60 mb-1.5">
          <span className="flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-[#C5A059]" /> Active Repo
          </span>
          <span className="text-[9px] text-[#D4D4D8]/40 font-mono tracking-normal">{repositories.length} indexed</span>
        </div>

        {repositories.length === 0 ? (
          <div className="text-xs text-[#D4D4D8]/40 italic py-1">No repositories indexed</div>
        ) : (
          <select
            value={selectedRepoId || ""}
            onChange={(e) => setSelectedRepoId(e.target.value)}
            className="w-full text-xs font-mono bg-[#141417] border border-white/10 rounded px-2.5 py-2 text-[#D4D4D8] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/50 cursor-pointer transition-colors"
          >
            {repositories.map(r => (
              <option key={r.id} value={r.id} className="bg-[#141417] text-[#D4D4D8]">
                {r.github_owner}/{r.github_repo} ({r.analysis_status})
              </option>
            ))}
          </select>
        )}

        {selectedRepo && (
          <div className="mt-2 flex items-center justify-between text-[10px] text-[#D4D4D8]/60 font-mono">
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${selectedRepo.analysis_status === 'complete' ? 'bg-[#C5A059]' : selectedRepo.analysis_status === 'failed' ? 'bg-rose-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="capitalize">{selectedRepo.analysis_status}</span>
            </span>
            <span>{selectedRepo.files_count || 0} files</span>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#D4D4D8]/40 px-3 mb-2">Platform</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-medium transition-all ${
                isActive
                  ? "bg-white/[0.04] text-white border border-[#C5A059]/60 shadow-[0_0_12px_rgba(197,160,89,0.06)]"
                  : "text-[#D4D4D8]/60 hover:text-white hover:bg-white/[0.02] border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-[#C5A059]" : "text-[#D4D4D8]/50"}`} />
                <span className={isActive ? "text-white" : ""}>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#C5A059]" />}
            </button>
          );
        })}
      </nav>

      {/* AI Engine Status Badge */}
      <div className="px-4 py-3 mx-3 mb-3 rounded border border-white/10 bg-white/[0.02] text-[11px]">
        <div className="flex items-center gap-2 text-[#C5A059] font-medium text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
          <span className="uppercase tracking-[0.1em] text-[10px]">Server-Side RAG</span>
        </div>
        <p className="text-[10px] text-[#D4D4D8]/60 mt-1 leading-tight font-mono">
          Gemini 3.8 & Vector Engine active
        </p>
      </div>

      {/* User Profile & Logout */}
      <div className="p-3 border-t border-white/10 bg-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded border border-[#C5A059]/40 bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] serif-text font-bold text-sm shrink-0">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.full_name || "Developer"}</p>
              <p className="text-[10px] text-[#D4D4D8]/50 truncate">{user?.company || user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-[#D4D4D8]/50 hover:text-[#C5A059] hover:bg-white/[0.04] rounded transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
