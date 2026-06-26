# Custom Skills & Automation Guide

Neuron bridges high-level AI agent capabilities with local shell execution using a **three-channel skills system**: DuckDB registry, `.agents/skills/` filesystem markers, and native task runner manifests (Makefile/package.json).

---

## ⚡ How Skills Work — Three Discovery Paths

Skills are registered once in DuckDB and become discoverable by AI agents through **three independent channels**:

### 1. MCP Protocol (Structured JSON-RPC)
AI agents connecting to Neuron's MCP server call `list_skills(project_id)` and receive full structured skill objects — name, description, trigger pattern, execution type, and execution path. The MCP server also exposes `add_skill`, `export_skills`, and `get_plan`/`get_rules` for the full read/write lifecycle. This is the primary path for MCP-compatible agents (Claude Desktop, Claude Code CLI, OpenCode TUI).

### 2. TUI Filesystem (`.agents/skills/` directory)
Skills downloaded from the catalog (or default skills written on project TRACK) are stored as `SKILL.md` files under `.agents/skills/<owner>/<name>/`. Claude TUI and OpenCode TUI agents automatically scan this directory and make every detected `SKILL.md` available as a discoverable skill. The directory structure mirrors the agentskill.sh marketplace convention:
```
.agents/skills/
├── neuron/
│   ├── build/SKILL.md
│   ├── test/SKILL.md
│   └── run/SKILL.md
├── affaan-m/
│   └── error-handling/SKILL.md
└── ...
```

### 3. Task Runner Export (Makefile / package.json)
Clicking "Compile & Export Skills" in the skills dashboard writes all registered DuckDB skills into a standard `Makefile` (Go, Python, HTML, Android) or `package.json` script entries (Node, Next.js). Any AI agent — even those without MCP or TUI integration — can then execute `make build` or `npm run test`.

---

## 🏗️ Default Skills Per Tech Stack

When you provision or track a project, Neuron automatically registers a small set of stack-appropriate default skills in DuckDB AND writes them as `SKILL.md` files under `.agents/skills/neuron/`:

| Tech Stack | Default Skills                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| Go         | `build` — `go build -o <name> main.go` · `run` — `go run main.go` · `test` — `go test ./...`            |
| Node.js    | `start` — `node index.js` · `test` — `npm test`                                                        |
| Next.js    | `dev` — `next dev` · `build` — `next build` · `start` — `next start`                                   |
| Python     | `run` — `python3 main.py` · `test` — `python3 -m unittest discover`                                    |
| HTML5      | `serve` — `python3 -m http.server 8000`                                                                |
| Android    | `build` — `./gradlew assembleDebug` · `test` — `./gradlew test` · `run` — `./gradlew installDebug`     |
| PowerShell | `run` — `PowerShell -ExecutionPolicy Bypass -File .\script.ps1`                                        |

---

## 📦 Recommended Catalog Skills

The **Skill Catalog** (accessible via System Settings) contains 60+ curated skills from the `agentskill.sh` marketplace. Skills marked `is_checked: true` are **auto-installed** when you TRACK a pre-existing project — they are downloaded from `agentskill.sh`, saved to DuckDB, and written as `SKILL.md` files to `.agents/skills/<author>/<name>/` for immediate TUI discovery.

You can also manage the catalog in Settings:
- **Toggle checkboxes**: Skills checked for a tech stack are auto-installed on future TRACK operations.
- **Add custom skills**: Register any `agentskill.sh` URL with a label and tech stack category.
- **Delete skills**: Remove unwanted entries from the catalog.

---

## 🛠️ Registering Custom Skills

Inside the **04_SKILLS_CONSOLE** tab of any project dashboard, you can register custom skills manually:

1. **Name / Identifier**: A clean name used as the invocation target (e.g. `generate-db`).
2. **Description**: High-signal metadata describing what the automation achieves.
3. **Trigger Regex Pattern**: A regular expression that tells AI agents when to invoke this skill (e.g. `^db-init$`).
4. **Execution Type**: `script` (shell), `binary` (compiled), or `mcp` (MCP server).
5. **Execution Path**: The actual command to run (e.g. `scripts/setup-db.sh` or `make db`).

After registration, the skill is available via MCP (`list_skills`) immediately. To make it available via the task runner, click **"Compile & Export Skills"**.

---

## 🔌 What does "Export to Native Stack" mean?

Unlike other developer platforms that require proprietary CLI runners, **Neuron translates database skills into native task runners**.

### 1. The Makefile Compiler (Go, Python, HTML, Android)
Neuron injects a `# --- BEGIN NEURON SKILLS ---` block into your project's `Makefile`:
```makefile
# Skill: Compile database schemas
generate-db:
	./scripts/generate-db.sh
```
Any AI agent can run: `make generate-db`

### 2. The package.json Compiler (Node.js, Next.js)
Neuron adds script entries under the `"scripts"` JSON block:
```json
"scripts": {
  "generate-db": "./scripts/generate-db.sh"
}
```
Any AI agent can run: `npm run generate-db`

---

## 🔗 TUI Symlink Compatibility

The `.claude/skills/` directory is symlinked to `.agents/skills/`, ensuring that skills downloaded from the catalog and default skills written by Neuron are instantly discoverable by both Claude TUI and OpenCode TUI without any manual configuration.
