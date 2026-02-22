# Work Log

## 2026-02-20: Fix cost analytics

**Commit:** `01f644a` (local, no remote configured)

### What was done
- Rewrote `src/app/api/costs/route.ts` to fetch real session data from OpenClaw API instead of regex-scraping markdown files
- Removed the `* 100` cents conversion — all values now in dollars
- Removed fallback sample data (was generating random $100-600 values)
- Updated `src/app/costs/page.tsx` — removed all `/ 100` divisions (5 instances)
- Updated `src/app/page.tsx` — removed `/ 100` in Daily Cost display and session cost display (2 instances)
- Updated `src/app/api/sessions/route.ts` — session cost now returns dollars instead of cents

### How it works now
- Fetches all sessions from `{openclawApiUrl}/api/sessions`
- Groups by date using `updatedAt`
- Calculates cost per session using model-specific pricing (Opus: $15/$75, Sonnet: $3/$15, Haiku: $0.80/$4)
- When only `totalTokens` available (no input/output breakdown), estimates 25% input / 75% output split
- Infers project from session key/label (boost, jarvis-dashboard, db-mcp, openclaw, cron-jobs, etc.)
- Returns values in dollars, rounded to cents

### Assumptions
- 25/75 input/output token split when breakdown unavailable (conservative estimate)
- Project inference is heuristic based on label/key keywords
- Gateway API URL from config (defaults to localhost:4440, may need env var adjustment)

### Needs verification
- Dashboard should show daily costs in $3-15 range (not $100-600)
- Gateway must be running for data to appear
- No remote repo configured — needs `git remote add origin <url>` to push

## 2026-02-21: Fix ops-db sqlite3 invocation for API routes

### What was done
- Fixed `src/lib/ops-db.ts` `queryDb()` sqlite3 argument construction for dot-commands.
- Replaced invalid argv token usage (`.mode`, `json`, `.parameter`, `clear`, etc.) with sqlite3-supported `-cmd` form:
  - `-cmd ".mode json"`
  - `-cmd ".parameter clear"`
  - `-cmd ".parameter set ?N <value>"`
- Kept `execFile` protections and runtime limits (`timeout: 3000`, `maxBuffer: 4MB`).
- Preserved read-only access (`-readonly`) and positional SQL parameter binding (`?1`, `?2`, ...).

### Safety / injection notes
- SQL text remains static in code; user input is not interpolated into SQL.
- Dynamic values are passed via sqlite parameters using `.parameter set` commands.
- Parameter values are quoted using `JSON.stringify(String(value))` before being sent to sqlite3, preventing command/token injection through shell-like splitting.

### Local verification
- Started dev server with:
  - `PORT=3011 OPS_DB_PATH=./ops.db npm run dev`
- Verified API returns JSON successfully:
  - `curl http://127.0.0.1:3011/api/ops/events?limit=2`
  - Result: valid JSON payload with `events` array and `count` (no 500).

### How to run
- `PORT=3011 OPS_DB_PATH=./ops.db npm run dev`
- `curl http://127.0.0.1:3011/api/ops/events?limit=2`

## Ops DB wiring (local dev)

### Run
```bash
PORT=3012 OPS_DB_PATH="$HOME/.openclaw/workspace/ops.db" npm run dev
```

### Verify API (examples)
```bash
curl -sS "http://localhost:3012/api/ops/events?limit=3" | head -c 400
curl -sS "http://localhost:3012/api/ops/agent-runs?limit=2" | head -c 400
curl -sS "http://localhost:3012/api/ops/summary/today" | head -c 400
```

Expected: all return 200 with JSON payloads.

### Notes
- Ops Log UI page (`/ops-log`) now polls `/api/ops/events` (instead of the legacy SSE `/api/ops-log`).
- DB access is via `sqlite3` CLI with `.mode json` and `.parameter` bindings; set `OPS_DB_PATH` to point at your `ops.db`.

---

## 2026-02-21: Ops Log UX Fixes Plan

### Issues to Address

1. **Duplicate events**: Tool calls appearing twice in the log
   - One without agent context: "tool_call: cron 57ms ok (unknown)"  
   - One with agent context: "tool_call: cron ok (unknown)"
   - Need to investigate and deduplicate

2. **Costs filter functionality**: Verify 💰 Costs filter works correctly
   - Should filter to events containing "tokens", "$", or "cost"
   - Uses regex `/tokens|cost|\$/i.test(e.message)`

3. **Auto-scroll to bottom on page load**: Ensure page starts at newest events
   - Uses `logEndRef` and `initialScrollDone` ref
   - Should scroll instantly on first load, smoothly afterwards

4. **500 limit verification**: Confirm API handles the increased limit
   - `clampLimit` function with `maxValue` parameter
   - Currently set to max 500 in `getOpsEvents`

5. **Cost filter count badge**: Consider adding event count to filter button

### Exploration Findings

- **Plugin analysis**: Found ops-db-logger plugin at `~/.openclaw/workspace/.openclaw/extensions/ops-db-logger/index.ts`
  - Registers `after_tool_call` event handler
  - Only writes one event per tool call
  - Also found message hook at `~/.openclaw/workspace/hooks/ops-db-logger/handler.ts` (messages only)

- **Limit verification**: `src/lib/ops-db.ts` uses `clampLimit(limitParam, 200, 500)` - correct max of 500

- **UI analysis**: `src/app/ops-log/page.tsx` has all expected functionality:
  - Auto-scroll logic with `initialScrollDone` ref
  - Costs filter using regex pattern
  - 500 limit in API calls

### Plan

1. **Test current functionality** - Run dashboard and verify current behavior
2. **Investigate duplicate events** - Check actual ops.db data for patterns  
3. **Verify costs filter** - Test filtering with actual cost events
4. **Test auto-scroll behavior** - Confirm instant scroll on page load
5. **Add cost count badge** - Show number of cost events in filter
6. **Fix any identified issues** - Based on testing results

**Plan complete. Proceeding to execution.**