export const DOCS_GETTING_STARTED = `# Getting Started with Neuron

Welcome to **Neuron**, an AI-native Lifecycle Manager for software projects. Neuron binds conceptual specifications (like "plan.md") to technical implementations and automates local development workspaces with zero proprietary configuration footprint.

---

## 🚀 Core Philosophy: Zero-Footprint Workspaces

Unlike other tools that leave proprietary metadata files (like ".neuron/" or "neuron.yaml") scattered inside your project directories, Neuron enforces a **Zero-Footprint Workspace Contract**:

1. **Standard Scaffolds**: Provisioned projects are completely clean and standard (e.g., standard "go.mod" for Go, "package.json" for Node.js).
2. **High-Signal Rules ("AGENTS.md")**: Neuron generates a stack-specific "AGENTS.md" file and a "CLAUDE.md" symbolic rules link at your project root. Any entering AI agent (like Claude Code, OpenCode TUI, Cursor, or Copilot) automatically reads these guidelines to maintain coding standards, lint checks, and safety boundaries.
3. **Cross-TUI Skills Integration**: Mapped skills are downloaded locally under ".agents/skills/" and symlinked to ".claude/skills/", making custom automation commands universally discoverable by both **OpenCode TUI** and **Claude TUI**!

---

## 💾 State Architecture: DuckDB vs. Project Directory

To maintain a pristine codebase environment, Neuron decouples project metadata from the physical directory layout using a **strict database-to-project separation boundary**:

### 1. What lives in the Neuron Database?
Neuron maintains an in-process, high-performance transactional **DuckDB database** locally at "~/.config/neuron/neuron.db". This database serves as the source of truth for:
* **The Projects Catalog**: Physical directories, custom IDs, and creation dates.
* **Task Backlogs (Kanban)**: Tracked ticket contents, priorities, status states, and Git branches/commits.
* **Automation Skills Registry**: Programmatic associations, descriptions, execution pathways, and trigger regexes.
* **Default System Boilerplates**: Custom default rules configurations and skills catalog checklists.

### 2. What lives in your Project Folder?
Your project directories contain absolutely **zero proprietary configuration files** (no ".neuron/" or "neuron.yaml" files). Only standard, high-signal, industry-standard assets reside in your workspace:
* **"AGENTS.md" (and "CLAUDE.md" symlink)**: Transparent, standard text rules defining system coding boundaries.
* **"plan.md"**: Standard, high-level markdown specifications checklist.
* **".agents/skills/" (and ".claude/skills/" symlink)**: Custom shell automations or binaries cached locally.
* **Native manifests ("Makefile" or "package.json")**: Configured and updated natively during skills exports.

---

## 📁 Installation & Platform Support

Neuron is compiled and distributed as a single, self-contained, zero-dependency executable.

### Compilation
Build the binary locally from the root folder:
\`\`\`bash
make build
\`\`\`
This automatically installs the Web HUD dependencies, compiles Next.js statically, embeds the client assets into Go, and outputs the portable "./neuron" binary.

### CLI Launch
Launch the beautiful Web HUD dashboard on default port "8080" and open your browser automatically:
\`\`\`bash
./neuron
\`\`\`

### Subcommands
* "neuron ui -p [port]": Launch the Web HUD on a custom port.
* "neuron init [project-name] -t [go|node|html|powershell|nextjs|python|android]": Provision a project from the CLI.
* "neuron mcp start": Launch the in-process JSON-RPC Model Context Protocol server over stdio.

### Background Daemon Mode
You can run the Web HUD server continuously in the background, freeing up your active terminal window:
* **Start background server**:
\`\`\`bash
neuron ui --daemon
\`\`\`
* **Stop background server**:
\`\`\`bash
neuron stop
\`\`\`
*(This reads the active Process ID from "~/.config/neuron/neuron.pid", shuts down the server gracefully, and releases the DuckDB file lock immediately).*
* **In-App Shutdown**: You can also shut down the server cleanly from inside the Web HUD by clicking the red **"[ SHUTDOWN_HUD_SERVER ]"** button inside Global System Settings.

---

## 🌐 Adding Neuron to your System PATH

To launch "neuron" dynamically from any terminal on your machine, you should add its compiled binary directory to your operating system's system PATH.

### 🍎 1. macOS
If you compiled the binary under "/Users/mojoaar/Development/neuron/":
1. Open your shell configuration file (usually "~/.zshrc" or "~/.bash_profile"):
\`\`\`bash
nano ~/.zshrc
\`\`\`
2. Append the following export line at the bottom:
\`\`\`bash
export PATH="/Users/mojoaar/Development/neuron:\\$PATH"
\`\`\`
3. Save, exit, and reload the terminal config:
\`\`\`bash
source ~/.zshrc
\`\`\`

### 🐧 2. Linux
If the binary directory is "/home/user/neuron/":
1. Open your shell profile (usually "~/.bashrc" or "~/.zshrc"):
\`\`\`bash
nano ~/.bashrc
\`\`\`
2. Append the PATH definition:
\`\`\`bash
export PATH="/home/user/neuron:\\$PATH"
\`\`\`
3. Save, exit, and source the profile:
\`\`\`bash
source ~/.bashrc
\`\`\`

### 🪟 3. Windows
If the binary directory is "C:\\\\neuron\\\\":
#### Via PowerShell (Recommended - Run as Administrator):
\`\`\`powershell
[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\\\\neuron", "User")
\`\`\`
#### Via Graphical System Settings:
1. Press "Win + R", type "sysdm.cpl", and press Enter to open System Properties.
2. Select the **Advanced** tab and click **Environment Variables**.
3. Under *User variables*, select **Path** and click **Edit**.
4. Click **New**, paste the absolute folder path "C:\\\\neuron\\\\", click **OK** on all dialog boxes, and restart your active terminal window.

---

## Path-Aware Context

Neuron features a **Path-Aware Workspace Context Plane**:
* When you run "./neuron", the Go backend captures the active folder path.
* The HUD dashboard automatically filters your listed projects to show **only** those that are sub-folders of your active folder.
* Default provisioning paths are dynamically absolute-referenced relative to your active CWD, using correct platform separators ("\\\\" on Windows, "/" on macOS/Linux).
* Stale database records for physically deleted folders are automatically cleaned and purged from your catalog in the background, keeping database cache records completely pristine!
`;

