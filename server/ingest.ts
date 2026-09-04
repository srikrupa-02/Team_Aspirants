import { v4 as uuidv4 } from "uuid";
import crypto from "node:crypto";
import { db } from "./db.js";
import { parseGitHubUrl, fetchGitHubRepoMetadata, fetchGitHubRepoTree, fetchFileContent } from "./github.js";
import { generateEmbedding, analyzeRepositoryAI, generateReadmeAI, generateSkillReportAI } from "./ai.js";

function getLanguageFromExt(ext: string, fileName: string): string {
  if (fileName === "Dockerfile") return "Dockerfile";
  if (fileName === "Makefile") return "Makefile";
  switch (ext.toLowerCase()) {
    case "ts":
    case "tsx":
      return "TypeScript";
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return "JavaScript";
    case "py":
      return "Python";
    case "go":
      return "Go";
    case "rs":
      return "Rust";
    case "java":
      return "Java";
    case "rb":
      return "Ruby";
    case "php":
      return "PHP";
    case "cs":
      return "C#";
    case "cpp":
    case "cc":
    case "cxx":
    case "c":
    case "h":
    case "hpp":
      return "C/C++";
    case "html":
      return "HTML";
    case "css":
    case "scss":
    case "less":
      return "CSS";
    case "json":
      return "JSON";
    case "yaml":
    case "yml":
      return "YAML";
    case "md":
    case "markdown":
      return "Markdown";
    case "sql":
      return "SQL";
    case "sh":
    case "bash":
      return "Shell";
    default:
      return "Code";
  }
}

function parseDependenciesFromContent(fileName: string, content: string): { name: string; version: string; type: string; manager: string }[] {
  const deps: { name: string; version: string; type: string; manager: string }[] = [];
  try {
    if (fileName === "package.json") {
      const parsed = JSON.parse(content);
      if (parsed.dependencies) {
        for (const [name, ver] of Object.entries(parsed.dependencies)) {
          deps.push({ name, version: String(ver), type: "production", manager: "npm" });
        }
      }
      if (parsed.devDependencies) {
        for (const [name, ver] of Object.entries(parsed.devDependencies)) {
          deps.push({ name, version: String(ver), type: "development", manager: "npm" });
        }
      }
      if (parsed.peerDependencies) {
        for (const [name, ver] of Object.entries(parsed.peerDependencies)) {
          deps.push({ name, version: String(ver), type: "peer", manager: "npm" });
        }
      }
    } else if (fileName === "requirements.txt") {
      const lines = content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const parts = trimmed.split(/(==|>=|<=|>|<|~=)/);
          const name = parts[0]?.trim();
          const version = parts.length > 2 ? parts[2]?.trim() : "latest";
          if (name) deps.push({ name, version, type: "production", manager: "pip" });
        }
      }
    } else if (fileName === "Cargo.toml") {
      const lines = content.split("\n");
      let section = "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          section = trimmed.slice(1, -1).trim();
          continue;
        }
        if (section === "dependencies" || section === "dev-dependencies") {
          const eq = trimmed.indexOf("=");
          if (eq > 0) {
            const name = trimmed.slice(0, eq).trim();
            const version = trimmed.slice(eq + 1).replace(/"/g, "").trim();
            deps.push({
              name,
              version,
              type: section === "dev-dependencies" ? "development" : "production",
              manager: "cargo"
            });
          }
        }
      }
    }
  } catch (e) {
    // ignore parse failure for partial files
  }
  return deps;
}

