import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { watch } from "fs";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

function parseOpsLogLine(line: string) {
  // Format: "2026-02-20 16:10 | type | message"
  const match = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*\|\s*(\S+)\s*\|\s*(.+)$/);
  if (match) {
    return {
      timestamp: match[1],
      type: match[2],
      message: match[3].trim(),
      raw: line,
    };
  }
  return { timestamp: "", type: "unknown", message: line, raw: line };
}

async function readLastLines(filePath: string, n: number): Promise<string[]> {
  try {
    const content = await readFile(filePath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    return lines.slice(-n);
  } catch {
    return [];
  }
}

// Regular GET: return last N lines
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accept = request.headers.get("accept") || "";

  // SSE mode
  if (accept.includes("text/event-stream")) {
    const logPath = config.opsLogPath;

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let lastSize = 0;

        // Send initial data
        (async () => {
          try {
            const lines = await readLastLines(logPath, 50);
            const entries = lines.map(parseOpsLogLine);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "initial", entries })}\n\n`)
            );
            const s = await stat(logPath);
            lastSize = s.size;
          } catch {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "initial", entries: [] })}\n\n`)
            );
          }
        })();

        // Watch for changes
        let watcher: ReturnType<typeof watch> | null = null;
        try {
          watcher = watch(logPath, async () => {
            try {
              const s = await stat(logPath);
              if (s.size > lastSize) {
                const content = await readFile(logPath, "utf-8");
                const allLines = content.trim().split("\n").filter(Boolean);
                // Calculate approx new lines based on size diff
                const newLines = allLines.slice(-10); // send last 10 on each change
                const entries = newLines.map(parseOpsLogLine);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "update", entries })}\n\n`)
                );
                lastSize = s.size;
              }
            } catch {
              // ignore
            }
          });
        } catch {
          // File doesn't exist yet, that's fine
        }

        // Heartbeat every 30s
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            clearInterval(heartbeat);
          }
        }, 30000);

        // Cleanup on close
        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          watcher?.close();
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Regular JSON response
  const lines = parseInt(searchParams.get("lines") || "100");
  const typeFilter = searchParams.get("type") || "";

  const rawLines = await readLastLines(config.opsLogPath, lines);
  let entries = rawLines.map(parseOpsLogLine);

  if (typeFilter) {
    entries = entries.filter((e) => e.type === typeFilter);
  }

  return NextResponse.json({ entries });
}
