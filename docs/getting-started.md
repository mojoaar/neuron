# Getting Started with Neuron

Welcome to **Neuron**, an AI-native Lifecycle Manager for software projects. Neuron binds conceptual specifications (like `plan.md`) to technical implementations and automates local development workspaces with zero proprietary configuration footprint.

---

## 🚀 Core Philosophy: Zero-Footprint Workspaces

Unlike other tools that leave proprietary metadata files (like `.neuron/` or `neuron.yaml`) scattered inside your project directories, Neuron enforces a **Zero-Footprint Workspace Contract**:

1. **Standard Scaffolds**: Provisioned projects are completely clean and standard (e.g., standard `go.mod` for Go, `package.json` for Node.js).
2. **High-Signal Rules (`AGENTS.md`)**: Neuron generates a stack-specific `AGENTS.md` file and a `CLAUDE.md` symbolic rules link at your project root. Any entering AI agent (like Claude Code, OpenCode TUI, Cursor, or Copilot) automatically reads these guidelines to maintain coding standards, lint checks, and safety boundaries.
3. **Cross-TUI Skills Integration**: Mapped skills are downloaded locally under `.agents/skills/` and symlinked to `.claude/skills/`, making custom automation commands universally discoverable by both **OpenCode TUI** and **Claude TUI**!

---

## 💾 State Architecture: DuckDB vs. Project Directory

To maintain a pristine codebase environment, Neuron decouples project metadata from the physical directory layout using a **strict database-to-project separation boundary**:

### 1. What lives in the Neuron Database?
Neuron maintains an in-process, high-performance transactional **DuckDB database** locally at `~/.config/neuron/neuron.db`. This database serves as the source of truth for:
* **The Projects Catalog**: Physical directories, custom IDs, and creation dates.
* **Task Backlogs (Kanban)**: Tracked ticket contents, priorities, status states, and Git branches/commits.
* **Automation Skills Registry**: Programmatic associations, descriptions, execution pathways, and trigger regexes.
* **Default System Boilerplates**: Custom default rules configurations and skills catalog checklists.

### 2. What lives in your Project Folder?
Your project directories contain absolutely **zero proprietary configuration files** (no `.neuron/` or `neuron.yaml` files). Only standard, high-signal, industry-standard assets reside in your workspace:
* **`AGENTS.md` (and `CLAUDE.md` symlink)**: Transparent, standard text rules defining system coding boundaries.
* **`plan.md`**: Standard, high-level markdown specifications checklist.
* **`.agents/skills/` (and `.claude/skills/` symlink)**: Custom shell automations or binaries cached locally.
* **Native manifests (`Makefile` or `package.json`)**: Configured and updated natively during skills exports.

---

## 🎨 Key HUD Dashboard Features

### Visual Themes & Fonts
*   **5 Themes**: Switch between Neuron (green terminal), Dracula (purple syntax), Nord (arctic frost), Cyberpunk 2077 (neon), and GitHub Developer — each with dark and light modes.
*   **10 Monospace Fonts**: Configure JetBrains Mono, Fira Code, Source Code Pro, IBM Plex Mono, Cascadia Code, Roboto Mono, Inconsolata, Space Mono, Ubuntu Mono, or Cousine — all weight variants loaded dynamically.
*   **Editor Font Size**: Adjust plan editor, rules editor, and markdown preview font sizes from 11px to 17px.

### Project Clusters
Group related workspace environments into named clusters via the sidebar accordion. Each cluster renders a dashboard with member projects, per-project quick-link buttons, and batch unbind/remove actions.

### DuckDB Table Viewer
Click `DUCKDB:ACTIVE` in the sidebar footer to open a live relational database browser. View all tables, inspect rows with truncation for long values, delete projects with 2-step confirmation, and unhide hidden projects directly from the table view.

### CI Verification Dashboard
A test/lint status bar below the git bar in every project dashboard. Click **Tests: PASS/FAIL** or **Lint: PASS/WARN** to expand stdout/stderr output trays. Runs `go test` / `npm test` / `pytest` per tech stack with a 15-second timeout. Enable/disable in System Settings.

