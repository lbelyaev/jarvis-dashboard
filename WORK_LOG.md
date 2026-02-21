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