export const DOCS_MCP_SERVER = `# Model Context Protocol (MCP) Integration Guide

Neuron hosts an in-process, high-performance **Model Context Protocol (MCP) Server** that exposes your DuckDB projects database directly to MCP-compliant AI agents (such as Claude Desktop, Claude Code CLI, Cursor, or OpenCode TUI).

---

## ⚡ Exposed Tools Schema

AI agents connecting to the Neuron MCP server can natively query and execute the following tools:

1. **"list_projects"**: Lists all active, path-filtered projects registered in the local DuckDB database catalog.
2. **"list_tasks(project_id)"**: Lists all backlog tasks, priorities, and branch-status flags for the focused project.
3. **"add_task(project_id, task_id, content, priority)"**: Inserts a new task/TODO record directly into the database.
4. **"update_task_status(project_id, task_id, status)"**: Shuffles task statuses between "pending", "in_progress", "completed", and "cancelled".
5. **"list_skills(project_id)"**: Lists all automated, registered skills and shell command execution pathways.
6. **"get_plan(project_id)"**: Reads the full plan.md content for a project so agents understand the project scope.
7. **"get_rules(project_id)"**: Reads the full AGENTS.md rules context so agents respect coding boundaries.
8. **"list_clusters"**: Lists all project clusters with their member workspaces.
9. **"list_activity(limit?)"**: Returns recent activity log entries — project creation, task transitions, skill installs.
10. **"update_plan(project_id, content)"**: Updates the plan.md content for a project.
11. **"update_rules(project_id, content)"**: Updates the AGENTS.md rules text for a project.
12. **"delete_task(project_id, task_id)"**: Permanently removes a task from a project.
13. **"add_skill(project_id, name, execution_type, execution_path)"**: Registers a new automation skill.
14. **"export_skills(project_id)"**: Compiles registered skills into native Makefile or package.json.
15. **"git_status(project_id)"**: Returns Git branch, commit, and dirty/file state for a project.
16. **"get_project(project_id)"**: Returns a single project's full metadata object.
17. **"truncate_db(confirm)"**: Purges all database tables and re-seeds defaults. Requires confirm set to "yes".

---

## 🔌 One-Click Integrations

To connect your AI clients, click the setup buttons inside the **"[ 05_MCP_INTEGRATOR ]"** workspace tab or the **Universal Command Palette ("⌘K")**. Neuron will write the stdio connection configurations automatically. You can also click the **copy icon (📋)** to copy the exact config snippet to your clipboard:

### 1. OpenCode TUI Config Path
* **macOS/Linux**: "~/.config/opencode/opencode.json"
* **Windows**: "%APPDATA%\\\\opencode\\\\opencode.json"

### 2. Claude Desktop Config Path
* **macOS**: "~/Library/Application Support/Claude/claude_desktop_config.json"
* **Windows**: "%APPDATA%\\\\Claude\\\\claude_desktop_config.json"

### 3. Claude Code CLI Config Path
* **All platforms**: "~/.claude.json"

---

## 🛠️ Manual Integration Configuration

If you prefer to configure your client manually, use the appropriate snippet below depending on your client.

### For OpenCode TUI
Add the following JSON node under the "mcp" block:

\`\`\`json
{
  "mcp": {
    "neuron": {
      "type": "local",
      "command": ["/path/to/neuron", "mcp", "start"],
      "enabled": true
    }
  }
}
\`\`\`

### For Claude Desktop and Claude Code CLI
Add the following JSON node under the "mcpServers" block:

\`\`\`json
{
  "mcpServers": {
    "neuron": {
      "type": "stdio",
      "command": "/path/to/neuron",
      "args": ["mcp", "start"]
    }
  }
}
\`\`\`
*Make sure the "command" field points directly to the absolute path of your compiled "neuron" binary!*
`;

