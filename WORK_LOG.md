# Mission #4: Rich Mission Audit Trail, Editable Fields & Repo Mapping

**Status:** in-progress  
**Branch:** `feat/mission-rich-audit`  
**Project:** personal  
**Priority:** normal

## Goal
Enhance mission detail page with:
1. **Rich audit trail** — actual agent runs with model, status, runtime, cost, errors, prompts, outputs
2. **Editable fields** — description, expected_outcome, definition_of_done, status (with archive/backlog options)
3. **Repo mapping** — link mission to specific repo via `repo_id` (FK to `repos` table)
4. **Mission type expansion** — add `research` to mission_type enum

## Database Changes

### Add `research` to mission_type
```sql
-- mission_type accepts: bug, feature, chore, hotfix, research
```

### Add status values
```sql
-- status accepts: planned, in-progress, done, failed, blocked, deferred, archived, backlog
```

### repo_id already exists
- `missions.repo_id` → `repos.id` FK
- Need UI to select/change repo

## API Changes
- `GET /api/missions?id=X` — join mission_steps with agent_runs
- `POST /api/missions/[id]/update` — update editable fields
- `GET /api/repos` — list repos for dropdown

## UI Changes

### Missions List Page
- Add repo filter dropdown
- Add "research" type badge styling

### Mission Detail Page
- **Header**: Editable status dropdown (with `archived`, `backlog` options)
- **Fields**: Inline edit for description, expected_outcome, definition_of_done
- **Repo**: Dropdown to select/change linked repo
- **Audit Trail**: Expand agent run details (model, cost, error, prompts, outputs)

## Type Colors (add research)
```typescript
const typeColors = {
  bug: 'bg-red-500/20 text-red-400',
  feature: 'bg-blue-500/20 text-blue-400',
  chore: 'bg-gray-500/20 text-gray-400',
  hotfix: 'bg-orange-500/20 text-orange-400',
  research: 'bg-cyan-500/20 text-cyan-400',
};
```

## Status Colors (add archived, backlog)
```typescript
const statusColors = {
  planned: 'bg-gray-500/20 text-gray-400',
  'in-progress': 'bg-yellow-500/20 text-yellow-400',
  done: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
  blocked: 'bg-orange-500/20 text-orange-400',
  deferred: 'bg-zinc-500/20 text-zinc-500',
  archived: 'bg-zinc-800 text-zinc-600',
  backlog: 'bg-slate-500/20 text-slate-400',
};
```

## Files to Modify
- `src/app/missions/[id]/page.tsx` — editable fields, repo dropdown, rich audit
- `src/app/missions/page.tsx` — add repo filter, research type
- `src/app/api/missions/route.ts` — add PUT/update handler, repo join
- `src/app/api/repos/route.ts` — list repos endpoint (new)
- `src/lib/ops-db.ts` — update query functions

## Definition of Done
- [ ] `research` mission type works with cyan badge
- [ ] Archive/backlog status in dropdown, proper styling
- [ ] Repo dropdown in mission detail with change capability
- [ ] Editable fields: description, expected_outcome, definition_of_done, status
- [ ] POST /api/missions/[id]/update endpoint
- [ ] GET /api/repos endpoint for dropdown
- [ ] Rich audit trail: shows model, cost, duration, error, prompts, outputs
- [ ] Repo filter in missions list
- [ ] Tested on localhost:3012/missions
