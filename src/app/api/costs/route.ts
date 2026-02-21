import { NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import { config } from "@/lib/config";
import path from "path";

export const dynamic = "force-dynamic";

interface DailyCost {
  date: string;
  total: number;
  byModel: Record<string, number>;
  byProject: Record<string, number>;
  sessions: number;
}

async function parseDailyFiles(): Promise<DailyCost[]> {
  const memoryDir = path.join(config.workspacePath, "memory");
  const costs: DailyCost[] = [];

  try {
    const files = await readdir(memoryDir);
    const dailyFiles = files
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .slice(-30); // last 30 days

    for (const file of dailyFiles) {
      const date = file.replace(".md", "");
      const content = await readFile(path.join(memoryDir, file), "utf-8");

      // Parse cost data from daily notes
      // Look for patterns like "Sonnet, 31.8k tokens, ~$0.06" or cost summaries
      const costMatches = content.matchAll(
        /\$(\d+\.?\d*)/g
      );
      let totalCost = 0;
      const byModel: Record<string, number> = {};
      const byProject: Record<string, number> = {};
      let sessions = 0;

      for (const match of costMatches) {
        const amount = parseFloat(match[1]) * 100; // to cents
        totalCost += amount;
      }

      // Parse model mentions
      const modelPatterns = [
        { pattern: /[Oo]pus/g, model: "claude-opus" },
        { pattern: /[Ss]onnet/g, model: "claude-sonnet" },
        { pattern: /[Hh]aiku/g, model: "claude-haiku" },
      ];
      for (const { pattern, model } of modelPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          byModel[model] = (byModel[model] || 0) + matches.length;
          sessions += matches.length;
        }
      }

      // Parse project mentions from subagent labels
      const subagentMatches = content.matchAll(/subagent[^\n]*?(\w[\w-]+)/g);
      for (const match of subagentMatches) {
        const project = match[1];
        byProject[project] = (byProject[project] || 0) + 1;
      }

      if (totalCost > 0 || sessions > 0) {
        costs.push({ date, total: totalCost, byModel, byProject, sessions });
      }
    }
  } catch {
    // No memory directory or files
  }

  // If no real data, return sample data for development
  if (costs.length === 0) {
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split("T")[0];
      costs.push({
        date,
        total: Math.floor(Math.random() * 500) + 100,
        byModel: {
          "claude-opus": Math.floor(Math.random() * 300) + 50,
          "claude-sonnet": Math.floor(Math.random() * 150) + 30,
          "claude-haiku": Math.floor(Math.random() * 50) + 10,
        },
        byProject: {
          "engage-api": Math.floor(Math.random() * 200) + 50,
          "jarvis-dashboard": Math.floor(Math.random() * 100) + 20,
          "data-pipeline": Math.floor(Math.random() * 150) + 30,
        },
        sessions: Math.floor(Math.random() * 15) + 3,
      });
    }
  }

  return costs;
}

export async function GET() {
  try {
    const costs = await parseDailyFiles();
    return NextResponse.json({ costs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch costs", detail: String(error) },
      { status: 500 }
    );
  }
}
