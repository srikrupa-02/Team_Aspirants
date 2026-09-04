# Buildrex AI

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.10+-blue)
![FastAPI](https://img.shields.io/badge/framework-FastAPI-05998b)

## Overview
**Buildrex AI** is an intelligent developer productivity platform designed to bridge the gap between complex codebases and developer understanding. By leveraging advanced RAG (Retrieval-Augmented Generation) and semantic analysis, Buildrex acts as an autonomous AI engineer that parses your entire repository to provide deep architectural insights, automated documentation, and intelligent code Q&A.

### The Problem
Modern development teams struggle with:
*   **Onboarding friction:** New developers spending weeks understanding legacy code.
*   **Knowledge silos:** Critical architectural context buried in un-indexed codebases.
*   **Documentation rot:** READMEs and technical specs failing to sync with the evolving codebase.
*   **Skill gaps:** Difficulty identifying team-wide technical bottlenecks and learning needs.

---

## Key Features
*   **Repository Analysis:** Automatically maps codebase architecture and detects technology stacks.
*   **AI-Powered Q&A:** RAG-based engine to answer complex questions about logic, dependencies, and flow.
*   **Auto-Documentation:** Generates and maintains high-quality `README.md` and technical specifications.
*   **Skill Gap Analytics:** Analyzes developer contribution patterns to identify areas for professional growth.
*   **Dependency Mapping:** Visualizes project dependencies and identifies potential security or compatibility risks.

---

## Architecture & Directory Structure
```text
buildrex-ai/
├── src/
│   ├── analysis/       # Codebase parsing and AST analysis
│   ├── llm/            # RAG pipelines and prompting logic
│   ├── api/            # FastAPI endpoints
│   ├── db/             # Vector database integration (e.g., Pinecone/Milvus)
│   └── models/         # Pydantic models and schemas
├── tests/              # Unit and integration tests
├── scripts/            # Build and deployment scripts
├── .env.example        # Environment variables template
└── README.md
```

---

## Tech Stack
*   **Backend:** Python 3.10+, FastAPI
*   **LLM Orchestration:** LangChain / LlamaIndex
*   **Vector Database:** ChromaDB / Pinecone
*   **Parsing:** Tree-sitter
*   **Deployment:** Docker, AWS ECS/EKS

---

## Prerequisites
*   Python 3.10+
*   Docker & Docker Compose
*   OpenAI API Key (or local LLM via Ollama)
*   GitHub Personal Access Token (with repo read permissions)

---

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/srikrupa-02/Team_Aspirants.git
   cd Team_Aspirants
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## Environment Variables
Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_key_here
GITHUB_TOKEN=your_github_token_here
VECTOR_DB_URL=your_vector_db_url
DATABASE_URL=postgresql://user:pass@localhost:5432/buildrex
```

---

## Running Locally
Start the application using:
```bash
uvicorn src.api.main:app --reload
```
Navigate to `http://localhost:8000/docs` to access the interactive Swagger API documentation.

---

## Testing and Linting
*   **Run tests:** `pytest tests/`
*   **Lint code:** `flake8 src/`
*   **Format code:** `black src/`

---

## Deployment
Buildrex AI is container-ready. 
1. Build the image: `docker build -t buildrex-ai .`
2. Deploy via Docker Compose: `docker-compose up -d`

---

## Contributing
We welcome contributions! Please follow these steps:
1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## License
Distributed under the MIT License. See `LICENSE` for more information.
