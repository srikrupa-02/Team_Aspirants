import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

// Ensure data directory exists for persistent SQLite database
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "buildrex.db");
export const db = new DatabaseSync(dbPath);

// Enable WAL mode for high concurrent read/write performance
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// Initialize all 15 tables with exact schema matching production PostgreSQL / Supabase
export function initDatabase() {
  db.exec(`
    -- 1. Profiles
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      avatar_url TEXT,
      company TEXT,
      job_title TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 2. Repositories
    CREATE TABLE IF NOT EXISTS repositories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      github_owner TEXT NOT NULL,
      github_repo TEXT NOT NULL,
      github_url TEXT NOT NULL,
      default_branch TEXT DEFAULT 'main',
      description TEXT,
      private_repository INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      analysis_status TEXT DEFAULT 'queued',
      analysis_progress INTEGER DEFAULT 0,
      analysis_error TEXT,
      indexed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 3. Repository Files
    CREATE TABLE IF NOT EXISTS repository_files (
      id TEXT PRIMARY KEY,
      repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_extension TEXT,
      language TEXT,
      file_size INTEGER DEFAULT 0,
      file_content TEXT,
      content_hash TEXT,
      is_binary INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 4. Repository Analysis
    CREATE TABLE IF NOT EXISTS repository_analysis (
      id TEXT PRIMARY KEY,
      repository_id TEXT UNIQUE NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      architecture_summary TEXT,
      project_summary TEXT,
      tech_stack TEXT, -- JSON
      folder_structure TEXT, -- JSON
      main_features TEXT, -- JSON
      dependencies_summary TEXT,
      documentation_score INTEGER DEFAULT 0,
      repository_health_score INTEGER DEFAULT 0,
      detected_languages TEXT, -- JSON
      detected_frameworks TEXT, -- JSON
      analysis_status TEXT DEFAULT 'pending',
      analysis_error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 5. Repository Languages
    CREATE TABLE IF NOT EXISTS repository_languages (
      id TEXT PRIMARY KEY,
      repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      language TEXT NOT NULL,
      file_count INTEGER DEFAULT 0,
      percentage REAL DEFAULT 0.0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 6. Repository Dependencies
    CREATE TABLE IF NOT EXISTS repository_dependencies (
      id TEXT PRIMARY KEY,
      repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      dependency_name TEXT NOT NULL,
      version TEXT,
      dependency_type TEXT DEFAULT 'production',
      package_manager TEXT DEFAULT 'npm',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 7. Repository Insights
    CREATE TABLE IF NOT EXISTS repository_insights (
      id TEXT PRIMARY KEY,
      repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      insight_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      file_path TEXT,
      line_reference TEXT,
      recommendation TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 8. Code Chunks for Vector Search / RAG
    CREATE TABLE IF NOT EXISTS code_chunks (
      id TEXT PRIMARY KEY,
      repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      file_id TEXT REFERENCES repository_files(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding TEXT, -- JSON array of floats for cosine similarity
      token_count INTEGER DEFAULT 0,
      metadata TEXT, -- JSON: { file_path, start_line, end_line, language }
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 9. Chat Sessions
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 10. Chat Messages
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      citations TEXT, -- JSON array of { file_path, line_reference, snippet, score }
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 11. README Documents
    CREATE TABLE IF NOT EXISTS readme_documents (
      id TEXT PRIMARY KEY,
      repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      generated_by_ai INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 12. Skill Reports
    CREATE TABLE IF NOT EXISTS skill_reports (
      id TEXT PRIMARY KEY,
      repository_id TEXT UNIQUE NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      overall_score INTEGER DEFAULT 0,
      summary TEXT,
      strengths TEXT, -- JSON
      gaps TEXT, -- JSON
      recommendations TEXT, -- JSON
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 13. Skill Report Items
    CREATE TABLE IF NOT EXISTS skill_report_items (
      id TEXT PRIMARY KEY,
      skill_report_id TEXT NOT NULL REFERENCES skill_reports(id) ON DELETE CASCADE,
      skill_name TEXT NOT NULL,
      current_level TEXT NOT NULL,
      target_level TEXT NOT NULL,
      importance TEXT NOT NULL,
      explanation TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 14. Learning Recommendations
    CREATE TABLE IF NOT EXISTS learning_recommendations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      skill_name TEXT NOT NULL,
      recommendation_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT DEFAULT 'Medium',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 15. Activities
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      repository_id TEXT REFERENCES repositories(id) ON DELETE CASCADE,
      activity_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      metadata TEXT, -- JSON
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_repositories_user ON repositories(user_id);
    CREATE INDEX IF NOT EXISTS idx_repo_files_repo ON repository_files(repository_id);
    CREATE INDEX IF NOT EXISTS idx_code_chunks_repo ON code_chunks(repository_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
    CREATE INDEX IF NOT EXISTS idx_insights_repo ON repository_insights(repository_id);
  `);

  console.log("[Buildrex DB] Persistent SQLite tables & indexes successfully verified.");
}

