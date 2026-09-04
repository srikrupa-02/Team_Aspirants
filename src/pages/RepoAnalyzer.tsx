import React, { useState, useEffect } from "react";
import {
  GitBranch,
  Layers,
  FileCode,
  Package,
  ShieldAlert,
  Activity,
  RefreshCw,
  Trash2,
  ExternalLink,
  Search,
  Copy,
  Check,
  ChevronRight,
  Folder,
  File,
  Code2,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileText,
  Download,
  X
} from "lucide-react";
import {
  Repository,
  RepositoryAnalysis,
  RepositoryFile,
  RepositoryLanguage,
  RepositoryDependency,
  RepositoryInsight
} from "../types.js";
import { repositoryService } from "../services/api.js";
import { useToast } from "../context/ToastContext.js";

interface RepoAnalyzerProps {
  repositoryId: string | null;
  onDeleted: () => void;
  setCurrentPage: (page: string) => void;
}

export const RepoAnalyzer: React.FC<RepoAnalyzerProps> = ({
  repositoryId,
  onDeleted,
  setCurrentPage
}) => {
  const [repo, setRepo] = useState<Repository | null>(null);
  const [analysis, setAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [languages, setLanguages] = useState<RepositoryLanguage[]>([]);
  const [dependencies, setDependencies] = useState<RepositoryDependency[]>([]);
  const [insights, setInsights] = useState<RepositoryInsight[]>([]);

  const [activeTab, setActiveTab] = useState<"overview" | "files" | "stack" | "insights">("overview");
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [depSearch, setDepSearch] = useState("");
  const [insightFilter, setInsightFilter] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  const loadData = async () => {
    if (!repositoryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [rRes, aRes, fRes, lRes, dRes, iRes] = await Promise.all([
        repositoryService.getById(repositoryId),
        repositoryService.getAnalysis(repositoryId),
        repositoryService.getFiles(repositoryId),
        repositoryService.getLanguages(repositoryId),
        repositoryService.getDependencies(repositoryId),
        repositoryService.getInsights(repositoryId)
      ]);

      setRepo(rRes.repository);
      setAnalysis(aRes.analysis);
      setFiles(fRes.files);
      if (fRes.files.length > 0) {
        // Load first file content
        const firstFile = await repositoryService.getFileContent(repositoryId, fRes.files[0].id);
        setSelectedFile(firstFile.file);
      }
      setLanguages(lRes.languages);
      setDependencies(dRes.dependencies);
      setInsights(iRes.insights);
    } catch (err: any) {
      toast.error("Failed to load repository data", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [repositoryId]);

  const handleSelectFile = async (f: RepositoryFile) => {
    if (!repositoryId) return;
    try {
      const res = await repositoryService.getFileContent(repositoryId, f.id);
      setSelectedFile(res.file);
    } catch (e: any) {
      toast.error("Could not load file", e.message);
    }
  };

  const handleReanalyze = async () => {
    if (!repositoryId) return;
    setReanalyzing(true);
    try {
      await repositoryService.reanalyze(repositoryId);
      toast.success("Re-analysis scheduled", "Processing repository files and updating vectors.");
      setTimeout(() => {
        loadData();
        setReanalyzing(false);
      }, 3000);
    } catch (err: any) {
      toast.error("Re-analysis error", err.message);
      setReanalyzing(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!repositoryId || !repo) return;
    setDeleting(true);
    try {
      await repositoryService.delete(repositoryId);
      toast.success("Repository deleted");
      setShowDeleteModal(false);
      onDeleted();
    } catch (err: any) {
      toast.error("Delete failed", err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadFile = () => {
    if (!selectedFile?.file_content) return;
    const blob = new Blob([selectedFile.file_content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedFile.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloaded ${selectedFile.file_name}`);
  };

  const handleExportDependencies = () => {
    if (dependencies.length === 0 || !repo) return;
    const jsonStr = JSON.stringify(dependencies, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${repo.github_repo}-dependencies.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Dependencies exported as JSON");
  };

  const copyCodeToClipboard = () => {
    if (!selectedFile?.file_content) return;
    navigator.clipboard.writeText(selectedFile.file_content);
    setCopiedCode(true);
    toast.info("Copied code to clipboard");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!repositoryId) {
    return (
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-12 text-center max-w-lg mx-auto mt-10">
        <GitBranch className="w-12 h-12 text-[#D4D4D8]/30 mx-auto mb-4" />
        <h2 className="serif-text text-xl font-light text-white mb-2">No repository selected</h2>
        <p className="text-xs text-[#D4D4D8]/60 mb-6 font-light">Select an existing repository from the sidebar or import a new one.</p>
        <button
          onClick={() => setCurrentPage("dashboard")}
          className="border gold-border gold-accent text-[10px] uppercase tracking-[0.2em] font-medium bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] px-5 py-2.5 rounded transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24 text-[#D4D4D8]/50 font-mono text-xs">
        <RefreshCw className="w-4 h-4 animate-spin mr-3 text-[#C5A059]" />
        <span>Loading repository intelligence...</span>
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="p-8 text-center text-xs text-[#D4D4D8]/50 font-light">
        Repository could not be found or was removed.
      </div>
    );
  }

  const filteredFiles = files.filter(f =>
    f.file_path.toLowerCase().includes(fileSearch.toLowerCase())
  );

  const filteredDeps = dependencies.filter(d =>
    d.dependency_name.toLowerCase().includes(depSearch.toLowerCase()) ||
    d.package_manager.toLowerCase().includes(depSearch.toLowerCase())
  );

  const filteredInsights = insightFilter === "all"
    ? insights
    : insights.filter(i => i.severity === insightFilter);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6 shadow-sm relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-24 h-24 border-t border-r gold-border opacity-20 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="serif-text text-2xl font-light text-white">
                {repo.github_owner}/{repo.github_repo}
              </h2>
              <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-medium border ${
                repo.analysis_status === 'complete'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : repo.analysis_status === 'failed'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/30 animate-pulse'
              }`}>
                {repo.analysis_status}
              </span>
            </div>
            <p className="text-xs text-[#D4D4D8]/70 mt-1.5 max-w-3xl leading-relaxed font-light">
              {repo.description || "Source code repository indexed by Buildrex AI."}
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs text-[#D4D4D8]/50 font-mono">
              <a
                href={repo.github_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-[#C5A059] transition-colors"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span>Branch: <b className="text-white font-normal">{repo.default_branch}</b></span>
              <span>Indexed: <b className="text-white font-normal">{files.length} files</b></span>
              {repo.health_score ? (
                <span className="text-[#C5A059] font-medium">Health: {repo.health_score}%</span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="flex items-center gap-1.5 px-3 py-2 rounded border gold-border gold-accent text-[10px] uppercase tracking-wider font-medium bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reanalyzing ? 'animate-spin text-[#0F0F11]' : ''}`} />
              <span>{reanalyzing ? "Analyzing..." : "Re-Analyze"}</span>
            </button>
            <button
              onClick={handleDeleteClick}
              className="flex items-center gap-1.5 px-3 py-2 rounded border border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/40 text-[10px] uppercase tracking-wider font-medium text-rose-300 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 mt-6 border-t border-white/10 pt-4 overflow-x-auto">
          {[
            { id: "overview", label: "Architecture Overview", icon: Layers },
            { id: "files", label: `File Explorer (${files.length})`, icon: FileCode },
            { id: "stack", label: `Tech Stack & Deps (${dependencies.length})`, icon: Package },
            { id: "insights", label: `Code Insights (${insights.length})`, icon: ShieldAlert }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded text-[10px] uppercase tracking-wider font-medium transition-all shrink-0 cursor-pointer ${
                  active
                    ? "border gold-border gold-accent bg-[#C5A059]/10"
                    : "text-[#D4D4D8]/60 hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & ARCHITECTURE */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Architecture Summary */}
            <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-[#C5A059]" />
                <h3 className="serif-text text-base font-medium text-white tracking-wide">System Architecture Summary</h3>
              </div>
              <p className="text-xs text-[#D4D4D8]/70 leading-relaxed font-light">
                {analysis?.architecture_summary || "Architectural analysis pending or completed without summary."}
              </p>

              {/* Detected Frameworks Pills */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <span className="text-[10px] uppercase font-medium text-[#D4D4D8]/40 tracking-wider block mb-2">Detected Frameworks & Modules</span>
                <div className="flex flex-wrap gap-1.5">
                  {(analysis?.detected_frameworks || ["Standard Runtime"]).map((fw, idx) => (
                    <span key={idx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.03] text-[#C5A059] border border-[#C5A059]/30">
                      {fw}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Project Purpose & Scope */}
            <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[#C5A059]" />
                <h3 className="serif-text text-base font-medium text-white tracking-wide">Project Purpose & Scope</h3>
              </div>
              <p className="text-xs text-[#D4D4D8]/70 leading-relaxed font-light">
                {analysis?.project_summary || repo.description}
              </p>

              {/* Score Badges */}
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
                <div className="p-3 rounded bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] text-[#D4D4D8]/50 uppercase font-mono block">Doc Score</span>
                  <span className="serif-text text-2xl font-light text-white">
                    {analysis?.documentation_score ? `${analysis.documentation_score}%` : "—"}
                  </span>
                </div>
                <div className="p-3 rounded bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] text-[#D4D4D8]/50 uppercase font-mono block">Health Index</span>
                  <span className="serif-text text-2xl font-light text-[#C5A059]">
                    {analysis?.repository_health_score ? `${analysis.repository_health_score}%` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Features */}
          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6">
            <h3 className="serif-text text-base font-medium text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C5A059]" /> Key Features & Capabilities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(analysis?.main_features || []).map((feat, idx) => (
                <div key={idx} className="p-4 rounded bg-white/[0.02] border border-white/10">
                  <h4 className="serif-text text-sm font-medium text-white mb-1">{feat.title}</h4>
                  <p className="text-[11px] text-[#D4D4D8]/60 leading-relaxed font-light">{feat.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Folder Structure */}
          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6">
            <h3 className="serif-text text-base font-medium text-white mb-4 flex items-center gap-2">
              <Folder className="w-4 h-4 text-[#C5A059]" /> Directory Structure Role Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(analysis?.folder_structure || []).map((fold, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded bg-white/[0.02] border border-white/10">
                  <Folder className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-mono text-white font-medium">{fold.path}</span>
                    <p className="text-[11px] text-[#D4D4D8]/60 mt-0.5 font-light">{fold.purpose}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FILE EXPLORER */}
      {activeTab === "files" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[550px]">
          {/* File Tree Left Column */}
          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4 flex flex-col">
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-[#D4D4D8]/40 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter files..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                className="w-full bg-[#141417] border border-white/10 rounded pl-9 pr-3 py-1.5 text-xs text-[#D4D4D8] placeholder-[#D4D4D8]/30 focus:outline-none focus:border-[#C5A059] font-mono"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[500px]">
              {filteredFiles.length === 0 ? (
                <div className="text-xs text-[#D4D4D8]/40 p-4 text-center italic font-light">No matching files</div>
              ) : (
                filteredFiles.map((file) => {
                  const isSelected = selectedFile?.id === file.id;
                  return (
                    <button
                      key={file.id}
                      onClick={() => handleSelectFile(file)}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30 font-medium"
                          : "text-[#D4D4D8]/70 hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileCode className={`w-3.5 h-3.5 ${isSelected ? "text-[#C5A059]" : "text-[#D4D4D8]/40"}`} />
                        <span className="truncate">{file.file_path}</span>
                      </div>
                      <span className="text-[10px] text-[#D4D4D8]/40 shrink-0">{file.language}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* File Viewer Right Column */}
          <div className="lg:col-span-2 bg-[#141417] border border-white/10 rounded-lg flex flex-col overflow-hidden shadow-inner">
            {selectedFile ? (
              <>
                <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-[#C5A059] font-medium">{selectedFile.file_path}</span>
                    <span className="text-[#D4D4D8]/30">•</span>
                    <span className="text-[#D4D4D8]/60">{selectedFile.language}</span>
                    <span className="text-[#D4D4D8]/30">•</span>
                    <span className="text-[#D4D4D8]/50">{Math.round(selectedFile.file_size / 1024)} KB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownloadFile}
                      className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#D4D4D8]/60 hover:text-white px-2.5 py-1 rounded border border-white/10 hover:border-[#C5A059]/40 transition-colors font-mono cursor-pointer"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={copyCodeToClipboard}
                      className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#D4D4D8]/60 hover:text-white px-2.5 py-1 rounded border border-white/10 hover:border-[#C5A059]/40 transition-colors font-mono cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 flex-1 overflow-x-auto overflow-y-auto max-h-[500px] font-mono text-xs text-[#D4D4D8] leading-relaxed bg-[#0F0F11]">
                  {selectedFile.file_content ? (
                    <pre className="whitespace-pre">
                      {selectedFile.file_content.split("\n").map((line, idx) => (
                        <div key={idx} className="table-row">
                          <span className="table-cell pr-4 text-[#D4D4D8]/30 select-none text-right w-10">{idx + 1}</span>
                          <span className="table-cell">{line}</span>
                        </div>
                      ))}
                    </pre>
                  ) : (
                    <div className="text-[#D4D4D8]/40 italic p-6 text-center font-light">
                      Binary or large file content not rendered directly in preview.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-[#D4D4D8]/40 italic p-12 font-light">
                Select a file from the explorer to view its contents
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TECH STACK & DEPENDENCIES */}
      {activeTab === "stack" && (
        <div className="space-y-6">
          {/* Languages breakdown */}
          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6">
            <h3 className="serif-text text-base font-medium text-white mb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#C5A059]" /> Programming Languages Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {languages.map((l) => (
                <div key={l.id} className="p-3 rounded bg-white/[0.02] border border-white/10">
                  <div className="flex justify-between items-center text-xs font-medium text-[#D4D4D8]">
                    <span>{l.language}</span>
                    <span className="font-mono text-[#C5A059]">{l.percentage}%</span>
                  </div>
                  <div className="w-full bg-[#141417] rounded-full h-1 mt-2 overflow-hidden border border-white/5">
                    <div className="bg-[#C5A059] h-1 rounded-full" style={{ width: `${l.percentage}%` }} />
                  </div>
                  <span className="text-[10px] text-[#D4D4D8]/40 font-mono mt-1 block">{l.file_count} files</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dependencies Table */}
          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="serif-text text-base font-medium text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-[#C5A059]" /> Declared Dependencies ({dependencies.length})
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 text-[#D4D4D8]/40 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search package..."
                    value={depSearch}
                    onChange={(e) => setDepSearch(e.target.value)}
                    className="w-full bg-[#141417] border border-white/10 rounded pl-9 pr-3 py-1.5 text-xs text-[#D4D4D8] placeholder-[#D4D4D8]/30 focus:outline-none focus:border-[#C5A059] font-mono"
                  />
                </div>
                {dependencies.length > 0 && (
                  <button
                    onClick={handleExportDependencies}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 hover:border-[#C5A059]/40 bg-white/[0.02] text-[10px] uppercase font-mono tracking-wider text-[#D4D4D8] hover:text-[#C5A059] transition-all cursor-pointer shrink-0"
                    title="Export dependencies list as JSON"
                  >
                    <Download className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span className="hidden sm:inline">Export JSON</span>
                  </button>
                )}
              </div>
            </div>

            <div className="border border-white/10 rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] text-[#D4D4D8]/60 uppercase font-mono text-[10px] border-b border-white/10">
                  <tr>
                    <th className="p-3 font-medium tracking-wider">Dependency</th>
                    <th className="p-3 font-medium tracking-wider">Version</th>
                    <th className="p-3 font-medium tracking-wider">Type</th>
                    <th className="p-3 font-medium tracking-wider">Package Manager</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 font-mono">
                  {filteredDeps.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-[#D4D4D8]/40 italic font-light">No dependencies found</td>
                    </tr>
                  ) : (
                    filteredDeps.map((dep) => (
                      <tr key={dep.id} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-medium text-[#C5A059]">{dep.dependency_name}</td>
                        <td className="p-3 text-[#D4D4D8]/70">{dep.version}</td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${
                            dep.dependency_type === 'production'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-white/[0.03] text-[#D4D4D8]/50 border-white/10'
                          }`}>
                            {dep.dependency_type}
                          </span>
                        </td>
                        <td className="p-3 text-[#D4D4D8]/50 uppercase text-[10px]">{dep.package_manager}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CODE INSIGHTS */}
      {activeTab === "insights" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {["all", "critical", "high", "medium", "low", "info"].map((sev) => (
              <button
                key={sev}
                onClick={() => setInsightFilter(sev)}
                className={`px-3 py-1.5 rounded text-[10px] uppercase tracking-wider font-medium font-mono transition-colors ${
                  insightFilter === sev
                    ? "border gold-border gold-accent bg-[#C5A059]/10"
                    : "bg-white/[0.02] text-[#D4D4D8]/60 hover:text-white border border-white/10"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredInsights.length === 0 ? (
              <div className="bg-white/[0.02] border border-white/10 rounded-lg p-10 text-center text-[#D4D4D8]/40 text-xs italic font-light">
                No insights found matching "{insightFilter}". Code health is high!
              </div>
            ) : (
              filteredInsights.map((ins) => (
                <div
                  key={ins.id}
                  className="bg-white/[0.02] border border-white/10 rounded-lg p-5 hover:border-[#C5A059]/40 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-medium border ${
                        ins.severity === 'critical' || ins.severity === 'high'
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          : ins.severity === 'medium'
                          ? 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/30'
                          : 'bg-white/[0.05] text-[#D4D4D8] border-white/20'
                      }`}>
                        {ins.severity}
                      </span>
                      <h4 className="serif-text text-sm font-medium text-white">{ins.title}</h4>
                    </div>
                    <span className="text-[10px] font-mono text-[#D4D4D8]/40 uppercase">{ins.insight_type}</span>
                  </div>

                  <p className="text-xs text-[#D4D4D8]/70 mt-2 leading-relaxed font-light">{ins.description}</p>

                  {ins.file_path && (
                    <button
                      onClick={() => {
                        setActiveTab("files");
                        const matched = files.find(f => f.file_path === ins.file_path || f.file_path.endsWith(ins.file_path!));
                        if (matched) {
                          handleSelectFile(matched);
                        }
                      }}
                      className="mt-3 flex items-center gap-2 text-xs font-mono text-[#D4D4D8]/60 hover:text-[#C5A059] bg-white/[0.02] hover:bg-[#C5A059]/10 px-3 py-1.5 rounded border border-white/10 hover:border-[#C5A059]/40 w-fit transition-all cursor-pointer"
                      title="Open file in File Explorer"
                    >
                      <FileCode className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>{ins.file_path}</span>
                      {ins.line_reference && <span className="text-[#D4D4D8]/40">({ins.line_reference})</span>}
                      <ExternalLink className="w-3 h-3 text-[#C5A059]/70 ml-1" />
                    </button>
                  )}

                  {ins.recommendation && (
                    <div className="mt-3 pt-3 border-t border-white/10 text-xs text-emerald-300 font-sans flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-emerald-200">Recommended Action: </span>
                        <span className="text-[#D4D4D8]/80 font-light">{ins.recommendation}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#141417] border border-white/10 rounded-lg max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-rose-400 font-medium text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="uppercase tracking-wider text-xs">Delete Repository</span>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-[#D4D4D8]/40 hover:text-white p-1 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-[#D4D4D8]/80">
              <p>
                Are you sure you want to delete <b className="text-white font-mono">{repo?.github_owner}/{repo?.github_repo}</b>?
              </p>
              <p className="text-[#D4D4D8]/60 leading-relaxed font-light">
                This action will permanently purge all indexed source files, vector embeddings, documentation, and chat sessions associated with this repository.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 rounded text-xs text-[#D4D4D8]/70 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? "Deleting..." : "Permanently Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
