package storage

import (
	"context"
	"database/sql"
	_ "embed"
	"fmt"
	"strings"
	"time"

	_ "github.com/duckdb/duckdb-go/v2"
)

//go:embed schema.sql
var schemaSQL string

// Storage provides access to the DuckDB local database.
type Storage struct {
	db *sql.DB
}

// Project represents a target project managed by Neuron.
type Project struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	TechStack string    `json:"tech_stack"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Task represents a task/TODO inside a project.
type Task struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"project_id"`
	Content   string    `json:"content"`
	Status    string    `json:"status"` // 'pending', 'in_progress', 'completed', 'cancelled'
	Priority  string    `json:"priority"`
	GitBranch string    `json:"git_branch,omitempty"`
	GitCommit string    `json:"git_commit,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Template represents a custom scaffolding file template.
type Template struct {
	TechStack string    `json:"tech_stack"`
	AgentsMD  string    `json:"agents_md"`
	PlanMD    string    `json:"plan_md"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CatalogSkill represents a dynamic recommended skill catalog record.
type CatalogSkill struct {
	URL       string    `json:"url"`
	Label     string    `json:"label"`
	TechStack string    `json:"tech_stack"`
	IsChecked bool      `json:"is_checked"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Skill represents a conceptual skill registered with Neuron.
type Skill struct {
	ID             string    `json:"id"`
	ProjectID      string    `json:"project_id"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	TriggerPattern string    `json:"trigger_pattern"`
	ExecutionType  string    `json:"execution_type"` // 'script', 'mcp', 'binary'
	ExecutionPath  string    `json:"execution_path"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// New opens a DuckDB database at the specified path and initializes the schema.
func New(dbPath string) (*Storage, error) {
	db, err := sql.Open("duckdb", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open duckdb: %w", err)
	}

	s := &Storage{db: db}
	if err := s.initSchema(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	return s, nil
}

// Close closes the underlying database connection.
func (s *Storage) Close() error {
	return s.db.Close()
}

func (s *Storage) initSchema() error {
	_, err := s.db.Exec(schemaSQL)
	if err != nil {
		return fmt.Errorf("failed to execute schema SQL: %w", err)
	}
	_ = s.prepopulateSystemTables()
	return nil
}

// AddProject saves a new project.
func (s *Storage) AddProject(ctx context.Context, p *Project) error {
	query := `
		INSERT INTO projects (id, name, path, tech_stack, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?);
	`
	now := time.Now()
	if p.CreatedAt.IsZero() {
		p.CreatedAt = now
	}
	if p.UpdatedAt.IsZero() {
		p.UpdatedAt = now
	}

	_, err := s.db.ExecContext(ctx, query, p.ID, p.Name, p.Path, p.TechStack, p.CreatedAt, p.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert project: %w", err)
	}
	return nil
}

// GetProject retrieves a project by its ID.
func (s *Storage) GetProject(ctx context.Context, id string) (*Project, error) {
	query := `
		SELECT id, name, path, tech_stack, created_at, updated_at
		FROM projects
		WHERE id = ?;
	`
	var p Project
	err := s.db.QueryRowContext(ctx, query, id).Scan(&p.ID, &p.Name, &p.Path, &p.TechStack, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("project not found: %s", id)
	} else if err != nil {
		return nil, fmt.Errorf("failed to get project: %w", err)
	}
	return &p, nil
}

// ListProjects lists all projects.
func (s *Storage) ListProjects(ctx context.Context) ([]*Project, error) {
	query := `
		SELECT id, name, path, tech_stack, created_at, updated_at
		FROM projects
		ORDER BY created_at DESC;
	`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query projects: %w", err)
	}
	defer rows.Close()

	var list []*Project
	for rows.Next() {
		var p Project
		if err := rows.Scan(&p.ID, &p.Name, &p.Path, &p.TechStack, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan project: %w", err)
		}
		list = append(list, &p)
	}
	return list, nil
}

// AddTask saves a new task.
func (s *Storage) AddTask(ctx context.Context, t *Task) error {
	query := `
		INSERT INTO tasks (id, project_id, content, status, priority, git_branch, git_commit, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
	`
	now := time.Now()
	if t.CreatedAt.IsZero() {
		t.CreatedAt = now
	}
	if t.UpdatedAt.IsZero() {
		t.UpdatedAt = now
	}

	_, err := s.db.ExecContext(ctx, query, t.ID, t.ProjectID, t.Content, t.Status, t.Priority, t.GitBranch, t.GitCommit, t.CreatedAt, t.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert task: %w", err)
	}
	return nil
}

// UpdateTask updates an existing task.
func (s *Storage) UpdateTask(ctx context.Context, t *Task) error {
	query := `
		UPDATE tasks
		SET content = ?, status = ?, priority = ?, git_branch = ?, git_commit = ?, updated_at = ?
		WHERE id = ?;
	`
	t.UpdatedAt = time.Now()
	_, err := s.db.ExecContext(ctx, query, t.Content, t.Status, t.Priority, t.GitBranch, t.GitCommit, t.UpdatedAt, t.ID)
	if err != nil {
		return fmt.Errorf("failed to update task: %w", err)
	}
	return nil
}

// ListTasksByProject lists tasks for a specific project.
func (s *Storage) ListTasksByProject(ctx context.Context, projectID string) ([]*Task, error) {
	query := `
		SELECT id, project_id, content, status, priority, git_branch, git_commit, created_at, updated_at
		FROM tasks
		WHERE project_id = ?
		ORDER BY created_at ASC;
	`
	rows, err := s.db.QueryContext(ctx, query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to query tasks: %w", err)
	}
	defer rows.Close()

	var list []*Task
	for rows.Next() {
		var t Task
		var branch, commit sql.NullString
		if err := rows.Scan(&t.ID, &t.ProjectID, &t.Content, &t.Status, &t.Priority, &branch, &commit, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}
		if branch.Valid {
			t.GitBranch = branch.String
		}
		if commit.Valid {
			t.GitCommit = commit.String
		}
		list = append(list, &t)
	}
	return list, nil
}

// AddSkill saves a new skill.
func (s *Storage) AddSkill(ctx context.Context, sk *Skill) error {
	query := `
		INSERT INTO skills (id, project_id, name, description, trigger_pattern, execution_type, execution_path, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
	`
	now := time.Now()
	if sk.CreatedAt.IsZero() {
		sk.CreatedAt = now
	}
	if sk.UpdatedAt.IsZero() {
		sk.UpdatedAt = now
	}

	_, err := s.db.ExecContext(ctx, query, sk.ID, sk.ProjectID, sk.Name, sk.Description, sk.TriggerPattern, sk.ExecutionType, sk.ExecutionPath, sk.CreatedAt, sk.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert skill: %w", err)
	}
	return nil
}

// ListSkillsByProject lists skills registered for a project.
func (s *Storage) ListSkillsByProject(ctx context.Context, projectID string) ([]*Skill, error) {
	query := `
		SELECT id, project_id, name, description, trigger_pattern, execution_type, execution_path, created_at, updated_at
		FROM skills
		WHERE project_id = ?
		ORDER BY created_at ASC;
	`
	rows, err := s.db.QueryContext(ctx, query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to query skills: %w", err)
	}
	defer rows.Close()

	var list []*Skill
	for rows.Next() {
		var sk Skill
		var desc, trigger sql.NullString
		if err := rows.Scan(&sk.ID, &sk.ProjectID, &sk.Name, &desc, &trigger, &sk.ExecutionType, &sk.ExecutionPath, &sk.CreatedAt, &sk.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan skill: %w", err)
		}
		if desc.Valid {
			sk.Description = desc.String
		}
		if trigger.Valid {
			sk.TriggerPattern = trigger.String
		}
		list = append(list, &sk)
	}
	return list, nil
}

// UpdateSkill updates an existing skill in DuckDB.
func (s *Storage) UpdateSkill(ctx context.Context, sk *Skill) error {
	query := `
		UPDATE skills
		SET name = ?, description = ?, trigger_pattern = ?, execution_type = ?, execution_path = ?, updated_at = ?
		WHERE id = ?;
	`
	sk.UpdatedAt = time.Now()
	_, err := s.db.ExecContext(ctx, query, sk.Name, sk.Description, sk.TriggerPattern, sk.ExecutionType, sk.ExecutionPath, sk.UpdatedAt, sk.ID)
	if err != nil {
		return fmt.Errorf("failed to update skill: %w", err)
	}
	return nil
}

// DeleteSkill purges a skill from DuckDB.
func (s *Storage) DeleteSkill(ctx context.Context, id string) error {
	query := `
		DELETE FROM skills
		WHERE id = ?;
	`
	_, err := s.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete skill: %w", err)
	}
	return nil
}

// DeleteProject purges a project, its tasks, and its skills from DuckDB in a single atomic transaction.
func (s *Storage) DeleteProject(ctx context.Context, id string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, "DELETE FROM tasks WHERE project_id = ?;", id)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, "DELETE FROM skills WHERE project_id = ?;", id)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, "DELETE FROM projects WHERE id = ?;", id)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (s *Storage) prepopulateSystemTables() error {
	ctx := context.Background()

	var count int
	err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM templates;").Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		stacks := []string{"go", "node", "html", "powershell", "nextjs", "python", "android"}
		for _, tech := range stacks {
			agentsTemplate := GetDefaultAgentsTemplate(tech)
			planTemplate := GetDefaultPlanTemplate(tech)
			query := "INSERT INTO templates (tech_stack, agents_md, plan_md, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP);"
			_, err = s.db.ExecContext(ctx, query, tech, agentsTemplate, planTemplate)
			if err != nil {
				return fmt.Errorf("failed to prepopulate template for %s: %w", tech, err)
			}
		}
	}

	err = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM skill_catalog;").Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		skills := []CatalogSkill{
			// Next.js
			{URL: "https://agentskill.sh/@affaan-m/nextjs-turbopack", Label: "Next.js Turbopack", TechStack: "nextjs", IsChecked: true},
			{URL: "https://agentskill.sh/@davila7/nextjs-app-router-patterns", Label: "Next.js App Router Patterns", TechStack: "nextjs", IsChecked: true},
			{URL: "https://agentskill.sh/@davila7/tailwind-design-system", Label: "Tailwind Design System Tokens", TechStack: "nextjs", IsChecked: true},
			{URL: "https://agentskill.sh/@neversight/javascript-testing", Label: "JS/TS Testing (Jest/Vitest)", TechStack: "nextjs", IsChecked: true},
			{URL: "https://agentskill.sh/@sametcelikbicak/coverage-guard", Label: "Coverage Guard (Vitest/Jest)", TechStack: "nextjs", IsChecked: true},
			{URL: "https://agentskill.sh/@affaan-m/error-handling", Label: "Error Handling (Cross-Platform)", TechStack: "nextjs", IsChecked: true},
			{URL: "https://agentskill.sh/@kunanonj/react-flow-node-ts", Label: "React Flow Node TypeScript", TechStack: "nextjs", IsChecked: false},
			{URL: "https://agentskill.sh/@kunanonj/react-flow-architect", Label: "React Flow Application Architect", TechStack: "nextjs", IsChecked: false},
			{URL: "https://agentskill.sh/@mikecheng1208/components", Label: "Accessible React Components", TechStack: "nextjs", IsChecked: false},
			{URL: "https://agentskill.sh/@kunanonj/reference-builder", Label: "Reference Builder", TechStack: "nextjs", IsChecked: false},
			{URL: "https://agentskill.sh/@davila7/pb-sdk", Label: "PocketBase JS/TS SDK", TechStack: "nextjs", IsChecked: false},
			{URL: "https://agentskill.sh/@affaan-m/seo", Label: "SEO Visibility Best Practices", TechStack: "nextjs", IsChecked: false},
			{URL: "https://agentskill.sh/@sickn33/seo-aeo-meta-description-generator", Label: "SEO AEO Meta-Description Gen", TechStack: "nextjs", IsChecked: false},
			{URL: "https://agentskill.sh/@davila7/seo-audit", Label: "SEO Complete Auditor", TechStack: "nextjs", IsChecked: false},
			{URL: "https://agentskill.sh/@github/markdown-to-html", Label: "Markdown to HTML Parser", TechStack: "nextjs", IsChecked: false},
			{URL: "https://agentskill.sh/@sickn33/drizzle-orm-expert", Label: "Drizzle ORM Expert Schema & Query", TechStack: "nextjs", IsChecked: false},
			{URL: "https://agentskill.sh/@pedronauck/drizzle-safe-migrations", Label: "Drizzle Safe Database Migrations", TechStack: "nextjs", IsChecked: false},

			// Node.js
			{URL: "https://agentskill.sh/@affaan-m/nodejs-keccak256", Label: "Node.js Keccak-256 Hashing", TechStack: "node", IsChecked: true},
			{URL: "https://agentskill.sh/@sametcelikbicak/coverage-guard", Label: "Coverage Guard (Vitest/Jest)", TechStack: "node", IsChecked: true},
			{URL: "https://agentskill.sh/@neversight/javascript-testing", Label: "JS/TS Testing (Jest/Vitest)", TechStack: "node", IsChecked: true},
			{URL: "https://agentskill.sh/@affaan-m/error-handling", Label: "Error Handling (Cross-Platform)", TechStack: "node", IsChecked: true},
			{URL: "https://agentskill.sh/@modbender/audit-fix", Label: "Package Dependency Auditor", TechStack: "node", IsChecked: false},
			{URL: "https://agentskill.sh/@davila7/pb-sdk", Label: "PocketBase JS/TS SDK", TechStack: "node", IsChecked: false},
			{URL: "https://agentskill.sh/@sickn33/drizzle-orm-expert", Label: "Drizzle ORM Expert Schema & Query", TechStack: "node", IsChecked: false},
			{URL: "https://agentskill.sh/@pedronauck/drizzle-safe-migrations", Label: "Drizzle Safe Database Migrations", TechStack: "node", IsChecked: false},

			// Go
			{URL: "https://agentskill.sh/@affaan-m/error-handling", Label: "Error Handling (Cross-Platform)", TechStack: "go", IsChecked: true},
			{URL: "https://agentskill.sh/@kunanonj/reference-builder", Label: "Reference Builder", TechStack: "go", IsChecked: false},
			{URL: "https://agentskill.sh/@github/sql-optimization", Label: "SQL Query Optimizer", TechStack: "go", IsChecked: false},

			// PowerShell
			{URL: "https://agentskill.sh/@majiayu000/coding-conventions", Label: "Coding Conventions (Py/PS)", TechStack: "powershell", IsChecked: true},
			{URL: "https://agentskill.sh/@diegosouzapw/powershell-windows-v2", Label: "PowerShell Windows Patterns v2", TechStack: "powershell", IsChecked: true},

			// Python
			{URL: "https://agentskill.sh/@majiayu000/coding-conventions", Label: "Coding Conventions (Py/PS)", TechStack: "python", IsChecked: true},
			{URL: "https://agentskill.sh/@kunanonj/python-packaging", Label: "Python Packaging & Distribution", TechStack: "python", IsChecked: true},
			{URL: "https://agentskill.sh/@affaan-m/error-handling", Label: "Error Handling (Cross-Platform)", TechStack: "python", IsChecked: true},
			{URL: "https://agentskill.sh/@github/sql-optimization", Label: "SQL Query Optimizer", TechStack: "python", IsChecked: false},
			{URL: "https://agentskill.sh/@elizaos/pdf-editing", Label: "PDF Editing (via PyMuPDF)", TechStack: "python", IsChecked: false},

			// HTML
			{URL: "https://agentskill.sh/@affaan-m/seo", Label: "SEO Visibility Best Practices", TechStack: "html", IsChecked: false},
			{URL: "https://agentskill.sh/@github/markdown-to-html", Label: "Markdown to HTML Parser", TechStack: "html", IsChecked: false},

			// Android
			{URL: "https://agentskill.sh/@alphaonedev/android", Label: "Core Android Workflows", TechStack: "android", IsChecked: true},
			{URL: "https://agentskill.sh/@dicklesworthstone/mobile-android-design", Label: "Mobile Android Design", TechStack: "android", IsChecked: true},

			// General
			{URL: "https://agentskill.sh/@obra/writing-plans", Label: "Writing Executable Plans (plan.md)", TechStack: "general", IsChecked: true},
			{URL: "https://agentskill.sh/@obra/systematic-debugging", Label: "Systematic Bug Debugging", TechStack: "general", IsChecked: true},
			{URL: "https://agentskill.sh/@wshobson/code-review-excellence", Label: "Code Review Excellence", TechStack: "general", IsChecked: true},
			{URL: "https://agentskill.sh/@elizaos/coding-agent-kh0", Label: "Coding Agent Assistant (Eliza)", TechStack: "general", IsChecked: true},
			{URL: "https://agentskill.sh/@davila7/database-design", Label: "Database Design & Normalization", TechStack: "general", IsChecked: true},
			{URL: "https://agentskill.sh/@sickn33/filesystem-context", Label: "Filesystem Context Optimization", TechStack: "general", IsChecked: false},
			{URL: "https://agentskill.sh/@github/refactor", Label: "Safe Code Refactoring Engine", TechStack: "general", IsChecked: false},
			{URL: "https://agentskill.sh/@wshobson/parallel-debugging", Label: "Parallel Bug Diagnostics", TechStack: "general", IsChecked: false},
			{URL: "https://agentskill.sh/@github/create-readme", Label: "Automated README Builder", TechStack: "general", IsChecked: false},
			{URL: "https://agentskill.sh/@affaan-m/strategic-compact", Label: "Strategic Planning Compact", TechStack: "general", IsChecked: false},
			{URL: "https://agentskill.sh/@github/sql-optimization", Label: "SQL Query Optimizer", TechStack: "general", IsChecked: false},
			{URL: "https://agentskill.sh/@davila7/bash-linux", Label: "Bash & Linux Commands Guide", TechStack: "general", IsChecked: false},
			{URL: "https://agentskill.sh/@modbender/jq", Label: "JSON JQ Command Filtering", TechStack: "general", IsChecked: false},
			{URL: "https://agentskill.sh/@davila7/changelog-generator", Label: "Automatic Release Changelog Gen", TechStack: "general", IsChecked: false},
			{URL: "https://agentskill.sh/@anthropics/performance-report", Label: "Diagnostic Performance Report", TechStack: "general", IsChecked: false},
			{URL: "https://agentskill.sh/@sickn33/llm-prompt-optimizer", Label: "LLM Prompt Rules Optimizer", TechStack: "general", IsChecked: false},
			{URL: "https://agentskill.sh/@modbender/github-pat", Label: "GitHub PAT Access Manager", TechStack: "general", IsChecked: false},
			{URL: "https://agentskill.sh/@elizaos/yaml-config", Label: "YAML Configuration File Guide", TechStack: "general", IsChecked: false},
			{URL: "https://agentskill.sh/@elizaos/weather", Label: "Weather Utility (wttr.in)", TechStack: "general", IsChecked: false},
		}

		for _, sk := range skills {
			query := "INSERT INTO skill_catalog (url, label, tech_stack, is_checked, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP);"
			_, err = s.db.ExecContext(ctx, query, sk.URL, sk.Label, sk.TechStack, sk.IsChecked)
			if err != nil {
				return fmt.Errorf("failed to prepopulate skill %s: %w", sk.URL, err)
			}
		}
	}

	return nil
}

func GetDefaultPlanTemplate(tech string) string {
	return `# Project Plan: [PROJECT_NAME]

## 🎯 1. Specification & Scope
An AI-native project managed by Neuron. Under active architectural refinement.

## 🗺️ 2. Architectural Milestones
- [ ] Phase 1: Establish foundational structures and packages.
- [ ] Phase 2: Implement core technical handlers, error-handling routines, and unit tests.
- [ ] Phase 3: Optimize performance benchmarks and prepare for production deployment.

## 📝 3. Active Todo Backlog
- [ ] Write initial specifications inside plan.md.
- [ ] Generate project tasks.
- [ ] Click 'Import Plan Checklist to Tasks' to automatically load them into Neuron HUD!
`
}

func GetDefaultAgentsTemplate(tech string) string {
	switch strings.ToLower(tech) {
	case "go":
		return `# AGENTS.md - [PROJECT_NAME]

## Tech Stack
- Framework: Standard Library Go
- Language: Go (Golang)
- Go Version: 1.22+

## Key Commands
- Build: ~make build~
- Run: ~make run~
- Run tests: ~make test~

## Code Style
- Use standard, idiomatic Go formatting (always run ~go fmt~).
- Handle errors explicitly and early (~if err != nil { return ... }~).
- Keep conditional block/loop nesting depth to at most 2 levels; refactor complex loops.

## Boundaries
### ✅ Always
- Run linter/tests before considering a task complete.
- Handle all return errors explicitly.

### ⚠️ Ask First
- Adding third-party package dependencies.
- Creating packages outside standard Go project conventions.

### 🚫 Never
- Commit secrets, credentials, or ~.env~ files.
- Bypass error returns using blank identifiers (~_~).
`
	case "node":
		return `# AGENTS.md - [PROJECT_NAME]

## Tech Stack
- Runtime: Node.js
- Package Manager: npm (always use npm, never yarn/pnpm unless specified)
- Language: JavaScript (ES6+)

## Key Commands
- Start app: ~npm start~
- Run tests: ~npm test~

## Code Style
- Named exports preferred over default exports.
- Use async/await for asynchronous actions instead of raw promise chains.

## Boundaries
### ✅ Always
- Run ~npm test~ before declaring a task complete.
- Verify node dependencies are stored cleanly.

### ⚠️ Ask First
- Installing new npm package dependencies.
- Modifying major entry-point configurations.

### 🚫 Never
- Commit secrets, ~.env~ files, or private credentials.
- Force push to main branches.
`
	case "html":
		return `# AGENTS.md - [PROJECT_NAME]

## Tech Stack
- Runtime: Web Browser (Vanilla HTML5 / CSS3 / ES6 JS)
- Local Server: Python HTTP static module (python3 -m http.server 8000)

## Key Commands
- Spin up dev server: ~make run~

## Code Style
- Write standard semantic, responsive HTML5 markup tags.
- Prefer raw clean vanilla JavaScript and modular ES6 imports over large framework scripts.

## Boundaries
### ✅ Always
- Verify styling layout on responsive viewports.
- Check relative file paths for images/scripts.

### ⚠️ Ask First
- Copying bulky styling CDN libraries like Bootstrap or Tailwind.

### 🚫 Never
- Hardcode full credentials, endpoints, or keys inside static files.
- Put inline styles directly into HTML structures.
`
	case "powershell":
		return `# AGENTS.md - [PROJECT_NAME]

## Tech Stack
- Shell/Runtime: PowerShell Core (v7.x) / Windows PowerShell 5.1
- Language: PowerShell Scripting (.ps1)

## Key Commands
- Execute script: ~.\script.ps1~

## Code Style
- Adhere to the standard Verb-Noun convention for all declared commands (e.g. ~Get-ServiceState~).
- Set typed parameter constraints explicitly and enforce clean error handling (~try/catch~ blocks).

## Boundaries
### ✅ Always
- Document parameters and usage inside the script headers.
- Gracefully handle default errors.

### ⚠️ Ask First
- Modifying structural OS registers or registry items.

### 🚫 Never
- Commit personal system credentials inside PowerShell execution blocks.
- Use script aliases (like ~cat~ or ~ls~) within shared cmdlets.
`
	case "nextjs":
		return `# AGENTS.md - [PROJECT_NAME]

## Tech Stack
- Framework: Next.js (App Router)
- Language: TypeScript / React
- CSS: Tailwind CSS

## Key Commands
- Launch development server: ~npm run dev~
- Build app: ~npm run build~

## Code Style
- Implement React Server Components (RSC) by default; only use ~"use client"~ for interactive client states.
- Follow Named Exports conventions and clean TypeScript typing schemas.

## Boundaries
### ✅ Always
- Run standard Next.js build validation (~npm run build~) before declaring task success.
- Isolate client hooks under components directory.

### ⚠️ Ask First
- Importing massive external state-management or UI animation packages.

### 🚫 Never
- Store local keys or private keys in Git records.
- Render server environment variables directly in client components.
`
	case "python":
		return `# AGENTS.md - [PROJECT_NAME]

## Tech Stack
- Runtime: Python 3.10+
- Package Manager: pip (requirements.txt) / venv

## Key Commands
- Run script: ~python3 main.py~
- Run tests: ~python3 -m unittest discover~

## Code Style
- Adhere strictly to PEP 8 styling guidelines.
- Use explicit type hinting (~def greet(name: str) -> None:~) where possible.
- Wrap OS-level file or network access blocks inside standard context managers (~with open(...) as f:~).

## Boundaries
### ✅ Always
- Isolate package dependencies inside local virtual environments (~.venv~).
- Run formatter (~black~ or ~ruff~) before submitting files.

### ⚠️ Ask First
- Adding third-party package dependencies to requirements.txt.

### 🚫 Never
- Commit virtual environment folders (~.venv~) or active user keys.
- Leave trailing debug prints in production code paths.
`
	case "android":
		return `# AGENTS.md - [PROJECT_NAME]

## Tech Stack
- Runtime: Android Runtime (ART)
- Language: Kotlin
- Build System: Gradle (Kotlin DSL / Groovy)

## Key Commands
- Compile project: ~./gradlew assembleDebug~
- Run local unit tests: ~./gradlew test~
- Install Debug APK: ~./gradlew installDebug~

## Code Style
- Write standard, clean Kotlin structures following Google Kotlin Style Guide.
- Isolate asynchronous execution paths (use Coroutines or RxJava) from the Main UI Thread.
- Declare variables with explicit read-only constraints (~val~) where possible.

## Boundaries
### ✅ Always
- Decouple credentials and API secrets; read from ~local.properties~ only.
- Run lint validation before committing changes.

### ⚠️ Ask First
- Adding third-party package dependencies to build.gradle.

### 🚫 Never
- Commit compiled outputs (~build/~), SDK caches (~.gradle/~), or built APK assets to Git.
- Run synchronous networking requests directly on Main thread pathways.
`
	}
	return ""
}

// GetTemplate retrieves a template record from DuckDB.
func (s *Storage) GetTemplate(ctx context.Context, techStack string) (*Template, error) {
	query := "SELECT tech_stack, agents_md, plan_md, updated_at FROM templates WHERE tech_stack = ?;"
	var t Template
	err := s.db.QueryRowContext(ctx, query, strings.ToLower(techStack)).Scan(&t.TechStack, &t.AgentsMD, &t.PlanMD, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// UpdateTemplate updates a template record in DuckDB.
func (s *Storage) UpdateTemplate(ctx context.Context, techStack, agentsMD, planMD string) error {
	query := "UPDATE templates SET agents_md = ?, plan_md = ?, updated_at = CURRENT_TIMESTAMP WHERE tech_stack = ?;"
	_, err := s.db.ExecContext(ctx, query, agentsMD, planMD, strings.ToLower(techStack))
	return err
}

// ListTemplates lists all system templates.
func (s *Storage) ListTemplates(ctx context.Context) ([]*Template, error) {
	query := "SELECT tech_stack, agents_md, plan_md, updated_at FROM templates ORDER BY tech_stack ASC;"
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*Template
	for rows.Next() {
		var t Template
		if err := rows.Scan(&t.TechStack, &t.AgentsMD, &t.PlanMD, &t.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &t)
	}
	return list, nil
}

// ListCatalogSkills lists all skills in the recommended catalog.
func (s *Storage) ListCatalogSkills(ctx context.Context) ([]*CatalogSkill, error) {
	query := "SELECT url, label, tech_stack, is_checked, updated_at FROM skill_catalog ORDER BY tech_stack ASC, label ASC;"
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*CatalogSkill
	for rows.Next() {
		var sk CatalogSkill
		if err := rows.Scan(&sk.URL, &sk.Label, &sk.TechStack, &sk.IsChecked, &sk.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &sk)
	}
	return list, nil
}

// AddCatalogSkill registers a new skill inside the recommended catalog.
func (s *Storage) AddCatalogSkill(ctx context.Context, sk *CatalogSkill) error {
	query := "INSERT INTO skill_catalog (url, label, tech_stack, is_checked, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP);"
	_, err := s.db.ExecContext(ctx, query, sk.URL, sk.Label, sk.TechStack, sk.IsChecked)
	return err
}

// UpdateCatalogSkill updates an existing skill inside the recommended catalog.
func (s *Storage) UpdateCatalogSkill(ctx context.Context, sk *CatalogSkill) error {
	query := "UPDATE skill_catalog SET label = ?, tech_stack = ?, is_checked = ?, updated_at = CURRENT_TIMESTAMP WHERE url = ?;"
	_, err := s.db.ExecContext(ctx, query, sk.Label, sk.TechStack, sk.IsChecked, sk.URL)
	return err
}

// DeleteCatalogSkill purges a skill from the recommended catalog.
func (s *Storage) DeleteCatalogSkill(ctx context.Context, url string) error {
	query := "DELETE FROM skill_catalog WHERE url = ?;"
	_, err := s.db.ExecContext(ctx, query, url)
	return err
}

// GetSetting retrieves a configuration value from the system_settings table.
func (s *Storage) GetSetting(ctx context.Context, key string) (string, error) {
	var val string
	err := s.db.QueryRowContext(ctx, "SELECT value FROM system_settings WHERE key = ?;", key).Scan(&val)
	if err != nil {
		return "", err
	}
	return val, nil
}

// SaveSetting upserts a key-value setting configuration.
func (s *Storage) SaveSetting(ctx context.Context, key, val string) error {
	query := `
		INSERT INTO system_settings (key, value, updated_at)
		VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;`
	_, err := s.db.ExecContext(ctx, query, key, val)
	return err
}

// DeleteSetting removes a setting by key.
func (s *Storage) DeleteSetting(ctx context.Context, key string) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM system_settings WHERE key = ?;", key)
	return err
}