export const DOCS_SKILLS_GUIDE = `# Custom Skills Automation Guide

Neuron features a **Zero-Footprint Custom Skills Execution Engine** that bridges conceptual steps inside AI agents with concrete local shell scripts and task runners.

---

## ⚡ What is a Custom Skill?

A custom skill is a declarative automation manifest mapped inside your local DuckDB projects catalog database. Each skill defines:
1. **Name / Identifier**: A clean name used as the invocation target (e.g. "generate-db").
2. **Description**: High-signal metadata describing what the automation achieves.
3. **Trigger Regex Pattern**: A regular expression boundary that tells AI agents (like Claude TUI or OpenCode TUI) when to trigger this skill (e.g. "^db-init$").
4. **Execution Type**: Context boundaries ("script", "binary", or "mcp").
5. **Execution Path**: The actual local shell command or file executable pathway (e.g. "scripts/setup-db.sh" or "make db").

---

## 💾 What does "Register Skill" do?

When you register a skill inside the **"[ 04_SKILLS_CONSOLE ]"** tab:
1. **Cataloging**: Neuron inserts the record into your DuckDB relational metadata catalog.
2. **TUI Auto-Discovery**: If you specify an "agentskill.sh" URL, Neuron downloads the package files in the background, extracts them locally into ".agents/skills/", and configures absolute symbolic rule paths into ".claude/skills/". This makes custom automation commands instantly discoverable by both **Claude TUI** and **OpenCode TUI**!

---

## 🔌 What does "Export to Native Stack" mean?

Unlike other developer platforms that require proprietary CLI runners or client software to run configured tasks, **Neuron translates virtual database skills into native task runners**. 

Clicking **"[ EXPORT_TO_NATIVE_STACK ]"** compiles your skills into standard project manifests based on your active technological stack:

### 1. The Makefile Compiler (Go, Python, HTML, Android)
Neuron compiles and writes a native standard **"Makefile"** inside your project's root folder:
* It reads your existing "Makefile" (if any), preserves all custom developer rules, and injects a dedicated "# --- BEGIN NEURON SKILLS ---" block.
* Every registered skill is outputted as a native make target:
\`\`\`makefile
# Skill: Compile database schemas
generate-db:
	./scripts/generate-db.sh
\`\`\`
* This allows standard developers or visiting AI agents to run tasks natively:
\`\`\`bash
make generate-db
\`\`\`

### 2. The package.json Compiler (Node.js, Next.js)
Neuron compiles and injects script commands inside your project's root **"package.json"** manifest:
* It parses, preserves, and injects targets directly under the "scripts" JSON block:
\`\`\`json
"scripts": {
  "generate-db": "./scripts/generate-db.sh"
}
\`\`\`
* This allows executing any configured capabilities using standard package runners:
\`\`\`bash
npm run generate-db
\`\`\`
`;

