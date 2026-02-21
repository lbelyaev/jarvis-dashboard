"use client";

import { useState, useEffect, useRef } from "react";
import type { OpsLogEntry } from "@/lib/types";

export function useOpsLogSSE(url: string) {
  const [entries, setEntries] = useState<OpsLogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "initial") {
          setEntries(data.entries);
        } else if (data.type === "update") {
          setEntries((prev) => {
            const combined = [...prev, ...data.entries];
            // Deduplicate by raw content and keep last 500
            const seen = new Set<string>();
            const unique = combined.filter((e: OpsLogEntry) => {
              if (seen.has(e.raw)) return false;
              seen.add(e.raw);
              return true;
            });
            return unique.slice(-500);
          });
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
    };
  }, [url]);

  return { entries, connected };
}
