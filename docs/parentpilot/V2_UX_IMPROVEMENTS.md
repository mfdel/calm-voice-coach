# ParentPilot — UX Feedback Round 2

> **Date:** 14 March 2026
> **Source:** User review session — second round of observations from live app usage
> **Status:** Documented, not yet implemented

---

## Overview

Three UX issues were identified in a second hands-on review. They span the Debrief screen, a new per-child AI insight feature, and a simplification of the child edit form.

---

## Issue 7 — Debrief Page Does Not Show Which Child an Incident Belongs To

### Observation
When a parent views the Debrief screen, each incident card shows only the problem category and time. When a family has multiple children, there is no way to tell which child the session was for.

### Current State
- `useIncidentsByDateRange` in [src/hooks/useIncidents.ts](../../src/hooks/useIncidents.ts) selects `*` from `incidents` but does **not** join `child_profiles`
- `DebriefPage.tsx` renders each incident card with `catLabel` and `format(inc.created_at, "h:mm a")` only — child name is absent
- `incidents.child_id` FK exists and is populated during SOS sessions

### Data Model Readiness
- ✅ `incidents.child_id` is a FK to `child_profiles.id`
- ✅ `child_profiles.display_name` is always set
- ✅ Supabase supports nested `select` to join the child name in a single query

### What Needs to Be Built
1. Update the `select` in `useIncidentsByDateRange` to include `child_profiles(display_name)`:
   ```ts
   .select(`
     *,
     incident_suggestions(*),
     incident_feedback(*),
     child_profiles(display_name)
   `)
   ```
2. In `DebriefPage.tsx`, render `inc.child_profiles?.display_name` as a secondary line on each incident card, below the problem category label
3. Handle the `null` case gracefully — some older incidents may have no `child_id`

### Complexity
**Low** — ~1 hour

---

## Issue 8 — No LLM-Powered 30-Day Conversation History Per Child

### Observation
There is no way for a parent to see a narrative summary of a specific child's patterns over the last 30 days. The existing Debrief screen aggregates across all children and is time-range filtered, not child-filtered. Parents want per-child insight: what issues are recurring, what advice worked, what to try differently.

### Current State
- No per-child history surface exists anywhere in the app
- `ChildDetailPage.tsx` shows only static profile fields (name, age group, triggers, notes)
- `useMonthlyIncidentsSummary` in `useIncidents.ts` aggregates across all children — not per-child, not LLM-powered
- No edge function for per-child AI narrative exists

### Data Model Readiness
- ✅ `incidents.child_id` links all SOS sessions to a child
- ✅ `incident_suggestions` stores the advice delivered in each session
- ✅ `incident_feedback` stores whether the advice was helpful or misaligned, with `reason_tags`
- ⚠️ No caching table for generated child summaries — repeated generation would be costly; a `child_history_summaries` table is recommended

### What Needs to Be Built

#### Backend

1. New migration: `child_history_summaries` table
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

2. New Supabase edge function: `supabase/functions/child-history-summary/index.ts`
   - Auth: validate `Authorization: Bearer` header via `supabase.auth.getUser()`
   - Input: `{ child_id: string }`
   - Pipeline:
     1. Fetch child profile (`display_name`, `age_group`, `known_triggers`)
     2. Fetch last 30 days of incidents for the child, joined with `incident_suggestions` and `incident_feedback`
     3. Check for a cached `child_history_summaries` record generated within the last 24 hours — return it if fresh
     4. Assemble a prompt with the child's profile context and a structured list of sessions (category, suggestions, feedback outcome)
     5. Call Gemini Flash to generate a narrative summary covering:
        - Most recurring problem categories
        - Advice that was consistently marked helpful
        - Advice that was consistently marked misaligned (and why, from `reason_tags`)
        - 2–3 actionable suggestions for the coming weeks
     6. Persist the generated text to `child_history_summaries`
     7. Return the summary text

#### Frontend

3. `useChildHistorySummary(childId)` hook in `src/hooks/useIncidents.ts`:
   - Calls the `child-history-summary` edge function via `supabase.functions.invoke`
   - Stale time: 24 hours (matches cache window)
   - Returns `{ data: { summary_text: string } | null, isLoading, error }`

4. New UI section in `ChildDetailPage.tsx` — "30-Day Insights":
   - Appears below the Development Notes field
   - Contains a "Generate Insights" button (or auto-loads if a fresh cached summary exists)
   - Shows the generated narrative in a scrollable card
   - Shows a `generated_at` timestamp and a "Refresh" button (rate-limited: once per 24 hours)
   - Loading state: spinner with "Generating insights…" label
   - Empty state: "No sessions in the last 30 days for this child."

### Complexity
**High** — ~10–12 hours (edge function + caching + UI)

---

## Issue 9 — Remove "Calming Preferences" Section from Child Edit Page

### Observation
The "Calming Preferences" chip grid in `ChildDetailPage.tsx` adds visual complexity without clear parent value. Users do not understand what effect these selections have and the section clutters the edit form.

### Current State
- `ChildDetailPage.tsx` renders a full chip grid labeled "Calming Preferences" with 10 options (`CALMING_OPTIONS` constant defined locally in the file)
- The `calming` state is persisted to `child_profiles.calming_preferences` on save
- The `calming_preferences` column **is used** by the `sos-respond` edge function as part of the personalization context sent to the LLM
- No other UI surface exposes or explains this field to the parent

### Impact Note
Removing the UI removes the parent's ability to set `calming_preferences`. The column will remain in the DB and the SOS pipeline will continue to read it — existing stored values will still be used. New child profiles created after this change will simply have a `null` value for this field, which the SOS pipeline already handles gracefully.

### What Needs to Be Built
1. Remove the `CALMING_OPTIONS` constant from `ChildDetailPage.tsx`
2. Remove the `calming` state variable and its `useState` initializer
3. Remove the `setCalming` branch in the `useEffect` that populates form state from the loaded child profile
4. Remove the "Calming Preferences" JSX section (label + chip grid)
5. Remove `calming_preferences: calming` from the `updateChild.mutateAsync` call in `handleSave`
6. Remove unused `toggleItem` call sites for `calming` (keep `toggleItem` itself — it is still used by the triggers section)

### Complexity
**Low (removal)** — ~30 minutes

---

## Implementation Priority

| # | Issue | Complexity | Suggested Priority |
|---|-------|------------|--------------------|
| 9 | Remove Calming Preferences from edit page | Low | **P0 — do first** (quick cleanup) |
| 7 | Show child name on Debrief incident cards | Low | **P0** |
| 8 | LLM 30-day per-child history | High | **P1** |

---

## File Impact Map

| File | Issues |
|------|--------|
| `src/hooks/useIncidents.ts` | #7, #8 |
| `src/pages/DebriefPage.tsx` | #7 |
| `src/pages/ChildDetailPage.tsx` | #8, #9 |
| `supabase/functions/child-history-summary/` *(new)* | #8 |
| `supabase/migrations/` *(new migration)* | #8 |
