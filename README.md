# Buildrex AI

![Build Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Built with Gemini](https://img.shields.io/badge/AI-Google_Gemini-red)

## Overview
Buildrex AI is an intelligent developer productivity platform designed to bridge the gap between complex codebase architecture and developer efficiency. By leveraging Retrieval-Augmented Generation (RAG) and advanced repository analysis, Buildrex allows teams to query their codebase, automate documentation, and identify critical knowledge silos within their engineering workflows.

### The Problem
Modern development teams struggle with:
* **Context Overload:** New developers spending weeks just to understand the architecture of a legacy repository.
* **Documentation Debt:** READMEs that are outdated or non-existent.
* **Knowledge Silos:** Inability to track skill distribution across large, distributed codebases.

Buildrex AI solves this by transforming your repository into a searchable, interactive knowledge base.

## Key Features
* **Repository Ingestion:** Seamlessly pull and index GitHub repositories for deep semantic analysis.
* **RAG-Powered Q&A:** Ask complex questions about your codebase and receive context-aware answers from Google Gemini or OpenAI.
* **Automated Documentation:** Instantly generate professional-grade `README.md` files based on code structure and dependencies.
* **Skill Gap Analysis:** Data-driven insights into the technologies used versus team expertise.
* **Local-First Performance:** Utilizes `node:sqlite` for high-speed local persistence with native Supabase/PostgreSQL migration readiness.

## Tech Stack

| Category | Technology |
| :--- | :--- |
| **Frontend** | React 19, Tailwind CSS v4, Motion, Lucide React, Featherless ai |
| **Backend** | Express, TypeScript, Node.js |
| **Database** | `node:sqlite` (with PostgreSQL/Supabase compatibility)
| **AI/LLM** | Google Gemini API, OpenAI API |
| **Tooling** | Vite 6, esbuild, quen ai |

## Architecture & Directory Structure
```text
├── server/             # Backend: API, Auth, GitHub ingestion, AI orchestration
├── src/                # Frontend: React application
│   ├── components/     # UI Library (Header, Sidebar, Modals)
│   ├── context/        # Global Auth & Notification state
│   ├── pages/          # View layer (Dashboard, RepoAnalyzer, etc.)
│   └── services/       # API Abstractions
├── supabase/           # PostgreSQL migration schemas
└── public/             # Static assets
```

## Prerequisites
* Node.js (v20+)
* npm or pnpm
* GitHub Personal Access Token (with repo read permissions)
* API Keys for Google Gemini or OpenAI
* Featherless models

## Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/srikrupa-02/Team_Aspirants.git
   cd Team_Aspirants
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Environment Configuration:**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   DATABASE_URL=file:./dev.db
   GITHUB_TOKEN=your_github_token_here
   GOOGLE_GENAI_API_KEY=your_gemini_key
   OPENAI_API_KEY=your_openai_key
   JWT_SECRET=your_super_secret_key
   ```

## Running Locally
* **Development Server:**
  ```bash
  npm run dev
  ```
* **Production Build:**
  ```bash
  npm run build
  npm run start
  ```

## Testing & Linting
* **Type Checking:** `npm run type-check`
* **Linting:** `npm run lint`

## Deployment
Buildrex AI is designed for containerized deployment:
1. Ensure the `dist` folder is generated via `npm run build`.
2. Use the `server/` directory as the entry point for your Node.js runtime.
3. For database persistent storage in production, update the `DATABASE_URL` to point to your Supabase PostgreSQL instance, as the migrations in `supabase/migrations/` are compatible with the schema used in the SQLite local dev environment.

## Contributing
We welcome contributions! Please follow these steps:
1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

## License
Distributed under the MIT License. See `LICENSE` for more information.
