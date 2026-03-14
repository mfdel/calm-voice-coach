---
description: "Run a comprehensive pre-push review of local changes using specialized agents in parallel"
tools: ["search/changes", "search/codebase", "search/fileSearch", "read/readFile", "execute/runInTerminal", "agent/runSubagent", "search/textSearch"]
---

# Pre-Push Review

Run a multi-agent review of local changes before pushing.

**Focus (optional):** $ARGUMENTS

## How It Works

Dispatch specialized agents **in parallel** based on what changed:

| If changed | Agent |
|-----------|-------|
| `supabase/functions/sos-respond/` | `@rag-pipeline-reviewer` |
| Anything touching red lines | `@red-line-guardian` |
| `src/components/` or `src/pages/` | `@ui-builder` |
| `supabase/migrations/` | `@supabase-explorer` |
| Any TypeScript file | `@debug-executor` (run `tsc --noEmit`) |
| Test files | `@test-runner` |

## Steps

1. Detect changed files:
   ```bash
   git diff HEAD --name-only
   git diff origin/main..HEAD --name-only 2>/dev/null
   ```

2. Dispatch relevant agents simultaneously based on the file list above.

3. Aggregate findings into a unified report.

## Output Format

```markdown
## Pre-Push Review Summary

**Files Changed:** N
**Agents Dispatched:** [list]

### ❌ Must Fix Before Pushing
- ...

### ⚠️ Recommended
- ...

### ✅ Looks Good
- ...
```
