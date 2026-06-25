package storage

import (
	"context"
	"path/filepath"
	"testing"
)

func TestStorage(t *testing.T) {
	ctx := context.Background()
	dbPath := filepath.Join(t.TempDir(), "neuron_test.db")

	store, err := New(dbPath)
	if err != nil {
		t.Fatalf("failed to create storage: %v", err)
	}
	defer store.Close()

	// 1. Test Project insertion and retrieval
	p := &Project{
		ID:        "test-proj",
		Name:      "Test Project",
		Path:      "/path/to/test-proj",
		TechStack: "go",
	}

	if err := store.AddProject(ctx, p); err != nil {
		t.Fatalf("failed to add project: %v", err)
	}

	retrieved, err := store.GetProject(ctx, "test-proj")
	if err != nil {
		t.Fatalf("failed to get project: %v", err)
	}

	if retrieved.Name != p.Name || retrieved.TechStack != p.TechStack || retrieved.Path != p.Path {
		t.Errorf("retrieved project does not match: expected %+v, got %+v", p, retrieved)
	}

	// 2. Test Task insertion, listing and update
	task := &Task{
		ID:        "task-1",
		ProjectID: "test-proj",
		Content:   "Implement database layer",
		Status:    "pending",
		Priority:  "high",
	}

	if err := store.AddTask(ctx, task); err != nil {
		t.Fatalf("failed to add task: %v", err)
	}

	tasks, err := store.ListTasksByProject(ctx, "test-proj")
	if err != nil {
		t.Fatalf("failed to list tasks: %v", err)
	}

	if len(tasks) != 1 {
		t.Errorf("expected 1 task, got %d", len(tasks))
	} else {
		retTask := tasks[0]
		if retTask.Content != task.Content || retTask.Status != task.Status {
			t.Errorf("retrieved task does not match: expected %+v, got %+v", task, retTask)
		}
	}

	// Update task status
	task.Status = "completed"
	if err := store.UpdateTask(ctx, task); err != nil {
		t.Fatalf("failed to update task: %v", err)
	}

	tasks, err = store.ListTasksByProject(ctx, "test-proj")
	if err != nil {
		t.Fatalf("failed to list tasks: %v", err)
	}

	if tasks[0].Status != "completed" {
		t.Errorf("expected task status 'completed', got %s", tasks[0].Status)
	}

	// 3. Test Skill insertion and listing
	skill := &Skill{
		ID:             "skill-1",
		ProjectID:      "test-proj",
		Name:           "generate-models",
		Description:    "Generate database models from schema",
		TriggerPattern: "^generate$",
		ExecutionType:  "script",
		ExecutionPath:  "./scripts/gen-models.sh",
	}

	if err := store.AddSkill(ctx, skill); err != nil {
		t.Fatalf("failed to add skill: %v", err)
	}

	skills, err := store.ListSkillsByProject(ctx, "test-proj")
	if err != nil {
		t.Fatalf("failed to list skills: %v", err)
	}

	if len(skills) != 1 {
		t.Errorf("expected 1 skill, got %d", len(skills))
	} else {
		retSkill := skills[0]
		if retSkill.Name != skill.Name || retSkill.ExecutionPath != skill.ExecutionPath {
			t.Errorf("retrieved skill does not match: expected %+v, got %+v", skill, retSkill)
		}
	}
}
