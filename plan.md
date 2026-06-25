# Project Neuron Lifecycle Manager Plan

## Status
Build Mode: Active

## Goal
Develop a CLI utility managing the full lifecycle of AI development projects, binding conceptual models to technical implementations.

## Technical Stack
*   **Database:** DuckDB (Transactional Local Backend) for persistent local storage of project metadata, skill definitions, and generated TODO items.
*   **CLI/TUI Backend:** Go (Golang) for the control plane and interactive TUI interface.

## Key Components
*   **Interface (CLI):** Serves as the central control plane for project tasks and lifecycle management.
*   **TUI:** Provides a visual interface for provisioning and managing projects using the data/rules defined by the Lifecycle Manager.
*   **Skills Model:** Conceptual entities stored in DuckDB, mapping to specific code execution paths.

## Design and Scaffolding Principles

*   **Zero Proprietary Footprint:** Neuron must not leave any proprietary or hidden metadata/config files (like `.neuron/` or `neuron.yaml`) in the generated projects.
*   **Agent-Ready Output:** The generated projects must be completely clean, standard, and idiomatic for their respective tech stacks (e.g., standard `go.mod` for Go, `package.json` for Node.js).
*   **High-Signal AGENTS.md Generation:** Instead of leaving empty directories or proprietary configs, Neuron scaffolds a standard, highly curated `AGENTS.md` (and a symlink to `CLAUDE.md` for Anthropic tools) at the project root. This file provides precise, non-inferable technical details (e.g., exact tech stack versions, custom test commands, coding style rules, and safety boundaries like "Always", "Ask First", and "Never") tailored to the chosen scaffold template.
*   **Interoperability:** This zero-footprint approach ensures other AI tools and agents (e.g., Claude TUI, OpenCode TUI, Cursor, Copilot) can work seamlessly with the generated repositories out-of-the-box by reading the standard `AGENTS.md` file.

## Implementation Phases

### Phase 1: Foundation (CLI & DuckDB Backend)
*   Initialize Go module and CLI scaffolding.
*   Design and deploy the DuckDB database schema.
*   Implement local transactional persistence for projects, tasks, and skill definitions.

### Phase 2: Project Scaffolding & Agent-Ready Generation
*   Implement the `neuron init` command.
*   Create clean scaffolding templates (e.g., Go, Node.js).
*   Implement automated generation of high-signal, template-specific `AGENTS.md` files and `CLAUDE.md` symlinks (following the Augment Code 2026 guidelines).

### Phase 3: Skills Engine & Script Export
*   Design the skills registration and execution engine.
*   Implement exporting database skills into standard task-runner files (e.g., `Makefile`, `package.json`, or a `./scripts/` directory).

### Phase 4: Model Context Protocol (MCP) Server
*   Implement a global MCP server in Go (`neuron mcp start`).
*   Expose dynamic lists of active projects, tasks, and skills directly to MCP-compliant agents (like Claude TUI).

### Phase 5: Interactive TUI
*   Develop a beautiful, interactive Terminal User Interface (TUI) using Go (e.g., Bubble Tea) for project provisioning, task management, and visual lifecycle tracking.

