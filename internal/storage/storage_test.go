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

func TestGetTask(t *testing.T) {
	ctx := context.Background()
	store, err := New(filepath.Join(t.TempDir(), "neuron_gettask_test.db"))
	if err != nil {
		t.Fatalf("failed to create storage: %v", err)
	}
	defer store.Close()

	if err := store.AddProject(ctx, &Project{ID: "proj", Name: "P", Path: "/p", TechStack: "go"}); err != nil {
		t.Fatalf("failed to add project: %v", err)
	}

	task := &Task{ID: "t1", ProjectID: "proj", Content: "test", Status: "pending", Priority: "medium"}
	if err := store.AddTask(ctx, task); err != nil {
		t.Fatalf("failed to add task: %v", err)
	}

	got, err := store.GetTask(ctx, "t1")
	if err != nil {
		t.Fatalf("GetTask failed: %v", err)
	}
	if got.Content != "test" || got.Status != "pending" {
		t.Errorf("retrieved task mismatch: %+v", got)
	}

	_, err = store.GetTask(ctx, "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent task, got nil")
	}
}

func TestDeleteSkill(t *testing.T) {
	ctx := context.Background()
	store, err := New(filepath.Join(t.TempDir(), "neuron_delsk_test.db"))
	if err != nil {
		t.Fatalf("failed to create storage: %v", err)
	}
	defer store.Close()

	if err := store.AddProject(ctx, &Project{ID: "proj", Name: "P", Path: "/p", TechStack: "go"}); err != nil {
		t.Fatalf("AddProject failed: %v", err)
	}
	if err := store.AddSkill(ctx, &Skill{ID: "s1", ProjectID: "proj", Name: "skill1", ExecutionType: "script", ExecutionPath: "./run.sh"}); err != nil {
		t.Fatalf("AddSkill failed: %v", err)
	}

	if err := store.DeleteSkill(ctx, "s1"); err != nil {
		t.Fatalf("DeleteSkill failed: %v", err)
	}

	skills, _ := store.ListSkillsByProject(ctx, "proj")
	if len(skills) != 0 {
		t.Errorf("expected 0 skills after delete, got %d", len(skills))
	}
}

func TestUpdateSkill(t *testing.T) {
	ctx := context.Background()
	store, err := New(filepath.Join(t.TempDir(), "neuron_updsk_test.db"))
	if err != nil {
		t.Fatalf("failed to create storage: %v", err)
	}
	defer store.Close()

	if err := store.AddProject(ctx, &Project{ID: "proj", Name: "P", Path: "/p", TechStack: "go"}); err != nil {
		t.Fatalf("AddProject failed: %v", err)
	}
	if err := store.AddSkill(ctx, &Skill{ID: "s1", ProjectID: "proj", Name: "old", ExecutionType: "script", ExecutionPath: "./old.sh"}); err != nil {
		t.Fatalf("AddSkill failed: %v", err)
	}

	skill := &Skill{ID: "s1", Name: "new", ExecutionPath: "./new.sh"}
	if err := store.UpdateSkill(ctx, skill); err != nil {
		t.Fatalf("UpdateSkill failed: %v", err)
	}

	skills, _ := store.ListSkillsByProject(ctx, "proj")
	if len(skills) != 1 || skills[0].Name != "new" || skills[0].ExecutionPath != "./new.sh" {
		t.Errorf("skill was not updated correctly: %+v", skills)
	}
}

func TestDeleteProject(t *testing.T) {
	ctx := context.Background()
	store, err := New(filepath.Join(t.TempDir(), "neuron_delp_test.db"))
	if err != nil {
		t.Fatalf("failed to create storage: %v", err)
	}
	defer store.Close()

	if err := store.AddProject(ctx, &Project{ID: "proj", Name: "P", Path: "/p", TechStack: "go"}); err != nil {
		t.Fatalf("AddProject failed: %v", err)
	}
	if err := store.AddTask(ctx, &Task{ID: "t1", ProjectID: "proj", Content: "task1", Status: "pending", Priority: "low"}); err != nil {
		t.Fatalf("AddTask failed: %v", err)
	}
	if err := store.AddSkill(ctx, &Skill{ID: "s1", ProjectID: "proj", Name: "skill1", ExecutionType: "script", ExecutionPath: "./run.sh"}); err != nil {
		t.Fatalf("AddSkill failed: %v", err)
	}

	if err := store.DeleteProject(ctx, "proj"); err != nil {
		t.Fatalf("DeleteProject failed: %v", err)
	}

	tasks, _ := store.ListTasksByProject(ctx, "proj")
	if len(tasks) != 0 {
		t.Errorf("expected 0 tasks after cascade delete, got %d", len(tasks))
	}
	skills, _ := store.ListSkillsByProject(ctx, "proj")
	if len(skills) != 0 {
		t.Errorf("expected 0 skills after cascade delete, got %d", len(skills))
	}
	_, err = store.GetProject(ctx, "proj")
	if err == nil {
		t.Error("expected error for deleted project, got nil")
	}
}

