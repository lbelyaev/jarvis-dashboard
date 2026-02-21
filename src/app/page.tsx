"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { Bot, Clock, DollarSign, Activity, Zap, CheckCircle2 } from "lucide-react";
import { formatDuration, timeAgo } from "@/lib/utils";

interface SessionsData {
  active: Array<{
    key: string;
    label?: string;
    model?: string;
    status: string;
    startedAt: string;
    tokens?: { input: number; output: number; total: number };
  }>;
  recent: Array<{
    key: string;
    label?: string;
    model?: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    cost?: number;
    duration?: number;
    result?: string;
    tokens?: { input: number; output: number; total: number };
  }>;
  stats?: {
    totalSessions: number;
    totalTokens: number;
    modelBreakdown: Record<string, number>;
  };
}

interface CostsData {
  costs: Array<{
    date: string;
    total: number;
    byModel: Record<string, number>;
    sessions: number;
  }>;
}

export default function OverviewPage() {
  const { data: sessions } = useFetch<SessionsData>("/api/sessions", 10000);
  const { data: costsData } = useFetch<CostsData>("/api/costs", 30000);

  const activeAgents = sessions?.active || [];
  const recentCompletions = sessions?.recent || [];
  const todayCost = costsData?.costs?.slice(-1)[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Overview</h1>
        <p className="text-sm text-zinc-500">Jarvis operations at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-400" />
              Active Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeAgents.length}</div>
            <p className="text-xs text-zinc-500 mt-1">
              {activeAgents.length > 0
                ? activeAgents.map((a) => a.label || "unnamed").join(", ")
                : "No active agents"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Completions Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{recentCompletions.length}</div>
            <p className="text-xs text-zinc-500 mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-400" />
              Daily Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${todayCost ? (todayCost.total / 100).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {todayCost?.sessions || 0} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Gateway
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-400 pulse-dot" />
              <span className="text-xl font-bold">Online</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">localhost:4440</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Agents */}
      {activeAgents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Active Sub-Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeAgents.map((agent) => (
                <div
                  key={agent.key}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-blue-400 pulse-dot" />
                    <div>
                      <span className="font-medium text-sm">
                        {agent.label || "unnamed"}
                      </span>
                      <p className="text-xs text-zinc-500 font-mono">
                        {agent.model}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(new Date(agent.startedAt))}
                    </span>
                    {agent.tokens && (
                      <span className="font-mono">
                        {(agent.tokens.total / 1000).toFixed(1)}k tok
                      </span>
                    )}
                    <Badge variant="info">running</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Completions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Completions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentCompletions.length === 0 ? (
              <p className="text-sm text-zinc-500">No recent completions</p>
            ) : (
              recentCompletions.map((session) => (
                <div
                  key={session.key}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {session.label || "unnamed"}
                      </span>
                      <Badge
                        variant={
                          session.status === "completed"
                            ? "success"
                            : session.status === "failed"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {session.status}
                      </Badge>
                    </div>
                    {session.result && (
                      <p className="text-xs text-zinc-500 mt-1 truncate">
                        {session.result}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-400 ml-4 shrink-0">
                    {session.duration && (
                      <span>{formatDuration(session.duration)}</span>
                    )}
                    {session.cost && (
                      <span className="text-amber-400">
                        ${(session.cost / 100).toFixed(2)}
                      </span>
                    )}
                    <span className="font-mono text-zinc-500">
                      {session.model?.split("-").slice(-1)[0]}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
