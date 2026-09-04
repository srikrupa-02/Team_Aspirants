export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  url: string;
  defaultBranch: string;
  description: string;
  isPrivate: boolean;
  stars: number;
  forks: number;
  openIssues: number;
  language: string;
}

export interface GitHubFileItem {
  path: string;
  name: string;
  extension: string;
  size: number;
  content?: string;
  isBinary: boolean;
}

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "svg", "ico", "webp", "mp4", "webm", "mp3", "wav",
  "pdf", "zip", "tar", "gz", "7z", "rar", "woff", "woff2", "ttf", "eot",
  "exe", "dll", "so", "dylib", "bin", "class", "jar", "war", "pyc", "pyo", "pyd",
  "iso", "img", "dmg", "lock"
]);

const IGNORE_DIRECTORIES = new Set([
  ".git", "node_modules", "dist", "build", "coverage", "vendor",
  ".next", ".nuxt", ".turbo", "target", "bin", "obj", ".idea",
  ".vscode", ".cache", "tmp", "temp", "out"
]);

export function parseGitHubUrl(input: string): { owner: string; repo: string } {
  const cleaned = input.trim().replace(/\/$/, "");
  const match = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i)
    || cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);

  if (!match) {
    throw new Error("Invalid GitHub repository URL. Expected format: https://github.com/owner/repo or owner/repo");
  }

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, "")
  };
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Buildrex-AI-Intelligence-Engine/1.0"
  };

  const token = process.env.GITHUB_TOKEN;
  if (token && token.trim() !== "") {
    headers["Authorization"] = `Bearer ${token.trim()}`;
  }

  return headers;
}

export async function fetchGitHubRepoMetadata(owner: string, repo: string): Promise<GitHubRepoInfo> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: getHeaders()
  });

  if (res.status === 404) {
    throw new Error(`GitHub repository "${owner}/${repo}" was not found or is private.`);
  }

  if (res.status === 403 || res.status === 429) {
    const rateLimitReset = res.headers.get("x-ratelimit-reset");
    const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset, 10) * 1000).toLocaleTimeString() : "shortly";
    throw new Error(`GitHub API rate limit exceeded. Provide a GITHUB_TOKEN in Settings or wait until ${resetTime}.`);
  }

  if (!res.ok) {
    throw new Error(`GitHub API responded with status ${res.status}: ${res.statusText}`);
  }

  const data = await res.json() as any;
  return {
    owner: data.owner?.login || owner,
    repo: data.name || repo,
    url: data.html_url || `https://github.com/${owner}/${repo}`,
    defaultBranch: data.default_branch || "main",
    description: data.description || "No description provided.",
    isPrivate: Boolean(data.private),
    stars: data.stargazers_count || 0,
    forks: data.forks_count || 0,
    openIssues: data.open_issues_count || 0,
    language: data.language || "Unknown"
  };
}

export async function fetchGitHubRepoTree(owner: string, repo: string, defaultBranch: string): Promise<GitHubFileItem[]> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, {
    headers: getHeaders()
  });

  if (!res.ok) {
    throw new Error(`Could not fetch git tree for branch "${defaultBranch}". Status: ${res.status}`);
  }

  const data = await res.json() as any;
  if (!data.tree || !Array.isArray(data.tree)) {
    return [];
  }

  const fileList: GitHubFileItem[] = [];

  for (const item of data.tree) {
    if (item.type !== "blob") continue; // only files, not trees/directories
    const filePath = item.path as string;

    // Check directory ignores
    const parts = filePath.split("/");
    const hasIgnoredDir = parts.some(p => IGNORE_DIRECTORIES.has(p));
    if (hasIgnoredDir) continue;

    const fileName = parts[parts.length - 1];
    const ext = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() || "" : "";
    const isBinary = BINARY_EXTENSIONS.has(ext);

    // Filter file size (max ~200KB for text ingestion)
    const size = item.size || 0;
    if (size > 250000 && !fileName.includes("package.json")) continue;

    fileList.push({
      path: filePath,
      name: fileName,
      extension: ext,
      size,
      isBinary
    });
  }

  return fileList;
}

export async function fetchFileContent(owner: string, repo: string, branch: string, filePath: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Buildrex-AI/1.0" }
  });

  if (!res.ok) {
    return "";
  }
  return await res.text();
}
