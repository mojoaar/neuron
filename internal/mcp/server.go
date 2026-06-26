package mcp

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"neuron/internal/export"
	"neuron/internal/scaffold"
	"neuron/internal/storage"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// StartServer starts the MCP server over standard input/output (stdio).
func StartServer(store *storage.Storage) error {
	s := server.NewMCPServer("neuron", "1.5.0", server.WithDescription("Neuron AI-native Lifecycle Manager Server"))

	// 1. Tool: list_projects
	listProjectsTool := mcp.NewTool("list_projects",
		mcp.WithDescription("List all registered projects managed by Neuron"),
	)
	s.AddTool(listProjectsTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projects, err := store.ListProjects(ctx)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Error listing projects: %v", err)), nil
		}

		out, err := json.MarshalIndent(projects, "", "  ")
		if err != nil {
			return nil, err
		}

		return mcp.NewToolResultText(string(out)), nil
	})

	// 2. Tool: list_tasks
	listTasksTool := mcp.NewTool("list_tasks",
		mcp.WithDescription("List all tasks/TODOs for a specific project"),
		mcp.WithString("project_id", mcp.Description("The unique identifier of the project"), mcp.Required()),
	)
	s.AddTool(listTasksTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err := request.RequireString("project_id")
		if err != nil {
			return mcp.NewToolResultError("Missing required parameter: project_id"), nil
		}

		tasks, err := store.ListTasksByProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Error listing tasks: %v", err)), nil
		}

		out, err := json.MarshalIndent(tasks, "", "  ")
		if err != nil {
			return nil, err
		}

		return mcp.NewToolResultText(string(out)), nil
	})

	// 3. Tool: add_task
	addTaskTool := mcp.NewTool("add_task",
		mcp.WithDescription("Add a new task/TODO item to a project"),
		mcp.WithString("project_id", mcp.Description("The unique ID of the project"), mcp.Required()),
		mcp.WithString("task_id", mcp.Description("A unique ID for the new task"), mcp.Required()),
		mcp.WithString("content", mcp.Description("Brief description of the task content"), mcp.Required()),
		mcp.WithString("priority", mcp.Description("Priority of the task (high, medium, low)"), mcp.Required()),
	)
	s.AddTool(addTaskTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err1 := request.RequireString("project_id")
		taskID, err2 := request.RequireString("task_id")
		content, err3 := request.RequireString("content")
		priority, err4 := request.RequireString("priority")

		if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
			return mcp.NewToolResultError("Missing required parameters"), nil
		}

		task := &storage.Task{
			ID:        taskID,
			ProjectID: projectID,
			Content:   content,
			Status:    "pending",
			Priority:  priority,
		}

		if err := store.AddTask(ctx, task); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Error adding task: %v", err)), nil
		}

		return mcp.NewToolResultText(fmt.Sprintf("Successfully added task '%s' (%s) to project '%s'.", content, taskID, projectID)), nil
	})

	// 4. Tool: update_task_status
	updateTaskStatusTool := mcp.NewTool("update_task_status",
		mcp.WithDescription("Update the status of an existing task"),
		mcp.WithString("project_id", mcp.Description("The unique ID of the project"), mcp.Required()),
		mcp.WithString("task_id", mcp.Description("The ID of the task to update"), mcp.Required()),
		mcp.WithString("status", mcp.Description("The new status (pending, in_progress, completed, cancelled)"), mcp.Required()),
	)
	s.AddTool(updateTaskStatusTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err1 := request.RequireString("project_id")
		taskID, err2 := request.RequireString("task_id")
		status, err3 := request.RequireString("status")

		if err1 != nil || err2 != nil || err3 != nil {
			return mcp.NewToolResultError("Missing required parameters"), nil
		}

		targetTask, err := store.GetTask(ctx, taskID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Task '%s' not found: %v", taskID, err)), nil
		}

		if targetTask.ProjectID != projectID {
			return mcp.NewToolResultError("Task does not belong to this project"), nil
		}

		targetTask.Status = status
		if err := store.UpdateTask(ctx, targetTask); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Error updating task status: %v", err)), nil
		}

		return mcp.NewToolResultText(fmt.Sprintf("Successfully updated task '%s' status to '%s'.", taskID, status)), nil
	})

	// 5. Tool: list_skills
	listSkillsTool := mcp.NewTool("list_skills",
		mcp.WithDescription("List all conceptual skills registered for a specific project"),
		mcp.WithString("project_id", mcp.Description("The unique identifier of the project"), mcp.Required()),
	)
	s.AddTool(listSkillsTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err := request.RequireString("project_id")
		if err != nil {
			return mcp.NewToolResultError("Missing required parameter: project_id"), nil
		}

		skills, err := store.ListSkillsByProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Error listing skills: %v", err)), nil
		}

		out, err := json.MarshalIndent(skills, "", "  ")
		if err != nil {
			return nil, err
		}

		return mcp.NewToolResultText(string(out)), nil
	})

	// 6. Tool: get_plan
	getPlanTool := mcp.NewTool("get_plan",
		mcp.WithDescription("Read the plan.md content for a project"),
		mcp.WithString("project_id", mcp.Description("The unique identifier of the project"), mcp.Required()),
	)
	s.AddTool(getPlanTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err := request.RequireString("project_id")
		if err != nil {
			return mcp.NewToolResultError("Missing required parameter: project_id"), nil
		}

		proj, err := store.GetProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Project not found: %v", err)), nil
		}

		planPath := filepath.Join(proj.Path, "plan.md")
		content, err := os.ReadFile(planPath)
		if err != nil {
			return mcp.NewToolResultText("No plan.md found or unable to read the file."), nil
		}

		return mcp.NewToolResultText(string(content)), nil
	})

	// 7. Tool: get_rules
	getRulesTool := mcp.NewTool("get_rules",
		mcp.WithDescription("Read the AGENTS.md rules context for a project"),
		mcp.WithString("project_id", mcp.Description("The unique identifier of the project"), mcp.Required()),
	)
	s.AddTool(getRulesTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err := request.RequireString("project_id")
		if err != nil {
			return mcp.NewToolResultError("Missing required parameter: project_id"), nil
		}

		proj, err := store.GetProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Project not found: %v", err)), nil
		}

		rulesPath := filepath.Join(proj.Path, "AGENTS.md")
		content, err := os.ReadFile(rulesPath)
		if err != nil {
			return mcp.NewToolResultText("No AGENTS.md found or unable to read the file."), nil
		}

		return mcp.NewToolResultText(string(content)), nil
	})

	// 8. Tool: list_clusters
	listClustersTool := mcp.NewTool("list_clusters",
		mcp.WithDescription("List all project clusters managed by Neuron"),
	)
	s.AddTool(listClustersTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		clusters, err := store.ListClusters(ctx)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Error listing clusters: %v", err)), nil
		}

		out, err := json.MarshalIndent(clusters, "", "  ")
		if err != nil {
			return nil, err
		}

		return mcp.NewToolResultText(string(out)), nil
	})

	// 9. Tool: list_activity
	listActivityTool := mcp.NewTool("list_activity",
		mcp.WithDescription("List recent activity log entries"),
		mcp.WithString("limit", mcp.Description("Maximum number of entries to return (default 50)")),
	)
	s.AddTool(listActivityTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		limit := 50
		if limitStr, err := request.RequireString("limit"); err == nil {
			if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 500 {
				limit = parsed
			}
		}

		entries, err := store.ListActivity(ctx, limit)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Error listing activity: %v", err)), nil
		}

		out, err := json.MarshalIndent(entries, "", "  ")
		if err != nil {
			return nil, err
		}

		return mcp.NewToolResultText(string(out)), nil
	})

	// 10. Tool: update_plan
	updatePlanTool := mcp.NewTool("update_plan",
		mcp.WithDescription("Update the plan.md content for a project"),
		mcp.WithString("project_id", mcp.Description("The unique identifier of the project"), mcp.Required()),
		mcp.WithString("content", mcp.Description("The full markdown content to write to plan.md"), mcp.Required()),
	)
	s.AddTool(updatePlanTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err1 := request.RequireString("project_id")
		content, err2 := request.RequireString("content")
		if err1 != nil || err2 != nil {
			return mcp.NewToolResultError("Missing required parameters"), nil
		}

		proj, err := store.GetProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Project not found: %v", err)), nil
		}

		planPath := filepath.Join(proj.Path, "plan.md")
		if err := os.WriteFile(planPath, []byte(content), 0644); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Failed to write plan.md: %v", err)), nil
		}

		return mcp.NewToolResultText(fmt.Sprintf("Successfully updated plan.md for project '%s'.", projectID)), nil
	})

	// 11. Tool: update_rules
	updateRulesTool := mcp.NewTool("update_rules",
		mcp.WithDescription("Update the AGENTS.md rules content for a project"),
		mcp.WithString("project_id", mcp.Description("The unique identifier of the project"), mcp.Required()),
		mcp.WithString("content", mcp.Description("The full markdown content to write to AGENTS.md"), mcp.Required()),
	)
	s.AddTool(updateRulesTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err1 := request.RequireString("project_id")
		content, err2 := request.RequireString("content")
		if err1 != nil || err2 != nil {
			return mcp.NewToolResultError("Missing required parameters"), nil
		}

		proj, err := store.GetProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Project not found: %v", err)), nil
		}

		rulesPath := filepath.Join(proj.Path, "AGENTS.md")
		if err := os.WriteFile(rulesPath, []byte(content), 0644); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Failed to write AGENTS.md: %v", err)), nil
		}

		return mcp.NewToolResultText(fmt.Sprintf("Successfully updated AGENTS.md for project '%s'.", projectID)), nil
	})

	// 12. Tool: delete_task
	deleteTaskTool := mcp.NewTool("delete_task",
		mcp.WithDescription("Delete a task from a project"),
		mcp.WithString("project_id", mcp.Description("The unique ID of the project"), mcp.Required()),
		mcp.WithString("task_id", mcp.Description("The ID of the task to delete"), mcp.Required()),
	)
	s.AddTool(deleteTaskTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err1 := request.RequireString("project_id")
		taskID, err2 := request.RequireString("task_id")
		if err1 != nil || err2 != nil {
			return mcp.NewToolResultError("Missing required parameters"), nil
		}

		task, err := store.GetTask(ctx, taskID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Task '%s' not found: %v", taskID, err)), nil
		}
		if task.ProjectID != projectID {
			return mcp.NewToolResultError("Task does not belong to this project"), nil
		}

		if err := store.DeleteTask(ctx, taskID); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Error deleting task: %v", err)), nil
		}

		return mcp.NewToolResultText(fmt.Sprintf("Successfully deleted task '%s'.", taskID)), nil
	})

	// 13. Tool: add_skill
	addSkillTool := mcp.NewTool("add_skill",
		mcp.WithDescription("Register a new skill for a project"),
		mcp.WithString("project_id", mcp.Description("The unique ID of the project"), mcp.Required()),
		mcp.WithString("name", mcp.Description("The name of the skill"), mcp.Required()),
		mcp.WithString("execution_type", mcp.Description("Type of execution (script, binary, mcp)"), mcp.Required()),
		mcp.WithString("execution_path", mcp.Description("The command or file path to execute"), mcp.Required()),
		mcp.WithString("description", mcp.Description("Optional description of the skill")),
		mcp.WithString("trigger_pattern", mcp.Description("Optional trigger regex pattern")),
	)
	s.AddTool(addSkillTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err1 := request.RequireString("project_id")
		name, err2 := request.RequireString("name")
		execType, err3 := request.RequireString("execution_type")
		execPath, err4 := request.RequireString("execution_path")
		if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
			return mcp.NewToolResultError("Missing required parameters"), nil
		}

		desc, _ := request.RequireString("description")
		trigger, _ := request.RequireString("trigger_pattern")

		b := make([]byte, 8)
		_, _ = rand.Read(b)

		skill := &storage.Skill{
			ID:             hex.EncodeToString(b),
			ProjectID:      projectID,
			Name:           name,
			Description:    desc,
			TriggerPattern: trigger,
			ExecutionType:  execType,
			ExecutionPath:  execPath,
		}

		if err := store.AddSkill(ctx, skill); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Error adding skill: %v", err)), nil
		}

		return mcp.NewToolResultText(fmt.Sprintf("Successfully added skill '%s' to project '%s'.", name, projectID)), nil
	})

	// 14. Tool: export_skills
	exportSkillsTool := mcp.NewTool("export_skills",
		mcp.WithDescription("Export registered skills to native project manifest (Makefile or package.json)"),
		mcp.WithString("project_id", mcp.Description("The unique identifier of the project"), mcp.Required()),
	)
	s.AddTool(exportSkillsTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err := request.RequireString("project_id")
		if err != nil {
			return mcp.NewToolResultError("Missing required parameter: project_id"), nil
		}

		proj, err := store.GetProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Project not found: %v", err)), nil
		}

		skills, err := store.ListSkillsByProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Error listing skills: %v", err)), nil
		}

		if len(skills) == 0 {
			return mcp.NewToolResultText("No skills registered to export for this project."), nil
		}

		switch strings.ToLower(proj.TechStack) {
		case "go", "html", "python", "android":
			if err := export.ExportToGoMakefile(proj.Path, skills); err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Export failed: %v", err)), nil
			}
		case "node", "nextjs":
			if err := export.ExportToNodePackageJSON(proj.Path, skills); err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Export failed: %v", err)), nil
			}
		default:
			return mcp.NewToolResultText(fmt.Sprintf("No automatic export for tech stack '%s'.", proj.TechStack)), nil
		}

		return mcp.NewToolResultText(fmt.Sprintf("Successfully exported %d skills for project '%s'.", len(skills), projectID)), nil
	})

	// 15. Tool: git_status
	gitStatusTool := mcp.NewTool("git_status",
		mcp.WithDescription("Get Git status for a project (branch, commit, dirty state)"),
		mcp.WithString("project_id", mcp.Description("The unique identifier of the project"), mcp.Required()),
	)
	s.AddTool(gitStatusTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err := request.RequireString("project_id")
		if err != nil {
			return mcp.NewToolResultError("Missing required parameter: project_id"), nil
		}

		proj, err := store.GetProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Project not found: %v", err)), nil
		}

		gCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
		defer cancel()

		cmd := exec.CommandContext(gCtx, "git", "rev-parse", "--is-inside-work-tree")
		cmd.Dir = proj.Path
		if err := cmd.Run(); err != nil {
			return mcp.NewToolResultText(`{"is_repo": false}`), nil
		}

		branchCmd := exec.CommandContext(gCtx, "git", "branch", "--show-current")
		branchCmd.Dir = proj.Path
		branchBytes, _ := branchCmd.Output()
		branchName := strings.TrimSpace(string(branchBytes))

		commitCmd := exec.CommandContext(gCtx, "git", "rev-parse", "--short", "HEAD")
		commitCmd.Dir = proj.Path
		commitBytes, _ := commitCmd.Output()
		commitHash := strings.TrimSpace(string(commitBytes))

		statusCmd := exec.CommandContext(gCtx, "git", "status", "--porcelain")
		statusCmd.Dir = proj.Path
		statusBytes, _ := statusCmd.Output()
		statusLines := strings.Split(strings.TrimSpace(string(statusBytes)), "\n")
		dirtyCount := 0
		for _, line := range statusLines {
			if strings.TrimSpace(line) != "" {
				dirtyCount++
			}
		}

		result, _ := json.MarshalIndent(map[string]interface{}{
			"is_repo":    true,
			"branch":     branchName,
			"commit":     commitHash,
			"is_dirty":   dirtyCount > 0,
			"dirty_count": dirtyCount,
		}, "", "  ")

		return mcp.NewToolResultText(string(result)), nil
	})

	// 16. Tool: get_project
	getProjectTool := mcp.NewTool("get_project",
		mcp.WithDescription("Get a single project by its ID"),
		mcp.WithString("project_id", mcp.Description("The unique identifier of the project"), mcp.Required()),
	)
	s.AddTool(getProjectTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err := request.RequireString("project_id")
		if err != nil {
			return mcp.NewToolResultError("Missing required parameter: project_id"), nil
		}

		proj, err := store.GetProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Project not found: %v", err)), nil
		}

		out, err := json.MarshalIndent(proj, "", "  ")
		if err != nil {
			return nil, err
		}

		return mcp.NewToolResultText(string(out)), nil
	})

	// 17. Tool: truncate_db
	truncateDbTool := mcp.NewTool("truncate_db",
		mcp.WithDescription("Truncate the entire DuckDB database and re-seed defaults"),
		mcp.WithString("confirm", mcp.Description("Must be set to 'yes' to confirm"), mcp.Required()),
	)
	s.AddTool(truncateDbTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		confirm, err := request.RequireString("confirm")
		if err != nil || confirm != "yes" {
			return mcp.NewToolResultError("This action is destructive. Pass 'confirm' set to 'yes' to proceed."), nil
		}

		if err := store.TruncateAllTables(ctx); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Failed to truncate database: %v", err)), nil
		}

		return mcp.NewToolResultText("Successfully truncated all DuckDB tables and re-seeded default catalog entries."), nil
	})

	// 18. Tool: project_summary
	projectSummaryTool := mcp.NewTool("project_summary",
		mcp.WithDescription("Get a dashboard overview of a project: task counts, skills count, git status, recent activity"),
		mcp.WithString("project_id", mcp.Description("The unique identifier of the project"), mcp.Required()),
	)
	s.AddTool(projectSummaryTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err := request.RequireString("project_id")
		if err != nil {
			return mcp.NewToolResultError("Missing required parameter: project_id"), nil
		}

		proj, err := store.GetProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Project not found: %v", err)), nil
		}

		tasks, _ := store.ListTasksByProject(ctx, projectID)
		pending, inProgress, completed, cancelled := 0, 0, 0, 0
		for _, t := range tasks {
			switch t.Status {
			case "pending":
				pending++
			case "in_progress":
				inProgress++
			case "completed":
				completed++
			case "cancelled":
				cancelled++
			}
		}

		skills, _ := store.ListSkillsByProject(ctx, projectID)
		activity, _ := store.ListActivity(ctx, 5)

		gCtx, gitCancel := context.WithTimeout(ctx, 10*time.Second)
		defer gitCancel()

		gitBranch, gitCommit, gitDirty := "", "", 0
		repoCmd := exec.CommandContext(gCtx, "git", "rev-parse", "--is-inside-work-tree")
		repoCmd.Dir = proj.Path
		if repoCmd.Run() == nil {
			branchBytes, _ := exec.CommandContext(gCtx, "git", "branch", "--show-current").Output()
			gitBranch = strings.TrimSpace(string(branchBytes))
			commitBytes, _ := exec.CommandContext(gCtx, "git", "rev-parse", "--short", "HEAD").Output()
			gitCommit = strings.TrimSpace(string(commitBytes))
			statusBytes, _ := exec.CommandContext(gCtx, "git", "status", "--porcelain").Output()
			gitDirty = len(strings.Fields(string(statusBytes)))
		}

		result, _ := json.MarshalIndent(map[string]interface{}{
			"project":       proj,
			"task_counts":   map[string]int{"pending": pending, "in_progress": inProgress, "completed": completed, "cancelled": cancelled},
			"skill_count":   len(skills),
			"git_branch":    gitBranch,
			"git_commit":    gitCommit,
			"git_is_dirty":  gitDirty > 0,
			"recent_activity": activity,
		}, "", "  ")

		return mcp.NewToolResultText(string(result)), nil
	})

	// 19. Tool: run_tests
	runTestsTool := mcp.NewTool("run_tests",
		mcp.WithDescription("Run test and lint suites for a project and return results"),
		mcp.WithString("project_id", mcp.Description("The unique identifier of the project"), mcp.Required()),
	)
	s.AddTool(runTestsTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err := request.RequireString("project_id")
		if err != nil {
			return mcp.NewToolResultError("Missing required parameter: project_id"), nil
		}

		proj, err := store.GetProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Project not found: %v", err)), nil
		}

		timeoutCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
		defer cancel()

		var testCmd, lintCmd *exec.Cmd
		switch strings.ToLower(proj.TechStack) {
		case "go":
			testCmd = exec.CommandContext(timeoutCtx, "go", "test", "./...")
			lintCmd = exec.CommandContext(timeoutCtx, "go", "vet", "./...")
		case "node", "nextjs":
			testCmd = exec.CommandContext(timeoutCtx, "npm", "test")
			lintCmd = exec.CommandContext(timeoutCtx, "npm", "run", "lint")
		case "python":
			testCmd = exec.CommandContext(timeoutCtx, "python3", "-m", "unittest", "discover")
			lintCmd = exec.CommandContext(timeoutCtx, "python3", "-m", "pyflakes", ".")
		default:
			testCmd = exec.CommandContext(timeoutCtx, "echo", "No test command configured")
			lintCmd = exec.CommandContext(timeoutCtx, "echo", "No linter configured")
		}

		testCmd.Dir = proj.Path
		testBytes, _ := testCmd.CombinedOutput()
		testPassed := testCmd.ProcessState != nil && testCmd.ProcessState.Success()

		lintCmd.Dir = proj.Path
		lintBytes, _ := lintCmd.CombinedOutput()
		lintPassed := lintCmd.ProcessState != nil && lintCmd.ProcessState.Success()

		result, _ := json.MarshalIndent(map[string]interface{}{
			"test_passed": testPassed,
			"test_output": string(testBytes),
			"lint_passed": lintPassed,
			"lint_output": string(lintBytes),
		}, "", "  ")

		return mcp.NewToolResultText(string(result)), nil
	})

	// 20. Tool: create_project
	createProjectTool := mcp.NewTool("create_project",
		mcp.WithDescription("Provision a new project from scratch: scaffold files, generate AGENTS.md, register in DB"),
		mcp.WithString("name", mcp.Description("The project name"), mcp.Required()),
		mcp.WithString("path", mcp.Description("Absolute or relative path for the project directory"), mcp.Required()),
		mcp.WithString("tech_stack", mcp.Description("Technology stack (go, node, nextjs, python, html, android, powershell)"), mcp.Required()),
	)
	s.AddTool(createProjectTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		name, err1 := request.RequireString("name")
		path, err2 := request.RequireString("path")
		tech, err3 := request.RequireString("tech_stack")
		if err1 != nil || err2 != nil || err3 != nil {
			return mcp.NewToolResultError("Missing required parameters"), nil
		}

		tech = strings.ToLower(strings.TrimSpace(tech))
		if _, ok := map[string]bool{"go": true, "node": true, "nextjs": true, "python": true, "html": true, "android": true, "powershell": true}[tech]; !ok {
			return mcp.NewToolResultError(fmt.Sprintf("Unsupported tech stack '%s' (supported: go, node, nextjs, python, html, android, powershell)", tech)), nil
		}

		absPath, err := filepath.Abs(path)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Invalid path: %v", err)), nil
		}

		if err := os.MkdirAll(absPath, 0755); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Failed to create directory: %v", err)), nil
		}

		entries, _ := os.ReadDir(absPath)
		for _, e := range entries {
			if e.Name() != ".git" {
				return mcp.NewToolResultError("Target directory is not empty"), nil
			}
		}

		agentsTemplate := storage.GetDefaultAgentsTemplate(tech)
		planTemplate := storage.GetDefaultPlanTemplate(tech)

		if err := scaffold.ScaffoldProject(name, absPath, tech, planTemplate); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Scaffolding failed: %v", err)), nil
		}
		if err := scaffold.GenerateAgentsContext(name, absPath, tech, agentsTemplate); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("AGENTS.md generation failed: %v", err)), nil
		}

		p := &storage.Project{
			ID:        name,
			Name:      name,
			Path:      absPath,
			TechStack: tech,
		}
		if err := store.AddProject(ctx, p); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Failed to register project: %v", err)), nil
		}

		out, _ := json.MarshalIndent(p, "", "  ")
		return mcp.NewToolResultText(string(out)), nil
	})

	// 21. Tool: read_file
	readFileTool := mcp.NewTool("read_file",
		mcp.WithDescription("Read a file from a project directory"),
		mcp.WithString("project_id", mcp.Description("The unique identifier of the project"), mcp.Required()),
		mcp.WithString("relative_path", mcp.Description("Relative path to the file from the project root (e.g. src/main.go)"), mcp.Required()),
	)
	s.AddTool(readFileTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err1 := request.RequireString("project_id")
		relPath, err2 := request.RequireString("relative_path")
		if err1 != nil || err2 != nil {
			return mcp.NewToolResultError("Missing required parameters"), nil
		}

		if strings.Contains(relPath, "..") || strings.HasPrefix(relPath, "/") {
			return mcp.NewToolResultError("Invalid path: must be a relative path without directory traversal"), nil
		}

		proj, err := store.GetProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Project not found: %v", err)), nil
		}

		absFile := filepath.Clean(filepath.Join(proj.Path, relPath))
		if !strings.HasPrefix(absFile, filepath.Clean(proj.Path)) {
			return mcp.NewToolResultError("Path escapes project root"), nil
		}

		content, err := os.ReadFile(absFile)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Failed to read file: %v", err)), nil
		}

		return mcp.NewToolResultText(string(content)), nil
	})

	// 22. Tool: write_file
	writeFileTool := mcp.NewTool("write_file",
		mcp.WithDescription("Write content to a file inside a project directory (1MB max)"),
		mcp.WithString("project_id", mcp.Description("The unique identifier of the project"), mcp.Required()),
		mcp.WithString("relative_path", mcp.Description("Relative path to the file from the project root"), mcp.Required()),
		mcp.WithString("content", mcp.Description("The content to write"), mcp.Required()),
	)
	s.AddTool(writeFileTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err1 := request.RequireString("project_id")
		relPath, err2 := request.RequireString("relative_path")
		content, err3 := request.RequireString("content")
		if err1 != nil || err2 != nil || err3 != nil {
			return mcp.NewToolResultError("Missing required parameters"), nil
		}

		if len(content) > 1<<20 {
			return mcp.NewToolResultError("Content too large: maximum 1MB"), nil
		}
		if strings.Contains(relPath, "..") || strings.HasPrefix(relPath, "/") {
			return mcp.NewToolResultError("Invalid path: must be a relative path without directory traversal"), nil
		}

		proj, err := store.GetProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Project not found: %v", err)), nil
		}

		absFile := filepath.Clean(filepath.Join(proj.Path, relPath))
		if !strings.HasPrefix(absFile, filepath.Clean(proj.Path)) {
			return mcp.NewToolResultError("Path escapes project root"), nil
		}

		if err := os.MkdirAll(filepath.Dir(absFile), 0755); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Failed to create directories: %v", err)), nil
		}
		if err := os.WriteFile(absFile, []byte(content), 0644); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Failed to write file: %v", err)), nil
		}

		return mcp.NewToolResultText(fmt.Sprintf("Successfully wrote %d bytes to %s", len(content), relPath)), nil
	})

	// 23. Tool: project_search
	projectSearchTool := mcp.NewTool("project_search",
		mcp.WithDescription("Search registered projects by name, tech stack, or path"),
		mcp.WithString("query", mcp.Description("Search term to match against project name, tech stack, or path"), mcp.Required()),
	)
	s.AddTool(projectSearchTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		query, err := request.RequireString("query")
		if err != nil {
			return mcp.NewToolResultError("Missing required parameter: query"), nil
		}

		projects, err := store.ListProjects(ctx)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Error listing projects: %v", err)), nil
		}

		q := strings.ToLower(strings.TrimSpace(query))
		var matched []*storage.Project
		for _, p := range projects {
			if strings.Contains(strings.ToLower(p.Name), q) ||
				strings.Contains(strings.ToLower(p.TechStack), q) ||
				strings.Contains(strings.ToLower(p.Path), q) {
				matched = append(matched, p)
			}
		}

		if matched == nil {
			matched = []*storage.Project{}
		}
		out, _ := json.MarshalIndent(matched, "", "  ")
		return mcp.NewToolResultText(string(out)), nil
	})

	// 24. Tool: exec_command
	execCommandTool := mcp.NewTool("exec_command",
		mcp.WithDescription("Run a shell command in the project directory (30s timeout)"),
		mcp.WithString("project_id", mcp.Description("The unique identifier of the project"), mcp.Required()),
		mcp.WithString("command", mcp.Description("The shell command to execute"), mcp.Required()),
	)
	s.AddTool(execCommandTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err1 := request.RequireString("project_id")
		cmdStr, err2 := request.RequireString("command")
		if err1 != nil || err2 != nil || cmdStr == "" {
			return mcp.NewToolResultError("Missing required parameters"), nil
		}

		proj, err := store.GetProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Project not found: %v", err)), nil
		}

		ecCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
		defer cancel()

		cmd := exec.CommandContext(ecCtx, "sh", "-c", cmdStr)
		cmd.Dir = proj.Path
		output, err := cmd.CombinedOutput()
		exitCode := 0
		if err != nil {
			exitCode = 1
			if exiterr, ok := err.(*exec.ExitError); ok {
				exitCode = exiterr.ExitCode()
			}
		}

		result, _ := json.MarshalIndent(map[string]interface{}{
			"stdout":     string(output),
			"exit_code":  exitCode,
			"timed_out":  ecCtx.Err() != nil,
			"project_id": projectID,
		}, "", "  ")

		return mcp.NewToolResultText(string(result)), nil
	})

	// 25. Tool: delete_project
	deleteProjectTool := mcp.NewTool("delete_project",
		mcp.WithDescription("Permanently delete a project and all associated tasks/skills"),
		mcp.WithString("project_id", mcp.Description("The unique identifier of the project"), mcp.Required()),
		mcp.WithString("confirm", mcp.Description("Must be set to 'yes' to confirm deletion"), mcp.Required()),
	)
	s.AddTool(deleteProjectTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		projectID, err1 := request.RequireString("project_id")
		confirm, err2 := request.RequireString("confirm")
		if err1 != nil || err2 != nil {
			return mcp.NewToolResultError("Missing required parameters"), nil
		}
		if confirm != "yes" {
			return mcp.NewToolResultError("This action is destructive. Pass 'confirm' set to 'yes' to proceed."), nil
		}

		proj, err := store.GetProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Project not found: %v", err)), nil
		}

		if err := store.DeleteProject(ctx, projectID); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Failed to delete project: %v", err)), nil
		}

		return mcp.NewToolResultText(fmt.Sprintf("Successfully deleted project '%s' (%s) with all tasks/skills.", proj.Name, projectID)), nil
	})

	return server.ServeStdio(s)
}
