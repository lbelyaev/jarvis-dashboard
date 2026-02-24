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

export interface Mission {
  id: number;
  title: string;
  description: string | null;
  mission_type: string | null;
  status: string;
  priority: string | null;
  project: string | null;
  repo_id: number | null;
  repo_name?: string | null;
  repo_project?: string | null;
  expected_outcome: string | null;
  definition_of_done: string | null;
  outcome: string | null;
  dependencies: string | null;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface MissionStep {
  id: number;
  mission_id: number;
  step_number: number;
  title: string;
  description: string | null;
  status: string;
  outcome: string | null;
  agent_id: string | null;
  agent_name: string;
  action: string;
  cost: number;
  session_key: string | null;
  brief: string | null;
  plan: string | null;
  output: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface MissionFilters {
  project?: string[];
  status?: string[];
  type?: string[];
  search?: string;
}

export async function getMissions(filters: MissionFilters = {}): Promise<Mission[]> {
  let query = `
    SELECT m.*, r.name as repo_name, r.project as repo_project
    FROM missions m
    LEFT JOIN repos r ON m.repo_id = r.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.project && filters.project.length > 0) {
    const placeholders = filters.project.map(() => '?').join(', ');
    query += ` AND (m.project IN (${placeholders}) OR r.project IN (${placeholders}))`;
    params.push(...filters.project, ...filters.project);
  }

  if (filters.status && filters.status.length > 0) {
    const placeholders = filters.status.map(() => '?').join(', ');
    query += ` AND m.status IN (${placeholders})`;
    params.push(...filters.status);
  }

  if (filters.type && filters.type.length > 0) {
    const placeholders = filters.type.map(() => '?').join(', ');
    query += ` AND m.mission_type IN (${placeholders})`;
    params.push(...filters.type);
  }

  if (filters.search) {
    query += ` AND (m.title LIKE ? OR m.description LIKE ?)`;
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }

  query += ` ORDER BY m.created_at DESC`;

  return queryDb<Mission>(query, params);
}

export async function getMissionById(id: number): Promise<Mission | null> {
  const sql = `
    SELECT m.*, r.name as repo_name, r.project as repo_project
    FROM missions m
    LEFT JOIN repos r ON m.repo_id = r.id
    WHERE m.id = ?
  `;
  const rows = await queryDb<Mission>(sql, [id]);
  return rows[0] || null;
}

export async function getMissionSteps(missionId: number): Promise<MissionStep[]> {
  const sql = `
    SELECT * FROM mission_steps 
    WHERE mission_id = ? 
    ORDER BY started_at DESC
  `;
  return queryDb<MissionStep>(sql, [missionId]);
}

export interface Repo {
  id: number;
  name: string;
  project: string | null;
}

export async function getRepos(): Promise<Repo[]> {
  const sql = `
    SELECT id, name, project FROM repos ORDER BY name
  `;
  return queryDb<Repo>(sql);
}

export async function updateMission(
  id: number,
  updates: Partial<Omit<Mission, 'id' | 'created_at' | 'updated_at'>>
): Promise<Mission | null> {
  // Build SET clause dynamically with named parameters
  const setClauses: string[] = [];
  const params: (string | number)[] = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && value !== null) {
      setClauses.push(`${key} = ?${params.length + 1}`);
      params.push(value as string | number);
    } else if (value === null) {
      setClauses.push(`${key} = NULL`);
    }
  }
  
  if (setClauses.length === 0) {
    return getMissionById(id);
  }
  
  // Add updated_at
  setClauses.push("updated_at = datetime('now')");
  
  // Add id as last param
  params.push(id);
  
  const sql = `
    UPDATE missions 
    SET ${setClauses.join(', ')}
    WHERE id = ?${params.length}
  `;
  
  // Execute using queryDb pattern but without -readonly
  const args = [
    config.opsDbPath,
    "-cmd", ".mode json",
    "-cmd", ".parameter clear",
  ];
  
  params.forEach((value, idx) => {
    args.push("-cmd", `.parameter set ?${idx + 1} ${JSON.stringify(String(value))}`);
  });
  
  args.push(sql);
  
  try {
    await execFileAsync("sqlite3", args, { timeout: 3000 });
  } catch (e) {
    console.error("Update failed:", e);
    throw e;
  }
  
  // Fetch with repo info
  return getMissionById(id);
}

export async function getProjects(): Promise<string[]> {
  const sql = `
    SELECT DISTINCT project FROM repos WHERE project IS NOT NULL
    UNION
    SELECT DISTINCT project FROM missions WHERE project IS NOT NULL
  `;
  const results = await queryDb<{ project: string }>(sql);
  return [...new Set(results.map(r => r.project))];
}

export async function getOpsEvents(limitParam: string | null, sinceParam: string | null): Promise<OpsEvent[]> {
  const limit = clampLimit(limitParam, 200, 500);
  const sinceIso = normalizeSinceIso(sinceParam);

  const sql = sinceIso
    ? `
      SELECT id, timestamp, category, event, mission_id, agent_run_id, pr_id, repo_id
      FROM ops_events
      WHERE timestamp >= ?1
      ORDER BY id DESC
      LIMIT ?2
    `
    : `
      SELECT id, timestamp, category, event, mission_id, agent_run_id, pr_id, repo_id
      FROM ops_events
      ORDER BY id DESC
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

export async function getAgentRunById(runId: number): Promise<AgentRun | null> {
  const sql = `
    SELECT
      id, label, mission_id, step_id, model, thinking_level, status,
      tokens_input, tokens_output, tokens_cache, cost_usd, duration_sec,
      started_at, completed_at, result_summary, error, session_key, created_at
    FROM agent_runs
    WHERE id = ?1
    LIMIT 1
  `;

  const rows = await queryDb<AgentRun>(sql, [runId]);
  return rows[0] || null;
}

export async function getAgentRunsForMission(missionId: number): Promise<AgentRun[]> {
  // First try by mission_id
  const sqlByMissionId = `
    SELECT
      id, label, mission_id, step_id, model, thinking_level, status,
      tokens_input, tokens_output, tokens_cache, cost_usd, duration_sec,
      started_at, completed_at, result_summary, error, session_key, created_at
    FROM agent_runs
    WHERE mission_id = ?1
    ORDER BY datetime(started_at) DESC
  `;
  const runs = await queryDb<AgentRun>(sqlByMissionId, [missionId]);
  
  // If no runs found, try to find by mission title in label
  if (runs.length === 0) {
    const mission = await getMissionById(missionId);
    if (mission) {
      const sqlByLabel = `
        SELECT
          id, label, mission_id, step_id, model, thinking_level, status,
          tokens_input, tokens_output, tokens_cache, cost_usd, duration_sec,
          started_at, completed_at, result_summary, error, session_key, created_at
        FROM agent_runs
        WHERE label LIKE ?1 OR result_summary LIKE ?1
        ORDER BY datetime(started_at) DESC
        LIMIT 50
      `;
      const searchTerm = `%${mission.title}%`;
      return queryDb<AgentRun>(sqlByLabel, [searchTerm]);
    }
  }
  
  return runs;
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
