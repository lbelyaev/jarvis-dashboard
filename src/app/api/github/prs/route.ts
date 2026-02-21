import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { exec } from "child_process";
import { promisify } from "util";
import type { GitHubPR } from "@/lib/types";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

async function fetchPRsForRepo(repo: string): Promise<GitHubPR[]> {
  try {
    const { stdout } = await execAsync(
      `gh pr list --repo ${config.githubOwner}/${repo} --json number,title,author,state,statusCheckRollup,url,createdAt,updatedAt --limit 10 2>/dev/null`,
      { timeout: 15000 }
    );
    const prs = JSON.parse(stdout || "[]");
    return prs.map((pr: Record<string, unknown>) => {
      const checks = pr.statusCheckRollup as Array<{ conclusion: string }> | null;
      let ciStatus: GitHubPR["ciStatus"] = "unknown";
      if (checks && checks.length > 0) {
        const hasFailure = checks.some((c) => c.conclusion === "FAILURE");
        const allSuccess = checks.every((c) => c.conclusion === "SUCCESS");
        const hasPending = checks.some((c) => !c.conclusion);
        if (hasFailure) ciStatus = "failure";
        else if (allSuccess) ciStatus = "success";
        else if (hasPending) ciStatus = "pending";
      }
      return {
        repo,
        number: pr.number,
        title: pr.title,
        author: (pr.author as { login: string })?.login || "unknown",
        state: pr.state,
        ciStatus,
        url: pr.url,
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
      };
    });
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      config.githubRepos.map((repo) => fetchPRsForRepo(repo))
    );

    const prs: GitHubPR[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        prs.push(...result.value);
      }
    }

    // Sort by most recently updated
    prs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({ prs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch PRs", detail: String(error) },
      { status: 500 }
    );
  }
}
