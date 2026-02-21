import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "@/lib/config";

const execFileAsync = promisify(execFile);

function clampLimit(value: string | null, defaultValue: number, maxValue: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue;
  }
  return Math.min(parsed, maxValue);
}

function normalizeSinceIso(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function queryDb<T>(sql: string, params: Array<string | number> = []): Promise<T[]> {
  const args = [
    "-readonly",
    config.opsDbPath,
    "-cmd",
    ".mode json",
    "-cmd",
    ".parameter clear",
  ];

  params.forEach((value, idx) => {
    args.push("-cmd", `.parameter set ?${idx + 1} ${JSON.stringify(String(value))}`);
  });

  args.push(sql);

  const { stdout } = await execFileAsync("sqlite3", args, { timeout: 3000, maxBuffer: 1024 * 1024 * 4 });
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  const parsed = JSON.parse(trimmed);
  return Array.isArray(parsed) ? parsed : [];
}

export type OpsEvent = {
  id: number;
  timestamp: string;
  category: string;
  event: string;
  mission_id: number | null;
  agent_run_id: number | null;
  pr_id: number | null;
  repo_id: number | null;
};

export type AgentRun = {
  id: number;
  label: string;
  mission_id: number | null;
  step_id: number | null;
  model: string;
  thinking_level: string | null;
  status: string;
  tokens_input: number | null;
  tokens_output: number | null;
  tokens_cache: number | null;
  cost_usd: number | null;
  duration_sec: number | null;
  started_at: string;
  completed_at: string | null;
  result_summary: string | null;
  error: string | null;
  session_key: string | null;
  created_at: string;
};

export async function getOpsEvents(limitParam: string | null, sinceParam: string | null): Promise<OpsEvent[]> {
  const limit = clampLimit(limitParam, 200, 500);
  const sinceIso = normalizeSinceIso(sinceParam);

  const sql = sinceIso
    ? `
      SELECT id, timestamp, category, event, mission_id, agent_run_id, pr_id, repo_id
      FROM ops_events
      WHERE timestamp >= ?1
      ORDER BY datetime(timestamp) DESC
      LIMIT ?2
    `
    : `
      SELECT id, timestamp, category, event, mission_id, agent_run_id, pr_id, repo_id
      FROM ops_events
      ORDER BY datetime(timestamp) DESC
      LIMIT ?1
    `;

  const rows = await queryDb<OpsEvent>(sql, sinceIso ? [sinceIso, limit] : [limit]);
  return rows;
}

export async function getAgentRuns(limitParam: string | null): Promise<AgentRun[]> {
  const limit = clampLimit(limitParam, 50, 200);
  const sql = `
    SELECT
      id, label, mission_id, step_id, model, thinking_level, status,
      tokens_input, tokens_output, tokens_cache, cost_usd, duration_sec,
      started_at, completed_at, result_summary, error, session_key, created_at
    FROM agent_runs
    ORDER BY datetime(started_at) DESC
    LIMIT ?1
  `;

  return queryDb<AgentRun>(sql, [limit]);
}

export async function getTodaySummary() {
  const sql = `
    WITH today_events AS (
      SELECT *
      FROM ops_events
      WHERE date(timestamp) = date('now', 'localtime')
    ),
    today_runs AS (
      SELECT *
      FROM agent_runs
      WHERE date(started_at) = date('now', 'localtime')
    )
    SELECT
      (SELECT COUNT(*) FROM today_events) AS events_count,
      (SELECT COUNT(*) FROM today_runs) AS runs_count,
      (SELECT COUNT(*) FROM today_runs WHERE status = 'completed') AS runs_completed,
      (SELECT COUNT(*) FROM today_runs WHERE status = 'failed') AS runs_failed,
      (SELECT ROUND(COALESCE(SUM(cost_usd), 0), 4) FROM today_runs) AS cost_usd_total
  `;

  const rows = await queryDb<Array<{
    events_count: number;
    runs_count: number;
    runs_completed: number;
    runs_failed: number;
    cost_usd_total: number;
  }>>(sql);

  return rows[0] || {
    events_count: 0,
    runs_count: 0,
    runs_completed: 0,
    runs_failed: 0,
    cost_usd_total: 0,
  };
}
