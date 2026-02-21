"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFetch } from "@/hooks/use-fetch";
import { Bot, Clock, Cpu, Eye, StopCircle, MessageSquare } from "lucide-react";
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
}

export default function AgentsPage() {
  const { data: sessions, loading } = useFetch<SessionsData>("/api/sessions", 5000);

  const activeAgents = sessions?.active || [];
  const recentAgents = sessions?.recent || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Sub-Agents</h1>
        <p className="text-sm text-zinc-500">Monitor active and recent agent sessions</p>
      </div>

      {/* Active Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-400" />
            Active Agents
            {activeAgents.length > 0 && (
              <Badge variant="info">{activeAgents.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-zinc-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
              <span className="ml-2 text-sm">Loading...</span>
            </div>
          ) : activeAgents.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              No active agents. All quiet on the western front.
            </div>
          ) : (
            <div className="space-y-3">
              {activeAgents.map((agent) => {
                const runtime = Math.floor(
                  (Date.now() - new Date(agent.startedAt).getTime()) / 1000
                );
                return (
                  <div
                    key={agent.key}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-400 pulse-dot" />
                          <span className="font-medium">
                            {agent.label || "unnamed"}
                          </span>
                          <Badge variant="info">running</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            {agent.model}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(runtime)}
                          </span>
                          {agent.tokens && (
                            <span className="font-mono">
                              {(agent.tokens.total / 1000).toFixed(1)}k tokens
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" disabled title="Steer agent (coming soon)">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Steer
                        </Button>
                        <Button variant="ghost" size="sm" disabled title="Kill agent (coming soon)">
                          <StopCircle className="h-3 w-3 mr-1" />
                          Kill
                        </Button>
                        <Button variant="ghost" size="sm" disabled title="View logs (coming soon)">
                          <Eye className="h-3 w-3 mr-1" />
                          Logs
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs font-mono text-zinc-600 truncate">
                      {agent.key}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Completions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Completions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAgents.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">
              No recent completions
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                    <th className="pb-2 pr-4">Agent</th>
                    <th className="pb-2 pr-4">Model</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Duration</th>
                    <th className="pb-2 pr-4">Tokens</th>
                    <th className="pb-2 pr-4">Cost</th>
                    <th className="pb-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAgents.map((agent) => (
                    <tr
                      key={agent.key}
                      className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
                    >
                      <td className="py-3 pr-4 font-medium">
                        {agent.label || "unnamed"}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-zinc-400">
                        {agent.model?.split("/").pop()}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={
                            agent.status === "completed"
                              ? "success"
                              : agent.status === "failed"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {agent.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-zinc-400">
                        {agent.duration ? formatDuration(agent.duration) : "—"}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-zinc-400">
                        {agent.tokens
                          ? `${(agent.tokens.total / 1000).toFixed(1)}k`
                          : "—"}
                      </td>
                      <td className="py-3 pr-4 text-amber-400">
                        {agent.cost
                          ? `$${(agent.cost / 100).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="py-3 text-xs text-zinc-500 max-w-xs truncate">
                        {agent.result || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
