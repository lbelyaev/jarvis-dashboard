"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOpsLogSSE } from "@/hooks/use-sse";
import { ScrollText, Wifi, WifiOff, ArrowDown, Filter } from "lucide-react";

const typeColors: Record<string, string> = {
  subagent: "text-blue-400",
  "subagent-done": "text-emerald-400",
  merge: "text-purple-400",
  deploy: "text-amber-400",
  error: "text-red-400",
  config: "text-cyan-400",
  pr: "text-violet-400",
  release: "text-amber-300",
  unknown: "text-zinc-500",
};

const typeBadgeVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  subagent: "info",
  "subagent-done": "success",
  merge: "default",
  deploy: "warning",
  error: "danger",
  config: "default",
  pr: "info",
  release: "warning",
  unknown: "default",
};

export default function OpsLogPage() {
  const { entries, connected } = useOpsLogSSE("/api/ops-log");
  const [autoScroll, setAutoScroll] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries, autoScroll]);

  const filteredEntries = typeFilter
    ? entries.filter((e) => e.type === typeFilter)
    : entries;

  const uniqueTypes = [...new Set(entries.map((e) => e.type))].sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Ops Log</h1>
          <p className="text-sm text-zinc-500">Live operational event stream</p>
        </div>
        <div className="flex items-center gap-3">
          {connected ? (
            <Badge variant="success" className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              Live
            </Badge>
          ) : (
            <Badge variant="danger" className="flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              Disconnected
            </Badge>
          )}
          <Button
            variant={autoScroll ? "outline" : "ghost"}
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
          >
            <ArrowDown className="h-3 w-3 mr-1" />
            {autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-zinc-500" />
        <Button
          variant={typeFilter === "" ? "outline" : "ghost"}
          size="sm"
          onClick={() => setTypeFilter("")}
        >
          All
        </Button>
        {uniqueTypes.map((type) => (
          <Button
            key={type}
            variant={typeFilter === type ? "outline" : "ghost"}
            size="sm"
            onClick={() => setTypeFilter(type)}
          >
            {type}
          </Button>
        ))}
      </div>

      {/* Log Viewer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            Event Stream
            <span className="text-xs text-zinc-500 font-normal">
              ({filteredEntries.length} entries)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[calc(100vh-320px)] overflow-y-auto rounded-md bg-zinc-950 border border-zinc-800 p-3">
            {filteredEntries.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                No log entries{typeFilter ? ` of type "${typeFilter}"` : ""}
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredEntries.map((entry, i) => (
                  <div key={`${entry.timestamp}-${i}`} className="log-line flex gap-3 py-0.5">
                    <span className="text-zinc-600 shrink-0 w-32">
                      {entry.timestamp}
                    </span>
                    <Badge
                      variant={typeBadgeVariant[entry.type] || "default"}
                      className="shrink-0 w-24 justify-center text-[11px]"
                    >
                      {entry.type}
                    </Badge>
                    <span className={typeColors[entry.type] || "text-zinc-400"}>
                      {entry.message}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
