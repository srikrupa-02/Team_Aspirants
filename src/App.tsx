import React, { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { ToastProvider, useToast } from "./context/ToastContext.js";
import { Sidebar } from "./components/Sidebar.js";
import { Header } from "./components/Header.js";
import { ImportRepoModal } from "./components/ImportRepoModal.js";
import { AuthPage } from "./pages/AuthPage.js";
import { Dashboard } from "./pages/Dashboard.js";
import { RepoAnalyzer } from "./pages/RepoAnalyzer.js";
import { AskCodebase } from "./pages/AskCodebase.js";
import { ReadmeGenerator } from "./pages/ReadmeGenerator.js";
import { SkillGap } from "./pages/SkillGap.js";
import { Settings } from "./pages/Settings.js";
import { repositoryService, statsService, activityService } from "./services/api.js";
import { Repository, DashboardStats, Activity } from "./types.js";
import { Loader2 } from "lucide-react";

const MainLayout: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>("dashboard");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    repositoriesCount: 0,
    filesIndexed: 0,
    languagesDetected: 0,
    documentationScore: 0,
    repositoryHealthScore: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  const toast = useToast();

  const loadAllData = useCallback(async () => {
    if (!user) return;
    try {
      const [reposRes, statsRes, actsRes] = await Promise.all([
        repositoryService.getAll(),
        statsService.getStats(),
        activityService.getActivities()
      ]);

      const repos = reposRes.repositories || [];
      setRepositories(repos);
      setStats(statsRes.stats);
      setActivities(actsRes.activities || []);

      if (repos.length > 0) {
        setSelectedRepoId(prev => (prev && repos.some(r => r.id === prev) ? prev : repos[0].id));
      }
    } catch (err: any) {
      console.error("Failed to load initial data:", err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  // Polling for repository analysis status if any repo is still ingesting
  useEffect(() => {
    if (!user) return;
    const hasPending = repositories.some(
      r => r.analysis_status !== "complete" && r.analysis_status !== "failed"
    );

    if (!hasPending) return;

    const interval = setInterval(() => {
      loadAllData();
    }, 3000);

    return () => clearInterval(interval);
  }, [user, repositories, loadAllData]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F11] flex flex-col items-center justify-center text-[#D4D4D8] font-mono text-xs gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[#C5A059]" />
        <span className="tracking-[0.2em] uppercase text-[11px] opacity-70">Initializing Buildrex AI Session...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const handleSelectRepo = (id: string) => {
    setSelectedRepoId(id);
  };

  const handleImportSuccess = (newRepoId: string) => {
    setSelectedRepoId(newRepoId);
    loadAllData();
    setCurrentPage("analyzer");
  };

  return (
    <div className="flex h-screen bg-[#0F0F11] text-[#D4D4D8] overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        repositories={repositories}
        selectedRepoId={selectedRepoId}
        setSelectedRepoId={handleSelectRepo}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          currentPage={currentPage}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          repositories={repositories}
          onSelectRepo={(id) => {
            handleSelectRepo(id);
            setCurrentPage("analyzer");
          }}
        />

        <main className="flex-1 overflow-y-auto px-6 py-6 max-w-7xl w-full mx-auto">
          {currentPage === "dashboard" && (
            <Dashboard
              stats={stats}
              repositories={repositories}
              activities={activities}
              onSelectRepo={handleSelectRepo}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onRefreshData={loadAllData}
              setCurrentPage={setCurrentPage}
            />
          )}

          {currentPage === "analyzer" && (
            <RepoAnalyzer
              repositoryId={selectedRepoId}
              onDeleted={() => {
                loadAllData();
                setCurrentPage("dashboard");
              }}
              setCurrentPage={setCurrentPage}
            />
          )}

          {currentPage === "chat" && (
            <AskCodebase
              repositories={repositories}
              selectedRepoId={selectedRepoId}
              onSelectRepo={handleSelectRepo}
            />
          )}

          {currentPage === "readme" && (
            <ReadmeGenerator
              repositories={repositories}
              selectedRepoId={selectedRepoId}
              onSelectRepo={handleSelectRepo}
            />
          )}

          {currentPage === "skills" && (
            <SkillGap
              repositories={repositories}
              selectedRepoId={selectedRepoId}
              onSelectRepo={handleSelectRepo}
            />
          )}

          {currentPage === "settings" && <Settings />}
        </main>
      </div>

      {/* Import / Connect Codebase Modal */}
      <ImportRepoModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ToastProvider>
  );
}
