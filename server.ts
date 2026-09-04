import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { initDatabase, db } from "./server/db.js";
import { apiRouter } from "./server/routes.js";
import { registerUser } from "./server/auth.js";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedDemoDataIfEmpty() {
  try {
    const userCount = (db.prepare("SELECT COUNT(*) as count FROM profiles").get() as any)?.count || 0;
    if (userCount === 0) {
      console.log("[Buildrex AI] Seeding initial demo account and sample indexed repository...");
      const demo = registerUser("demo@buildrex.ai", "BuildrexDemo2026!", "Buildrex Lead Architect", "Buildrex Systems", "Senior Staff Engineer");
      const userId = demo.user.id;
      const repoId = uuidv4();
      const now = new Date().toISOString();

      // Seed a sample real indexed repo: Express.js
      db.prepare(`
        INSERT INTO repositories (id, user_id, github_owner, github_repo, github_url, default_branch, description, private_repository, status, analysis_status, analysis_progress, indexed_at, created_at, updated_at)
        VALUES (?, ?, 'expressjs', 'express', 'https://github.com/expressjs/express', 'master', 'Fast, unopinionated, minimalist web framework for node.', 0, 'active', 'complete', 100, ?, ?, ?)
      `).run(repoId, userId, now, now, now);

      // Seed files
      const files = [
        { path: "lib/express.js", name: "express.js", ext: "js", lang: "JavaScript", content: "const EventEmitter = require('events').EventEmitter;\nconst proto = require('./application');\nconst Route = require('./router/route');\nconst Router = require('./router');\n\nfunction createApplication() {\n  const app = function(req, res, next) {\n    app.handle(req, res, next);\n  };\n  return app;\n}\nmodule.exports = createApplication;" },
        { path: "lib/application.js", name: "application.js", ext: "js", lang: "JavaScript", content: "const http = require('http');\nconst slice = Array.prototype.slice;\n\nconst app = exports = module.exports = {};\napp.init = function init() {\n  this.settings = {};\n  this.defaultConfiguration();\n};\napp.listen = function listen() {\n  const server = http.createServer(this);\n  return server.listen.apply(server, arguments);\n};" },
        { path: "lib/router/index.js", name: "index.js", ext: "js", lang: "JavaScript", content: "const Route = require('./route');\nconst Layer = require('./layer');\n\nconst proto = module.exports = function(options) {\n  function router(req, res, next) {\n    router.handle(req, res, next);\n  }\n  return router;\n};" },
        { path: "package.json", name: "package.json", ext: "json", lang: "JSON", content: '{\n  "name": "express",\n  "description": "Fast, unopinionated, minimalist web framework",\n  "version": "4.21.2",\n  "dependencies": {\n    "accepts": "~1.3.8",\n    "array-flatten": "1.1.1",\n    "body-parser": "1.20.3",\n    "content-disposition": "0.5.4",\n    "content-type": "~1.0.4",\n    "cookie": "0.7.1",\n    "cookie-signature": "1.0.6",\n    "debug": "2.6.9",\n    "depd": "2.0.0",\n    "encodeurl": "~2.0.0",\n    "escape-html": "~1.0.3",\n    "etag": "~1.8.1",\n    "finalhandler": "1.3.1",\n    "fresh": "0.5.2",\n    "http-errors": "2.0.0",\n    "merge-descriptors": "1.0.3",\n    "methods": "~1.1.2",\n    "on-finished": "2.4.1",\n    "parseurl": "~1.3.3",\n    "path-to-regexp": "0.1.12",\n    "proxy-addr": "~2.0.7",\n    "qs": "6.13.0",\n    "range-parser": "~1.2.1",\n    "safe-buffer": "5.2.1",\n    "send": "0.19.0",\n    "serve-static": "1.16.2",\n    "setprototypeof": "1.2.0",\n    "statuses": "2.0.1",\n    "type-is": "~1.6.18",\n    "utils-merge": "1.0.1",\n    "vary": "~1.1.2"\n  }\n}' }
      ];

      for (const f of files) {
        const fileId = uuidv4();
        db.prepare(`
          INSERT INTO repository_files (id, repository_id, file_path, file_name, file_extension, language, file_size, file_content, is_binary, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `).run(fileId, repoId, f.path, f.name, f.ext, f.lang, f.content.length, f.content, now, now);

        // Code chunk for RAG
        db.prepare(`
          INSERT INTO code_chunks (id, repository_id, file_id, chunk_index, content, metadata, created_at)
          VALUES (?, ?, ?, 0, ?, ?, ?)
        `).run(uuidv4(), repoId, fileId, f.content, JSON.stringify({ file_path: f.path, start_line: 1, end_line: 20, language: f.lang }), now);
      }

      // Languages
      db.prepare(`
        INSERT INTO repository_languages (id, repository_id, language, file_count, percentage, created_at)
        VALUES (?, ?, 'JavaScript', 3, 85.0, ?),
               (?, ?, 'JSON', 1, 15.0, ?)
      `).run(uuidv4(), repoId, now, uuidv4(), repoId, now);

      // Dependencies
      db.prepare(`
        INSERT INTO repository_dependencies (id, repository_id, dependency_name, version, dependency_type, package_manager, created_at)
        VALUES (?, ?, 'body-parser', '1.20.3', 'production', 'npm', ?),
               (?, ?, 'debug', '2.6.9', 'production', 'npm', ?),
               (?, ?, 'finalhandler', '1.3.1', 'production', 'npm', ?),
               (?, ?, 'router', '1.3.8', 'production', 'npm', ?)
      `).run(uuidv4(), repoId, now, uuidv4(), repoId, now, uuidv4(), repoId, now, uuidv4(), repoId, now);

      // Analysis
      const techStack = [
        { category: "Backend", name: "Node.js HTTP Server", description: "Native Node.js HTTP request/response wrapper" },
        { category: "Routing", name: "Express Router & Layers", description: "Middleware pipeline pattern" },
        { category: "Parsing", name: "body-parser & qs", description: "Query and payload serialization" }
      ];
      const folderStructure = [
        { path: "lib/", purpose: "Core Express middleware dispatch and application logic" },
        { path: "lib/router/", purpose: "Route matching, nested layer stacks, and regex compilation" }
      ];
      const mainFeatures = [
        { title: "Middleware Pipeline", description: "Composable request interception with `next()` cascading" },
        { title: "Parametric Routing", description: "Pattern matching with path parameters and query strings" },
        { title: "HTTP Abstraction", description: "Enhanced request and response helper objects" }
      ];
      const insights = [
        {
          insight_type: "architecture",
          severity: "info",
          title: "Layered Middleware Dispatcher",
          description: "Core HTTP pipeline delegates down sequential layers with fail-safe error fallbacks.",
          file_path: "lib/router/index.js",
          line_reference: "L1-L15",
          recommendation: "Preserve lightweight overhead by avoiding synchronous heavy blocking operations in middlewares."
        },
        {
          insight_type: "maintainability",
          severity: "low",
          title: "Legacy Prototype Inheritance Pattern",
          description: "Internal modules use prototype merging via merge-descriptors rather than ES6 class syntax.",
          file_path: "lib/application.js",
          line_reference: "L4",
          recommendation: "Ensure compatibility wrappers are tested across modern ECMAScript runtimes."
        }
      ];

      db.prepare(`
        INSERT INTO repository_analysis (id, repository_id, architecture_summary, project_summary, tech_stack, folder_structure, main_features, dependencies_summary, documentation_score, repository_health_score, detected_languages, detected_frameworks, analysis_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 92, 95, ?, ?, 'complete', ?, ?)
      `).run(
        uuidv4(),
        repoId,
        "Express uses a layered pipeline architecture centered on an EventEmitter application object and an internal Route/Layer middleware dispatcher.",
        "Fast, unopinionated, minimalist web framework for Node.js powering millions of server APIs.",
        JSON.stringify(techStack),
        JSON.stringify(folderStructure),
        JSON.stringify(mainFeatures),
        "Contains 30+ hardened, production-grade micro-utilities.",
        JSON.stringify([{ language: "JavaScript", percentage: 85 }, { language: "JSON", percentage: 15 }]),
        JSON.stringify(["Node.js", "Express", "npm"]),
        now,
        now
      );

      for (const ins of insights) {
        db.prepare(`
          INSERT INTO repository_insights (id, repository_id, insight_type, severity, title, description, file_path, line_reference, recommendation, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), repoId, ins.insight_type, ins.severity, ins.title, ins.description, ins.file_path, ins.line_reference, ins.recommendation, now);
      }

      // README
      db.prepare(`
        INSERT INTO readme_documents (id, repository_id, user_id, content, version, generated_by_ai, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, 1, ?, ?)
      `).run(uuidv4(), repoId, userId, "# Express.js\n\n> Fast, unopinionated, minimalist web framework for Node.js.\n\n## Features\n- Robust routing\n- Focus on high performance\n- Super-high test coverage\n- HTTP helpers (redirection, caching, etc)\n\n## Quick Start\n```bash\nnpm install express\n```", now, now);

      // Skill report
      const skillId = uuidv4();
      db.prepare(`
        INSERT INTO skill_reports (id, repository_id, user_id, overall_score, summary, strengths, gaps, recommendations, created_at, updated_at)
        VALUES (?, ?, ?, 88, 'Strong understanding of Node.js event loop and asynchronous stream piping required.', ?, ?, ?, ?, ?)
      `).run(skillId, repoId, userId, JSON.stringify(["Node.js stream processing", "Middleware patterns"]), JSON.stringify(["ESM transition"]), JSON.stringify(["Audit deprecated subdependencies"]), now, now);

      db.prepare(`
        INSERT INTO skill_report_items (id, skill_report_id, skill_name, current_level, target_level, importance, explanation, created_at)
        VALUES (?, ?, 'Node.js Streams & HTTP', 'Intermediate', 'Advanced', 'Critical', 'Core to handling raw incoming HTTP sockets.', ?),
               (?, ?, 'Middleware Architecture', 'Intermediate', 'Advanced', 'High', 'Required for composing secure request chains.', ?)
      `).run(uuidv4(), skillId, now, uuidv4(), skillId, now);

      db.prepare(`
        INSERT INTO activities (id, user_id, repository_id, activity_type, title, description, created_at)
        VALUES (?, ?, ?, 'repository_imported', 'Sample Repository Loaded', 'Indexed expressjs/express with full architecture insights', ?)
      `).run(uuidv4(), userId, repoId, now);

      console.log("[Buildrex AI] Initial demo data setup complete.");
    }
  } catch (err: any) {
    console.error("[Buildrex AI] Error during demo seeding:", err);
  }
}

async function startServer() {
  // Initialize Database Tables & Schema
  initDatabase();
  await seedDemoDataIfEmpty();

  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Buildrex AI Engine", timestamp: new Date().toISOString() });
  });

  // Mount API Router
  app.use("/api", apiRouter);

  // Vite middleware in dev, static dist in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Buildrex AI] Production Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
