import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "@/lib/config";

const execFileAsync = promisify(execFile);

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

export interface Mission {
  id: number;
  title: string;
  description: string | null;
  mission_type: string;
  status: string;
  project: string;
  priority: string;
  expected_outcome: string | null;
  definition_of_done: string | null;
  outcome: string | null;
  lessons: string | null;
  repo_id: number | null;
  repo_name: string | null;
  requested_by: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
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
  session_key: string | null;
  brief: string | null;
  plan: string | null;
  output: string | null;
  cost_usd: number | null;
  started_at: string | null;
  completed_at: string | null;
}

export async function getMissions(filters?: { project?: string; status?: string; type?: string }): Promise<Mission[]> {
  const conditions: string[] = [];
  
  if (filters?.project && filters.project !== 'all') {
    conditions.push(`m.project = '${filters.project}'`);
  }
  if (filters?.status) {
    conditions.push(`m.status = '${filters.status}'`);
  }
  if (filters?.type) {
    conditions.push(`m.mission_type = '${filters.type}'`);
  }
  
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const sql = `
    SELECT 
      m.*,
      r.name as repo_name
    FROM missions m
    LEFT JOIN repos r ON m.repo_id = r.id
    ${where}
    ORDER BY m.created_at DESC
  `;
  
  return queryDb<Mission>(sql);
}

export async function getMissionById(id: number): Promise<Mission | null> {
  const sql = `
    SELECT 
      m.*,
      r.name as repo_name
    FROM missions m
    LEFT JOIN repos r ON m.repo_id = r.id
    WHERE m.id = ?1
  `;
  const rows = await queryDb<Mission>(sql, [id]);
  return rows[0] || null;
}

export async function getMissionSteps(missionId: number): Promise<MissionStep[]> {
  const sql = `
    SELECT * 
    FROM mission_steps 
    WHERE mission_id = ?1 
    ORDER BY step_number
  `;
  return queryDb<MissionStep>(sql, [missionId]);
}