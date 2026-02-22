import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "@/lib/config";

const execFileAsync = promisify(execFile);

async function queryDb(sql: string): Promise<string> {
  const { stdout } = await execFileAsync("sqlite3", [
    "-readonly",
    config.opsDbPath,
    sql,
  ], { timeout: 30000, maxBuffer: 1024 * 1024 * 10 });
  return stdout.trim();
}

interface DailyCost {
  date: string;
  total: number;
  byModel: Record<string, number>;
  byProject: Record<string, number>;
  sessions: number;
  // For tooltips - detailed breakdown per day
  detailByModel: Record<string, number>;
  detailByProject: Record<string, number>;
}

function normalizeModel(model: string): string {
  if (!model) return "unknown";
  if (model.includes("opus")) return "claude-opus";
  if (model.includes("sonnet")) return "claude-sonnet";
  if (model.includes("haiku")) return "claude-haiku";
  if (model.includes("gpt")) return "gpt";
  if (model.includes("minimax")) return "minimax";
  if (model.includes("kimi")) return "kimi";
  return "other";
}

function inferProject(sessionKey: string): string {
  if (!sessionKey) return "other";
  const lower = sessionKey.toLowerCase();
  
  // Sub-agent task labels often contain project hints
  if (lower.includes("subagent:")) {
    const labelPart = lower.split("subagent:")[1] || "";
    if (labelPart.includes("boost")) return "boost";
    if (labelPart.includes("x1")) return "x1";
    if (labelPart.includes("ape")) return "ape";
  }
  
  // Boost projects
  if (lower.includes("boost") || 
      lower.includes("engage") || 
      lower.includes("b1g") ||
      lower.includes("ncaa")) {
    return "boost";
  }
  
  // X1 projects
  if (lower.includes("x1")) return "x1";
  
  // Ape projects  
  if (lower.includes("ape")) return "ape";
  
  // Session types
  if (lower.includes("cron:")) return "cron-jobs";
  if (lower.includes("subagent")) return "subagent";
  if (lower.includes("main:main")) return "main-chat";
  
  return "other";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "last7";
    
    // Date filter for SQL
    let dateFilter = "";
    if (range === "last7") {
      dateFilter = "AND timestamp >= date('now', '-7 days')";
    }
    
    // Primary query: ops_events (accurate cost data from LLM logs)
    // Join with agent_runs and repos if available to get better project data
    const sql = `
      SELECT 
        DATE(e.timestamp) as date,
        e.event,
        COALESCE(ar.label, '') as agent_label,
        COALESCE(r.project, 'other') as repo_project
      FROM ops_events e
      LEFT JOIN agent_runs ar ON e.agent_run_id = ar.id
      LEFT JOIN missions m ON ar.mission_id = m.id
      LEFT JOIN repos r ON m.repo_id = r.id
      WHERE e.category = 'llm' 
        AND e.event LIKE '%tokens%'
        ${dateFilter}
      ORDER BY e.timestamp ASC
    `;
    
    const output = await queryDb(sql);
    if (!output) {
      return NextResponse.json({ costs: [], range });
    }
    
    const lines = output.split("\n");
    
    const byDate = new Map<string, {
      total: number;
      byModel: Record<string, number>;
      byProject: Record<string, number>;
      sessions: Set<string>;
    }>();

    for (const line of lines) {
      if (!line || line.length < 20) continue;
      
      const parts = line.split("|");
      if (parts.length < 2) continue;
      
      const date = parts[0];
      const event = parts[1] || "";
      const agentLabel = parts[2] || "";
      const repoProject = parts[3] || "other";
      
      // Extract model and tokens from event
      // Format: "llm_output: claude-opus-4-6 - 77220 tokens..."
      const modelMatch = event.match(/llm_output: ([a-zA-Z0-9.-]+)/);
      const model = modelMatch ? modelMatch[1] : "unknown";
      
      const tokensMatch = event.match(/- (\d+) tokens/);
      const tokens = tokensMatch ? parseInt(tokensMatch[1], 10) : 0;
      if (tokens === 0) continue;
      
      // Extract session from event
      const sessionMatch = event.match(/\(agent:([^)]+)\)/);
      const sessionKey = sessionMatch ? sessionMatch[1] : agentLabel || "unknown";
      
      // Calculate cost
      let costPerM = 3.0;// claude-sonnet default
      if (model.includes("opus")) costPerM = 15.0;
      else if (model.includes("haiku")) costPerM = 0.25;
      else if (model.includes("gpt")) costPerM = 2.5;
      else if (model.includes("kimi")) costPerM = 0.5;
      else if (model.includes("minimax")) costPerM = 0.1;
      
      const cost = (tokens / 1_000_000) * costPerM;
      const normalizedModel = normalizeModel(model);
      
      // Infer project - prefer repo project, fallback to session inference
      const project = (repoProject !== "other" && repoProject !== "unknown") 
        ? repoProject 
        : inferProject(sessionKey);
      
      if (!byDate.has(date)) {
        byDate.set(date, {
          total: 0,
          byModel: {},
          byProject: {},
          sessions: new Set(),
        });
      }
      
      const day = byDate.get(date)!;
      day.total += cost;
      day.byModel[normalizedModel] = (day.byModel[normalizedModel] || 0) + cost;
      day.byProject[project] = (day.byProject[project] || 0) + cost;
      day.sessions.add(sessionKey);
    }
    
    // Ensure all 7 days exist for "last7" view
    if (range === "last7") {
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        if (!byDate.has(dateStr)) {
          byDate.set(dateStr, { total: 0, byModel: {}, byProject: {}, sessions: new Set() });
        }
      }
    }

    // Convert to array, sort ascending
    const costs: DailyCost[] = Array.from(byDate.entries())
      .map(([date, data]) => ({
        date,
        total: Math.round(data.total * 100) / 100,
        byModel: Object.fromEntries(
          Object.entries(data.byModel).map(([k, v]) => [k, Math.round(v * 100) / 100])
        ),
        byProject: Object.fromEntries(
          Object.entries(data.byProject).map(([k, v]) => [k, Math.round(v * 100) / 100])
        ),
        sessions: data.sessions.size,
        detailByModel: data.byModel,
        detailByProject: data.byProject,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ costs, range });
  } catch (error) {
    console.error("Error fetching costs:", error);
    return NextResponse.json(
      { error: "Failed to fetch costs", detail: String(error) },
      { status: 500 }
    );
  }
}
