import { NextResponse } from "next/server";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

interface RawSession {
  key: string;
  kind: string;
  updatedAt: number;
  ageMs: number;
  sessionId: string;
  systemSent?: boolean;
  abortedLastRun?: boolean;
  thinkingLevel?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number | null;
  totalTokensFresh?: boolean;
  model?: string;
  contextTokens?: number;
}

interface RawResponse {
  path: string;
  count: number;
  sessions: RawSession[];
}

function extractLabel(key: string): string {
  // Extract a readable label from the session key
  // e.g., "agent:main:subagent:uuid" -> "subagent"
  // e.g., "agent:main:cron:uuid" -> "cron"
  // e.g., "agent:main:telegram:group:xxx" -> "telegram:group"
  // e.g., "agent:main:discord:channel:xxx" -> "discord"
  const parts = key.split(":");
  if (parts.length >= 3) {
    const type = parts[2]; // subagent, cron, telegram, discord, main
    if (type === "subagent") return "subagent";
    if (type === "cron") return "cron";
    if (type === "telegram") return "telegram";
    if (type === "discord") return "discord";
    if (type === "main") return "main";
    return type;
  }
  return key;
}

function isActive(session: RawSession): boolean {
  // Consider active if updated within last 5 minutes
  return session.ageMs < 300000;
}

export async function GET() {
  try {
    // Try OpenClaw sessions.json directly
    const apiUrl = `${config.openclawApiUrl}/api/sessions`;
    let rawSessions: RawSession[] = [];

    try {
      const res = await fetch(apiUrl, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data: RawResponse = await res.json();
        rawSessions = data.sessions || [];
      }
    } catch {
      // API not available
    }

    // Filter out duplicate cron run entries (keep parent only)
    const filtered = rawSessions.filter((s) => {
      // Skip cron run sub-entries (they're duplicates)
      const parts = s.key.split(":");
      const runIdx = parts.indexOf("run");
      if (runIdx > 0) return false;
      return true;
    });

    // Split into active and recent
    const active = filtered
      .filter((s) => isActive(s) && s.kind === "direct")
      .map((s) => ({
        key: s.key,
        label: extractLabel(s.key),
        model: s.model || "unknown",
        status: "active" as const,
        startedAt: new Date(s.updatedAt - s.ageMs).toISOString(),
        tokens: s.totalTokens
          ? {
              input: s.inputTokens || 0,
              output: s.outputTokens || 0,
              total: s.totalTokens,
            }
          : undefined,
      }));

    // Recent: subagents and significant sessions from last 24h
    const oneDayAgo = Date.now() - 86400000;
    const recent = filtered
      .filter(
        (s) =>
          !isActive(s) &&
          s.key.includes("subagent") &&
          s.updatedAt > oneDayAgo
      )
      .slice(0, 20)
      .map((s) => ({
        key: s.key,
        label: extractLabel(s.key),
        model: s.model || "unknown",
        status: "completed" as const,
        startedAt: new Date(s.updatedAt - s.ageMs).toISOString(),
        completedAt: new Date(s.updatedAt).toISOString(),
        tokens: s.totalTokens
          ? {
              input: s.inputTokens || 0,
              output: s.outputTokens || 0,
              total: s.totalTokens,
            }
          : undefined,
        cost: s.totalTokens
          ? Math.round(estimateCost(s.model || "", s.inputTokens || 0, s.outputTokens || 0)) / 100
          : undefined,
        duration: Math.round(s.ageMs / 1000),
      }));

    // Summary stats
    const totalSessions = filtered.length;
    const totalTokens = filtered.reduce((sum, s) => sum + (s.totalTokens || 0), 0);
    const modelBreakdown: Record<string, number> = {};
    for (const s of filtered) {
      const model = s.model || "unknown";
      modelBreakdown[model] = (modelBreakdown[model] || 0) + 1;
    }

    return NextResponse.json({
      active,
      recent,
      stats: {
        totalSessions,
        totalTokens,
        modelBreakdown,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch sessions", detail: String(error) },
      { status: 500 }
    );
  }
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Returns cost in cents
  // Approximate pricing per 1M tokens
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-opus-4-6": { input: 1500, output: 7500 }, // $15/$75 per 1M
    "claude-sonnet-4-5-20250929": { input: 300, output: 1500 }, // $3/$15 per 1M
    "claude-haiku-4-5-20251001": { input: 80, output: 400 }, // $0.80/$4 per 1M
    "gpt-5.2-2025-12-11": { input: 250, output: 1000 }, // estimate
  };

  const p = pricing[model] || pricing["claude-sonnet-4-5-20250929"];
  const inputCost = (inputTokens / 1000000) * p.input;
  const outputCost = (outputTokens / 1000000) * p.output;
  return inputCost + outputCost;
}
