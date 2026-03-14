---
description: "Plan and implement a new feature end-to-end: DB → edge function → hooks → UI → iOS sync"
tools: ["read/readFile", "search/codebase", "search/fileSearch", "agent/runSubagent", "todo", "memory"]
---

# New Feature

Plan and implement a new feature for ParentPilot.

**Feature Description:** $ARGUMENTS

## Phase 1 — Understand & Plan

1. Read relevant existing code to understand the current structure
2. Identify what layers are affected:
   - [ ] Supabase schema (new table / column)
   - [ ] Edge function (`sos-respond` or new function)
   - [ ] React Query hook (`src/hooks/`)
   - [ ] React component / page (`src/components/`, `src/pages/`)
   - [ ] iOS / Capacitor (native plugin needed?)
   - [ ] Red-line enforcement (if suggestions are affected)

3. Write plan to `.github/tasks/todo.md`
4. **Check in with user before implementing**

## Phase 2 — Parallel Discovery

Dispatch discovery agents simultaneously:

| Scope | Agent |
|-------|-------|
| Schema / RLS impact | `@supabase-explorer` |
| UI spec + mobile constraints | `@ui-builder` |
| RAG pipeline impact (if suggestions change) | `@rag-pipeline-reviewer` |

## Phase 3 — Implement

Dispatch in dependency order:
1. `@code-implementer` → DB migration (if needed)
2. `@code-implementer` → Edge function changes (if needed)
3. `@code-implementer` → React Query hook
4. `@code-implementer` → UI component / page

## Phase 4 — Validate

Dispatch in parallel:
- `@debug-executor` → TypeScript errors, lint
- `@test-runner` → Test suite
- `@red-line-guardian` → If suggestions layer was touched

## Phase 5 — iOS Sync

Run `/sync-ios` to apply web changes to the Xcode project.

## Phase 6 — Commit

Run `/commit-push "feat: $ARGUMENTS"`
