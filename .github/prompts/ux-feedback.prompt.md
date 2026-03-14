---
description: "Turn quick app testing observations into detailed, codebase-grounded implementation specs"
tools: ["read/readFile", "search/codebase", "search/fileSearch", "agent/runSubagent", "todo", "vscode/memory", "vscode/askQuestions"]
---

# UX Feedback → Implementation Spec

I tested the app. Here are my quick observations:

$ARGUMENTS

---

## Step 1 — Research Each Observation

For every observation, dispatch `@Explore` (thorough) to understand the current state:
- Which files and components are involved?
- What does the existing code actually do today?
- Is there relevant data already in the DB that isn't being surfaced?
- Has this already been fixed or partially addressed?

## Step 2 — Validate

For each observation, classify it as one of:
- ✅ **Valid** — confirmed gap between current behaviour and expected UX
- ⚠️ **Needs clarification** — ambiguous; ask the user one focused question
- 🔄 **Already addressed** — existing code handles this; describe where
- 🚫 **Out of scope** — conflicts with product constraints (e.g. red lines, no passive audio)

Briefly explain the classification for each item before proceeding.

## Step 3 — Detail Valid Observations

For each ✅ Valid observation, write a structured spec section:

```
### Issue N — <short title>

**Observation**
One sentence describing the UX gap.

**Current State**
- What the code does today (file + line references where helpful)

**Data Model Readiness**
- ✅ / ⚠️ / ❌ for each relevant table or field

**What Needs to Be Built**
Numbered list of concrete changes (hooks, components, migrations, edge functions)

**Complexity**
Low / Medium / High — rough hour estimate
```

## Step 4 — Save the Spec

Determine the next version number by checking which `V*_UX_IMPROVEMENTS.md` files already exist under `docs/parentpilot/`. Create the new file as `docs/parentpilot/V{N}_UX_IMPROVEMENTS.md` using the same header format as the existing files.

Then offer to create a matching implementation prompt if the user wants one.
