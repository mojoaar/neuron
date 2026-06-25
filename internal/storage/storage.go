package storage

import (
	"context"
	"database/sql"
	_ "embed"
	"fmt"
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
