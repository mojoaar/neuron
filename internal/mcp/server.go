package mcp

import (
	"context"
	"encoding/json"
	"fmt"

	"neuron/internal/storage"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// StartServer starts the MCP server over standard input/output (stdio).
func StartServer(store *storage.Storage) error {
	s := server.NewMCPServer("neuron", "1.0.0", server.WithDescription("Neuron AI-native Lifecycle Manager Server"))

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

		tasks, err := store.ListTasksByProject(ctx, projectID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Error finding task: %v", err)), nil
		}

		var targetTask *storage.Task
		for _, t := range tasks {
			if t.ID == taskID {
				targetTask = t
				break
			}
		}

		if targetTask == nil {
			return mcp.NewToolResultError(fmt.Sprintf("Task '%s' not found in project '%s'", taskID, projectID)), nil
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

	return server.ServeStdio(s)
}
