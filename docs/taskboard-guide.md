# Kanban Task Board Integration Guide

Neuron houses a premium, transactional **Kanban Task Board** that bridges high-level markdown specifications with structured relational database tracking.

---

## 📋 The DuckDB Backlog Pipeline

Every backlog task in Neuron represents a structured relational record tracked inside your DuckDB project database. Tasks are organized into 4 logical states:

1. **PENDING**: New requirements, ideas, or architectural steps waiting to be initiated.
2. **IN PROGRESS**: Active tasks that a developer or an AI agent is currently executing.
3. **COMPLETED**: Closed out tasks that have passed standard test and linter safety nets.
4. **CANCELLED**: Deferrals or requirement adjustments that are kept in the backlog history for auditing.

Task status changes are applied instantly via PATCH and logged to the Activity Audit Timeline (06_TIMELINE tab).

---

## 🔄 Auto-Sync from plan.md

Every time you open the **03_TASKBOARD** tab, Neuron automatically scans your project's `plan.md` file for markdown checklist items and syncs them into the task board:

```markdown
- [ ] Implement database layer    →  PENDING task
- [x] Set up CI pipeline          →  COMPLETED task
- [ ] Write unit tests            →  PENDING task
```

This auto-sync runs on every tab open so that any changes made to `plan.md` by an AI agent or external tool are immediately reflected in the task board — no manual import step needed.

The backend deduplicates by task content: if a plan.md line already exists as a task, it is skipped. No duplicate tasks are ever created.

### Manual Task Management

You can also add tasks directly via the input form at the top of the board, and change task status with the inline buttons (PND / WRK / DON / CNL).

---

## 📋 Priority Coding

Each task has a priority level (`high`, `medium`, `low`), displayed as colored badges on each card. High-priority items are highlighted in red, low-priority in blue, and medium in yellow.
