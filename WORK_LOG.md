# Jarvis Dashboard - Duplicate Events Fix + Cost Badge

## Task Overview
1. Fix duplicate tool events in ops.db with client-side deduplication
2. Add cost count badge to the 💰 Costs filter button

## Phase 1: Analysis (DONE)

### Current State
- React/Next.js app fetching from `/api/ops/events`
- Events stored in `ops_events` table in SQLite
- UI in `src/app/ops-log/page.tsx`
- Duplication pattern: Each tool call appears twice - once without agent context, once with agent context in parentheses
- Cost filter exists but no count badge

### Files to Modify
- `src/app/ops-log/page.tsx` - Add deduplication logic and cost count badge

### Deduplication Strategy
When merging new entries, skip any event where:
- Timestamp + category match existing entry within 2 seconds
- Event text contains same tool name (similar content)

### Cost Badge Strategy
Count events matching `/tokens|cost|\$/i` regex in current filtered dataset and display in button text.

## Phase 2: Implementation

### Step 1: Add deduplication logic to the merge function
### Step 2: Add cost count to the Costs button
### Step 3: Test the changes
### Step 4: Commit with conventional commit message

---

## Results
(To be filled after execution)