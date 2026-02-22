"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, Wifi, WifiOff, ArrowDown, Filter } from "lucide-react";

type OpsEvent = {
  id: number;
  timestamp: string;
  category: string;
  event: string;
  mission_id: number | null;
  agent_run_id: number | null;
  pr_id: number | null;
  repo_id: number | null;
};

type LogEntry = {
  id: number;
  timestamp: string;
  type: string;
  message: string;
};

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

function mapEventToEntry(event: OpsEvent): LogEntry {
  return {
    id: event.id,
    timestamp: event.timestamp,
    type: event.category || "unknown",
    message: event.event,
  };
}

export default function OpsLogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [hasScrolledToBottomOnce, setHasScrolledToBottomOnce] = useState(false);
  const [newEventsCount, setNewEventsCount] = useState(0);
  const logEndRef = useRef<HTMLDivElement>(null);
  const sinceRef = useRef<string | null>(null);
  
  // Helper function to check if user is near bottom (within 100px)
  const isNearBottom = () => {
    if (!scrollContainerRef.current) return false;
    const container = scrollContainerRef.current;
    return container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
  };

  // Helper function to scroll to bottom instantly
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  // Handle clicking the new events indicator
  const handleNewEventsClick = () => {
    scrollToBottom();
    setNewEventsCount(0);
  };

  // Handle scroll events to clear new events counter when user scrolls near bottom
  const handleScroll = () => {
    if (isNearBottom() && newEventsCount > 0) {
      setNewEventsCount(0);
    }
  };

  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      try {
        const params = new URLSearchParams();
        params.set("limit", "500");
        if (sinceRef.current) {
          params.set("since", sinceRef.current);
        }

        const response = await fetch(`/api/ops/events?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = (await response.json()) as { events?: OpsEvent[] };
        const fetchedEvents = Array.isArray(data.events) ? data.events : [];

        if (!mounted) return;

        const orderedAsc = [...fetchedEvents].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const newEntries = orderedAsc.map(mapEventToEntry);

        setEntries((prev) => {
          const existingIds = new Set(prev.map((entry) => entry.id));
          const merged = [...prev];
          let newEventCount = 0;

          for (const entry of newEntries) {
            if (!existingIds.has(entry.id)) {
              // Deduplication logic: check if this entry is a duplicate
              const isDuplicate = prev.some(existingEntry => {
                // Check if same category and within 2 seconds
                const timeDiff = Math.abs(new Date(entry.timestamp).getTime() - new Date(existingEntry.timestamp).getTime());
                const withinTimeWindow = timeDiff <= 2000;
                const sameCategory = entry.type === existingEntry.type;
                
                if (withinTimeWindow && sameCategory) {
                  // Check if messages are similar (same tool name for tool events)
                  if (entry.type === 'tool') {
                    const toolNamePattern = /tool_call: (\w+)/;
                    const entryTool = entry.message.match(toolNamePattern)?.[1];
                    const existingTool = existingEntry.message.match(toolNamePattern)?.[1];
                    return entryTool && existingTool && entryTool === existingTool;
                  }
                  // For non-tool events, check if messages are substantially similar
                  const similarity = entry.message.toLowerCase().includes(existingEntry.message.toLowerCase().substring(0, 20)) ||
                                    existingEntry.message.toLowerCase().includes(entry.message.toLowerCase().substring(0, 20));
                  return similarity;
                }
                return false;
              });

              if (!isDuplicate) {
                merged.push(entry);
                newEventCount++;
              }
            }
          }

          // Handle new events indicator and initial scroll
          if (newEventCount > 0) {
            if (!hasScrolledToBottomOnce) {
              // First time loading data - scroll to bottom immediately
              setTimeout(() => {
                scrollToBottom();
                setHasScrolledToBottomOnce(true);
              }, 50);
            } else if (!isNearBottom()) {
              // User is scrolled up - increment new events counter
              setNewEventsCount(count => count + newEventCount);
            } else if (autoScroll) {
              // User is near bottom and auto-scroll is on - scroll to bottom
              setTimeout(scrollToBottom, 50);
            }
          }

          return merged;
        });

        if (orderedAsc.length > 0) {
          sinceRef.current = orderedAsc[orderedAsc.length - 1].timestamp;
        }

        setConnected(true);
      } catch {
        if (mounted) {
          setConnected(false);
        }
      }
    };

    poll();
    const interval = setInterval(poll, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Set up scroll event listener to clear new events counter when user scrolls near bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [newEventsCount]); // Re-run when newEventsCount changes

  const costEntries = entries.filter((e) => /tokens|cost|\$/i.test(e.message));
  const filteredEntries = typeFilter === "$costs"
    ? costEntries
    : typeFilter
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

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-zinc-500" />
        <Button
          variant={typeFilter === "" ? "outline" : "ghost"}
          size="sm"
          onClick={() => setTypeFilter("")}
        >
          All
        </Button>
        <Button
          variant={typeFilter === "$costs" ? "outline" : "ghost"}
          size="sm"
          onClick={() => setTypeFilter("$costs")}
          className={typeFilter === "$costs" ? "text-amber-400 border-amber-400/50" : "text-amber-400/70"}
        >
          💰 Costs ({costEntries.length})
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
          <div className="relative">
            <div ref={scrollContainerRef} className="h-[calc(100vh-320px)] overflow-y-auto rounded-md bg-zinc-950 border border-zinc-800 p-3">
              {filteredEntries.length === 0 ? (
                <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                  No log entries{typeFilter ? ` of type "${typeFilter}"` : ""}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredEntries.map((entry) => (
                    <div key={entry.id} className="log-line flex gap-3 py-0.5">
                      <span className="text-zinc-600 shrink-0 w-32">{new Date(entry.timestamp + "Z").toLocaleString()}</span>
                      <Badge
                        variant={typeBadgeVariant[entry.type] || "default"}
                        className="shrink-0 w-24 justify-center text-[11px]"
                      >
                        {entry.type}
                      </Badge>
                      <span className={typeColors[entry.type] || "text-zinc-400"}>{entry.message}</span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              )}
            </div>
            
            {/* New events indicator */}
            {newEventsCount > 0 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                <Button
                  onClick={handleNewEventsClick}
                  variant="outline"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 border-blue-500 text-white shadow-lg animate-pulse"
                >
                  <ArrowDown className="h-3 w-3 mr-1" />
                  {newEventsCount} new event{newEventsCount > 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
