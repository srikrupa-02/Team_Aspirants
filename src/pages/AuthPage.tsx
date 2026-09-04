import React, { useState } from "react";
import { Cpu, Lock, Mail, User, Building, Briefcase, ArrowRight, ShieldCheck, Sparkles, Code2, Database } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { useToast } from "../context/ToastContext.js";

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, register, demoLogin } = useAuth();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await login(email, password);
        toast.success("Welcome back to Buildrex AI");
      } else {
        await register(email, password, fullName, company, jobTitle);
        toast.success("Account created successfully!");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
      toast.error("Auth Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    try {
      await demoLogin();
      toast.info("Demo Account loaded", "Exploring pre-indexed sample repository.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F11] text-[#D4D4D8] flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      {/* Subtle architectural ambient accents */}
      <div className="absolute -top-12 -right-12 w-64 h-64 border-t border-r gold-border opacity-20 pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-64 h-64 border-b border-l gold-border opacity-20 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded border border-[#C5A059]/40 bg-white/[0.02] p-0.5 shadow-sm mb-3">
            <div className="w-full h-full bg-[#0F0F11] rounded flex items-center justify-center">
              <Cpu className="w-5 h-5 text-[#C5A059]" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="serif-text text-2xl tracking-[0.2em] font-light text-white uppercase">BUILDREX</h1>
            <span className="text-[9px] uppercase font-medium tracking-[0.2em] px-1.5 py-0.5 rounded border border-[#C5A059]/40 text-[#C5A059] bg-[#C5A059]/10">AI</span>
          </div>
          <p className="text-xs text-[#D4D4D8]/80 font-normal tracking-wide mt-1.5">
            Your AI engineer that reads the entire codebase.
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-lg p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex border-b border-white/10 pb-3 mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 text-center text-[10px] uppercase tracking-[0.2em] font-medium pb-2 border-b-2 transition-all ${
                isLogin ? "border-[#C5A059] text-[#C5A059]" : "border-transparent text-[#D4D4D8]/40 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 text-center text-[10px] uppercase tracking-[0.2em] font-medium pb-2 border-b-2 transition-all ${
                !isLogin ? "border-[#C5A059] text-[#C5A059]" : "border-transparent text-[#D4D4D8]/40 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#D4D4D8]/60 mb-1 font-medium">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#D4D4D8]/40 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#141417] border border-white/10 rounded pl-9 pr-4 py-2 text-xs text-[#D4D4D8] placeholder-[#D4D4D8]/30 focus:outline-none focus:border-[#C5A059]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#D4D4D8]/60 mb-1 font-medium">Company</label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-[#D4D4D8]/40 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Organization"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full bg-[#141417] border border-white/10 rounded pl-9 pr-3 py-2 text-xs text-[#D4D4D8] placeholder-[#D4D4D8]/30 focus:outline-none focus:border-[#C5A059]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#D4D4D8]/60 mb-1 font-medium">Role</label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-[#D4D4D8]/40 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Staff Engineer"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="w-full bg-[#141417] border border-white/10 rounded pl-9 pr-3 py-2 text-xs text-[#D4D4D8] placeholder-[#D4D4D8]/30 focus:outline-none focus:border-[#C5A059]"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#D4D4D8]/60 mb-1 font-medium">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#D4D4D8]/40 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="developer@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#141417] border border-white/10 rounded pl-9 pr-4 py-2 text-xs text-[#D4D4D8] placeholder-[#D4D4D8]/30 focus:outline-none focus:border-[#C5A059] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#D4D4D8]/60 mb-1 font-medium">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#D4D4D8]/40 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#141417] border border-white/10 rounded pl-9 pr-4 py-2 text-xs text-[#D4D4D8] placeholder-[#D4D4D8]/30 focus:outline-none focus:border-[#C5A059] font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 border gold-border gold-accent text-[10px] uppercase tracking-[0.2em] font-medium bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] py-2.5 rounded transition-all cursor-pointer disabled:opacity-50 mt-4 shadow-sm"
            >
              <span>{isLogin ? "Sign In to Console" : "Create Developer Account"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Access */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <button
              onClick={handleDemo}
              disabled={loading}
              className="w-full py-2 px-3 rounded border border-white/10 hover:border-[#C5A059]/50 bg-white/[0.02] text-[10px] uppercase tracking-[0.15em] text-[#D4D4D8] hover:text-[#C5A059] transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Instant Demo Account (One-Click)</span>
            </button>
            <p className="text-[10px] text-[#D4D4D8]/40 mt-2 font-light">
              Instant access with pre-indexed repository and vector search
            </p>
          </div>
        </div>

        {/* Feature Highlights Footnote */}
        <div className="grid grid-cols-3 gap-2 mt-6 text-center text-[9px] uppercase tracking-[0.2em] text-[#D4D4D8]/50 font-medium">
          <div className="flex items-center justify-center gap-1.5">
            <Code2 className="w-3 h-3 text-[#C5A059]" /> RAG Retrieval
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Database className="w-3 h-3 text-[#C5A059]" /> Pgvector Schema
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-[#C5A059]" /> Row-Level Security
          </div>
        </div>
      </div>
    </div>
  );
};
