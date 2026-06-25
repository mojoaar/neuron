# Project Neuron Lifecycle Manager Plan

## Status
Build Mode: Active (Local Continuous Integration)

## Goal
Develop a single-binary workspace lifecycle manager and JSON-RPC MCP server with an embedded, dynamic Next.js Web HUD Dashboard, enforcing a strict Zero-Footprint Workspace Contract.

---

## 🔍 Code Review & Architectural Analysis (June 2025)

### Round 1 Findings (Completed: P0-P3, all 18 items)

| Priority | Items | Status |
| -------- | ----- | ------ |
| P0       | XSS fix, component decomposition | Done |
| P1       | Skill validation, exporter merge, tech stack registry | Done |
| P2       | CLI delete, clusters, CI dashboard | Done |
| P3       | Tests, timeline, auth, plugins | Done (3/4) |
| Low      | Error swallowing, task lookup, shutdown, PID, go.mod | Done (5/5) |

### Round 2 Findings (June 2026) — Current Backlog

#### 🔴 Critical
*   **C1 — API Key Auth is Hollow**: `/api/system/api-key` generates a key but no middleware validates it. All endpoints remain unprotected.
*   **C2 — Nil FS Panic**: When `frontend/out` is missing during development, `fs.FS(nil)` causes a runtime panic on the first file request.
*   **C3 — Race on Server.cwd**: `Server.cwd` is read/written from multiple HTTP handler goroutines without any synchronization mutex.
*   **C4 — No HTTP Timeouts**: `http.Server` has no `ReadTimeout`, `WriteTimeout`, or `IdleTimeout`, making the server vulnerable to Slowloris.

#### 🟠 High
*   **H1 — Missing Security Headers**: No CSP, `X-Content-Type-Options`, `X-Frame-Options`, or CORS headers on any response.
*   **H2 — Unused npm Dependencies**: `clsx`, `motion`, and `tailwind-merge` are never imported but bloat the bundle.
*   **H3 — Hardcoded Colors Bypass Themes**: 35+ occurrences of `text-red-500`, `text-yellow-500`, `text-[#00ffff]` across 8 components that don't adapt to theme changes.
*   **H4 — Scanning Grid Hardcoded Green**: Background grid in `page.tsx:22` uses `rgba(0,255,102,0.015)` which stays green regardless of selected theme.
*   **H5 — Monolithic 1,590-line Hook**: `useNeuron.ts` bundles 60+ states, 40+ handlers, and 12 effects in a single file.
*   **H6 — Race on DbTableBrowser Unhide**: `setTimeout(() => fetchTableData(...), 100)` — race between API call and data refresh.

#### 🟡 Medium
*   **M1 — Git exec Without Timeouts**: Git sub-commands in `server.go` use `exec.Command` not `exec.CommandContext`, could hang on slow network mounts.
*   **M2 — Arg Injection in Browser Open**: URL passed directly to `open`/`xdg-open` on Windows without scheme validation.
*   **M3 — LogActivity Errors Silently Swallowed**: `LogActivity()` discards all DB errors from 15+ call sites.
*   **M4 — Missing FK Constraints**: `tasks.project_id` and `skills.project_id` have no `REFERENCES` or `ON DELETE CASCADE` in schema.
*   **M5 — Unchecked Test Errors**: Multiple `store.AddProject()` calls in test setup don't verify success.
*   **M6 — 41 Silent console.error Calls**: API failure catch blocks only `console.error` without user-facing `addLog`.
*   **M7 — TOCTOU Race in stop.go**: PID is checked for being a neuron process, then killed later — PID can recycle between.
*   **M8 — `any[][]` DB Row Type**: `DbTableData.rows` is typed as `any` — bypasses TypeScript safety.
*   **M9 — Fragile Column Indexing**: `DbTableBrowser` assumes project ID is always `row[0]`.
*   **M10 — window.confirm() in ClusterDashboard**: Native browser dialog clashes with terminal dark theme style.

---

## 🗺️ Phased Implementation Plan

### Phase 1: Quick Security & Stability (10 items)
*   [ ] **C2: Fix nil FS panic** — Replace `fs.FS(nil)` with a safe fallback
*   [ ] **C3: Add mutex on Server.cwd** — `sync.RWMutex` for goroutine-safe access
*   [ ] **C4: Add HTTP timeouts** — ReadTimeout 10s, WriteTimeout 30s, IdleTimeout 120s
*   [ ] **H2: Remove unused npm deps** — Uninstall clsx, motion, tailwind-merge
*   [ ] **H1: Security headers middleware** — CSP, X-Content-Type-Options, X-Frame-Options
*   [ ] **M3: LogActivity error propagation** — Return error from LogActivity, log to stderr
*   [ ] **M1: exec.CommandContext for git** — Add timeouts to all git sub-commands
*   [ ] **M2: Validate browser open URL** — Ensure URL starts with http(s)://
*   [ ] **M5: Check test setup errors** — Add t.Fatalf on all unchecked store calls
*   [ ] **M10: Add context timeouts to CLI** — Wrap CLI context.Background() with 30s timeouts

### Phase 2: Theme Consistency (1 item)
*   [ ] **H3/H4: Theme-ify all hardcoded colors** — Replace 35+ raw Tailwind colors with `text-terminal-*` tokens; fix green grid to use CSS custom properties

### Phase 3: Frontend Bug Fixes (5 items)
*   [ ] **H6: Fix DbTableBrowser race on unhide** — Use proper async/await instead of setTimeout
*   [ ] **M9: Fix fragile column indexing** — Use `columns.indexOf("id")` instead of `row[0]`
*   [ ] **H5 (partial): Wrap palette options in useCallback** — Prevent identity change on every render
*   [ ] **M6: Add addLog to silent catch blocks** — User-visible error messages for 41 catch blocks
*   [ ] **M10: Replace window.confirm()** — Themed inline confirmation in ClusterDashboard

### Phase 4: Code Cleanup (4 items)
*   [ ] **M8: Proper React keys** — Replace array index keys with unique identifiers
*   [ ] **M7: Fix TOCTOU in stop.go** — Use /proc/<pid>/cmdline directly instead of ps
*   [ ] **M4: Add FK constraints to schema** — REFERENCES + ON DELETE CASCADE
*   [ ] **Cleanup: Types, kbd font, DocsReader as any** — Type safety improvements

---

## 🛠️ Verification Commands
*   Run local asset pipeline and static export compilation:
    ```bash
    make build
    ```
*   Run Go unit tests:
    ```bash
    make test
    ```
