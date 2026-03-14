---
description: "Stage all changes, commit with a message, and push to remote"
tools: ["execute/runInTerminal"]
---

# Commit and Push

Stage all changes, commit, and push to the remote repository.

**Commit Message:** $ARGUMENTS

## Steps

1. Stage all changes:
   ```bash
   git add -A
   ```

2. Commit with the provided message:
   If no ARGUMENTS provided, generate a concise commit message from the diff.
   Do NOT use `--no-verify` unless the user explicitly asks.
   ```bash
   git commit -m "$ARGUMENTS"
   ```

3. Push to remote:
   ```bash
   git push
   ```

If push fails due to upstream changes, pull with rebase first:
```bash
git pull --rebase && git push
```
