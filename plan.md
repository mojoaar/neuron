# Project Neuron Lifecycle Manager Plan

## Status
Build Mode: Active (Local Continuous Integration)

## Goal
Develop a single-binary workspace lifecycle manager and JSON-RPC MCP server with an embedded, dynamic Next.js Web HUD Dashboard, enforcing a strict Zero-Footprint Workspace Contract.

---

## 🔍 Code Review & Architectural Analysis (June 2026)

### 1. Code Quality Findings
*   **Monolithic Frontend Component**: `frontend/src/app/page.tsx` was a massive 3,432-line single React component managing 46+ separate states and complex REST fetching hooks under one scope. Requires modularization and decomposition into separate components, React Hooks, and a dedicated service layer.
*   **Duplicate Script Exporters**: Identical implementation of `exportToGoMakefile` and `exportToNodePackageJSON` resided in both `internal/cmd/skill.go` and `internal/web/server.go`. Needs consolidation into a single helper module.
*   **Repeated Tech-Stack Mapping**: The list of 7 technical stacks is repeated in 5 separate validation/logic locations in both backend and frontend.

### 2. Security & Penetration Findings
*   **XSS Vulnerability (P0)**: Hand-rolled line-by-line Markdown compiler (`renderMarkdown`) rendered plans directly into HTML via `dangerouslySetInnerHTML`. Lacked proper HTML attribute escaping, allowing malicious event triggers (`onerror`, `onclick`) or standard `javascript:` URL injection paths.
*   **Unvalidated Remote File Execution**: The custom Skills downloader downloads templates directly from `agentskill.sh` and writes files to user workspace locations with no size boundaries, path-traversal sanitization, or file whitelists.
*   **PID File Terminations**: The PID stop daemon checks PIDs blindly without confirming the target process name is actually `neuron`, creating theoretical local process namespace termination collisions.

### 3. Deprecated & Outdated Package Analysis
*   **Unusual Go Compiler Declaration**: `go.mod` declared forward-looking `go 1.26.4`. Standard stable toolchains are at `1.24` as of early 2026.
*   **Outdated Roadmap Documents**: The `plan.md` and `README.md` documents referenced Bubble Tea TUI command lists, which were decommissioned in v1.4.0.

---

## 🗺️ Roadmap & Prioritized Backlog

### P0: Architecture & Core Refinement (In Progress)
*   [ ] **P0-A: Secure Markdown Rendering**: Eradicate the custom parser and compile Next.js with verified, sanitized standard libraries (`react-markdown` + `rehype-sanitize`).
*   [ ] **P0-B: Component Decomposition & Modularization**: Split the 3,400+ line `page.tsx` React component into separate modular folders:
    *   `/components` (Sidebar, Settings, Terminal, ProjectDashboard, Sandbox, DocReader)
    *   `/hooks` (isolated states for tasks, skills, projects, logging, sandbox, command palette)
    *   `/services` (unified REST fetch controller)
    *   `/types` (consolidated TypeScript definitions)

### P1: Security Hardening & Consolidation
*   [ ] **P1-A: Skill Download Verification**: Sandboxing of remote downloads. Validate content boundaries, deny path-traversal slugs (`../`), and reject non-plaintext files.
*   [ ] **P1-B: Duplicate Exporters Merger**: Refactor command and web exporters into a shared Go package.
*   [ ] **P1-C: Tech Stack Single Source of Truth**: Centralize tech stack definitions inside an internal Go registry package.

### P2: High-Value Features
*   [ ] **P2-A: CLI Project Deletion**: Implement the missing `neuron project delete` subcommand in Go.
*   [ ] **P2-B: Multi-Project Clusters**: Allow grouping and scanning related folders into Clusters for bulk overview tracking.
*   [ ] **P2-C: HUD Testing Dashboard**: Visual aggregate output of test suites inside the project HUD console.

---

## 🛠️ Verification Commands
*   Run local asset pipeline and static export compilation:
    ```bash
    make build
    ```
