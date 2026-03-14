## 2026-03-14 — Capacitor requires Node ≥ 22

- `@capacitor/cli` v8+ requires Node ≥ 22.0.0
- Use `nvm use 22` before any `npx cap` commands
- Set permanently: `nvm alias default 22`
- The web build (`npm run build`) works on any Node version; only `cap` commands need Node 22

## 2026-03-14 — Vite base must be './' for Capacitor

- Without `base: './'` in `vite.config.ts`, assets load with absolute paths and fail inside the iOS WKWebView
- Always set `base: './'` when using Capacitor

## 2026-03-14 — Orchestrator never edits files directly

- As the orchestrator agent, NEVER write or edit files yourself
- Always dispatch `@code-implementer` for any file creation or modification
- Suggesting shell commands or describing changes is not the same as completing the task