func TestListProjects(t *testing.T) {
	ctx := context.Background()
	store, err := New(filepath.Join(t.TempDir(), "neuron_listp_test.db"))
	if err != nil {
		t.Fatalf("failed to create storage: %v", err)
	}
	defer store.Close()

	if err := store.AddProject(ctx, &Project{ID: "a", Name: "A", Path: "/a", TechStack: "go"}); err != nil {
		t.Fatalf("AddProject failed: %v", err)
	}
	if err := store.AddProject(ctx, &Project{ID: "b", Name: "B", Path: "/b", TechStack: "node"}); err != nil {
		t.Fatalf("AddProject failed: %v", err)
	}

	list, err := store.ListProjects(ctx)
	if err != nil {
		t.Fatalf("ListProjects failed: %v", err)
	}
	if len(list) != 2 {
		t.Errorf("expected 2 projects, got %d", len(list))
	}
}

func TestSettingsCRUD(t *testing.T) {
	ctx := context.Background()
	store, err := New(filepath.Join(t.TempDir(), "neuron_sett_test.db"))
	if err != nil {
		t.Fatalf("failed to create storage: %v", err)
	}
	defer store.Close()

	if err := store.SaveSetting(ctx, "theme", "dark"); err != nil {
		t.Fatalf("SaveSetting failed: %v", err)
	}

	val, err := store.GetSetting(ctx, "theme")
	if err != nil {
		t.Fatalf("GetSetting failed: %v", err)
	}
	if val != "dark" {
		t.Errorf("expected 'dark', got '%s'", val)
	}

	if err := store.SaveSetting(ctx, "theme", "light"); err != nil {
		t.Fatalf("SaveSetting update failed: %v", err)
	}
	val, _ = store.GetSetting(ctx, "theme")
	if val != "light" {
		t.Errorf("expected 'light' after update, got '%s'", val)
	}

	if err := store.DeleteSetting(ctx, "theme"); err != nil {
		t.Fatalf("DeleteSetting failed: %v", err)
	}
	_, err = store.GetSetting(ctx, "theme")
	if err == nil {
		t.Error("expected error after delete, got nil")
	}
}

func TestClusterCRUD(t *testing.T) {
	ctx := context.Background()
	store, err := New(filepath.Join(t.TempDir(), "neuron_clust_test.db"))
	if err != nil {
		t.Fatalf("failed to create storage: %v", err)
	}
	defer store.Close()

	if err := store.AddCluster(ctx, &Cluster{ID: "c1", Name: "Cluster One"}); err != nil {
		t.Fatalf("AddCluster failed: %v", err)
	}

	if err := store.AddCluster(ctx, &Cluster{ID: "c2", Name: "Cluster Two"}); err != nil {
		t.Fatalf("AddCluster failed: %v", err)
	}

	clusters, err := store.ListClusters(ctx)
	if err != nil {
		t.Fatalf("ListClusters failed: %v", err)
	}
	if len(clusters) != 2 {
		t.Errorf("expected 2 clusters, got %d", len(clusters))
	}

	if err := store.DeleteCluster(ctx, "c1"); err != nil {
		t.Fatalf("DeleteCluster failed: %v", err)
	}
	clusters, _ = store.ListClusters(ctx)
	if len(clusters) != 1 {
		t.Errorf("expected 1 cluster after delete, got %d", len(clusters))
	}
}

func TestListCatalogSkills(t *testing.T) {
	ctx := context.Background()
	store, err := New(filepath.Join(t.TempDir(), "neuron_cat_test.db"))
	if err != nil {
		t.Fatalf("failed to create storage: %v", err)
	}
	defer store.Close()

	// After New(), catalog skills should be pre-populated
	skills, err := store.ListCatalogSkills(ctx)
	if err != nil {
		t.Fatalf("ListCatalogSkills failed: %v", err)
	}
	if len(skills) == 0 {
		t.Error("expected at least 1 catalog skill after prepopulation, got 0")
	}
}
