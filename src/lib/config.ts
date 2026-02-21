export const config = {
  openclawApiUrl: process.env.OPENCLAW_API_URL || "http://localhost:4440",
  workspacePath: process.env.WORKSPACE_PATH || `${process.env.HOME}/.openclaw/workspace`,
  opsLogPath: process.env.OPS_LOG_PATH || `${process.env.HOME}/.openclaw/workspace/memory/ops-log.txt`,
  githubRepos: [
    "engage-api",
    "engage-media-frontend",
    "db-mcp",
    "warp-bridge",
    "b1g-data-pipeline",
    "streamed-data-pipeline",
  ],
  githubOwner: process.env.GITHUB_OWNER || "lbelyaev",
  refreshInterval: 10000, // 10s default polling
};
