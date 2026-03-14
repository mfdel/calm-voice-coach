# Copilot Instructions — ParentPilot

You are an expert React/TypeScript developer and mobile app engineer working on **ParentPilot** — an AI-powered SOS parenting coach that delivers instant, style-aligned guidance during high-stress moments with children. The app targets iOS via Capacitor and uses Supabase for auth, database, and edge functions.

---

## Session Guardrails (Must Follow Unless User Overrides)

- **No dependency installs without asking**: Check `package.json` first; suggest, don't blindly install
- **Mobile-first always**: Every UI change must be usable one-handed on iOS; bottom-third tap targets
- **Red lines are sacred**: Never generate code that bypasses or weakens red-line enforcement at any of the three layers (retrieval → prompt → post-generation)
- **No passive audio**: The app explicitly does NOT use passive listening; don't suggest architectures that do
- **Minimal fix first**: Smallest change that works; don't refactor adjacent code unless asked
- **Type safety**: All TypeScript must be strict; no `any` types without explicit justification
- **Supabase RLS**: Every new table needs a Row Level Security policy; never expose data cross-user

---

## Repository Quick Reference

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 5 |
| Styling | Tailwind CSS 3, shadcn/ui (Radix UI) |
| State | TanStack React Query 5 (server state), React `useState` (local) |
| Routing | React Router 6 |
| Animation | Framer Motion |
| Backend | Supabase (PostgreSQL + pgvector, Edge Functions, Auth) |
| LLM | Google Gemini Flash via Lovable Gateway (tool calling) |
| Mobile | Capacitor 8 → iOS |
| Package Mgr | Bun (`bun.lockb`) |

### Key Directories

| Path | Purpose |
|------|---------|
| `src/pages/` | Route views (HomePage, SOSModePage, DebriefPage, ProfilePage, SettingsPage, AuthPage) |
| `src/components/` | Reusable UI (BottomTabBar, ProtectedRoute, `ui/*` Radix primitives) |
| `src/contexts/` | AuthContext (user + session) |
| `src/hooks/` | React Query wrappers (useIncidents, useProfile) |
| `src/integrations/supabase/` | Supabase client + auto-generated types |
| `src/lib/constants.ts` | Problem categories, red lines, age groups, trigger options |
| `supabase/functions/sos-respond/` | Primary LLM edge function (RAG pipeline) |
| `supabase/functions/curate-categories/` | Async category ranking per child |
| `supabase/migrations/` | SQL migrations (sequential, never edit past migrations) |
| `ios/` | Capacitor-generated Xcode project (committed; run `npm run cap:sync` after builds) |
| `docs/parentpilot/` | Product requirements, system design, RAG strategy docs |

### Core Data Model (Key Tables)

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts (linked to Supabase auth) |
| `child_profiles` | Per-child: age_group, known_triggers, calming_preferences |
| `parenting_preferences` | Style (gentle/structured/balanced), values, tone |
| `red_lines` | Forbidden tactics per user (8 options) — **hard stops** |
| `incidents` | SOS session records |
| `incident_suggestions` | LLM-generated advice with `title`, `reason`, `script` |
| `incident_feedback` | Parent ratings: "helpful" / "misaligned" + reason_tags |
| `knowledge_articles` | Curated parenting problem taxonomy |
| `knowledge_snippets` | Actionable advice snippets with pgvector embeddings |
| `curated_categories` | Per-child dynamically ranked top-4 problem categories |
| `prompt_runs` | LLM call observability (tokens, latency, violations) |

### SOS Pipeline Flow

```
AuthPage → HomePage (category picker) → SOSModePage
  → sos-respond edge function:
      1. Auth validation
      2. Hybrid snippet retrieval (problem + age + trigger + weight + recency)
      3. Red-line filtered retrieval
      4. Prior incident learning retrieval
      5. Prompt assembly
      6. Gemini Flash (tool calling → structured JSON)
      7. Post-generation red-line keyword validation
      8. Fallback if validation fails
      9. Persist incident + suggestions + telemetry
     10. Async: curate-categories
  → Suggestion cards → DebriefPage (feedback)
```

---

## Core Coding Principles

### TypeScript
- **Strict mode**: No `any`; use `unknown` with type guards if necessary
- **Supabase types**: Always use generated types from `src/integrations/supabase/types.ts`
- **Zod**: Use for runtime validation of external data (LLM responses, form inputs)
- **Prefer `const`**: Immutable by default; `let` only when needed