export const DOCS_TASKBOARD_GUIDE = `# Kanban Task Board Integration Guide

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

Inside the **"[ 01_PLAN_REFINEMENT ]"** tab, you can edit your project's high-level specifications inside a split-screen markdown editor.

When you click **"[ IMPORT_PLAN_TO_KANBAN ]"**, Neuron triggers its native markdown checklist compiler:
1. **Dynamic AST Scanner**: The Go backend scans your project's root "plan.md" file.
2. **Checklist Matches**: It parses and extracts lines formatted as unchecked lists ("- [ ]") or completed lists ("- [x]").
3. **Upsert Compilation**: 
   * Each unchecked list item is translated and inserted into DuckDB as a **PENDING** task card.
   * Each checked item is inserted as a **COMPLETED** task card.
   * Neuron automatically assigns sequential task identifiers (e.g. "#1", "#2") to help organize your progress boards cleanly.
   * If a task with the exact content already exists in the database, Neuron preserves its state to prevent duplicates!
`;

export const DOCS_SYSTEM_SERVICE = `# System Service Installation Guide

You can install and run Neuron as a persistent, background **System Service** on both Linux and Windows. This ensures that the Web HUD server and MCP bindings start automatically when your computer boots up and recover gracefully on any process failures.

---

## 🐧 1. Linux (systemd Setup)

Linux distributions (such as Ubuntu, Debian, Fedora, and Arch) utilize "systemd" to coordinate background services.

### 1. Create Service File
Write a new service descriptor file under "/etc/systemd/system/neuron.service":
\`\`\`ini
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
\`\`\`
*Make sure to replace "your-username" with your actual Linux user account name, and ensure the paths point directly to your compiled "neuron" binary!*

### 2. Register & Launch Service
Run the following commands inside your terminal:
\`\`\`bash
# Reload systemd configuration registers
sudo systemctl daemon-reload

# Enable service to run automatically on system bootup
sudo systemctl enable neuron.service

# Launch the server in the background immediately
sudo systemctl start neuron.service
\`\`\`

### 3. Service Commands & Logs
* **Check service status**:
  \`\`\`bash
  sudo systemctl status neuron.service
  \`\`\`
* **Read live execution logs**:
  \`\`\`bash
  journalctl -u neuron.service -f --no-tail
  \`\`\`
* **Restart the server**:
  \`\`\`bash
  sudo systemctl restart neuron.service
  \`\`\`

---

## 🪟 2. Windows (Background Service Setup)

To run Neuron cleanly as an automated background process on Windows, you can configure it either as a native Service or via the Windows Task Scheduler.

### Method A: Windows Task Scheduler (Recommended)
This is the most reliable, detached background method for Windows, as it avoids standard Service Control Manager (SCM) timeout limits.

#### 1. Via PowerShell (One-Liner Administrator Setup):
Open PowerShell as **Administrator** and execute the following block:
\`\`\`powershell
$Action = New-ScheduledTaskAction -Execute "C:\\\\neuron\\\\neuron.exe" -Argument "ui --port 8080"
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "NeuronServer" -Action $Action -Trigger $Trigger -Settings $Settings -User "NT AUTHORITY\\\\SYSTEM"
Start-ScheduledTask -TaskName "NeuronServer"
\`\`\`
*Ensure the execute path points directly to your absolute compiled "neuron.exe" executable!*

#### 2. Via Graphical Task Scheduler:
1. Press "Win + R", type "taskschd.msc", and press Enter to open Task Scheduler.
2. Click **Create Task** on the Actions sidebar.
3. Under the **General** tab:
   * Name: "NeuronServer"
   * Select **Run whether user is logged on or not** and **Run with highest privileges**.
4. Under the **Triggers** tab:
   * Click **New** and set *Begin the task* to **At startup**.
5. Under the **Actions** tab:
   * Click **New**, set *Action* to **Start a program**, and select your absolute executable path "C:\\\\neuron\\\\neuron.exe". Add arguments "ui --port 8080".
6. Click "OK", save the task, and start it!

---

### Method B: Native Windows Service (sc.exe)
If you prefer SCM-coordinated system services:
1. Open Command Prompt or PowerShell as **Administrator**:
   \`\`\`cmd
   sc.exe create Neuron binPath= "C:\\\\neuron\\\\neuron.exe ui --port 8080" start= auto DisplayName= "Neuron Lifecycle Manager"
   \`\`\`
2. Launch the service immediately:
   \`\`\`cmd
   net start Neuron
   \`\`\`
`;
