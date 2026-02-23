# Mission #10: Sub-Agents Page with Mission Tracking

**Status:** in-progress  
**Branch:** `feat/sub-agents-page`  
**Project:** personal  
**Priority:** high

## Goal
Create Sub-Agents dashboard page that shows all agent runs with mission context, and ensures `mission_id` flows properly from spawn → agent run → mission audit trail.

## Components

### 1. Sub-Agents List Page (`/agents`)
- Table/grid of all agent_runs
- Filters: model, status, mission, date range
- Columns: label, model, status, duration, cost, mission
- Sort by started_at DESC

### 2. Mission Context in Agent Runs
- Link runs to missions via `mission_id`
- Show mission title in run cards
- Click mission → go to mission detail

### 3. Spawn Agent from Dashboard
- Button to spawn new sub-agent
- Mission selector dropdown (pre-populates mission_id)
- Form: task, model, thinking level, mission_id

### 4. Wire up mission_id Tracking
- Update spawn API to accept mission_id
- Store mission_id in agent_runs table
- Ensure mission detail page shows linked runs

## Files to Create/Modify

### New Files
- `src/app/agents/page.tsx` — Sub-Agents list page
- `src/app/agents/agent-run-card.tsx` — Run card component
- `src/app/api/spawn/route.ts` — Spawn agent endpoint

### Modified Files
- `src/components/sidebar.tsx` — Link to /agents
- `src/lib/ops-db.ts` — Add agent run queries
- `src/app/api/missions/[id]/route.ts` — Verify mission_id linkage works

## API Considerations

### GET /api/agent-runs
```typescript
interface AgentRunFilters {
  mission_id?: number;
  model?: string;
  status?: string;
  since?: string;
}
```

### POST /api/spawn
```typescript
interface SpawnRequest {
  task: string;
  model?: string;
  thinking_level?: string;
  mission_id?: number;
}
```

## Database Notes

Currently `agent_runs.mission_id` exists but is mostly NULL:
```sql
SELECT status, COUNT(*) FROM agent_runs GROUP BY status;
-- Need to populate mission_id on new runs
```

## Definition of Done
1. [ ] `/agents` page shows all agent runs with mission context
2. [ ] Can filter runs by mission, model, status
3. [ ] Spawn agent button launches sub-agent with mission_id
4. [ ] New agent runs have mission_id populated
5. [ ] Mission detail shows linked runs in Commits section
6. [ ] Build passes, tested on localhost:3012

## References
- Branch: `feat/sub-agents-page`
- Mission ID: 10
