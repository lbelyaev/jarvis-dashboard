export interface Session {
  key: string;
  label?: string;
  model?: string;
  status: "active" | "completed" | "failed" | "killed";
  startedAt: string;
  completedAt?: string;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number; // cents
  duration?: number; // seconds
  result?: string;
}

export interface OpsLogEntry {
  timestamp: string;
  type: string;
  message: string;
  raw: string;
}

export interface GitHubPR {
  repo: string;
  number: number;
  title: string;
  author: string;
  state: string;
  ciStatus: "success" | "failure" | "pending" | "unknown";
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface CostEntry {
  date: string;
  model: string;
  cost: number; // cents
  tokens: number;
  sessions: number;
}

export interface GatewayStatus {
  status: "online" | "offline" | "unknown";
  uptime?: number;
  version?: string;
}
