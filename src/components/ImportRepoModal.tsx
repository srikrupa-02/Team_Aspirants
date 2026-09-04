import React, { useState } from "react";
import { X, GitBranch, Upload, ArrowRight, Loader2, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { repositoryService } from "../services/api.js";
import { useToast } from "../context/ToastContext.js";

interface ImportRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (repoId: string) => void;
}

export const ImportRepoModal: React.FC<ImportRepoModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<"github" | "upload">("github");
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFiles, setUploadFiles] = useState<{ path: string; name: string; content: string }[]>([]);

  const toast = useToast();

  if (!isOpen) return null;

  const handleGitHubImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim()) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await repositoryService.importGitHub(githubUrl.trim());
      toast.success("Repository connected!", "Import pipeline queued and indexing files.");
      onSuccess(res.repository.id);
      onClose();
      setGithubUrl("");
    } catch (err: any) {
      setError(err.message || "Failed to import GitHub repository");
      toast.error("Import failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: { path: string; name: string; content: string }[] = [];
    const readers: Promise<void>[] = [];

    Array.from(files).slice(0, 30).forEach((file: File) => {
      const p = new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          fileList.push({
            path: (file as any).webkitRelativePath || file.name,
            name: file.name,
            content: reader.result as string
          });
          resolve();
        };
        reader.readAsText(file);
      });
      readers.push(p);
    });

    Promise.all(readers).then(() => {
      setUploadFiles(fileList);
      if (!uploadName && fileList[0]) {
        setUploadName(fileList[0].name.split(".")[0] || "my-project");
      }
    });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim() || uploadFiles.length === 0) {
      setError("Please specify a project name and select files to upload.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await repositoryService.uploadLocal({
        name: uploadName.trim(),
        description: uploadDescription || "Uploaded codebase",
        files: uploadFiles
      });
      toast.success("Codebase uploaded!", "Generating vector embeddings and analysis.");
      onSuccess(res.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to upload codebase");
    } finally {
      setLoading(false);
    }
  };

  const sampleRepos = [
    { name: "expressjs/express", url: "https://github.com/expressjs/express" },
    { name: "colinhacks/zod", url: "https://github.com/colinhacks/zod" },
    { name: "pallets/flask", url: "https://github.com/pallets/flask" },
    { name: "reduxjs/redux", url: "https://github.com/reduxjs/redux" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0F0F11] border border-white/10 rounded-lg w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded border border-[#C5A059]/30 bg-[#C5A059]/10 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-[#C5A059]" />
            </div>
            <div>
              <h3 className="serif-text text-base font-medium text-white">Import & Analyze Codebase</h3>
              <p className="text-[11px] text-[#D4D4D8]/60 font-light">Index repository source files and generate architecture vectors</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#D4D4D8]/40 hover:text-white p-1 rounded transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/10 px-5 pt-2">
          <button
            onClick={() => { setActiveTab("github"); setError(null); }}
            className={`pb-2.5 px-3 text-xs font-medium tracking-wide border-b-2 transition-all cursor-pointer ${
              activeTab === "github"
                ? "border-[#C5A059] text-[#C5A059]"
                : "border-transparent text-[#D4D4D8]/50 hover:text-white"
            }`}
          >
            GitHub Repository
          </button>
          <button
            onClick={() => { setActiveTab("upload"); setError(null); }}
            className={`pb-2.5 px-3 text-xs font-medium tracking-wide border-b-2 transition-all cursor-pointer ${
              activeTab === "upload"
                ? "border-[#C5A059] text-[#C5A059]"
                : "border-transparent text-[#D4D4D8]/50 hover:text-white"
            }`}
          >
            Upload Source Files
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded bg-rose-950/40 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-200 font-light">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "github" ? (
            <form onSubmit={handleGitHubImport} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">
                  GitHub Repository URL
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/owner/repository"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full bg-[#141417] border border-white/10 rounded px-4 py-2.5 text-xs text-[#D4D4D8] font-mono placeholder-[#D4D4D8]/30 focus:outline-none focus:border-[#C5A059]"
                  disabled={loading}
                />
                <p className="text-[11px] text-[#D4D4D8]/50 mt-1 font-light">
                  Supports any public repository URL (e.g. <code className="text-[#C5A059]">https://github.com/facebook/react</code>)
                </p>
              </div>

              {/* Sample Presets */}
              <div>
                <span className="text-[9px] uppercase font-medium tracking-[0.2em] text-[#D4D4D8]/50 block">
                  Or pick a popular open-source repository:
                </span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {sampleRepos.map(s => (
                    <button
                      type="button"
                      key={s.name}
                      onClick={() => setGithubUrl(s.url)}
                      className="text-left px-3 py-2 rounded bg-white/[0.02] border border-white/10 hover:border-[#C5A059]/50 text-xs font-mono text-[#D4D4D8] transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span>{s.name}</span>
                      <ArrowRight className="w-3 h-3 text-[#D4D4D8]/40" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-light text-[#D4D4D8]/60 hover:text-white cursor-pointer"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !githubUrl.trim()}
                  className="flex items-center gap-2 border gold-border gold-accent text-[10px] uppercase tracking-wider font-medium bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] disabled:opacity-40 px-5 py-2.5 rounded shadow-sm transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting GitHub API...</span>
                    </>
                  ) : (
                    <>
                      <GitBranch className="w-4 h-4" />
                      <span>Start Analysis Pipeline</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. my-backend-service"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full bg-[#141417] border border-white/10 rounded px-4 py-2.5 text-xs text-[#D4D4D8] font-mono focus:outline-none focus:border-[#C5A059]"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Brief summary of codebase..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full bg-[#141417] border border-white/10 rounded px-4 py-2 text-xs text-[#D4D4D8] focus:outline-none focus:border-[#C5A059]"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">Select Source Files</label>
                <div className="border border-dashed border-white/20 rounded-lg p-6 text-center hover:border-[#C5A059]/50 transition-colors bg-white/[0.02] cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={loading}
                  />
                  <Upload className="w-8 h-8 text-[#C5A059] mx-auto mb-2" />
                  <p className="text-xs font-medium text-white">Click or drag & drop files here</p>
                  <p className="text-[10px] text-[#D4D4D8]/50 mt-1 font-light">Accepts .ts, .js, .py, .go, .rs, .json, etc. (up to 30 files)</p>
                </div>
                {uploadFiles.length > 0 && (
                  <p className="text-xs text-emerald-400 font-mono mt-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {uploadFiles.length} files selected ready for indexing
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-light text-[#D4D4D8]/60 hover:text-white cursor-pointer"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadFiles.length === 0 || !uploadName.trim()}
                  className="flex items-center gap-2 border gold-border gold-accent text-[10px] uppercase tracking-wider font-medium bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] disabled:opacity-40 px-5 py-2.5 rounded shadow-sm transition-all cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>Upload & Index</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
