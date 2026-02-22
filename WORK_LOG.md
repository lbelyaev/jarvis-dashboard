# Mission #4: Rich Mission Audit Trail & Editable Fields

**Status:** in-progress
**Branch:** `feat/mission-rich-audit`
**Project:** personal
**Priority:** normal

## Goal
Enhance mission detail page with:
1. Rich audit trail showing actual agent runs with model, status, runtime, cost, errors, prompts, outputs
2. Editable text fields for mission description, expected_outcome, definition_of_done
3. Join mission_steps with agent_runs for complete execution visibility
4. UI for inline editing with save/cancel

## Technical Approach

### Database Query
```sql
SELECT 
  ms.*,
  ar.model,
  ar.thinking_level,
  ar.status as run_status,
  ar.duration_sec,
  ar.cost_usd,
  ar.error,
  ar.result_summary
FROM mission_steps ms
LEFT JOIN agent_runs ar ON ms.session_key = ar.session_key OR ms.id = ar.step_id
WHERE ms.mission_id = ?
ORDER BY ms.step_number, ar.started_at
```

### API Changes
- `GET /api/missions?id=X` - join mission_steps with agent_runs
- `POST /api/missions/[id]/update` - update mission fields

### UI Changes
- Mission detail page: inline editable fields
- Audit trail: expand agent run details

## Files to Modify
- `src/app/missions/[id]/page.tsx` - rich audit trail + editable fields
- `src/app/api/missions/route.ts` - add POST/PUT handler
- `src/lib/ops-db.ts` - update query functions

## Definition of Done
1. Audit trail shows: agent name, model, thinking level, status, duration, cost, error, input prompt (truncated), output summary
2. API joins mission_steps with agent_runs via step_id or session_key
3. Editable fields: description, expected_outcome, definition_of_done with inline edit UI
4. POST /api/missions/[id]/update endpoint
5. Changes visible to agents immediately
6. Tested on localhost:3012/missions/[id]