### React Patterns
- **React Query for all async**: No `useEffect` for data fetching; use `useQuery`/`useMutation`
- **Hooks for logic**: Extract business logic into `src/hooks/`; pages are thin orchestrators
- **Composition over props drilling**: Use context for auth; React Query for server state
- **Error boundaries**: Wrap pages; show toast notifications for non-critical errors

### Styling
- **Mobile-first Tailwind**: `sm:` / `md:` breakpoints for larger screens
- **SOS mode colors**: Use CSS vars `--sos-bg`, `--sos-accent`, `--sos-fg` defined in `App.css`
- **shadcn/ui**: Prefer existing components; extend via `className` prop before creating new ones
- **Touch targets**: Minimum 44×44px for all interactive elements

### Supabase & Edge Functions
- **RLS always**: Every new table must have `enable row level security` and appropriate policies
- **Never raw SQL in client**: Use Supabase client; SQL only in migrations and edge functions
- **Edge functions use Deno**: TypeScript with `https://` imports; no `node_modules`
- **Auth in edge functions**: Always validate `Authorization: Bearer` header with `supabase.auth.getUser()`

### Red-Line Enforcement (Never Weaken)
The three-layer safety system must remain intact:
1. **Retrieval layer**: Filter `knowledge_snippets` where `blocked_by_red_lines` doesn't overlap user red lines
2. **Prompt layer**: Include red lines as hard constraints in system prompt
3. **Post-generation layer**: Keyword scan of LLM output before persisting

---

## Dev Workflow

### Local Development
```bash
npm run dev          # Start Vite dev server (port 8080)
npx supabase start   # Start local Supabase stack
```

### Building & Testing
```bash
npm run build        # Production build
npm run test         # Run Vitest unit tests
npm run lint         # ESLint check
```

### iOS Deployment
```bash
npm run build:ios    # Build web app + sync to Xcode project
npm run cap:open:ios # Open Xcode for simulator / App Store submission
```

**Node version**: Capacitor CLI requires Node ≥ 22. Use `nvm use 22` before running `cap` commands.

### Supabase Migrations
- New migration: `npx supabase migration new <description>`
- Apply locally: `npx supabase db reset`
- **Never edit existing migration files** — always create new ones

---

## Interaction Patterns

### Confirm Before Acting

Ask for clarification when:
- A change could affect red-line enforcement behavior
- Multiple child profiles could be impacted by a schema change
- A migration is irreversible

### Background Execution

Use background mode for:
- Long iOS build processes
- Supabase local stack startup

### Error Recovery

1. Check `get_errors` tool for TypeScript/ESLint errors
2. Check terminal output for runtime errors
3. Verify RLS policies if Supabase queries return empty unexpectedly
4. Never retry identical failing operations — analyze first

---

## Available Agents

| Agent | When to Use |
|-------|------------|
| `@orchestrator` | Multi-step features, complex debugging, planning |
| `@code-implementer` | Any file creation or editing |
| `@supabase-explorer` | DB schema questions, RLS audit, migration planning |
| `@ui-builder` | React component work, Tailwind styling, mobile UX |
| `@rag-pipeline-reviewer` | SOS edge function review, RAG quality, prompt changes |
| `@red-line-guardian` | Validate red-line enforcement across all 3 layers |
| `@ios-sync` | Capacitor build issues, iOS-specific behavior, Xcode setup |
| `@debug-executor` | Run commands, trace errors, validate fixes |
| `@test-runner` | Execute test suites, report coverage and failures |

---

## Available Prompts

| Prompt | Purpose |
|--------|---------|
| `/commit-push` | Stage, commit with message, push |
| `/review-local` | Pre-push review dispatching relevant review agents |
| `/check-status` | Workspace state: git, errors, test status |
| `/sync-ios` | Build + Capacitor sync workflow |
| `/new-feature` | Start a new feature: plan → implement → test → sync |

Prompt files are in `.github/prompts/`.

---

## Available Skills

| Skill | Purpose |
|-------|---------|
| `supabase-patterns` | RLS policies, edge function auth, migration patterns |
| `react-ui-patterns` | Component structure, React Query hooks, shadcn/ui patterns |
| `rag-pipeline-patterns` | Retrieval scoring, prompt assembly, red-line enforcement |

Skill files are in `.github/skills/<skill-name>/SKILL.md`.

---

## Meta: Keeping Instructions Current

Suggest updates to this file when you:
1. Discover undocumented patterns used consistently in the codebase
2. Learn domain context that would help future sessions
3. Find contradictions between instructions and actual code
4. See repeated corrections from the user

After any correction: update `.github/tasks/lessons.md` with the pattern learned.

**How to suggest**: Quote the section, provide exact replacement text, explain why.
