import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, cosineSimilarity, getPostgresSchemaSQL } from "./db.js";
import { registerUser, loginUser, requireAuth, AuthenticatedRequest } from "./auth.js";
import { parseGitHubUrl, fetchGitHubRepoMetadata } from "./github.js";
import { processRepositoryAsync } from "./ingest.js";
import { generateEmbedding, askCodebaseRAG, generateReadmeAI, generateSkillReportAI, getAIProviderStatus, analyzeRepositoryAI } from "./ai.js";

export const apiRouter = Router();

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

apiRouter.post("/auth/register", (req, res) => {
  try {
    const { email, password, full_name, company, job_title } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const result = registerUser(email, password, full_name, company, job_title);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post("/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const result = loginUser(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

apiRouter.get("/auth/me", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// Demo Account initialization for instant review/hackathon demo
apiRouter.post("/auth/demo", (req, res) => {
  const demoEmail = "demo@buildrex.ai";
  let user = db.prepare("SELECT * FROM profiles WHERE email = ?").get(demoEmail) as any;
  if (!user) {
    try {
      const created = registerUser(demoEmail, "BuildrexDemo2026!", "Buildrex Lead Architect", "Buildrex Systems", "Senior Staff Engineer");
      return res.json(created);
    } catch (e) {
      // continue
    }
  }
  const logged = loginUser(demoEmail, "BuildrexDemo2026!");
  res.json(logged);
});

// ==========================================
// REPOSITORY ROUTES
// ==========================================

// Get all repositories for authenticated user
apiRouter.get("/repositories", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const repos = db.prepare(`
    SELECT r.*,
      (SELECT COUNT(*) FROM repository_files WHERE repository_id = r.id) as files_count,
      (SELECT COUNT(*) FROM repository_languages WHERE repository_id = r.id) as languages_count,
      (SELECT repository_health_score FROM repository_analysis WHERE repository_id = r.id) as health_score,
      (SELECT documentation_score FROM repository_analysis WHERE repository_id = r.id) as doc_score
    FROM repositories r
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `).all(req.user!.id);

  res.json({ repositories: repos });
});

// Import GitHub Repository
apiRouter.post("/repositories/import", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "GitHub repository URL is required." });
    }

    const { owner, repo } = parseGitHubUrl(url);

    // Validate metadata from GitHub
    const metadata = await fetchGitHubRepoMetadata(owner, repo);

    // Check if user already imported this repo
    const existing = db.prepare("SELECT id FROM repositories WHERE user_id = ? AND github_owner = ? AND github_repo = ?").get(req.user!.id, metadata.owner, metadata.repo) as any;
    if (existing) {
      return res.status(400).json({ error: `Repository "${metadata.owner}/${metadata.repo}" has already been imported. Select it from your dashboard.` });
    }

    const repoId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO repositories (id, user_id, github_owner, github_repo, github_url, default_branch, description, private_repository, status, analysis_status, analysis_progress, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'queued', 0, ?, ?)
    `).run(repoId, req.user!.id, metadata.owner, metadata.repo, metadata.url, metadata.defaultBranch, metadata.description, metadata.isPrivate ? 1 : 0, now, now);

    // Record initial activity
    const actId = uuidv4();
    db.prepare(`
      INSERT INTO activities (id, user_id, repository_id, activity_type, title, description, metadata, created_at)
      VALUES (?, ?, ?, 'repository_imported', 'Imported repository', ?, ?, ?)
    `).run(actId, req.user!.id, repoId, `Connected ${metadata.owner}/${metadata.repo} (${metadata.stars} stars)`, JSON.stringify({ url: metadata.url }), now);

    // Trigger async ingestion pipeline
    processRepositoryAsync(repoId, req.user!.id);

    res.status(201).json({
      repository: {
        id: repoId,
        github_owner: metadata.owner,
        github_repo: metadata.repo,
        github_url: metadata.url,
        default_branch: metadata.defaultBranch,
        description: metadata.description,
        analysis_status: "queued",
        analysis_progress: 0
      }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to import GitHub repository." });
  }
});

// Manual Repository Code Upload
apiRouter.post("/repositories/upload", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, files } = req.body;
    if (!name || !files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "Repository name and at least one file are required." });
    }

    const repoId = uuidv4();
    const now = new Date().toISOString();
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();

    db.prepare(`
      INSERT INTO repositories (id, user_id, github_owner, github_repo, github_url, default_branch, description, private_repository, status, analysis_status, analysis_progress, created_at, updated_at)
      VALUES (?, ?, 'local', ?, ?, 'main', ?, 1, 'active', 'queued', 0, ?, ?)
    `).run(repoId, req.user!.id, safeName, `local://${safeName}`, description || "Locally uploaded codebase.", now, now);

    // Process files directly in background
    setTimeout(async () => {
      try {
        const storedFiles: any[] = [];
        const languageCounts: Record<string, number> = {};

        for (const f of files.slice(0, 50)) {
          const fileId = uuidv4();
          const ext = f.name?.includes(".") ? f.name.split(".").pop()?.toLowerCase() || "" : "";
          const lang = ext === "ts" || ext === "tsx" ? "TypeScript" : (ext === "js" ? "JavaScript" : (ext === "py" ? "Python" : "Code"));
          const content = f.content || "";
          db.prepare(`
            INSERT INTO repository_files (id, repository_id, file_path, file_name, file_extension, language, file_size, file_content, is_binary, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
          `).run(fileId, repoId, f.path || f.name, f.name, ext, lang, content.length, content, now, now);

          storedFiles.push({ path: f.path || f.name, content, lang });
          languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        }

        // Run AI analysis
        const analysis = await analyzeRepositoryAI({
          repoName: safeName,
          description: description || "Uploaded repository",
          files: storedFiles.map(s => ({ path: s.path, language: s.lang, size: s.content.length })),
          keyFileSnippets: storedFiles.slice(0, 8),
          languages: Object.entries(languageCounts).map(([l, c]) => ({ language: l, count: c, percentage: 100 })),
          dependencies: []
        });

        db.prepare(`
          INSERT INTO repository_analysis (id, repository_id, architecture_summary, project_summary, tech_stack, folder_structure, main_features, documentation_score, repository_health_score, detected_languages, detected_frameworks, analysis_status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'complete', ?, ?)
        `).run(uuidv4(), repoId, analysis.architecture_summary, analysis.project_summary, JSON.stringify(analysis.tech_stack), JSON.stringify(analysis.folder_structure), JSON.stringify(analysis.main_features), 85, 90, JSON.stringify([{ language: "TypeScript", percentage: 100 }]), JSON.stringify(analysis.detected_frameworks), now, now);

        db.prepare("UPDATE repositories SET analysis_status = 'complete', analysis_progress = 100, indexed_at = ? WHERE id = ?").run(now, repoId);
      } catch (e: any) {
        db.prepare("UPDATE repositories SET analysis_status = 'failed', analysis_error = ? WHERE id = ?").run(e.message, repoId);
      }
    }, 100);

    res.status(201).json({ id: repoId, name: safeName });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get Single Repository
apiRouter.get("/repositories/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const repo = db.prepare("SELECT * FROM repositories WHERE id = ? AND user_id = ?").get(req.params.id, req.user!.id);
  if (!repo) {
    return res.status(404).json({ error: "Repository not found." });
  }
  res.json({ repository: repo });
});

// Delete Repository
apiRouter.delete("/repositories/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const repo = db.prepare("SELECT * FROM repositories WHERE id = ? AND user_id = ?").get(req.params.id, req.user!.id) as any;
  if (!repo) {
    return res.status(404).json({ error: "Repository not found." });
  }

  db.prepare("DELETE FROM repositories WHERE id = ?").run(req.params.id);

  // Log activity
  const actId = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO activities (id, user_id, activity_type, title, description, created_at)
    VALUES (?, ?, 'repository_deleted', 'Deleted repository', ?, ?)
  `).run(actId, req.user!.id, `Removed ${repo.github_owner}/${repo.github_repo}`, now);

  res.json({ success: true, message: "Repository successfully removed." });
});

// Re-analyze Repository
apiRouter.post("/repositories/:id/reanalyze", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const repo = db.prepare("SELECT * FROM repositories WHERE id = ? AND user_id = ?").get(req.params.id, req.user!.id) as any;
  if (!repo) {
    return res.status(404).json({ error: "Repository not found." });
  }

  // Clear previous analysis artifacts
  db.prepare("DELETE FROM repository_files WHERE repository_id = ?").run(req.params.id);
  db.prepare("DELETE FROM repository_languages WHERE repository_id = ?").run(req.params.id);
  db.prepare("DELETE FROM repository_dependencies WHERE repository_id = ?").run(req.params.id);
  db.prepare("DELETE FROM repository_insights WHERE repository_id = ?").run(req.params.id);
  db.prepare("DELETE FROM code_chunks WHERE repository_id = ?").run(req.params.id);
  db.prepare("DELETE FROM repository_analysis WHERE repository_id = ?").run(req.params.id);

  const now = new Date().toISOString();
  db.prepare("UPDATE repositories SET analysis_status = 'queued', analysis_progress = 0, analysis_error = NULL, updated_at = ? WHERE id = ?").run(now, req.params.id);

  processRepositoryAsync(req.params.id, req.user!.id);
  res.json({ success: true, message: "Re-analysis scheduled." });
});

// Get Repository Files
apiRouter.get("/repositories/:id/files", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const repo = db.prepare("SELECT id FROM repositories WHERE id = ? AND user_id = ?").get(req.params.id, req.user!.id);
  if (!repo) return res.status(404).json({ error: "Repository not found." });

  const files = db.prepare(`
    SELECT id, file_path, file_name, file_extension, language, file_size, is_binary
    FROM repository_files
    WHERE repository_id = ?
    ORDER BY file_path ASC
  `).all(req.params.id);

  res.json({ files });
});

// Get Single File Content
apiRouter.get("/repositories/:id/files/:fileId", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const file = db.prepare(`
    SELECT f.* FROM repository_files f
    JOIN repositories r ON r.id = f.repository_id
    WHERE f.id = ? AND r.id = ? AND r.user_id = ?
  `).get(req.params.fileId, req.params.id, req.user!.id) as any;

  if (!file) return res.status(404).json({ error: "File not found." });
  res.json({ file });
});

// Get Repository Analysis
apiRouter.get("/repositories/:id/analysis", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const repo = db.prepare("SELECT id FROM repositories WHERE id = ? AND user_id = ?").get(req.params.id, req.user!.id);
  if (!repo) return res.status(404).json({ error: "Repository not found." });

  const analysis = db.prepare("SELECT * FROM repository_analysis WHERE repository_id = ?").get(req.params.id) as any;
  if (!analysis) return res.json({ analysis: null });

  res.json({
    analysis: {
      ...analysis,
      tech_stack: analysis.tech_stack ? JSON.parse(analysis.tech_stack) : [],
      folder_structure: analysis.folder_structure ? JSON.parse(analysis.folder_structure) : [],
      main_features: analysis.main_features ? JSON.parse(analysis.main_features) : [],
      detected_languages: analysis.detected_languages ? JSON.parse(analysis.detected_languages) : [],
      detected_frameworks: analysis.detected_frameworks ? JSON.parse(analysis.detected_frameworks) : []
    }
  });
});

// Get Repository Languages
apiRouter.get("/repositories/:id/languages", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const langs = db.prepare("SELECT * FROM repository_languages WHERE repository_id = ? ORDER BY percentage DESC").all(req.params.id);
  res.json({ languages: langs });
});

// Get Repository Dependencies
apiRouter.get("/repositories/:id/dependencies", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const deps = db.prepare("SELECT * FROM repository_dependencies WHERE repository_id = ? ORDER BY dependency_name ASC").all(req.params.id);
  res.json({ dependencies: deps });
});

// Get Repository Insights
apiRouter.get("/repositories/:id/insights", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const insights = db.prepare("SELECT * FROM repository_insights WHERE repository_id = ? ORDER BY severity ASC").all(req.params.id);
  res.json({ insights });
});

// ==========================================
// README ROUTES
// ==========================================

apiRouter.get("/repositories/:id/readme", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const doc = db.prepare("SELECT * FROM readme_documents WHERE repository_id = ? AND user_id = ? ORDER BY version DESC LIMIT 1").get(req.params.id, req.user!.id) as any;
  res.json({ readme: doc || null });
});

apiRouter.post("/repositories/:id/readme/generate", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customInstructions } = req.body;
    const repo = db.prepare("SELECT * FROM repositories WHERE id = ? AND user_id = ?").get(req.params.id, req.user!.id) as any;
    if (!repo) return res.status(404).json({ error: "Repository not found." });

    const analysis = db.prepare("SELECT * FROM repository_analysis WHERE repository_id = ?").get(req.params.id) as any;
    const deps = db.prepare("SELECT * FROM repository_dependencies WHERE repository_id = ?").all(req.params.id) as any[];

    const content = await generateReadmeAI({
      repoName: `${repo.github_owner}/${repo.github_repo}`,
      description: repo.description,
      techStack: analysis?.tech_stack ? JSON.parse(analysis.tech_stack) : [],
      features: analysis?.main_features ? JSON.parse(analysis.main_features) : [],
      folderStructure: analysis?.folder_structure ? JSON.parse(analysis.folder_structure) : [],
      dependencies: deps,
      customInstructions
    });

    const existing = db.prepare("SELECT version FROM readme_documents WHERE repository_id = ? AND user_id = ? ORDER BY version DESC LIMIT 1").get(req.params.id, req.user!.id) as any;
    const nextVer = (existing?.version || 0) + 1;
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO readme_documents (id, repository_id, user_id, content, version, generated_by_ai, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, req.params.id, req.user!.id, content, nextVer, now, now);

    // Activity
    db.prepare(`
      INSERT INTO activities (id, user_id, repository_id, activity_type, title, description, created_at)
      VALUES (?, ?, ?, 'readme_generated', 'Generated README Documentation', ?, ?)
    `).run(uuidv4(), req.user!.id, req.params.id, `Generated version ${nextVer} of README.md`, now);

    res.json({ readme: { id, content, version: nextVer, created_at: now } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put("/repositories/:id/readme", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Content is required." });

  const existing = db.prepare("SELECT version FROM readme_documents WHERE repository_id = ? AND user_id = ? ORDER BY version DESC LIMIT 1").get(req.params.id, req.user!.id) as any;
  const nextVer = (existing?.version || 0) + 1;
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO readme_documents (id, repository_id, user_id, content, version, generated_by_ai, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `).run(id, req.params.id, req.user!.id, content, nextVer, now, now);

  res.json({ success: true, version: nextVer });
});

