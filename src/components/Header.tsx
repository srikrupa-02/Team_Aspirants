import React, { useState } from "react";
import { Search, Plus, Bell, Sparkles, X, ExternalLink, GitBranch, FileCode } from "lucide-react";
import { Repository } from "../types.js";

interface HeaderProps {
  currentPage: string;
  onOpenImportModal: () => void;
  repositories: Repository[];
  onSelectRepo: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onOpenImportModal,
  repositories,
  onSelectRepo
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const titles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: "Command Center", subtitle: "Real-time codebase health and index overview" },
    analyzer: { title: "Repository Architecture Analyzer", subtitle: "Inspect dependencies, structure, and AI observations" },
    chat: { title: "Ask My Codebase", subtitle: "Vector RAG natural language code search" },
    readme: { title: "Production README Generator", subtitle: "Automated documentation synthesis" },
    skills: { title: "Developer Skill-Gap Report", subtitle: "Engineering stack readiness and recommendations" },
    settings: { title: "Settings & System Status", subtitle: "Database, AI providers, and Supabase migrations" }
  };

  const filteredRepos = searchQuery.trim()
    ? repositories.filter(
        r =>
          r.github_repo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.github_owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  return (
    <header className="h-16 border-b border-white/10 bg-[#0F0F11]/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Title & Page Info */}
      <div>
        <h1 className="serif-text text-lg text-white font-light tracking-wide flex items-center gap-2">
          {titles[currentPage]?.title || "Buildrex AI"}
        </h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4D4D8]/50 font-medium">
          {titles[currentPage]?.subtitle || "Codebase Intelligence"}
        </p>
      </div>

      {/* Center Search & Right Controls */}
      <div className="flex items-center gap-3">
        {/* Global Search */}
        <div className="relative">
          <div className="flex items-center bg-[#141417] border border-white/10 rounded px-3 py-1.5 w-64 md:w-80 focus-within:border-[#C5A059] focus-within:ring-1 focus-within:ring-[#C5A059]/40 transition-all">
            <Search className="w-3.5 h-3.5 text-[#D4D4D8]/50 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search indexed repositories..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="bg-transparent text-xs text-[#D4D4D8] placeholder-[#D4D4D8]/40 focus:outline-none w-full font-mono"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-[#D4D4D8]/50 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearchOpen && searchQuery && (
            <div className="absolute top-11 right-0 w-80 bg-[#141417] border border-white/10 rounded-lg shadow-2xl p-2 z-50">
              <div className="text-[9px] uppercase tracking-[0.2em] font-medium text-[#C5A059] px-2 py-1">Repositories</div>
              {filteredRepos.length === 0 ? (
                <div className="text-xs text-[#D4D4D8]/40 p-2 italic">No repositories found</div>
              ) : (
                filteredRepos.map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      onSelectRepo(r.id);
                      setIsSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="w-full text-left p-2 rounded hover:bg-white/[0.04] transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-medium text-[#C5A059] font-mono">
                        {r.github_owner}/{r.github_repo}
                      </p>
                      <p className="text-[10px] text-[#D4D4D8]/60 truncate max-w-[200px]">{r.description}</p>
                    </div>
                    <GitBranch className="w-3.5 h-3.5 text-[#D4D4D8]/40" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Primary Action: Analyze Repository */}
        <button
          onClick={onOpenImportModal}
          className="flex items-center gap-2 border gold-border gold-accent text-[10px] uppercase tracking-[0.2em] font-medium bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] px-4 py-2 rounded transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Analyze Repository</span>
        </button>
      </div>
    </header>
  );
};
