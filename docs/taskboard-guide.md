# Kanban Task Board Integration Guide

Neuron houses a premium, transactional **Kanban Task Board** that bridges high-level markdown specifications with structured relational database tracking.

---

## 📋 The DuckDB Backlog Pipeline

Every backlog task in Neuron represents a structured relational record tracked inside your DuckDB project database. Tasks are organized into 4 logical states:
1. **PENDING**: New requirements, ideas, or architectural steps waiting to be initiated.
2. **IN PROGRESS**: Active tasks that a developer or an AI agent is currently executing.
3. **COMPLETED**: Closed out tasks that have passed standard test and linter safety nets.
4. **CANCELLED**: Deferrals or requirement adjustments that are kept in the backlog history for auditing.

---

## 🗂️ Markdown Checklist Importer

Inside the **`[ 01_PLAN_REFINEMENT ]`** tab, you can edit your project's high-level specifications inside a split-screen markdown editor.

When you click **`[ IMPORT_PLAN_TO_KANBAN ]`**, Neuron triggers its native markdown checklist compiler:
1. **Dynamic AST Scanner**: The Go backend scans your project's root `plan.md` file.
2. **Checklist Matches**: It parses and extracts lines formatted as unchecked lists (`- [ ]`) or completed lists (`- [x]`).
3. **Upsert Compilation**: 
   * Each unchecked list item is translated and inserted into DuckDB as a **PENDING** task card.
   * Each checked item is inserted as a **COMPLETED** task card.
   * Neuron automatically assigns sequential task identifiers (e.g. `#1`, `#2`) to help organize your progress boards cleanly.
   * If a task with the exact content already exists in the database, Neuron preserves its state to prevent duplicates!