// ==========================================
// SKILL GAP ROUTES
// ==========================================

apiRouter.get("/repositories/:id/skills", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const report = db.prepare("SELECT * FROM skill_reports WHERE repository_id = ? AND user_id = ?").get(req.params.id, req.user!.id) as any;
  if (!report) return res.json({ report: null, items: [], recommendations: [] });

  const items = db.prepare("SELECT * FROM skill_report_items WHERE skill_report_id = ? ORDER BY importance ASC").all(report.id);
  const recommendations = db.prepare("SELECT * FROM learning_recommendations WHERE repository_id = ? AND user_id = ? ORDER BY priority ASC").all(req.params.id, req.user!.id);

  res.json({
    report: {
      ...report,
      strengths: report.strengths ? JSON.parse(report.strengths) : [],
      gaps: report.gaps ? JSON.parse(report.gaps) : [],
      recommendations: report.recommendations ? JSON.parse(report.recommendations) : []
    },
    items,
    recommendations
  });
});

apiRouter.post("/repositories/:id/skills/generate", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const repo = db.prepare("SELECT * FROM repositories WHERE id = ? AND user_id = ?").get(req.params.id, req.user!.id) as any;
    if (!repo) return res.status(404).json({ error: "Repository not found." });

    const analysis = db.prepare("SELECT * FROM repository_analysis WHERE repository_id = ?").get(req.params.id) as any;
    const languages = db.prepare("SELECT * FROM repository_languages WHERE repository_id = ?").all(req.params.id) as any[];
    const deps = db.prepare("SELECT * FROM repository_dependencies WHERE repository_id = ?").all(req.params.id) as any[];

    const result = await generateSkillReportAI({
      repoName: `${repo.github_owner}/${repo.github_repo}`,
      techStack: analysis?.tech_stack ? JSON.parse(analysis.tech_stack) : [],
      languages,
      dependencies: deps,
      features: analysis?.main_features ? JSON.parse(analysis.main_features) : []
    });

    const reportId = uuidv4();
    const now = new Date().toISOString();

    // Clear previous items
    db.prepare("DELETE FROM skill_reports WHERE repository_id = ? AND user_id = ?").run(req.params.id, req.user!.id);
    db.prepare("DELETE FROM learning_recommendations WHERE repository_id = ? AND user_id = ?").run(req.params.id, req.user!.id);

    db.prepare(`
      INSERT INTO skill_reports (id, repository_id, user_id, overall_score, summary, strengths, gaps, recommendations, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reportId,
      req.params.id,
      req.user!.id,
      result.overall_score || 80,
      result.summary || "Developer skill requirements evaluation.",
      JSON.stringify(result.strengths || []),
      JSON.stringify(result.gaps || []),
      JSON.stringify(result.recommendations || []),
      now,
      now
    );

    if (result.items && Array.isArray(result.items)) {
      for (const it of result.items) {
        db.prepare(`
          INSERT INTO skill_report_items (id, skill_report_id, skill_name, current_level, target_level, importance, explanation, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          reportId,
          it.skill_name || "Engineering skill",
          it.current_level || "Intermediate",
          it.target_level || "Advanced",
          it.importance || "Medium",
          it.explanation || "",
          now
        );
      }
    }

    if (result.recommendations && Array.isArray(result.recommendations)) {
      for (const rec of result.recommendations) {
        db.prepare(`
          INSERT INTO learning_recommendations (id, user_id, repository_id, skill_name, recommendation_type, title, description, priority, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          req.user!.id,
          req.params.id,
          rec.skill_name || "General",
          rec.recommendation_type || "documentation",
          rec.title || "Learning Recommendation",
          rec.description || "",
          rec.priority || "Medium",
          now
        );
      }
    }

    // Activity
    db.prepare(`
      INSERT INTO activities (id, user_id, repository_id, activity_type, title, description, created_at)
      VALUES (?, ?, ?, 'skill_report_generated', 'Generated Skill Gap Report', ?, ?)
    `).run(uuidv4(), req.user!.id, req.params.id, `Overall developer readiness: ${result.overall_score}%`, now);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ASK MY CODEBASE (RAG CHAT)
// ==========================================

apiRouter.get("/chat/sessions", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { repository_id } = req.query;
  let query = "SELECT * FROM chat_sessions WHERE user_id = ?";
  const params: any[] = [req.user!.id];
  if (repository_id) {
    query += " AND repository_id = ?";
    params.push(repository_id);
  }
  query += " ORDER BY updated_at DESC";

  const sessions = db.prepare(query).all(...params);
  res.json({ sessions });
});

apiRouter.post("/chat/sessions", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { repository_id, title } = req.body;
  if (!repository_id) return res.status(400).json({ error: "Repository ID is required." });

  const repo = db.prepare("SELECT * FROM repositories WHERE id = ? AND user_id = ?").get(repository_id, req.user!.id) as any;
  if (!repo) return res.status(404).json({ error: "Repository not found." });

  const sessionId = uuidv4();
  const now = new Date().toISOString();
  const sessionTitle = title || `Chat with ${repo.github_repo}`;

  db.prepare(`
    INSERT INTO chat_sessions (id, user_id, repository_id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, req.user!.id, repository_id, sessionTitle, now, now);

  res.status(201).json({ session: { id: sessionId, repository_id, title: sessionTitle, created_at: now } });
});

apiRouter.delete("/chat/sessions/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = db.prepare("SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?").get(req.params.id, req.user!.id);
  if (!session) return res.status(404).json({ error: "Chat session not found." });

  db.prepare("DELETE FROM chat_messages WHERE session_id = ?").run(req.params.id);
  db.prepare("DELETE FROM chat_sessions WHERE id = ?").run(req.params.id);

  res.json({ success: true, message: "Chat session deleted." });
});

