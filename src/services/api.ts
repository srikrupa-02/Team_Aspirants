import {
  UserProfile,
  Repository,
  RepositoryFile,
  RepositoryAnalysis,
  RepositoryLanguage,
  RepositoryDependency,
  RepositoryInsight,
  ChatSession,
  ChatMessage,
  ReadmeDocument,
  SkillReport,
  SkillReportItem,
  LearningRecommendation,
  Activity,
  DashboardStats,
  SystemStatus
} from "../types.js";

const TOKEN_KEY = "buildrex_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  });

  if (res.status === 401) {
    clearToken();
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}: ${res.statusText}`);
  }

  return data as T;
}

export const authService = {
  register: (payload: { email: string; password: string; full_name?: string; company?: string; job_title?: string }) =>
    request<{ token: string; user: UserProfile }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: UserProfile }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  demo: () =>
    request<{ token: string; user: UserProfile }>("/auth/demo", {
      method: "POST"
    }),

  me: () => request<{ user: UserProfile }>("/auth/me")
};

export const repositoryService = {
  getAll: () => request<{ repositories: Repository[] }>("/repositories"),

  getById: (id: string) => request<{ repository: Repository }>(`/repositories/${id}`),

  importGitHub: (url: string) =>
    request<{ repository: Repository }>("/repositories/import", {
      method: "POST",
      body: JSON.stringify({ url })
    }),

  uploadLocal: (payload: { name: string; description?: string; files: { path: string; name: string; content: string }[] }) =>
    request<{ id: string; name: string }>("/repositories/upload", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/repositories/${id}`, {
      method: "DELETE"
    }),

  reanalyze: (id: string) =>
    request<{ success: boolean }>(`/repositories/${id}/reanalyze`, {
      method: "POST"
    }),

  getFiles: (id: string) => request<{ files: RepositoryFile[] }>(`/repositories/${id}/files`),

  getFileContent: (id: string, fileId: string) =>
    request<{ file: RepositoryFile }>(`/repositories/${id}/files/${fileId}`),

  getAnalysis: (id: string) => request<{ analysis: RepositoryAnalysis | null }>(`/repositories/${id}/analysis`),

  getLanguages: (id: string) => request<{ languages: RepositoryLanguage[] }>(`/repositories/${id}/languages`),

  getDependencies: (id: string) => request<{ dependencies: RepositoryDependency[] }>(`/repositories/${id}/dependencies`),

  getInsights: (id: string) => request<{ insights: RepositoryInsight[] }>(`/repositories/${id}/insights`)
};

export const chatService = {
  getSessions: (repositoryId?: string) => {
    const query = repositoryId ? `?repository_id=${encodeURIComponent(repositoryId)}` : "";
    return request<{ sessions: ChatSession[] }>(`/chat/sessions${query}`);
  },

  createSession: (repositoryId: string, title?: string) =>
    request<{ session: ChatSession }>("/chat/sessions", {
      method: "POST",
      body: JSON.stringify({ repository_id: repositoryId, title })
    }),

  getMessages: (sessionId: string) =>
    request<{ messages: ChatMessage[] }>(`/chat/sessions/${sessionId}/messages`),

  sendMessage: (sessionId: string, content: string) =>
    request<{ message: ChatMessage }>(`/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content })
    }),

  deleteSession: (sessionId: string) =>
    request<{ success: boolean }>(`/chat/sessions/${sessionId}`, {
      method: "DELETE"
    })
};

export const readmeService = {
  getReadme: (repoId: string) => request<{ readme: ReadmeDocument | null }>(`/repositories/${repoId}/readme`),

  generateReadme: (repoId: string, customInstructions?: string) =>
    request<{ readme: ReadmeDocument }>(`/repositories/${repoId}/readme/generate`, {
      method: "POST",
      body: JSON.stringify({ customInstructions })
    }),

  saveReadme: (repoId: string, content: string) =>
    request<{ success: boolean; version: number }>(`/repositories/${repoId}/readme`, {
      method: "PUT",
      body: JSON.stringify({ content })
    })
};

export const skillService = {
  getSkills: (repoId: string) =>
    request<{ report: SkillReport | null; items: SkillReportItem[]; recommendations: LearningRecommendation[] }>(
      `/repositories/${repoId}/skills`
    ),

  generateSkills: (repoId: string) =>
    request<{ success: boolean }>(`/repositories/${repoId}/skills/generate`, {
      method: "POST"
    })
};

export const activityService = {
  getActivities: () => request<{ activities: Activity[] }>("/activities")
};

export const statsService = {
  getStats: () => request<{ stats: DashboardStats }>("/stats")
};

export const settingsService = {
  getStatus: () => request<{ system: SystemStatus }>("/settings/status"),
  exportMigrationUrl: "/api/settings/export-migration"
};
