---
description: "Implement V2 UX improvements: debrief child attribution, LLM per-child 30-day history, remove Calming Preferences from child edit"
tools: ["read/readFile", "search/codebase", "search/fileSearch", "agent/runSubagent", "todo", "memory"]
---

# Implement V2 UX Improvements

Full spec: [docs/parentpilot/V2_UX_IMPROVEMENTS.md](../parentpilot/V2_UX_IMPROVEMENTS.md)

Implement the three issues in priority order. Run P0 items first (Issues 9 and 7) in parallel since they are independent, then tackle Issue 8.

---

## Phase 1 — P0: Issue 9 — Remove Calming Preferences from Child Edit Page

**Target file:** `src/pages/ChildDetailPage.tsx`

Dispatch `@code-implementer`:
- Remove the `CALMING_OPTIONS` constant
- Remove the `calming` state variable and its `useState` initializer
- Remove the `setCalming(...)` line inside the `useEffect`
- Remove the "Calming Preferences" JSX block (label + chip grid)
- Remove `calming_preferences: calming` from the `updateChild.mutateAsync` call
- Keep `toggleItem` — it is still used by the triggers chip grid

---

## Phase 2 — P0: Issue 7 — Show Child Name on Debrief Incident Cards

**Target files:** `src/hooks/useIncidents.ts`, `src/pages/DebriefPage.tsx`

Dispatch `@code-implementer`:

1. In `useIncidentsByDateRange` (hooks/useIncidents.ts), update the `.select(...)` to include:
   ```ts
   child_profiles(display_name)
   ```
   alongside the existing `incident_suggestions(*)` and `incident_feedback(*)`.

2. In `DebriefPage.tsx`, inside the incident card's button element, add the child name as a secondary line below the category label:
   ```tsx
   {inc.child_profiles?.display_name && (
     <p className="font-body text-xs text-muted-foreground">{inc.child_profiles.display_name}</p>
   )}
   ```
   Place it between the `catLabel` paragraph and the time paragraph.

---

## Phase 3 — Validate P0 Changes

Dispatch `@debug-executor` in parallel with `@ui-builder`:
- `@debug-executor`: run `npm run lint` and check TypeScript for errors in modified files
- `@ui-builder`: verify the Debrief card layout is readable on a narrow mobile screen (child name + category + time stacked)

---

## Phase 4 — P1: Issue 8 — LLM 30-Day Per-Child History

This is the largest change. Follow strictly in dependency order.

### Step 4a — DB Migration

Dispatch `@supabase-explorer` to confirm no existing `child_history_summaries` table exists, then dispatch `@code-implementer` to create a new migration:

```sql
create table child_history_summaries (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references child_profiles(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  generated_at timestamptz default now() not null,
  summary_text text not null,
  window_days int not null default 30
);

alter table child_history_summaries enable row level security;

create policy "owner access" on child_history_summaries
  for all using (auth.uid() = user_id);

create index idx_child_history_child_generated
  on child_history_summaries(child_id, generated_at desc);
```

### Step 4b — Edge Function

Dispatch `@code-implementer` to create `supabase/functions/child-history-summary/index.ts`:

- **Auth**: validate `Authorization: Bearer` header via `supabase.auth.getUser()` — return 401 if invalid
- **Input**: JSON body `{ child_id: string }`
- **Pipeline**:
  1. Fetch child profile: `display_name`, `age_group`, `known_triggers`
  2. Fetch last 30 days of incidents for `child_id` + `user_id`, joined with `incident_suggestions(title, reason, script)` and `incident_feedback(outcome, reason_tags)`
  3. Check `child_history_summaries` for a record where `child_id` matches and `generated_at >= now() - interval '24 hours'` — if found, return `{ summary_text, generated_at, cached: true }`
  4. Assemble a Gemini prompt covering: child profile context, structured list of sessions (category, suggestions, feedback), request for narrative covering recurring patterns, what worked, what didn't (with reason tags), and 2–3 actionable suggestions for the coming weeks
  5. Call Gemini Flash via Lovable Gateway (match the pattern used in `supabase/functions/sos-respond/index.ts`)
  6. Persist result to `child_history_summaries` (`child_id`, `user_id`, `summary_text`, `window_days: 30`)
  7. Return `{ summary_text, generated_at, cached: false }`

### Step 4c — React Query Hook

Dispatch `@code-implementer` to add `useChildHistorySummary(childId: string)` to `src/hooks/useIncidents.ts`:

```ts
export function useChildHistorySummary(childId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["child_history_summary", childId],
    enabled: !!user && !!childId,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("child-history-summary", {
        body: { child_id: childId },
      });
      if (error) throw error;
      return data as { summary_text: string; generated_at: string; cached: boolean };
    },
  });
}
```

### Step 4d — UI: 30-Day Insights Section in ChildDetailPage

Dispatch `@code-implementer` to add a "30-Day Insights" section at the bottom of `ChildDetailPage.tsx`, above the Save button:

- Import `useChildHistorySummary` from `@/hooks/useIncidents`
- Call the hook with `childId`
- Render a card section:
  - Label: "30-Day Insights" (same style as other section labels)
  - If no data and not loading: show a "Generate Insights" button that calls `refetch()`
  - If `isLoading`: spinner + "Generating insights…" text
  - If `data`: show `summary_text` in a scrollable text area styled like the Development Notes field; show `generated_at` as `"Last generated: {format(generated_at, 'MMM d, h:mm a')}"` in muted text; show a "Refresh" button (triggers `refetch()`)
  - If `error`: show a muted error message "Could not load insights. Tap to retry." tapping retries

---

## Phase 5 — Final Validation

Dispatch in parallel:
- `@debug-executor`: `npm run build` to catch any TypeScript or bundling errors
- `@red-line-guardian`: confirm the new edge function does not weaken any red-line enforcement
- `@test-runner`: run `npm run test` and report any failures

---

## Completion Checklist

- [ ] Issue 9: Calming Preferences removed from ChildDetailPage
- [ ] Issue 7: Child name visible on Debrief incident cards
- [ ] Issue 8 — Migration: `child_history_summaries` table created with RLS
- [ ] Issue 8 — Edge function: `child-history-summary` deployed and type-checked
- [ ] Issue 8 — Hook: `useChildHistorySummary` added to useIncidents.ts
- [ ] Issue 8 — UI: "30-Day Insights" section visible in ChildDetailPage
- [ ] Build passes with no TypeScript errors
- [ ] Red-line enforcement verified intact
