import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Database,
  Cpu,
  GitBranch,
  ShieldCheck,
  Download,
  Copy,
  Check,
  ExternalLink,
  User,
  Building,
  Briefcase,
  Mail,
  Server,
  Code2
} from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { SystemStatus } from "../types.js";
import { settingsService } from "../services/api.js";
import { useToast } from "../context/ToastContext.js";

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);
  const [migrationSql, setMigrationSql] = useState<string>("");

  const toast = useToast();

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await settingsService.getStatus();
        setStatus(res.system);

        // Fetch migration sql
        const sqlRes = await fetch(settingsService.exportMigrationUrl);
        const text = await sqlRes.text();
        setMigrationSql(text);
      } catch (err: any) {
        toast.error("Failed to load status", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(migrationSql);
    setCopiedSql(true);
    toast.info("Copied Supabase SQL migration to clipboard");
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([migrationSql], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "20260904_buildrex_schema.sql");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded SQL", "20260904_buildrex_schema.sql ready for Supabase");
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-5xl">
      {/* Settings Header */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-[#C5A059]/30 bg-[#C5A059]/10 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-[#C5A059]" />
          </div>
          <div>
            <h2 className="serif-text text-lg font-medium text-white">System Infrastructure & Database</h2>
            <p className="text-xs text-[#D4D4D8]/70 mt-0.5 font-light">
              Multi-model AI runtime, vector similarity, and production Supabase migration configuration.
            </p>
          </div>
        </div>
      </div>

      {/* Developer Profile Info */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6 shadow-sm">
        <h3 className="serif-text text-base font-medium text-white mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-[#C5A059]" /> Developer Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3.5 rounded bg-white/[0.02] border border-white/10">
            <span className="text-[9px] uppercase font-medium tracking-[0.2em] text-[#D4D4D8]/50 font-mono block mb-1">Full Name</span>
            <span className="text-xs font-light text-white">{user?.full_name || "Developer"}</span>
          </div>

          <div className="p-3.5 rounded bg-white/[0.02] border border-white/10">
            <span className="text-[9px] uppercase font-medium tracking-[0.2em] text-[#D4D4D8]/50 font-mono block mb-1">Email</span>
            <span className="text-xs font-light text-white font-mono truncate block">{user?.email}</span>
          </div>

          <div className="p-3.5 rounded bg-white/[0.02] border border-white/10">
            <span className="text-[9px] uppercase font-medium tracking-[0.2em] text-[#D4D4D8]/50 font-mono block mb-1">Company</span>
            <span className="text-xs font-light text-white">{user?.company || "Autonomous Tech"}</span>
          </div>

          <div className="p-3.5 rounded bg-white/[0.02] border border-white/10">
            <span className="text-[9px] uppercase font-medium tracking-[0.2em] text-[#D4D4D8]/50 font-mono block mb-1">Role</span>
            <span className="text-xs font-light text-white">{user?.job_title || "Engineer"}</span>
          </div>
        </div>
      </div>

      {/* Live System Indicators */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6 shadow-sm">
        <h3 className="serif-text text-base font-medium text-white mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-[#C5A059]" /> Live Integrations & Health
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AI Provider */}
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10 flex items-start gap-3 hover:border-[#C5A059]/40 transition-all">
            <Cpu className="w-5 h-5 text-[#C5A059] mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="serif-text text-sm font-medium text-white">AI Engine</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-[#D4D4D8]/70 mt-1 font-mono">{status?.activeProvider || "Gemini 3.8 Flash"}</p>
              <p className="text-[10px] text-[#D4D4D8]/50 mt-1 font-light">Direct server-side SDK execution with automatic fallback</p>
            </div>
          </div>

          {/* Vector Engine */}
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10 flex items-start gap-3 hover:border-[#C5A059]/40 transition-all">
            <Code2 className="w-5 h-5 text-[#C5A059] mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="serif-text text-sm font-medium text-white">Vector Similarity Engine</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30">
                  768-dim
                </span>
              </div>
              <p className="text-[11px] text-[#D4D4D8]/70 mt-1 font-mono">{status?.vectorEngine}</p>
              <p className="text-[10px] text-[#D4D4D8]/50 mt-1 font-light">In-engine cosine distance & pgvector schema compatibility</p>
            </div>
          </div>

          {/* GitHub API Tier */}
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10 flex items-start gap-3 hover:border-[#C5A059]/40 transition-all">
            <GitBranch className="w-5 h-5 text-[#C5A059] mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="serif-text text-sm font-medium text-white">GitHub Ingestion Pipeline</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-[#D4D4D8] border border-white/10">
                  {status?.gitHubTokenConfigured ? "Token Auth" : "Public Tier"}
                </span>
              </div>
              <p className="text-[11px] text-[#D4D4D8]/70 mt-1 font-mono">{status?.gitHubRateLimitTier}</p>
              <p className="text-[10px] text-[#D4D4D8]/50 mt-1 font-light">Allows inspecting public repositories and tree manifests</p>
            </div>
          </div>

          {/* Database Layer */}
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10 flex items-start gap-3 hover:border-[#C5A059]/40 transition-all">
            <Database className="w-5 h-5 text-[#C5A059] mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="serif-text text-sm font-medium text-white">Database Engine</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  WAL Mode
                </span>
              </div>
              <p className="text-[11px] text-[#D4D4D8]/70 mt-1 font-mono">{status?.database}</p>
              <p className="text-[10px] text-[#D4D4D8]/50 mt-1 font-light">15 normalized tables with Foreign Key integrity</p>
            </div>
          </div>
        </div>
      </div>

      {/* Supabase / PostgreSQL Production Migration */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="serif-text text-base font-medium text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-[#C5A059]" /> PostgreSQL & Supabase Migration DDL
            </h3>
            <p className="text-xs text-[#D4D4D8]/70 mt-0.5 font-light">
              Production schema matching the current database with pgvector, indexes, and RLS policies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/[0.02] border border-white/10 hover:border-[#C5A059]/50 text-xs font-light text-[#D4D4D8] hover:text-white transition-all cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? "Copied" : "Copy SQL"}</span>
            </button>
            <button
              onClick={handleDownloadSql}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded border gold-border gold-accent text-[10px] uppercase tracking-wider font-medium bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .sql</span>
            </button>
          </div>
        </div>

        {/* Code Box */}
        <div className="bg-[#141417] border border-white/10 rounded p-4 font-mono text-xs text-[#D4D4D8]/90 max-h-72 overflow-y-auto whitespace-pre">
          {migrationSql || "-- Loading schema migration..."}
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 text-xs text-[#D4D4D8]/50 flex items-center justify-between font-light">
          <span>Target File: <code className="text-[#C5A059] font-mono">/supabase/migrations/20260904_buildrex_schema.sql</code></span>
          <a
            href="https://supabase.com/docs/guides/database"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[#C5A059] hover:text-white transition-colors"
          >
            <span>Supabase Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
