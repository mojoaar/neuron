# Neuron // Lifecycle Manager 🧠

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-red.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Version: v1.4.0](https://img.shields.io/badge/Version-1.4.0-green.svg)](https://github.com/mojoaar/neuron)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-mojoaar-yellow.svg)](https://buymeacoffee.com/mojoaar)

Neuron is an **AI-native Software Project Lifecycle Manager** that bridges high-level conceptual planning with low-level codebase implementation—automating local workspace directory scaffolding, custom capabilities execution, and task board coordination with a beautiful, single-binary portable Next.js Web HUD dashboard.

---

## 🚀 Core Philosophy: Zero-Footprint Workspaces

Unlike legacy project orchestrators that pollute your workspaces with complex, proprietary folders (like `.neuron/` or `neuron.yaml` files), Neuron operates under a strict **Zero-Footprint Workspace Contract**:

1. **Prisinte Directories**: Scaffolds are completely clean, standard, and native (e.g., standard `go.mod` for Go, `package.json` for Node.js).
2. **Dual-TUI Guidelines (`AGENTS.md` & `CLAUDE.md`)**: Neuron creates a stack-specific code-boundary guidelines file (`AGENTS.md`) and a relative symbolic link (`CLAUDE.md`) at your project root. Any entering AI agent (such as Claude Code, OpenCode TUI, Cursor, or Copilot) automatically reads these boundaries to ensure high-signal standards compliance.
3. **Cross-TUI Skills Integration**: Virtual catalog skills are compiled, unzipped, and linked under local project folders (`.agents/skills/` symlinked cleanly to `.claude/skills/`), making automated capabilities universally discoverable by both **OpenCode TUI** and **Claude TUI**!

---

## 💾 State Architecture: DuckDB vs. Project Directory

Neuron keeps your workspace pristine by enforcing a complete decoupled architectural separation of state:

### 1. What lives in the Neuron Database?
Neuron maintains an in-process, high-performance transactional **DuckDB database** locally at `~/.config/neuron/neuron.db`. This database serves as the local source of truth for:
* **The Projects Catalog**: Tracked absolute folder paths, custom identifiers, tech stacks, and registration logs.
* **Task Backlogs (Kanban)**: Todo ticket contents, priorities, status states (`pending`, `in_progress`, `completed`, `cancelled`), and Git branches/commits.
* **Automation Skills Registry**: Trigger regexes, descriptions, execution types (`script`, `binary`, `mcp`), and script execution paths.
* **Global System Boilerplates**: Custom default rules contexts and recommended platform checklists.

### 2. What lives in your Project Folder?
Your project workspace folder stays completely clean and contains only standard, transparent assets:
* **`AGENTS.md` (and `CLAUDE.md` symlink)**: Human-readable guidelines defining system boundaries.
* **`plan.md`**: High-level markdown specifications checklist.
* **`.agents/skills/` (and `.claude/skills/` symlink)**: Unpacked custom shell automations.
* **Project manifests (`Makefile` or `package.json`)**: Configured and updated natively during skills exports.

---

## 📁 Installation & PATH Configuration

Neuron is compiled as a single, self-contained, zero-dependency executable.

### Compilation
Build the single binary locally from the root folder:
```bash
make build
```
This automatically syncs markdown guides, compiles Next.js statically, embeds the client assets into Go, and outputs the portable `./neuron` binary.

### Adding Neuron to your PATH

To run `neuron` dynamically from any terminal folder:

* **macOS/Linux**:
  Open your shell profile (usually `~/.zshrc` or `~/.bashrc`) and append the export line:
  ```bash
  export PATH="/Users/mojoaar/Development/neuron:$PATH"
  ```
  Reload config: `source ~/.zshrc` (or `source ~/.bashrc`).

* **Windows**:
  Open PowerShell as **Administrator** and run:
  ```powershell
  [Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\neuron", "User")
  ```

---

## ⚙️ CLI Subcommand Catalog

| Command | Arguments | Purpose |
| :--- | :--- | :--- |
| **`neuron ui`** | `[-p port] [--daemon]` | Launch the dynamic, path-aware Next.js Web HUD dashboard (options: custom port, run in background). |
| **`neuron stop`** | *None* | Gracefully terminate any running background server daemon, releasing the DuckDB database lock immediately. |
| **`neuron init`** | `[project-name] [-t stack]` | Scaffolds a zero-footprint project rules context (`AGENTS.md`) and registers in DB. |
| **`neuron mcp`** | `start` | Launch the high-performance JSON-RPC MCP server over stdio. |
| **`neuron project`**| `list \| add \| delete` | Manages registered codebase mappings inside your local DuckDB catalog. |
| **`neuron skill`** | `list \| add \| export` | Manages custom automation skills and compiles them to Makefiles / package.json. |
| **`neuron version`** | *None* | Print the semantic release version of Neuron (also supported via flags: `-v`, `--version`). |
| **`neuron help`** | `[command]` | Displays natively generated CLI usage instructions and flags descriptions. |

---

## 🖥️ Background System Service Setup

### Linux (systemd Setup)
Write a new service file under `/etc/systemd/system/neuron.service`:
```ini
[Unit]
Description=Neuron AI Project Lifecycle Manager Web HUD
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/neuron/
ExecStart=/home/your-username/neuron/neuron ui --port 8080
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```
Run standard control commands:
```bash
sudo systemctl daemon-reload
sudo systemctl enable neuron.service
sudo systemctl start neuron.service
```

### Windows Task Scheduler (Detached Background Setup)
To bypass Windows service control timeouts, execute this block as **Administrator** inside PowerShell to run Neuron as a detached background startup task:
```powershell
$Action = New-ScheduledTaskAction -Execute "C:\neuron\neuron.exe" -Argument "ui --port 8080"
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "NeuronServer" -Action $Action -Trigger $Trigger -Settings $Settings -User "NT AUTHORITY\SYSTEM"
Start-ScheduledTask -TaskName "NeuronServer"
```

---

## 🎨 Next.js Web HUD Features

* **Universal Command Palette (`⌘K` / `Ctrl+K`)**: Instant fuzzy search across projects, viewports, settings, and command executions with keyboard traversal.
* **Interactive REST Playground (`/apidocs`)**: Interactive rest catalog with query parameters and body payloads allowing you to run live backend requests with latency CRT readouts.
* **Collapsible Terminal CRT Logger**: Real-time operating log console featuring 24-hour timestamp blocks, collapsible layouts, and active clear options.
* **Light/Dark Mode Toggler**: Instant style-skin variable toggler in the header row supporting custom terminal-dark and high-contrast terminal-light modes.

---

## ⚙️ Dependencies & Credits

Neuron is built upon the following world-class core dependencies:
* **Go (Golang)**: In-process single-binary server compilation.
* **DuckDB**: Fast, local transactional sql relational cataloging.
* **Next.js**: Premium terminal-dark single-page Web HUD dashboard.
* **Cobra CLI**: Standard self-documenting CLI and subcommands manager.
* **Lucide Icons**: Clean, developer-focused vector iconography.
* **mark3labs/mcp-go**: Lightweight JSON-RPC Model Context Protocol server.

---

## 📜 Changelog

### v1.4.0 (2026-06-25)
* **Interactive REST Playground**: Added `/apidocs` scene inside Web HUD enabling developer sandboxes.
* **General Documentation Hub**: Added `/docs` sub-nav supporting SETUP, MCP, Skills, and Service installation chapters.
* **Universal Command Palette**: Engineered global `⌘K` fuzzy-search modal.
* **Daemon Process Manager**: Added `neuron ui --daemon` background process spawner and `neuron stop` cli terminate commands.
* **In-App Shutdown**: Integrated secure `POST /api/system/shutdown` and setting buttons with fully disconnected overlays.
* **Time Scale Update**: Explicitly enforced 24-hour timestamp logs everywhere in the HUD.
* **Collapsible Terminal**: Added hide/expand toggle buttons on the terminal console panel.
* **TUI Decommission**: Cleanly decommissioned redundant `neuron tui` subcommands, pruning all Bubble Tea / Charm libraries to reduce binary size.

### v1.3.0 (2026-06-18)
* **Relational DuckDB Schema**: Integrated Cascade Deletion transactions (`DeleteProject`) to safely purge metadata records.
* **Dual-TUI Rules Integration**: Standardized `.claude/skills` ──► `.agents/skills` relative symlinks.
* **Markdown Importer**: Created split-screen `plan.md` specs editor and checklist importer.

### v1.2.0 (2026-06-10)
* **Path-Aware Context Plane**: Made the Go server and UI dynamically filter projects using `os.Getwd()`.

### v1.1.0 (2026-06-03)
* **Multi-stack Support**: Scaffolded 7 tech stacks (Go, Node, HTML, PowerShell, Next.js, Python, Android).

### v1.0.0 (2026-05-24)
* **Initial Release**: Launched core single-binary, DuckDB database interface, and embedded Next.js Web UI.
