---
description: "Show current workspace state: git status, TypeScript errors, test status"
tools: ["execute/runInTerminal", "execute/getTerminalOutput", "read/problems"]
---

# Check Status

Show the current state of the workspace.

## Steps

Run these checks and summarize:

### 1. Git Status
```bash
git status --short
git log --oneline -5
```

### 2. TypeScript Errors
```bash
npx tsc --noEmit 2>&1 | head -30
```

### 3. ESLint
```bash
npm run lint 2>&1 | tail -20
```

### 4. Test Status
```bash
npm run test 2>&1 | tail -20
```

### 5. iOS Sync State
```bash
# Check if dist/ is newer than ios/App/App/public
ls -la dist/index.html ios/App/App/public/index.html 2>/dev/null
```

## Output Format

```markdown
## Workspace Status

### Git
- Branch: main
- Uncommitted changes: N files
- Last 3 commits: ...

### TypeScript
- ✅ No errors / ❌ N errors

### ESLint
- ✅ No errors / ❌ N errors

### Tests
- ✅ All pass / ❌ N failing

### iOS Sync
- ✅ In sync / ⚠️ dist/ is newer — run `npm run build:ios`

### Recommended Next Action
...
```
