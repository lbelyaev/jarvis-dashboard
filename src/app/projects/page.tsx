"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import {
  FolderGit2,
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import type { GitHubPR } from "@/lib/types";

interface PRsData {
  prs: GitHubPR[];
}

const ciIcons = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  failure: <XCircle className="h-4 w-4 text-red-400" />,
  pending: <Clock className="h-4 w-4 text-amber-400 animate-pulse" />,
  unknown: <Clock className="h-4 w-4 text-zinc-500" />,
};

const ciBadgeVariant: Record<string, "success" | "danger" | "warning" | "default"> = {
  success: "success",
  failure: "danger",
  pending: "warning",
  unknown: "default",
};

export default function ProjectsPage() {
  const { data, loading } = useFetch<PRsData>("/api/github/prs", 30000);

  const prs = data?.prs || [];

  // Group PRs by repo
  const prsByRepo: Record<string, GitHubPR[]> = {};
  for (const pr of prs) {
    if (!prsByRepo[pr.repo]) prsByRepo[pr.repo] = [];
    prsByRepo[pr.repo].push(pr);
  }

  const repos = [
    "engage-api",
    "engage-media-frontend",
    "db-mcp",
    "warp-bridge",
    "b1g-data-pipeline",
    "streamed-data-pipeline",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Projects</h1>
        <p className="text-sm text-zinc-500">
          Repository status and open pull requests
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-blue-400" />
              Repositories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{repos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-purple-400" />
              Open PRs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{prs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              CI Passing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {prs.filter((pr) => pr.ciStatus === "success").length}
              <span className="text-lg text-zinc-500">/{prs.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-repo cards */}
      <div className="space-y-4">
        {repos.map((repo) => {
          const repoPRs = prsByRepo[repo] || [];
          return (
            <Card key={repo}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="h-4 w-4" />
                    {repo}
                  </div>
                  {repoPRs.length > 0 ? (
                    <Badge variant="info">{repoPRs.length} PR{repoPRs.length !== 1 ? "s" : ""}</Badge>
                  ) : (
                    <Badge variant="default">No PRs</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              {repoPRs.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    {repoPRs.map((pr) => (
                      <div
                        key={`${pr.repo}-${pr.number}`}
                        className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {ciIcons[pr.ciStatus]}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                #{pr.number} {pr.title}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500">
                              by {pr.author} · updated{" "}
                              {new Date(pr.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          <Badge variant={ciBadgeVariant[pr.ciStatus]}>
                            {pr.ciStatus}
                          </Badge>
                          <a
                            href={pr.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
