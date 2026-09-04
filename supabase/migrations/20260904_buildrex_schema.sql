-- BUILDREX AI — PRODUCTION SUPABASE / POSTGRESQL MIGRATION
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

-- 8. Code Chunks with pgvector (768 dimensions)
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

CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own repositories" ON public.repositories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own repo files" ON public.repository_files FOR ALL USING (
  EXISTS (SELECT 1 FROM public.repositories WHERE repositories.id = repository_files.repository_id AND repositories.user_id = auth.uid())
);
CREATE POLICY "Users can manage own chats" ON public.chat_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own messages" ON public.chat_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own readmes" ON public.readme_documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own skills" ON public.skill_reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own activities" ON public.activities FOR ALL USING (auth.uid() = user_id);
