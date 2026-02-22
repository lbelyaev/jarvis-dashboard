import { NextResponse } from "next/server";
import { readFile, readdir, stat } from "fs/promises";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import path from "path";

export const dynamic = "force-dynamic";

const SESSIONS_DIR = path.join(
  process.env.HOME || "/Users/lbelyaev",
  ".openclaw/agents/main/sessions"
);
const SESSIONS_JSON = path.join(SESSIONS_DIR, "sessions.json");

interface DailyCost {
  date: string;
  total: number;
  byModel: Record<string, number>;
  byProject: Record<string, number>;
  sessions: number;
}

interface SessionMeta {
  model: string;
  label: string;
  key: string;
}

function normalizeModel(model: string): string {
  if (model.includes("opus")) return "claude-opus";
  if (model.includes("sonnet")) return "claude-sonnet";
  if (model.includes("haiku")) return "claude-haiku";
  if (model.includes("gpt")) return "gpt";
  if (model === "unknown") return "unknown";
  return model;
}

function inferProject(key: string, label: string, firstUserMsg: string): string {
  const l = `${label} ${key} ${firstUserMsg}`.toLowerCase();
  if (l.includes("boost") || l.includes("engage")) return "boost";
  if (l.includes("jarvis") || l.includes("dashboard")) return "jarvis-dashboard";
  if (l.includes("dbmcp") || l.includes("db-mcp")) return "db-mcp";
  if (l.includes("openclaw")) return "openclaw";
  if (l.includes("cron:") || l.includes("[cron:")) return "cron-jobs";
  if (l.includes("discord")) return "discord";
  if (l.includes("telegram") || l.includes("main:main")) return "main-chat";
  if (l.includes("subagent")) return "subagent";
  return "other";
}

/**
 * Build a lookup map from sessionId -> metadata using sessions.json
 */
async function buildSessionLookup(): Promise<Map<string, SessionMeta>> {
  const map = new Map<string, SessionMeta>();
  try {
    const raw = await readFile(SESSIONS_JSON, "utf-8");
    const data = JSON.parse(raw) as Record<string, Record<string, unknown>>;
    for (const [key, meta] of Object.entries(data)) {
      const sessionId = meta.sessionId as string;
      if (sessionId) {
        map.set(sessionId, {
          model: (meta.model as string) || "",
          label: (meta.label as string) || "",
          key,
        });
      }
    }
  } catch {
    // sessions.json not available
  }
  return map;
}

/**
 * Parse a single JSONL file and return per-date cost entries.
 * Also extracts model from model_change lines and project context from first user message.
 */
async function parseJSONLFile(
  filePath: string,
  sessionId: string,
  metaLookup: Map<string, SessionMeta>
): Promise<{
  entries: Array<{ date: string; cost: number }>;
  model: string;
  project: string;
}> {
  const meta = metaLookup.get(sessionId);
  let model = meta?.model || "";
  let label = meta?.label || "";
  let key = meta?.key || "";
  let firstUserMsg = "";
  const entries: Array<{ date: string; cost: number }> = [];

  const rl = createInterface({ input: createReadStream(filePath) });

  for await (const line of rl) {
    // Fast pre-filter: skip lines that can't contain what we need
    if (line.length < 10) continue;

    try {
      const obj = JSON.parse(line);
      const type = obj.type;

      // Extract model from model_change lines (usually in first few lines)
      if (!model && type === "model_change" && obj.modelId) {
        model = obj.modelId;
        continue;
      }

      // Extract model from model-snapshot custom events
      if (!model && type === "custom" && obj.customType === "model-snapshot") {
        model = obj.data?.modelId || "";
        continue;
      }

      // Capture first user message for project inference
      if (
        !firstUserMsg &&
        type === "message" &&
        obj.message?.role === "user"
      ) {
        const content = obj.message.content;
        if (typeof content === "string") {
          firstUserMsg = content.slice(0, 200);
        } else if (Array.isArray(content)) {
          for (const block of content) {
            if (block?.type === "text" && block.text) {
              firstUserMsg = block.text.slice(0, 200);
              break;
            }
          }
        }
      }

      // Extract cost data from assistant messages
      if (type === "message") {
        const costTotal = obj.message?.usage?.cost?.total;
        if (costTotal && costTotal > 0) {
          const timestamp = obj.timestamp || "";
          // Parse as UTC and convert to local date
          const date = timestamp
            ? new Date(timestamp).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })
            : "";
          if (date) {
            entries.push({ date, cost: costTotal });
          }
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  const project = inferProject(key, label, firstUserMsg);
  return { entries, model: model || "unknown", project };
}

async function fetchSessionCosts(): Promise<DailyCost[]> {
  const metaLookup = await buildSessionLookup();

  const files = await readdir(SESSIONS_DIR);
  const jsonlFiles = files.filter(
    (f) => f.endsWith(".jsonl") && !f.includes(".deleted.")
  );

  // Aggregate: date -> { total, byModel, byProject, sessionIds }
  const byDate = new Map<
    string,
    {
      total: number;
      byModel: Record<string, number>;
      byProject: Record<string, number>;
      sessionIds: Set<string>;
    }
  >();

  // Process all files
  const results = await Promise.all(
    jsonlFiles.map(async (file) => {
      const sessionId = file.replace(".jsonl", "");
      const filePath = path.join(SESSIONS_DIR, file);
      try {
        return await parseJSONLFile(filePath, sessionId, metaLookup);
      } catch {
        return null;
      }
    })
  );

  // Aggregate results
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (!result || result.entries.length === 0) continue;

    const sessionId = jsonlFiles[i].replace(".jsonl", "");
    const modelName = normalizeModel(result.model);
    const project = result.project;

    for (const entry of result.entries) {
      let day = byDate.get(entry.date);
      if (!day) {
        day = {
          total: 0,
          byModel: {},
          byProject: {},
          sessionIds: new Set(),
        };
        byDate.set(entry.date, day);
      }

      day.total += entry.cost;
      day.byModel[modelName] = (day.byModel[modelName] || 0) + entry.cost;
      day.byProject[project] = (day.byProject[project] || 0) + entry.cost;
      day.sessionIds.add(sessionId);
    }
  }

  return Array.from(byDate.entries())
    .map(([date, data]) => ({
      date,
      total: Math.round(data.total * 100) / 100,
      byModel: Object.fromEntries(
        Object.entries(data.byModel).map(([k, v]) => [
          k,
          Math.round(v * 100) / 100,
        ])
      ),
      byProject: Object.fromEntries(
        Object.entries(data.byProject).map(([k, v]) => [
          k,
          Math.round(v * 100) / 100,
        ])
      ),
      sessions: data.sessionIds.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);
}

export async function GET() {
  try {
    const costs = await fetchSessionCosts();
    return NextResponse.json({ costs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch costs", detail: String(error) },
      { status: 500 }
    );
  }
}
