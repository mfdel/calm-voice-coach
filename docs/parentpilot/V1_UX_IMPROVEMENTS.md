# ParentPilot — UX Improvement Backlog

> **Date:** 14 March 2026
> **Source:** User review session — observations from live app usage
> **Status:** Documented, not yet implemented

---

## Overview

Six UX issues were identified during a hands-on review of the app. All issues are implementable against the **existing data model** — no schema migrations are required. Data is already being persisted; gaps are exclusively in hooks, pages, and routing.

---

## Issue 1 — No Conversation History Screen

### Observation
There is no way to view previous SOS sessions beyond the current day. Once the day ends, all prior work is inaccessible to the parent.

### Current State
- `useTodayIncidents()` in [src/hooks/useIncidents.ts](../../src/hooks/useIncidents.ts) hard-filters to `.gte("created_at", today.toISOString())`
- Both `HomePage.tsx` and `DebriefPage.tsx` consume only this today-scoped hook
- No history page, no date filter, no navigation path to past sessions

### Data Model Readiness
- ✅ `incidents.created_at` is persisted and indexed (`idx_incidents_user_created`)
- ✅ All incident relationships (`incident_suggestions`, `incident_feedback`) are preserved

### What Needs to Be Built
1. `useIncidentsDateRange(startDate, endDate)` hook in `useIncidents.ts`
2. New `HistoryPage.tsx` with a filterable/paginated incident list
3. New route in `App.tsx`
4. Entry point in the bottom tab bar or profile section

### Complexity
**Medium** — ~4–6 hours

---

## Issue 2 — Debrief Only Works for Today's Sessions

### Observation
The Debrief screen is hard-locked to today's sessions. Parents cannot review feedback, scores, or session summaries from previous days.

### Current State
- `DebriefPage.tsx` calls `useTodayIncidents()` — no date parameter exists
- Alignment score and feedback counts computed exclusively over today's data
- `incident_feedback` records exist for all past sessions but are never surfaced

### Data Model Readiness
- ✅ `incident_feedback.created_at` stored for all sessions
- ✅ `incidents` joined to feedback via foreign key — fully queryable for any date range

### What Needs to Be Built
1. Date/range selector UI in `DebriefPage.tsx`
2. New hook `useIncidentsWithFeedback(startDate, endDate)` in `useIncidents.ts`
3. Historical alignment trend display (e.g., "Last 7 days: 68%")
4. Optional: comparison view (today vs. this week vs. this month)

### Complexity
**Medium-High** — ~6–8 hours

---

## Issue 3 — Child Details Cannot Be Edited After Creation

### Observation
Once a child profile is created, there is no way to update any of its fields — name, age group, triggers, calming preferences, or development notes.

### Current State
- `ProfilePage.tsx` renders children as read-only cards
- `ChevronRight` icon is rendered but triggers no action
- `useProfile.ts` has `useChildProfiles()` (read) and `useAddChild()` (create) — **no update mutation exists**

### Data Model Readiness
- ✅ `child_profiles` supports `UPDATE` with `updated_at` tracking
- ✅ RLS policy permits the record owner to update their own child profiles

### What Needs to Be Built
1. `useUpdateChild(childId)` mutation hook in `useProfile.ts`
2. Edit modal or inline edit form on child card in `ProfilePage.tsx`
3. Form fields for: `display_name`, `age_group`, `known_triggers`, `calming_preferences`, `development_notes`

### Complexity
**Low** — ~2–3 hours

---

## Issue 4 — No Individual Child Detail / Edit Page

### Observation
Children are shown in a flat list. There is no dedicated page per child for viewing or editing their full profile. This is especially important as child details (triggers, calming preferences) directly influence the quality of SOS suggestions.

### Current State
- No `/profile/:childId` route in `App.tsx`
- No `ChildDetailPage.tsx` component
- `ChevronRight` on child card in `ProfilePage.tsx` navigates nowhere
- `calming_preferences` and `development_notes` are stored in the DB but never surfaced in the UI