export async function processRepositoryAsync(repoId: string, userId: string) {
  try {
    const repo = db.prepare("SELECT * FROM repositories WHERE id = ?").get(repoId) as any;
    if (!repo) return;

    // Helper to update progress
    const setStatus = (status: string, progress: number, error: string | null = null) => {
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE repositories
        SET analysis_status = ?, analysis_progress = ?, analysis_error = ?, updated_at = ?
        WHERE id = ?
      `).run(status, progress, error, now, repoId);
    };

    // Helper to log activity
    const logActivity = (type: string, title: string, description: string, metadata: any = {}) => {
      const actId = uuidv4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO activities (id, user_id, repository_id, activity_type, title, description, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(actId, userId, repoId, type, title, description, JSON.stringify(metadata), now);
    };

    setStatus("importing", 10);
    logActivity("analysis_started", `Analysis started for ${repo.github_owner}/${repo.github_repo}`, "Fetching repository tree and structure from GitHub.");

    // Fetch repository tree
    const fileItems = await fetchGitHubRepoTree(repo.github_owner, repo.github_repo, repo.default_branch);

    if (fileItems.length === 0) {
      throw new Error("Repository appears empty or no accessible source files were found.");
    }

    setStatus("reading_files", 25);

    // Prioritize key files (manifests, entry points, configs, top source files)
    const priorityFiles = fileItems.sort((a, b) => {
      const aIsManifest = a.name === "package.json" || a.name === "Cargo.toml" || a.name === "requirements.txt" || a.name === "go.mod";
      const bIsManifest = b.name === "package.json" || b.name === "Cargo.toml" || b.name === "requirements.txt" || b.name === "go.mod";
      if (aIsManifest && !bIsManifest) return -1;
      if (!aIsManifest && bIsManifest) return 1;
      return a.path.localeCompare(b.path);
    }).slice(0, 45); // index up to 45 key files for deep inspection

    const storedFiles: { id: string; path: string; name: string; ext: string; lang: string; content: string; size: number }[] = [];
    const allDependencies: { name: string; version: string; type: string; manager: string }[] = [];
    const languageCounts: Record<string, { count: number; bytes: number }> = {};

    for (const item of priorityFiles) {
      let content = "";
      if (!item.isBinary) {
        try {
          content = await fetchFileContent(repo.github_owner, repo.github_repo, repo.default_branch, item.path);
        } catch (e) {
          content = "";
        }
      }

      const fileId = uuidv4();
      const lang = getLanguageFromExt(item.extension, item.name);
      const hash = crypto.createHash("sha256").update(content || item.path).digest("hex");
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO repository_files (id, repository_id, file_path, file_name, file_extension, language, file_size, file_content, content_hash, is_binary, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(fileId, repoId, item.path, item.name, item.extension, lang, item.size, content, hash, item.isBinary ? 1 : 0, now, now);

      storedFiles.push({
        id: fileId,
        path: item.path,
        name: item.name,
        ext: item.extension,
        lang,
        content,
        size: item.size
      });

      // Track languages
      if (!languageCounts[lang]) languageCounts[lang] = { count: 0, bytes: 0 };
      languageCounts[lang].count += 1;
      languageCounts[lang].bytes += (item.size || 100);

      // Parse dependencies if manifest
      const deps = parseDependenciesFromContent(item.name, content);
      for (const d of deps) {
        allDependencies.push(d);
        const depId = uuidv4();
        db.prepare(`
          INSERT INTO repository_dependencies (id, repository_id, dependency_name, version, dependency_type, package_manager, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(depId, repoId, d.name, d.version, d.type, d.manager, now);
      }
    }

    // Store repository languages
    setStatus("detecting_tech", 40);
    const totalBytes = Object.values(languageCounts).reduce((acc, cur) => acc + cur.bytes, 0) || 1;
    const languageSummary: { language: string; count: number; percentage: number }[] = [];

    for (const [lang, stats] of Object.entries(languageCounts)) {
      const percentage = Math.round((stats.bytes / totalBytes) * 1000) / 10;
      languageSummary.push({ language: lang, count: stats.count, percentage });
      const langId = uuidv4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO repository_languages (id, repository_id, language, file_count, percentage, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(langId, repoId, lang, stats.count, percentage, now);
    }

    // Chunk code
    setStatus("chunking", 55);
    const chunksToEmbed: { fileId: string; filePath: string; chunkIndex: number; content: string; startLine: number; endLine: number; lang: string }[] = [];

    for (const file of storedFiles) {
      if (!file.content || file.content.trim().length === 0) continue;
      const lines = file.content.split("\n");
      const chunkSize = 40; // 40 lines per chunk
      for (let i = 0; i < lines.length; i += chunkSize) {
        const slice = lines.slice(i, i + chunkSize).join("\n");
        if (slice.trim().length < 15) continue;
        chunksToEmbed.push({
          fileId: file.id,
          filePath: file.path,
          chunkIndex: Math.floor(i / chunkSize),
          content: slice,
          startLine: i + 1,
          endLine: Math.min(i + chunkSize, lines.length),
          lang: file.lang
        });
      }
    }

    // Generate Embeddings for Chunks
    setStatus("generating_embeddings", 70);
    const maxChunksToEmbed = Math.min(chunksToEmbed.length, 60); // embed top 60 chunks for high performance
    for (let i = 0; i < maxChunksToEmbed; i++) {
      const chunk = chunksToEmbed[i];
      const chunkId = uuidv4();
      const now = new Date().toISOString();
      const embedding = await generateEmbedding(`${chunk.filePath}\n${chunk.content}`);
      const metadata = JSON.stringify({
        file_path: chunk.filePath,
        start_line: chunk.startLine,
        end_line: chunk.endLine,
        language: chunk.lang
      });
      const tokenCount = Math.round(chunk.content.length / 4);

      db.prepare(`
        INSERT INTO code_chunks (id, repository_id, file_id, chunk_index, content, embedding, token_count, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(chunkId, repoId, chunk.fileId, chunk.chunkIndex, chunk.content, JSON.stringify(embedding), tokenCount, metadata, now);
    }

    // AI Repository Analysis
    setStatus("analyzing", 85);
    const keySnippets = storedFiles
      .filter(f => f.content && f.content.length > 50)
      .slice(0, 10)
      .map(f => ({ path: f.path, content: f.content }));

    const analysisResult = await analyzeRepositoryAI({
      repoName: `${repo.github_owner}/${repo.github_repo}`,
      description: repo.description,
      files: storedFiles.map(f => ({ path: f.path, language: f.lang, size: f.size })),
      keyFileSnippets: keySnippets,
      languages: languageSummary,
      dependencies: allDependencies
    });

    // Save Analysis to DB
    const analysisId = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO repository_analysis (
        id, repository_id, architecture_summary, project_summary, tech_stack,
        folder_structure, main_features, dependencies_summary, documentation_score,
        repository_health_score, detected_languages, detected_frameworks, analysis_status,
        analysis_error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      analysisId,
      repoId,
      analysisResult.architecture_summary || "Modular codebase structure.",
      analysisResult.project_summary || repo.description,
      JSON.stringify(analysisResult.tech_stack || []),
      JSON.stringify(analysisResult.folder_structure || []),
      JSON.stringify(analysisResult.main_features || []),
      analysisResult.dependencies_summary || "Standard dependency tree.",
      analysisResult.documentation_score || 80,
      analysisResult.repository_health_score || 85,
      JSON.stringify(languageSummary),
      JSON.stringify(analysisResult.detected_frameworks || []),
      "complete",
      null,
      now,
      now
    );

    // Save Insights
    if (analysisResult.insights && Array.isArray(analysisResult.insights)) {
      for (const ins of analysisResult.insights) {
        const insightId = uuidv4();
        db.prepare(`
          INSERT INTO repository_insights (id, repository_id, insight_type, severity, title, description, file_path, line_reference, recommendation, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(insightId, repoId, ins.insight_type || "maintainability", ins.severity || "info", ins.title || "Observation", ins.description || "", ins.file_path || null, ins.line_reference || null, ins.recommendation || "", now);
      }
    }

    // Generate initial README
    const readmeContent = await generateReadmeAI({
      repoName: `${repo.github_owner}/${repo.github_repo}`,
      description: repo.description,
      techStack: analysisResult.tech_stack || [],
      features: analysisResult.main_features || [],
      folderStructure: analysisResult.folder_structure || [],
      dependencies: allDependencies
    });

    const readmeId = uuidv4();
    db.prepare(`
      INSERT INTO readme_documents (id, repository_id, user_id, content, version, generated_by_ai, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, 1, ?, ?)
    `).run(readmeId, repoId, userId, readmeContent, now, now);

    // Generate Skill Gap Report
    const skillResult = await generateSkillReportAI({
      repoName: `${repo.github_owner}/${repo.github_repo}`,
      techStack: analysisResult.tech_stack || [],
      languages: languageSummary,
      dependencies: allDependencies,
      features: analysisResult.main_features || []
    });

    const skillReportId = uuidv4();
    db.prepare(`
      INSERT OR REPLACE INTO skill_reports (
        id, repository_id, user_id, overall_score, summary, strengths, gaps, recommendations, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      skillReportId,
      repoId,
      userId,
      skillResult.overall_score || 80,
      skillResult.summary || "Skill readiness evaluation.",
      JSON.stringify(skillResult.strengths || []),
      JSON.stringify(skillResult.gaps || []),
      JSON.stringify(skillResult.recommendations || []),
      now,
      now
    );

    if (skillResult.items && Array.isArray(skillResult.items)) {
      for (const item of skillResult.items) {
        const itemId = uuidv4();
        db.prepare(`
          INSERT INTO skill_report_items (id, skill_report_id, skill_name, current_level, target_level, importance, explanation, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          itemId,
          skillReportId,
          item.skill_name || "Engineering skill",
          item.current_level || "Intermediate",
          item.target_level || "Advanced",
          item.importance || "Medium",
          item.explanation || "",
          now
        );
      }
    }

    if (skillResult.recommendations && Array.isArray(skillResult.recommendations)) {
      for (const rec of skillResult.recommendations) {
        const recId = uuidv4();
        db.prepare(`
          INSERT INTO learning_recommendations (id, user_id, repository_id, skill_name, recommendation_type, title, description, priority, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(recId, userId, repoId, rec.skill_name || "General", rec.recommendation_type || "documentation", rec.title || "Learning item", rec.description || "", rec.priority || "Medium", now);
      }
    }

    // Complete!
    setStatus("complete", 100);
    db.prepare("UPDATE repositories SET indexed_at = ? WHERE id = ?").run(now, repoId);

    logActivity("analysis_completed", `Analysis complete for ${repo.github_owner}/${repo.github_repo}`, `Indexed ${storedFiles.length} files, ${languageSummary.length} languages, and generated full architecture documentation.`);

  } catch (err: any) {
    console.error(`[Buildrex Ingestion Error] Repository ${repoId}:`, err);
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE repositories
      SET analysis_status = 'failed', analysis_error = ?, updated_at = ?
      WHERE id = ?
    `).run(err.message || "An unexpected error occurred during repository ingestion", now, repoId);

    const actId = uuidv4();
    db.prepare(`
      INSERT INTO activities (id, user_id, repository_id, activity_type, title, description, metadata, created_at)
      VALUES (?, ?, ?, 'analysis_failed', 'Repository Analysis Failed', ?, ?, ?)
    `).run(actId, userId, repoId, err.message || "Ingestion error", JSON.stringify({ error: err.message }), now);
  }
}
