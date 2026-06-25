# Model Context Protocol (MCP) Integration Guide

Neuron hosts an in-process, high-performance **Model Context Protocol (MCP) Server** that exposes your DuckDB projects database directly to MCP-compliant AI agents (such as Claude TUI, Cursor, or OpenCode TUI).

---

## ⚡ Exposed Tools Schema

AI agents connecting to the Neuron MCP server can natively query and execute the following tools:

1. **`list_projects`**: Lists all active, path-filtered projects registered in the local DuckDB database catalog.
2. **`list_tasks(project_id)`**: Lists all backlog tasks, priorities, and branch-status flags for the focused project.
3. **`add_task(project_id, task_id, content, priority)`**: Inserts a new task/TODO record directly into the database.
4. **`update_task_status(project_id, task_id, status)`**: Shuffles task statuses between `pending`, `in_progress`, `completed`, and `cancelled`.
5. **`list_skills(project_id)`**: Lists all automated, registered skills and shell command execution pathways.

---

## 🔌 One-Click Integrations

To connect your AI clients, click the setup buttons inside the **`[ 05_MCP_INTEGRATOR ]`** workspace tab or the **Universal Command Palette (`⌘K`)**. Neuron will write the stdio connection configurations automatically:

### 1. OpenCode TUI Config Path
* **macOS/Linux**: `~/.config/opencode/opencode.json`
* **Windows**: `%APPDATA%\opencode\opencode.json`

### 2. Claude Desktop Config Path
* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

---

## 🛠️ Manual Integration Configuration

If you prefer to configure your client manually, insert the following JSON node inside the `"mcpServers"` block of your client's settings:

```json
"mcpServers": {
  "neuron": {
    "command": "/Users/mojoaar/Development/neuron/neuron",
    "args": ["mcp", "start"]
  }
}
```
*Make sure the `command` field points directly to the absolute path of your compiled `neuron` binary!*
