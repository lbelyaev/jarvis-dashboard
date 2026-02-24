## 2026-02-23/24 — ops.db ingestion diagnosis (missions/agent_runs)

### Goal
Diagnose why recent missions/runs are not being captured in `ops.db` for `jarvis-dashboard`.

### Commands run
- `ls -la ~/dev/jarvis-dashboard/`
- `find src -type f ...`
- `cat ~/dev/jarvis-dashboard/.env.local`
- `sqlite3 ~/.openclaw/workspace/ops.db ".tables"`
- `sqlite3 ~/.openclaw/workspace/ops.db "SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT 5;"`
- `sqlite3 ~/.openclaw/workspace/ops.db "SELECT * FROM ops_events ORDER BY timestamp DESC LIMIT 10;"`
- `ls -lh ~/.openclaw/ops.db ~/.openclaw/workspace/ops.db`
- `sqlite3 ~/.openclaw/ops.db ".tables"`
- `grep -n "api.on('session_start'" ~/.openclaw/workspace/.openclaw/extensions/ops-db-logger/index.ts`
- `tail -100 ~/.openclaw/logs/gateway.log | grep -i "plugin\|extension"`

### Key findings

#### 1) jarvis-dashboard does NOT write missions/agent_runs automatically
- `jarvis-dashboard` mostly **reads** from SQLite via `src/lib/ops-db.ts` (using `sqlite3 -readonly` for reads).
- The only direct writer found is:
  - `src/app/api/spawn/route.ts` which **inserts a row into `agent_runs`** with status `running`.
  - But that route explicitly says: *"Agent spawn record created. Use 'openclaw agent spawn' or dashboard to complete."*
  - i.e. it is **manual bookkeeping**; it does not actually integrate with OpenClaw execution.

#### 2) There IS a plugin/hooks mechanism in OpenClaw intended to write to ops.db
- Plugin discovered and currently being loaded by the gateway:
  - `~/.openclaw/workspace/.openclaw/extensions/ops-db-logger/openclaw.plugin.json`
  - `~/.openclaw/workspace/.openclaw/extensions/ops-db-logger/index.ts`
- Gateway log confirms load:
  - `... [plugins] loaded ... (plugin=ops-db-logger, source=.../ops-db-logger/index.ts)`

#### 3) But the plugin is broken for `agent_runs` ingestion
Symptoms:
- `ops_events` is being populated heavily (recent rows exist).
- `agent_runs` is NOT being populated for recent sub-agent/cron runs.

Root cause:
- In `ops-db-logger/index.ts`, the hook `api.on('session_start', ...)` is registered **twice** (lines ~28 and ~99).
- The second registration overrides the first in the plugin API (effective behavior: only the later handler runs).
- The **first** `session_start` handler contains the logic that inserts into `agent_runs`.
- Therefore, only the generic ops_events session_start logging remains; no `agent_runs` inserts happen.

Extra issue: path confusion
- There are two DB files:
  - `~/.openclaw/ops.db` (0 bytes, empty)
  - `~/.openclaw/workspace/ops.db` (~600KB, real)
- `jarvis-dashboard` default config points to `~/.openclaw/workspace/ops.db` (correct), but a stray empty `~/.openclaw/ops.db` could confuse manual commands.

### Minimal fix plan (1–3 steps)
1) Fix the plugin: merge the two `session_start` handlers into one, or rename one event.
   - Keep the subagent-tracking insert into `agent_runs` AND also keep ops_events logging.
2) Restart the OpenClaw gateway so the plugin reloads.
3) Verify by spawning a subagent/cron and checking:
   - `sqlite3 ~/.openclaw/workspace/ops.db "SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT 5;"`

### Relevant files / code points
- Dashboard DB reader: `~/dev/jarvis-dashboard/src/lib/ops-db.ts`
- Dashboard spawn writer: `~/dev/jarvis-dashboard/src/app/api/spawn/route.ts`
- Plugin descriptor: `~/.openclaw/workspace/.openclaw/extensions/ops-db-logger/openclaw.plugin.json`
- Plugin code (broken duplicate hook): `~/.openclaw/workspace/.openclaw/extensions/ops-db-logger/index.ts` (duplicate `api.on('session_start', ...)`)
