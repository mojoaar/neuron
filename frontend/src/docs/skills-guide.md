# Custom Skills Automation Guide

Neuron features a **Zero-Footprint Custom Skills Execution Engine** that bridges conceptual steps inside AI agents with concrete local shell scripts and task runners.

---

## ⚡ What is a Custom Skill?

A custom skill is a declarative automation manifest mapped inside your local DuckDB projects catalog database. Each skill defines:
1. **Name / Identifier**: A clean name used as the invocation target (e.g. `generate-db`).
2. **Description**: High-signal metadata describing what the automation achieves.
3. **Trigger Regex Pattern**: A regular expression boundary that tells AI agents (like Claude TUI or OpenCode TUI) when to trigger this skill (e.g. `^db-init$`).
4. **Execution Type**: Context boundaries (`script`, `binary`, or `mcp`).
5. **Execution Path**: The actual local shell command or file executable pathway (e.g. `scripts/setup-db.sh` or `make db`).

---

## 💾 What does "Register Skill" do?

When you register a skill inside the **`[ 04_SKILLS_CONSOLE ]`** tab:
1. **Cataloging**: Neuron inserts the record into your DuckDB relational metadata catalog.
2. **TUI Auto-Discovery**: If you specify an `agentskill.sh` URL, Neuron downloads the package files in the background, extracts them locally into `.agents/skills/`, and configures absolute symbolic rule paths into `.claude/skills/`. This makes custom automation commands instantly discoverable by both **Claude TUI** and **OpenCode TUI**!

---

## 🔌 What does "Export to Native Stack" mean?

Unlike other developer platforms that require proprietary CLI runners or client software to run configured tasks, **Neuron translates virtual database skills into native task runners**. 

Clicking **`[ EXPORT_TO_NATIVE_STACK ]`** compiles your skills into standard project manifests based on your active technological stack:

### 1. The Makefile Compiler (Go, Python, HTML, Android)
Neuron compiles and writes a native standard **`Makefile`** inside your project's root folder:
* It reads your existing `Makefile` (if any), preserves all custom developer rules, and injects a dedicated `# --- BEGIN NEURON SKILLS ---` block.
* Every registered skill is outputted as a native make target:
  ```makefile
  # Skill: Compile database schemas
  generate-db:
  	./scripts/generate-db.sh
  ```
* This allows standard developers or visiting AI agents to run tasks natively:
  ```bash
  make generate-db
  ```

### 2. The package.json Compiler (Node.js, Next.js)
Neuron compiles and injects script commands inside your project's root **`package.json`** manifest:
* It parses, preserves, and injects targets directly under the `"scripts"` JSON block:
  ```json
  "scripts": {
    "generate-db": "./scripts/generate-db.sh"
  }
  ```
* This allows executing any configured capabilities using standard package runners:
  ```bash
  npm run generate-db
  ```
