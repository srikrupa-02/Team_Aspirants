import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  FolderGit2,
  RefreshCw,
  ExternalLink,
  Target,
  Award
} from "lucide-react";
import { Repository, SkillReport, SkillReportItem, LearningRecommendation } from "../types.js";
import { skillService } from "../services/api.js";
import { useToast } from "../context/ToastContext.js";

interface SkillGapProps {
  repositories: Repository[];
  selectedRepoId: string | null;
  onSelectRepo: (id: string) => void;
}

export const SkillGap: React.FC<SkillGapProps> = ({
  repositories,
  selectedRepoId,
  onSelectRepo
}) => {
  const [report, setReport] = useState<SkillReport | null>(null);
  const [items, setItems] = useState<SkillReportItem[]>([]);
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const toast = useToast();
  const selectedRepo = repositories.find(r => r.id === selectedRepoId);

  const loadSkills = async () => {
    if (!selectedRepoId) return;
    setLoading(true);
    try {
      const res = await skillService.getSkills(selectedRepoId);
      setReport(res.report);
      setItems(res.items);
      setRecommendations(res.recommendations);
    } catch (err: any) {
      toast.error("Failed to load skill gap report", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, [selectedRepoId]);

  const handleReevaluate = async () => {
    if (!selectedRepoId) return;
    setGenerating(true);
    try {
      await skillService.generateSkills(selectedRepoId);
      toast.success("Skill report generated", "Evaluated engineering stack requirements.");
      await loadSkills();
    } catch (err: any) {
      toast.error("Evaluation failed", err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (repositories.length === 0) {
    return (
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-12 text-center max-w-md mx-auto mt-12">
        <FolderGit2 className="w-12 h-12 text-[#D4D4D8]/30 mx-auto mb-3" />
        <h3 className="serif-text text-xl font-light text-white mb-2">No repositories indexed</h3>
        <p className="text-xs text-[#D4D4D8]/60 font-light">Import a repository to assess developer skills and prerequisites.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Card */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#C5A059]" />
              <h2 className="serif-text text-lg font-medium text-white">Developer Skill-Gap Radar</h2>
              {report && (
                <span className="text-[9px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Readiness: {report.overall_score}%
                </span>
              )}
            </div>
            <p className="text-xs text-[#D4D4D8]/70 mt-1 font-light">
              Evaluates technical proficiency required to contribute effectively to <b className="text-white font-normal">{selectedRepo?.github_owner}/{selectedRepo?.github_repo}</b>.
            </p>
          </div>

          <div className="flex items-center gap-3">
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

            <button
              onClick={handleReevaluate}
              disabled={generating || !selectedRepoId}
              className="flex items-center gap-1.5 px-4 py-2 rounded border gold-border gold-accent text-[10px] uppercase tracking-wider font-medium bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] shadow-sm transition-all cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? "Evaluating..." : report ? "Re-evaluate" : "Generate Report"}</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-24 text-xs text-[#D4D4D8]/50 font-mono">
          <RefreshCw className="w-4 h-4 animate-spin mr-2 text-[#C5A059]" />
          <span>Analyzing skill requirements...</span>
        </div>
      ) : !report ? (
        <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-lg p-12 text-center">
          <Award className="w-12 h-12 text-[#D4D4D8]/30 mx-auto mb-3" />
          <h3 className="serif-text text-lg font-light text-white mb-1">No Skill Assessment Generated</h3>
          <p className="text-xs text-[#D4D4D8]/60 max-w-sm mx-auto mb-4 font-light">
            Generate an engineering skill breakdown to identify required frameworks, architecture paradigms, and targeted study paths.
          </p>
          <button
            onClick={handleReevaluate}
            className="border gold-border gold-accent text-[10px] uppercase tracking-wider font-medium bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] px-5 py-2 rounded transition-all cursor-pointer"
          >
            Run Skill-Gap Evaluation
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Metric & Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score Card */}
            <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6 flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-medium tracking-[0.2em] text-[#D4D4D8]/50 font-mono">Developer Readiness</span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-light text-white font-mono">{report.overall_score}%</span>
                  <span className="text-xs text-emerald-400 font-mono">Stack Alignment</span>
                </div>
                <div className="w-full bg-white/[0.05] rounded-full h-1.5 mt-4 overflow-hidden">
                  <div
                    className="bg-[#C5A059] h-1.5 rounded-full"
                    style={{ width: `${report.overall_score}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-[#D4D4D8]/50 mt-4 leading-relaxed font-mono">
                Calculated based on detected language versions, modularity patterns, and domain complexity.
              </p>
            </div>

            {/* Strengths & Gaps */}
            <div className="md:col-span-2 bg-white/[0.02] border border-white/10 rounded-lg p-6">
              <h3 className="serif-text text-base font-medium text-white mb-2">Competency Overview</h3>
              <p className="text-xs text-[#D4D4D8]/70 leading-relaxed mb-4 font-light">{report.summary}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/10">
                <div>
                  <span className="text-[10px] uppercase font-medium tracking-wider text-emerald-400 font-mono flex items-center gap-1 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Core Strengths
                  </span>
                  <ul className="space-y-1.5 text-xs text-[#D4D4D8]/80 font-light">
                    {report.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-medium tracking-wider text-amber-400 font-mono flex items-center gap-1 mb-2">
                    <AlertCircle className="w-3.5 h-3.5" /> Identified Skill Gaps
                  </span>
                  <ul className="space-y-1.5 text-xs text-[#D4D4D8]/80 font-light">
                    {report.gaps.map((g, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Skill Breakdown Table */}
          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6">
            <h3 className="serif-text text-base font-medium text-white mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#C5A059]" /> Technology Skill Breakdown
            </h3>

            <div className="border border-white/10 rounded overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-white/[0.02] text-[#D4D4D8]/50 uppercase text-[9px] tracking-wider border-b border-white/10">
                  <tr>
                    <th className="p-3 font-medium">Skill / Technology</th>
                    <th className="p-3 font-medium">Current Level</th>
                    <th className="p-3 font-medium">Target Level</th>
                    <th className="p-3 font-medium">Importance</th>
                    <th className="p-3 font-medium">Requirement Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-medium text-[#C5A059]">{item.skill_name}</td>
                      <td className="p-3 text-[#D4D4D8]/60">{item.current_level}</td>
                      <td className="p-3 text-emerald-400 font-medium">{item.target_level}</td>
                      <td className="p-3">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase border ${
                          item.importance === 'critical'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : item.importance === 'high'
                            ? 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/30'
                            : 'bg-white/[0.05] text-[#D4D4D8] border-white/20'
                        }`}>
                          {item.importance}
                        </span>
                      </td>
                      <td className="p-3 text-[#D4D4D8]/80 font-sans text-xs font-light">{item.explanation || "Essential for repository contributions."}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actionable Learning Recommendations */}
          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6">
            <h3 className="serif-text text-base font-medium text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#C5A059]" /> Actionable Learning Paths
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendations.map((rec) => (
                <div key={rec.id} className="p-5 rounded-lg bg-white/[0.02] border border-white/10 hover:border-[#C5A059]/40 flex flex-col justify-between transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30">
                        {rec.skill_name}
                      </span>
                      <span className="text-[10px] font-mono text-[#D4D4D8]/40 uppercase">{rec.priority} Priority</span>
                    </div>
                    <h4 className="serif-text text-sm font-medium text-white mb-1.5">{rec.title}</h4>
                    <p className="text-[11px] text-[#D4D4D8]/70 leading-relaxed font-light">{rec.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 text-[10px] font-mono text-[#C5A059] flex items-center gap-1 uppercase tracking-wider">
                    <span>{rec.recommendation_type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