apiRouter.get("/chat/sessions/:id/messages", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = db.prepare("SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?").get(req.params.id, req.user!.id);
  if (!session) return res.status(404).json({ error: "Chat session not found." });

  const messages = db.prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC").all(req.params.id) as any[];

  res.json({
    messages: messages.map(m => ({
      ...m,
      citations: m.citations ? JSON.parse(m.citations) : []
    }))
  });
});

// Post Message & Execute RAG Search
apiRouter.post("/chat/sessions/:id/messages", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Message content is required." });
    }

    const session = db.prepare("SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?").get(req.params.id, req.user!.id) as any;
    if (!session) return res.status(404).json({ error: "Chat session not found." });

    const repo = db.prepare("SELECT * FROM repositories WHERE id = ?").get(session.repository_id) as any;
    const analysis = db.prepare("SELECT architecture_summary FROM repository_analysis WHERE repository_id = ?").get(session.repository_id) as any;

    const userMsgId = uuidv4();
    const now = new Date().toISOString();

    // Store user message
    db.prepare(`
      INSERT INTO chat_messages (id, session_id, user_id, role, content, created_at)
      VALUES (?, ?, ?, 'user', ?, ?)
    `).run(userMsgId, session.id, req.user!.id, content, now);

    // 1. Generate Question Embedding
    const queryVec = await generateEmbedding(content);

    // 2. Fetch Code Chunks for this repository
    const chunks = db.prepare("SELECT id, file_id, content, embedding, metadata FROM code_chunks WHERE repository_id = ?").all(session.repository_id) as any[];

    // 3. Compute Cosine Similarity
    const scoredChunks: any[] = [];
    for (const c of chunks) {
      if (!c.embedding) continue;
      try {
        const chunkVec = JSON.parse(c.embedding);
        const sim = cosineSimilarity(queryVec, chunkVec);
        const meta = c.metadata ? JSON.parse(c.metadata) : {};
        scoredChunks.push({
          chunkId: c.id,
          filePath: meta.file_path || "source.ts",
          startLine: meta.start_line,
          endLine: meta.endLine || meta.end_line,
          language: meta.language,
          content: c.content,
          score: sim
        });
      } catch (e) {
        // ignore parse error
      }
    }

    // Sort by highest similarity
    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, 6);

    // Fetch conversation history
    const pastMessages = db.prepare("SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 8").all(session.id) as any[];

    // 4. Generate AI Answer with Citations
    const { answer, citations } = await askCodebaseRAG({
      question: content,
      repoName: `${repo.github_owner}/${repo.github_repo}`,
      architectureSummary: analysis?.architecture_summary,
      relevantChunks: topChunks,
      history: pastMessages
    });

    const assistantMsgId = uuidv4();
    const assistantTime = new Date().toISOString();

    // Store assistant response
    db.prepare(`
      INSERT INTO chat_messages (id, session_id, user_id, role, content, citations, created_at)
      VALUES (?, ?, ?, 'assistant', ?, ?, ?)
    `).run(assistantMsgId, session.id, req.user!.id, answer, JSON.stringify(citations), assistantTime);

    // Update session timestamp
    db.prepare("UPDATE chat_sessions SET updated_at = ? WHERE id = ?").run(assistantTime, session.id);

    // Log Activity
    db.prepare(`
      INSERT INTO activities (id, user_id, repository_id, activity_type, title, description, metadata, created_at)
      VALUES (?, ?, ?, 'question_asked', 'Asked codebase question', ?, ?, ?)
    `).run(uuidv4(), req.user!.id, repo.id, content.slice(0, 80), JSON.stringify({ citationsCount: citations.length }), assistantTime);

    res.status(201).json({
      message: {
        id: assistantMsgId,
        session_id: session.id,
        role: "assistant",
        content: answer,
        citations,
        created_at: assistantTime
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// STATS & ACTIVITIES
// ==========================================

apiRouter.get("/stats", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const repoCount = (db.prepare("SELECT COUNT(*) as count FROM repositories WHERE user_id = ?").get(userId) as any)?.count || 0;
  const filesIndexed = (db.prepare(`
    SELECT COUNT(*) as count FROM repository_files rf
    JOIN repositories r ON r.id = rf.repository_id
    WHERE r.user_id = ?
  `).get(userId) as any)?.count || 0;

  const languagesCount = (db.prepare(`
    SELECT COUNT(DISTINCT language) as count FROM repository_languages rl
    JOIN repositories r ON r.id = rl.repository_id
    WHERE r.user_id = ?
  `).get(userId) as any)?.count || 0;

  const avgScores = db.prepare(`
    SELECT
      AVG(documentation_score) as avg_doc,
      AVG(repository_health_score) as avg_health
    FROM repository_analysis ra
    JOIN repositories r ON r.id = ra.repository_id
    WHERE r.user_id = ?
  `).get(userId) as any;

  res.json({
    stats: {
      repositoriesCount: repoCount,
      filesIndexed,
      languagesDetected: languagesCount,
      documentationScore: Math.round(avgScores?.avg_doc || 0),
      repositoryHealthScore: Math.round(avgScores?.avg_health || 0)
    }
  });
});

apiRouter.get("/activities", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const activities = db.prepare(`
    SELECT a.*, r.github_owner, r.github_repo
    FROM activities a
    LEFT JOIN repositories r ON r.id = a.repository_id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
    LIMIT 25
  `).all(req.user!.id) as any[];

  res.json({
    activities: activities.map(a => ({
      ...a,
      metadata: a.metadata ? JSON.parse(a.metadata) : {}
    }))
  });
});

// ==========================================
// SETTINGS & SYSTEM STATUS
// ==========================================

apiRouter.get("/settings/status", (req, res) => {
  const aiStatus = getAIProviderStatus();
  const hasGitHubToken = Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim() !== "");
  const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim() !== "");

  res.json({
    system: {
      database: "Persistent SQLite WAL (Schema identical to PostgreSQL/Supabase)",
      gitHubTokenConfigured: hasGitHubToken,
      gitHubRateLimitTier: hasGitHubToken ? "Authenticated (5,000 req/hr)" : "Public Rate Limit (60 req/hr)",
      ...aiStatus,
      supabaseSyncConfigured: hasSupabaseUrl,
      vectorEngine: "pgvector & In-Engine Cosine Similarity (768-dim)"
    }
  });
});

apiRouter.get("/settings/export-migration", (req, res) => {
  const sql = getPostgresSchemaSQL();
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", "attachment; filename=buildrex_supabase_migration.sql");
  res.send(sql);
});