// Helper for Cosine Similarity between vector embeddings
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Production PostgreSQL / Supabase Migration DDL generator
export function getPostgresSchemaSQL(): string {
  return `-- BUILDREX AI — PRODUCTION SUPABASE / POSTGRESQL MIGRATION
-- Run this in Supabase SQL Editor to deploy the complete production schema with pgvector & RLS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  company TEXT,
  job_title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Repositories
CREATE TABLE IF NOT EXISTS public.repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  github_owner TEXT NOT NULL,
  github_repo TEXT NOT NULL,
  github_url TEXT NOT NULL,
  default_branch TEXT DEFAULT 'main',
  description TEXT,
  private_repository BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  analysis_status TEXT DEFAULT 'queued',
  analysis_progress INTEGER DEFAULT 0,
  analysis_error TEXT,
  indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Repository Files
CREATE TABLE IF NOT EXISTS public.repository_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_extension TEXT,
  language TEXT,
  file_size INTEGER DEFAULT 0,
  file_content TEXT,
  content_hash TEXT,
  is_binary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Repository Analysis
CREATE TABLE IF NOT EXISTS public.repository_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID UNIQUE NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  architecture_summary TEXT,
  project_summary TEXT,
  tech_stack JSONB DEFAULT '[]'::jsonb,
  folder_structure JSONB DEFAULT '{}'::jsonb,
  main_features JSONB DEFAULT '[]'::jsonb,
  dependencies_summary TEXT,
  documentation_score INTEGER DEFAULT 0,
  repository_health_score INTEGER DEFAULT 0,
  detected_languages JSONB DEFAULT '[]'::jsonb,
  detected_frameworks JSONB DEFAULT '[]'::jsonb,
  analysis_status TEXT DEFAULT 'pending',
  analysis_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Repository Languages
CREATE TABLE IF NOT EXISTS public.repository_languages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  file_count INTEGER DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Repository Dependencies
CREATE TABLE IF NOT EXISTS public.repository_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  dependency_name TEXT NOT NULL,
  version TEXT,
  dependency_type TEXT DEFAULT 'production',
  package_manager TEXT DEFAULT 'npm',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Repository Insights
CREATE TABLE IF NOT EXISTS public.repository_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file_path TEXT,
  line_reference TEXT,
  recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Code Chunks with pgvector (1536 dimensions for OpenAI / 768 for Gemini)
CREATE TABLE IF NOT EXISTS public.code_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.repository_files(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  token_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Chat Sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Chat Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. README Documents
CREATE TABLE IF NOT EXISTS public.readme_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  generated_by_ai BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Skill Reports
CREATE TABLE IF NOT EXISTS public.skill_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID UNIQUE NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  overall_score INTEGER DEFAULT 0,
  summary TEXT,
  strengths JSONB DEFAULT '[]'::jsonb,
  gaps JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Skill Report Items
CREATE TABLE IF NOT EXISTS public.skill_report_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_report_id UUID NOT NULL REFERENCES public.skill_reports(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  current_level TEXT NOT NULL,
  target_level TEXT NOT NULL,
  importance TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Learning Recommendations
CREATE TABLE IF NOT EXISTS public.learning_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Activities
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readme_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_report_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Profiles Policy
CREATE POLICY "Users can manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Repositories Policy
CREATE POLICY "Users can manage own repositories" ON public.repositories
  FOR ALL USING (auth.uid() = user_id);

-- Chat & README Policies
CREATE POLICY "Users can manage own chats" ON public.chat_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own messages" ON public.chat_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own readmes" ON public.readme_documents
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own skills" ON public.skill_reports
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own activities" ON public.activities
  FOR ALL USING (auth.uid() = user_id);
`;
}