### Data Model Readiness
- ✅ `child_profiles` has all required fields
- ✅ `AGE_GROUPS` and `TRIGGER_OPTIONS` constants already defined in `src/lib/constants.ts`

### What Needs to Be Built
1. `/profile/:childId` route in `App.tsx`
2. New `ChildDetailPage.tsx` with full editable form
3. `useSingleChildProfile(childId)` fetch hook
4. `useUpdateChild(childId)` mutation (shared with Issue 3)
5. Wire `ChevronRight` on child cards to navigate to the new page

### Complexity
**Medium** — ~5–6 hours

> **Note:** Issues 3 and 4 share the `useUpdateChild` hook — implement together to avoid duplication.

---

## Issue 5 — No Monthly Conversation Summary

### Observation
There is no view that summarises patterns across the last month of SOS sessions. Parents should be able to see what triggered incidents, what advice worked, and what follow-up actions to take — without having to manually review each session.

### Current State
- `HomePage.tsx` surface area shows only today's session count and alignment score
- No aggregation, analytics, or summary logic exists anywhere in the codebase
- No "insights" concept in the data model or UI

### Data Model Readiness
- ✅ `incidents.problem_category` for grouping by problem type
- ✅ `incident_feedback.rating` ("helpful" / "misaligned") and `reason_tags` for outcome analysis
- ✅ `incident_suggestions.script` stores the actual advice text for surfacing as tips
- ⚠️ No pre-computed aggregation table — queries will be run-time computed or edge-function powered

### What Needs to Be Built
1. `useMonthlyIncidentsSummary()` hook (or a Supabase edge function for heavier workloads)
2. Aggregation queries:
   - Group by `problem_category` — most common issue types
   - Average `rating` per category — what worked best
   - Top-rated `incident_suggestions.script` entries — surfaced as "tips"
3. Optional: LLM-powered edge function generating narrative follow-up recommendations from 30-day data (consistent with existing SOS pipeline pattern)
4. New `MonthlySummaryWidget.tsx` component
5. Surface on a new page, or as a section within an expanded Debrief view

### Complexity
**High** — ~10–12 hours (backend aggregation logic + UI)

---

## Issue 6 — Alignment Score Shown on Home Screen

### Observation
The alignment score is displayed on the home screen, which is the entry point to SOS mode. This is the wrong context — the home screen should focus on the SOS call-to-action. Alignment is a reflection metric and belongs in the Debrief section.

### Current State
- `HomePage.tsx` calculates and displays alignment score in a 2-column stats card
- `DebriefPage.tsx` **also** displays alignment score — the correct location
- The score is duplicated across both screens

### What Needs to Be Done
1. Remove alignment score calculation and display card from `HomePage.tsx`
2. Keep alignment score in `DebriefPage.tsx` as-is
3. Optionally simplify the home screen stats grid to show only today's session count, or remove it entirely

### Complexity
**Low (removal)** — <30 minutes

---

## Implementation Priority

| # | Issue | Complexity | Suggested Priority |
|---|-------|------------|--------------------|
| 6 | Remove alignment score from home | Low | **P0 — do first** (quick win) |
| 3 | Edit child details | Low | **P1** |
| 4 | Child detail page | Medium | **P1** (pair with #3) |
| 1 | Conversation history screen | Medium | **P2** |
| 2 | Historical debrief | Medium-High | **P2** (builds on #1) |
| 5 | Monthly summary | High | **P3** |

---

## File Impact Map

| File | Issues |
|------|--------|
| `src/hooks/useIncidents.ts` | #1, #2 |
| `src/hooks/useProfile.ts` | #3, #4 |
| `src/pages/HomePage.tsx` | #6 |
| `src/pages/DebriefPage.tsx` | #2 |
| `src/pages/ProfilePage.tsx` | #3, #4 |
| `src/App.tsx` | #1, #4 |
| `src/pages/HistoryPage.tsx` *(new)* | #1 |
| `src/pages/ChildDetailPage.tsx` *(new)* | #4 |
| `src/components/MonthlySummaryWidget.tsx` *(new)* | #5 |
| `supabase/functions/monthly-summary/` *(new, optional)* | #5 |