### Activity Audit Timeline
The **06_TIMELINE** tab in each project dashboard shows a scrollable event feed with color-coded action icons — project creation (green), task transitions (yellow), and deletions (red). Data persisted in the `activity_log` DuckDB table.

### API Authentication Key
An auto-generated API key is available under System Settings. Use it to authenticate external tools connecting to the Neuron HTTP daemon. Regenerate at any time.

### Collapsible Terminal Logger
The bottom console bar shows real-time operation logs with 24-hour timestamps, color-coded message types (system/success/error/info), and a collapse/expand toggle (`⌘J` / `Ctrl+J`).

### Universal Command Palette
Press `⌘K` / `Ctrl+K` to open a fuzzy-search overlay across projects, settings, dashboard tabs, and HUD commands. Navigate with arrow keys — the list auto-scrolls to keep the selected item visible.

---

## 📁 Installation & Platform Support

Neuron is compiled and distributed as a single, self-contained, zero-dependency executable.

### Compilation
Build the binary locally from the root folder:
```bash
make build
```
This automatically installs the Web HUD dependencies, compiles Next.js statically, embeds the client assets into Go, and outputs the portable `./neuron` binary.

### CLI Launch
Launch the beautiful Web HUD dashboard on default port `8080` and open your browser automatically:
```bash
./neuron
```

### Subcommands
* `neuron ui -p [port]`: Launch the Web HUD on a custom port.
* `neuron init [project-name] -t [go|node|html|powershell|nextjs|python|android]`: Provision a project from the CLI.
* `neuron mcp start`: Launch the in-process JSON-RPC Model Context Protocol server over stdio.

### Background Daemon Mode
You can run the Web HUD server continuously in the background, freeing up your active terminal window:
* **Start background server**:
```bash
neuron ui --daemon
```
* **Stop background server**:
```bash
neuron stop
```
*(This reads the active Process ID from `~/.config/neuron/neuron.pid`, shuts down the server gracefully, and releases the DuckDB file lock immediately).*
* **In-App Shutdown**: You can also shut down the server cleanly from inside the Web HUD by clicking the red **`[ SHUTDOWN_HUD_SERVER ]`** button inside Global System Settings.

---

## 🌐 Adding Neuron to your System PATH

To launch `neuron` dynamically from any terminal on your machine, you should add its compiled binary directory to your operating system's system PATH.

### 🍎 1. macOS
If you compiled the binary under `/Users/mojoaar/Development/neuron/`:
1. Open your shell configuration file (usually `~/.zshrc` or `~/.bash_profile`):
```bash
nano ~/.zshrc
```
2. Append the following export line at the bottom:
```bash
export PATH="/Users/mojoaar/Development/neuron:$PATH"
```
3. Save, exit, and reload the terminal config:
```bash
source ~/.zshrc
```

### 🐧 2. Linux
If the binary directory is `/home/user/neuron/`:
1. Open your shell profile (usually `~/.bashrc` or `~/.zshrc`):
```bash
nano ~/.bashrc
```
2. Append the PATH definition:
```bash
export PATH="/home/user/neuron:$PATH"
```
3. Save, exit, and source the profile:
```bash
source ~/.bashrc
```

### 🪟 3. Windows
If the binary directory is `C:\neuron\`:
#### Via PowerShell (Recommended - Run as Administrator):
```powershell
[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\neuron", "User")
```
#### Via Graphical System Settings:
1. Press `Win + R`, type `sysdm.cpl`, and press Enter to open System Properties.
2. Select the **Advanced** tab and click **Environment Variables**.
3. Under *User variables*, select **Path** and click **Edit**.
4. Click **New**, paste the absolute folder path `C:\neuron\`, click **OK** on all dialog boxes, and restart your active terminal window.

---

##  Path-Aware Context

Neuron features a **Path-Aware Workspace Context Plane**:
* When you run `./neuron`, the Go backend captures the active folder path.
* The HUD dashboard automatically filters your listed projects to show **only** those that are sub-folders of your active folder.
* Default provisioning paths are dynamically absolute-referenced relative to your active CWD, using correct platform separators (`\` on Windows, `/` on macOS/Linux).
* Stale database records for physically deleted folders are automatically cleaned and purged from your catalog in the background, keeping database cache records completely pristine!
