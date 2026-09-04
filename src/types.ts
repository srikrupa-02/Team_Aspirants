export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  company?: string;
  job_title?: string;
}

export interface Repository {
  id: string;
  user_id: string;
  github_owner: string;
  github_repo: string;
  github_url: string;
  default_branch: string;
  description: string;
  private_repository: boolean | number;
  status: string;
  analysis_status: 'queued' | 'importing' | 'reading_files' | 'detecting_tech' | 'chunking' | 'generating_embeddings' | 'analyzing' | 'complete' | 'failed';
  analysis_progress: number;
  analysis_error?: string;
  indexed_at?: string;
  created_at: string;
  updated_at: string;
  files_count?: number;
  languages_count?: number;
  health_score?: number;
  doc_score?: number;
}

export interface RepositoryFile {
  id: string;
  repository_id: string;
  file_path: string;
  file_name: string;
  file_extension: string;
  language: string;
  file_size: number;
  file_content?: string;
  is_binary: boolean | number;
  created_at: string;
}

export interface TechStackItem {
  category: string;
  name: string;
  description: string;
}

export interface FolderStructureItem {
  path: string;
  purpose: string;
}

export interface MainFeatureItem {
  title: string;
  description: string;
}

export interface RepositoryAnalysis {
  id: string;
  repository_id: string;
  architecture_summary: string;
  project_summary: string;
  tech_stack: TechStackItem[];
  folder_structure: FolderStructureItem[];
  main_features: MainFeatureItem[];
  dependencies_summary: string;
  documentation_score: number;
  repository_health_score: number;
  detected_languages: { language: string; count: number; percentage: number }[];
  detected_frameworks: string[];
  analysis_status: string;
  analysis_error?: string;
  created_at: string;
}

export interface RepositoryLanguage {
  id: string;
  repository_id: string;
  language: string;
  file_count: number;
  percentage: number;
}

export interface RepositoryDependency {
  id: string;
  repository_id: string;
  dependency_name: string;
  version: string;
  dependency_type: string;
  package_manager: string;
}

export interface RepositoryInsight {
  id: string;
  repository_id: string;
  insight_type: 'code_issue' | 'missing_doc' | 'architecture' | 'maintainability' | 'security' | 'performance';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  file_path?: string;
  line_reference?: string;
  recommendation?: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  repository_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  file_path: string;
  line_reference: string;
  snippet: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  created_at: string;
}

export interface ReadmeDocument {
  id: string;
  repository_id: string;
  user_id: string;
  content: string;
  version: number;
  generated_by_ai: boolean | number;
  created_at: string;
  updated_at: string;
}

export interface SkillReportItem {
  id: string;
  skill_report_id: string;
  skill_name: string;
  current_level: string;
  target_level: string;
  importance: string;
  explanation?: string;
}

export interface LearningRecommendation {
  id: string;
  user_id: string;
  repository_id: string;
  skill_name: string;
  recommendation_type: string;
  title: string;
  description: string;
  priority: string;
}

export interface SkillReport {
  id: string;
  repository_id: string;
  user_id: string;
  overall_score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  created_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  repository_id?: string;
  github_owner?: string;
  github_repo?: string;
  activity_type: string;
  title: string;
  description?: string;
  metadata?: any;
  created_at: string;
}

export interface DashboardStats {
  repositoriesCount: number;
  filesIndexed: number;
  languagesDetected: number;
  documentationScore: number;
  repositoryHealthScore: number;
}

export interface SystemStatus {
  database: string;
  gitHubTokenConfigured: boolean;
  gitHubRateLimitTier: string;
  geminiConfigured: boolean;
  openAIConfigured: boolean;
  activeProvider: string;
  supabaseSyncConfigured: boolean;
  vectorEngine: string;
}
