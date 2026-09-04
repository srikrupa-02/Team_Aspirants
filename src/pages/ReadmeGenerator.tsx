import React, { useState, useEffect } from "react";
import {
  FileText,
  Sparkles,
  Download,
  Copy,
  Check,
  Save,
  RefreshCw,
  Eye,
  Code,
  FolderGit2
} from "lucide-react";
import { Repository, ReadmeDocument } from "../types.js";
import { readmeService } from "../services/api.js";
import { useToast } from "../context/ToastContext.js";

interface ReadmeGeneratorProps {
  repositories: Repository[];
  selectedRepoId: string | null;
  onSelectRepo: (id: string) => void;
}

export const ReadmeGenerator: React.FC<ReadmeGeneratorProps> = ({
  repositories,
  selectedRepoId,
  onSelectRepo
}) => {
  const [readme, setReadme] = useState<ReadmeDocument | null>(null);
  const [content, setContent] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("preview");
  const [copied, setCopied] = useState(false);

  const toast = useToast();
  const selectedRepo = repositories.find(r => r.id === selectedRepoId);

  useEffect(() => {
    if (!selectedRepoId) return;

    async function loadReadme() {
      setLoading(true);
      try {
        const res = await readmeService.getReadme(selectedRepoId);
        if (res.readme) {
          setReadme(res.readme);
          setContent(res.readme.content);
        } else {
          setReadme(null);
          setContent("");
        }
      } catch (err: any) {
        toast.error("Failed to load README", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadReadme();
  }, [selectedRepoId]);

  const handleGenerate = async () => {
    if (!selectedRepoId) return;
    setGenerating(true);
    try {
      const res = await readmeService.generateReadme(selectedRepoId, customPrompt.trim());
      setReadme(res.readme);
      setContent(res.readme.content);
      setViewMode("preview");
      toast.success("README Generated!", `Saved as version ${res.readme.version}`);
    } catch (err: any) {
      toast.error("Generation failed", err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedRepoId) return;
    setSaving(true);
    try {
      const res = await readmeService.saveReadme(selectedRepoId, content);
      if (readme) {
        setReadme({ ...readme, content, version: res.version });
      }
      toast.success("README Saved", `Updated to version ${res.version}`);
    } catch (err: any) {
      toast.error("Save failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.info("Markdown copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!content) return;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${selectedRepo?.github_repo || "repository"}-README.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started", "Saved README.md file");
  };

  if (repositories.length === 0) {
    return (
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-12 text-center max-w-md mx-auto mt-12">
        <FolderGit2 className="w-12 h-12 text-[#D4D4D8]/30 mx-auto mb-3" />
        <h3 className="serif-text text-xl font-light text-white mb-2">No repositories indexed</h3>
        <p className="text-xs text-[#D4D4D8]/60 font-light">Import a repository to generate technical documentation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Config Card */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#C5A059]" />
              <h2 className="serif-text text-lg font-medium text-white">Automated README Documentation Generator</h2>
              {readme && (
                <span className="text-[9px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30">
                  Version {readme.version}
                </span>
              )}
            </div>
            <p className="text-xs text-[#D4D4D8]/70 mt-1 font-light">
              Synthesizes installation, architecture, environment configuration, and API routes from source files.
            </p>
          </div>

          {/* Repo selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#D4D4D8]/50 font-mono">Repo:</span>
            <select
              value={selectedRepoId || ""}
              onChange={(e) => onSelectRepo(e.target.value)}
              className="text-xs font-mono bg-[#141417] border border-white/10 rounded px-3 py-2 text-[#D4D4D8] focus:outline-none focus:border-[#C5A059]"
            >
              {repositories.map(r => (
                <option key={r.id} value={r.id}>
                  {r.github_owner}/{r.github_repo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Instructions Input */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Custom instructions (e.g. 'Include Docker instructions and list all express routes')..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="flex-1 bg-[#141417] border border-white/10 rounded px-4 py-2 text-xs text-[#D4D4D8] placeholder-[#D4D4D8]/30 focus:outline-none focus:border-[#C5A059] font-mono"
            disabled={generating}
          />
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedRepoId}
            className="flex items-center justify-center gap-2 border gold-border gold-accent text-[10px] uppercase tracking-wider font-medium bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] disabled:opacity-40 px-5 py-2 rounded transition-all cursor-pointer shrink-0"
          >
            {generating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{readme ? "Regenerate README" : "Generate README"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor & Preview Workspace */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden shadow-xl flex flex-col min-h-[550px]">
        {/* Workspace Toolbar */}
        <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === "preview" ? "border gold-border gold-accent bg-[#C5A059]/10" : "text-[#D4D4D8]/60 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setViewMode("edit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === "edit" ? "border gold-border gold-accent bg-[#C5A059]/10" : "text-[#D4D4D8]/60 hover:text-white"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Markdown Editor</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !content}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/[0.02] border border-white/10 hover:border-[#C5A059]/50 text-xs font-light text-[#D4D4D8] hover:text-white transition-all disabled:opacity-40 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{saving ? "Saving..." : "Save to DB"}</span>
            </button>
            <button
              onClick={handleCopy}
              disabled={!content}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/[0.02] border border-white/10 hover:border-[#C5A059]/50 text-xs font-light text-[#D4D4D8] hover:text-white transition-all disabled:opacity-40 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={!content}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border gold-border gold-accent text-[10px] uppercase tracking-wider font-medium bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] transition-all disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-xs text-[#D4D4D8]/50 font-mono">
              <RefreshCw className="w-4 h-4 animate-spin mr-2 text-[#C5A059]" />
              <span>Loading README document...</span>
            </div>
          ) : !content ? (
            <div className="text-center py-20 space-y-3">
              <FileText className="w-12 h-12 text-[#D4D4D8]/30 mx-auto" />
              <h3 className="serif-text text-lg font-light text-white">No README Generated Yet</h3>
              <p className="text-xs text-[#D4D4D8]/60 max-w-sm mx-auto font-light">
                Click "Generate README" above to analyze the source files and synthesize comprehensive technical docs.
              </p>
            </div>
          ) : viewMode === "edit" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full min-h-[500px] bg-[#141417] border border-white/10 rounded p-5 text-xs font-mono text-[#D4D4D8] focus:outline-none focus:border-[#C5A059] leading-relaxed resize-y"
              placeholder="# Project Title..."
            />
          ) : (
            <div className="prose prose-invert max-w-none bg-[#141417] border border-white/10 rounded p-8 font-sans text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono text-[#D4D4D8]">
              {content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
