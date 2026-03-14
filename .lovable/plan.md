

# ParentPilot — UX Improvements Implementation Plan

Following the priority order from the document, here's what will be built:

---

## P0: Remove Alignment Score from Home Screen (Issue #6)

**File:** `HomePage.tsx`
- Remove the alignment score calculation and its grid card
- Simplify to show only today's session count (or remove stats entirely)
- Keep alignment score only in `DebriefPage.tsx`

---

## P1: Child Edit + Detail Page (Issues #3 & #4)

**Files:** `useProfile.ts`, `ProfilePage.tsx`, `ChildDetailPage.tsx` (new), `App.tsx`, `BottomTabBar.tsx`

1. **`useProfile.ts`** — Add `useUpdateChild` mutation and `useSingleChildProfile(childId)` query hook
2. **`ChildDetailPage.tsx`** (new) — Full editable form for:
   - `display_name`, `age_group`, `known_triggers`, `calming_preferences`, `development_notes`
   - Uses existing `AGE_GROUPS`, `TRIGGER_OPTIONS` constants
   - Save button calls `useUpdateChild`
   - Styled consistently with existing app (rounded cards, font-display/font-body)
3. **`ProfilePage.tsx`** — Wire `ChevronRight` on child cards to `navigate(/profile/${child.id})`
4. **`App.tsx`** — Add route `/profile/:childId` → `ChildDetailPage`
5. **`BottomTabBar.tsx`** — Show tab bar on child detail page (already works since it only hides on `/sos`)

---

## P2: Conversation History (Issue #1)

**Files:** `useIncidents.ts`, `HistoryPage.tsx` (new), `App.tsx`, `BottomTabBar.tsx`

1. **`useIncidents.ts`** — Add `useIncidentsByDateRange(startDate, endDate)` hook without the today filter
2. **`HistoryPage.tsx`** (new) — Scrollable list of past incidents grouped by date, with expandable detail showing suggestions and feedback. Date filter buttons (7d / 30d / all)
3. **`App.tsx`** — Add `/history` route
4. **`BottomTabBar.tsx`** — Add History tab (Clock icon) between Home and Profile

---

## P2: Historical Debrief (Issue #2)

**File:** `DebriefPage.tsx`

1. Add date range selector (Today / 7 Days / 30 Days tabs) at the top
2. Replace `useTodayIncidents()` with the new date-range hook
3. Recompute alignment stats over the selected range
4. Add a trend line showing "Last 7 days: X%" when viewing broader ranges

---

## P3: Monthly Summary (Issue #5)

**Files:** `useIncidents.ts`, `MonthlySummaryWidget.tsx` (new), `HomePage.tsx` or `DebriefPage.tsx`

1. **`useIncidents.ts`** — Add `useMonthlyIncidentsSummary()` hook querying last 30 days, grouping by `problem_category`, computing top categories and helpful/misaligned ratios
2. **`MonthlySummaryWidget.tsx`** — Display:
   - Most common problem categories (bar/pill chart)
   - Overall alignment percentage for the month
   - Top-rated suggestion scripts as "tips that worked"
3. Surface as a section in `DebriefPage.tsx` below the daily view, or as a card on `HomePage.tsx`

---

## Summary of New/Modified Files

| File | Action |
|------|--------|
| `src/pages/HomePage.tsx` | Remove alignment score |
| `src/hooks/useProfile.ts` | Add `useUpdateChild`, `useSingleChildProfile` |
| `src/pages/ChildDetailPage.tsx` | **New** — child edit page |
| `src/pages/ProfilePage.tsx` | Wire child card navigation |
| `src/hooks/useIncidents.ts` | Add date-range + monthly hooks |
| `src/pages/HistoryPage.tsx` | **New** — conversation history |
| `src/pages/DebriefPage.tsx` | Add date range selector |
| `src/components/MonthlySummaryWidget.tsx` | **New** — monthly insights |
| `src/components/BottomTabBar.tsx` | Add History tab |
| `src/App.tsx` | Add `/history` and `/profile/:childId` routes |

No database migrations required — all data already exists in the schema.

