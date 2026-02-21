import { NextResponse } from "next/server";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

interface DailyCost {
  date: string;
  total: number; // dollars
  byModel: Record<string, number>; // dollars
  byProject: Record<string, number>; // dollars
  sessions: number;
}

interface RawSession {
  key: string;
  label?: string;
  model?: string;
  updatedAt: number;
  totalTokens?: number | null;
  inputTokens?: number;
  outputTokens?: number;
}

// Cost per 1M tokens in dollars
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6": { input: 15, output: 75 },
  "claude-sonnet-4-5-20250929": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
  "gpt-5.2-2025-12-11": { input: 2.5, output: 10 },
};

function estimateCostDollars(
  model: string,
  inputTokens: number,
  outputTokens: number,
  totalTokens: number
): number {
  const p = MODEL_PRICING[model] || MODEL_PRICING["claude-sonnet-4-5-20250929"];

  if (inputTokens > 0 || outputTokens > 0) {
    return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
  }

  // No input/output breakdown — estimate 25% input, 75% output
  const estInput = totalTokens * 0.25;
  const estOutput = totalTokens * 0.75;
  return (estInput / 1_000_000) * p.input + (estOutput / 1_000_000) * p.output;
}

function normalizeModel(model: string): string {
  if (model.includes("opus")) return "claude-opus";
  if (model.includes("sonnet")) return "claude-sonnet";
  if (model.includes("haiku")) return "claude-haiku";
  if (model.includes("gpt")) return "gpt";
  return model;
}

function inferProject(key: string, label?: string): string {
  const l = (label || key).toLowerCase();
  if (l.includes("boost") || l.includes("engage")) return "boost";
  if (l.includes("jarvis") || l.includes("dashboard")) return "jarvis-dashboard";
  if (l.includes("dbmcp") || l.includes("db-mcp")) return "db-mcp";
  if (l.includes("openclaw")) return "openclaw";
  if (l.includes("cron:")) return "cron-jobs";
  if (l.includes("discord")) return "discord";
  if (l.includes("telegram") || l.includes("main:main")) return "main-chat";
  return "other";
}

async function fetchSessionCosts(): Promise<DailyCost[]> {
  const apiUrl = `${config.openclawApiUrl}/api/sessions`;
  let sessions: RawSession[] = [];

  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      sessions = data.sessions || data || [];
    }
  } catch {
    // API not available
  }

  if (sessions.length === 0) {
    return [];
  }

  // Group by date
  const byDate = new Map<string, { total: number; byModel: Record<string, number>; byProject: Record<string, number>; sessions: number }>();

  for (const s of sessions) {
    if (!s.totalTokens) continue;

    const date = new Date(s.updatedAt).toISOString().split("T")[0];
    if (!byDate.has(date)) {
      byDate.set(date, { total: 0, byModel: {}, byProject: {}, sessions: 0 });
    }

    const day = byDate.get(date)!;
    const cost = estimateCostDollars(
      s.model || "",
      s.inputTokens || 0,
      s.outputTokens || 0,
      s.totalTokens
    );

    day.total += cost;
    day.sessions += 1;

    const modelName = normalizeModel(s.model || "unknown");
    day.byModel[modelName] = (day.byModel[modelName] || 0) + cost;

    const project = inferProject(s.key, s.label);
    day.byProject[project] = (day.byProject[project] || 0) + cost;
  }

  // Sort by date, return last 30 days
  return Array.from(byDate.entries())
    .map(([date, data]) => ({
      date,
      total: Math.round(data.total * 100) / 100, // round to cents
      byModel: Object.fromEntries(
        Object.entries(data.byModel).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      byProject: Object.fromEntries(
        Object.entries(data.byProject).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      sessions: data.sessions,
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
