# Model Context Protocol (MCP) Integration Guide

Neuron hosts an in-process, high-performance **Model Context Protocol (MCP) Server** that exposes your DuckDB projects database directly to MCP-compliant AI agents (such as Claude Desktop, Claude Code CLI, Cursor, or OpenCode TUI).

---

## ⚡ Exposed Tools Schema

AI agents connecting to the Neuron MCP server can natively query and execute the following tools:

1. **`list_projects`**: Lists all active, path-filtered projects registered in the local DuckDB database catalog.
2. **`list_tasks(project_id)`**: Lists all backlog tasks, priorities, and branch-status flags for the focused project.
3. **`add_task(project_id, task_id, content, priority)`**: Inserts a new task/TODO record directly into the database.
4. **`update_task_status(project_id, task_id, status)`**: Shuffles task statuses between `pending`, `in_progress`, `completed`, and `cancelled`.
5. **`list_skills(project_id)`**: Lists all automated, registered skills and shell command execution pathways.
6. **`get_plan(project_id)`**: Reads the full `plan.md` content for a project so agents understand the project scope.
7. **`get_rules(project_id)`**: Reads the full `AGENTS.md` rules context so agents respect coding boundaries.
8. **`list_clusters`**: Lists all project clusters with their member workspaces.
9. **`list_activity(limit?)`**: Returns recent activity log entries — project creation, task transitions, skill installs.

---

## 🔌 One-Click Integrations

To connect your AI clients, click the setup buttons inside the **`[ 05_MCP_INTEGRATOR ]`** workspace tab or the **Universal Command Palette (`⌘K`)**. Neuron will write the stdio connection configurations automatically. You can also click the copy icon (📋) to copy the exact config snippet to your clipboard.

### 1. OpenCode TUI Config Path
* **macOS/Linux**: `~/.config/opencode/opencode.json`
* **Windows**: `%APPDATA%\opencode\opencode.json`

### 2. Claude Desktop Config Path
* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### 3. Claude Code CLI Config Path
* **All platforms**: `~/.claude.json`

---

## 🛠️ Manual Integration Configuration

If you prefer to configure your client manually, use the appropriate snippet below depending on your client.

### For OpenCode TUI
Add the following JSON node under the `"mcp"` block:

```json
{
  "mcp": {
    "neuron": {
      "type": "local",
      "command": ["/path/to/neuron", "mcp", "start"],
      "enabled": true
    }
  }
}
```

### For Claude Desktop and Claude Code CLI
Add the following JSON node under the `"mcpServers"` block:

```json
{
  "mcpServers": {
    "neuron": {
      "type": "stdio",
      "command": "/path/to/neuron",
      "args": ["mcp", "start"]
    }
  }
}
```
*Make sure the `command` field points directly to the absolute path of your compiled `neuron` binary!*
