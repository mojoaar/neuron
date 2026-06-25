# Neuron Developer & Agent Guidelines (AGENTS.md)

Welcome, AI Agent! This file outlines core architectural boundaries, code-style conventions, and safety guidelines for developing on the **Neuron** repository.

---

## 🚀 Technological Stack Overview

Neuron is a single-binary lifecycle manager written in **Go (Golang)** with an embedded, dynamic **Next.js Web HUD Dashboard** compiled statically and packaged using Go's `//go:embed` directive.
*   **Database**: In-process SQL relational cataloging via **DuckDB** (`~/.config/neuron/neuron.db`).
*   **Backend**: HTTP server, SPA router, and JSON-RPC Model Context Protocol (MCP) server.
*   **Frontend**: Next.js (TypeScript, Tailwind CSS, Lucide icons, premium terminal-dark theme).

---

## 📐 State Decoupling Architecture

Neuron enforces a strict **Zero-Footprint Workspace Contract**:
*   All project metadata (tasks, skills, catalog links) must be stored cleanly inside DuckDB.
*   Physical project directories must stay pristine with zero proprietary files (no `.neuron/` or `neuron.yaml` files). Only transparent, standard guidelines (`AGENTS.md`, `CLAUDE.md`, and `plan.md`) reside inside workdirs.

---

## 🛠️ Code Conventions & Guidelines

### 🟢 ALWAYS
*   **Verification**: Run `make build` before finishing any task to guarantee that static assets pack, webpack compiles, and Go builds flawlessly.
*   **Template Strings**: When editing documentation inside `frontend/src/docs/data.ts`, ensure any nested code block backticks are correctly backslash-escaped (`\``) to prevent webpack compilation/EOF errors.
*   **Time Scales**: Always use explicit 24-hour timestamps (`hour12: false`) for HUD console log lines.
*   **Database Lock Safety**: Always close rows and database handles gracefully, as DuckDB holds an exclusive file lock on `neuron.db`.

### 🟡 ASK FIRST
*   Adding heavy third-party Go dependencies to `go.mod` or npm packages to `package.json`.
*   Altering SQL database structures inside `internal/storage/schema.sql` without considering database migration fallbacks.

### 🔴 NEVER
*   Commit `node_modules/`, `.next/`, or compiled binaries (`neuron`) to Git (always verify `.gitignore` status).
*   Leave unescaped raw backticks inside template literal definitions inside `data.ts`.
*   Introduce proprietary file wrappers inside client workspaces that break the zero-footprint contract.

---

## ⚙️ Unified Compilation Commands

*   **Clean Compile**: Sync docs, compile Next.js static, and build Go binary:
    ```bash
    make build
    ```
*   **Run Local HUD**: Launch the server and HUD cleanly:
    ```bash
    ./neuron ui
    ```
*   **Graceful Terminations**: Stop any running background daemons cleanly:
    ```bash
    ./neuron stop
    ```
