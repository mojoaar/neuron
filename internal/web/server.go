package web

import (
	"context"
	"crypto/rand"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"neuron/internal/scaffold"
	"neuron/internal/storage"
)

//go:embed all:frontend/out
var frontendFS embed.FS

type Server struct {
	store      *storage.Storage
	port       int
	cwd        string
	startupCwd string
}

func NewServer(store *storage.Storage, port int) *Server {
	cwd, err := os.Getwd()
	if err != nil {
		cwd = "."
	}
	startupCwd := cwd

	// Check if there is a custom workspace path configured
	if storedPath, err := store.GetSetting(context.Background(), "workspace_root_path"); err == nil && storedPath != "" {
		// Verify that it physically exists on the disk
		if info, err := os.Stat(storedPath); err == nil && info.IsDir() {
			cwd = storedPath
		}
	}

	return &Server{
		store:      store,
		port:       port,
		cwd:        cwd,
		startupCwd: startupCwd,
	}
}

func (s *Server) Start() error {
	mux := http.NewServeMux()

	// Register API endpoints
	mux.HandleFunc("/api/projects", s.handleProjects)
	mux.HandleFunc("/api/projects/", s.handleProjectSubroutes)
	mux.HandleFunc("/api/system/cwd", s.handleCwd)
	mux.HandleFunc("/api/system/mcp/setup", s.handleSetupMcp)
	mux.HandleFunc("/api/system/templates", s.handleSystemTemplates)
	mux.HandleFunc("/api/system/skills", s.handleSystemSkills)
	mux.HandleFunc("/api/system/shutdown", s.handleShutdown)

	// Embed static client
	sub, err := fs.Sub(frontendFS, "frontend/out")
	if err != nil {
		// If frontend/out is empty during development, fallback
		sub = fs.FS(nil)
	}

	var indexHTML []byte
	if sub != nil {
		indexHTML, _ = fs.ReadFile(sub, "index.html")
	}

	fileServer := http.FileServer(http.FS(sub))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api") {
			http.NotFound(w, r)
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}

		// Check if file exists in embed FS
		_, err := sub.Open(path)
		if err != nil && len(indexHTML) > 0 {
			// Serve SPA fallback
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Write(indexHTML)
			return
		}

		fileServer.ServeHTTP(w, r)
	})

	addr := fmt.Sprintf("127.0.0.1:%d", s.port)
	fmt.Printf("Neuron UI Server starting at http://%s\n", addr)

	// Automatically open the browser
	go func() {
		time.Sleep(500 * time.Millisecond)
		openBrowser(fmt.Sprintf("http://%s", addr))
	}()

	return http.ListenAndServe(addr, mux)
}

func (s *Server) handleProjects(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		projects, err := s.store.ListProjects(ctx)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		var filtered []*storage.Project
		for _, p := range projects {
			if isSubpath(s.cwd, p.Path) {
				if !dirExists(p.Path) {
					_ = s.store.DeleteProject(ctx, p.ID)
					continue
				}
				filtered = append(filtered, p)
			}
		}
		respondJSON(w, http.StatusOK, filtered)

	case http.MethodPost:
		var req struct {
			Name      string   `json:"name"`
			Path      string   `json:"path"`
			TechStack string   `json:"tech_stack"`
			SkillURLs []string `json:"skill_urls"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request payload")
			return
		}

		req.Name = strings.TrimSpace(req.Name)
		req.Path = strings.TrimSpace(req.Path)
		req.TechStack = strings.ToLower(strings.TrimSpace(req.TechStack))

		if req.Name == "" || req.Path == "" || req.TechStack == "" {
			respondError(w, http.StatusBadRequest, "Missing name, path, or tech_stack")
			return
		}

		if req.TechStack != "go" && req.TechStack != "node" && req.TechStack != "html" && req.TechStack != "powershell" && req.TechStack != "nextjs" && req.TechStack != "python" && req.TechStack != "android" {
			respondError(w, http.StatusBadRequest, "Unsupported tech stack (supported: go, node, html, powershell, nextjs, python, android)")
			return
		}

		absPath, err := filepath.Abs(req.Path)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to resolve absolute path: "+err.Error())
			return
		}

		if err := os.MkdirAll(absPath, 0755); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to create directory: "+err.Error())
			return
		}

		// Check if target directory is empty
		entries, err := os.ReadDir(absPath)
		if err == nil && len(entries) > 0 {
			hasFiles := false
			for _, entry := range entries {
				if entry.Name() != ".git" {
					hasFiles = true
					break
				}
			}
			if hasFiles {
				respondError(w, http.StatusBadRequest, "Target directory is not empty")
				return
			}
		}

		// Fetch custom templates from DuckDB
		tmpl, err := s.store.GetTemplate(ctx, req.TechStack)
		var agentsTemplate, planTemplate string
		if err == nil {
			agentsTemplate = tmpl.AgentsMD
			planTemplate = tmpl.PlanMD
		} else {
			agentsTemplate = storage.GetDefaultAgentsTemplate(req.TechStack)
			planTemplate = storage.GetDefaultPlanTemplate(req.TechStack)
		}

		// Scaffold project
		if err := scaffold.ScaffoldProject(req.Name, absPath, req.TechStack, planTemplate); err != nil {
			respondError(w, http.StatusInternalServerError, "Scaffolding failed: "+err.Error())
			return
		}

		if err := scaffold.GenerateAgentsContext(req.Name, absPath, req.TechStack, agentsTemplate); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to generate AGENTS.md context: "+err.Error())
			return
		}

		// Save project to database
		p := &storage.Project{
			ID:        req.Name,
			Name:      req.Name,
			Path:      absPath,
			TechStack: req.TechStack,
		}

		if err := s.store.AddProject(ctx, p); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to register project in database: "+err.Error())
			return
		}

		// Save default skills
		defaultSkills := scaffold.GetDefaultSkills(p.Name, p.TechStack)
		for _, sk := range defaultSkills {
			sk.ProjectID = p.ID
			sk.ID = p.ID + "_" + sk.ID
			if err := s.store.AddSkill(ctx, sk); err != nil {
				fmt.Printf("Warning: failed to add default skill %s: %v\n", sk.ID, err)
			}
		}

		// Download and save remote skills
		for _, url := range req.SkillURLs {
			url = strings.TrimSpace(url)
			if url == "" {
				continue
			}
			sk, err := scaffold.DownloadRemoteSkill(p.Path, url)
			if err != nil {
				fmt.Printf("Warning: failed to download remote skill %s: %v\n", url, err)
				continue
			}
			sk.ProjectID = p.ID
			sk.ID = p.ID + "_" + sk.ID
			if err := s.store.AddSkill(ctx, sk); err != nil {
				fmt.Printf("Warning: failed to add remote skill %s: %v\n", sk.ID, err)
			}
		}

		// Auto-export all active skills
		skills, err := s.store.ListSkillsByProject(ctx, p.ID)
		if err == nil && len(skills) > 0 {
			var exportErr error
			switch strings.ToLower(p.TechStack) {
			case "go", "html", "python", "android":
				exportErr = exportToGoMakefile(p.Path, skills)
			case "node", "nextjs":
				exportErr = exportToNodePackageJSON(p.Path, skills)
			}
			if exportErr != nil {
				fmt.Printf("Warning: failed to auto-export skills on provision: %v\n", exportErr)
			}
		}

		respondJSON(w, http.StatusCreated, p)

	default:
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func (s *Server) handleProjectSubroutes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/projects/"), "/")
	if len(parts) < 2 {
		respondError(w, http.StatusNotFound, "Not Found")
		return
	}

	projectID := parts[0]
	subResource := parts[1]

	proj, err := s.store.GetProject(ctx, projectID)
	if err != nil {
		respondError(w, http.StatusNotFound, "Project not found: "+projectID)
		return
	}

	switch subResource {
	case "tasks":
		if len(parts) == 2 {
			switch r.Method {
			case http.MethodGet:
				tasks, err := s.store.ListTasksByProject(ctx, projectID)
				if err != nil {
					respondError(w, http.StatusInternalServerError, err.Error())
					return
				}
				respondJSON(w, http.StatusOK, tasks)

			case http.MethodPost:
				var req struct {
					Content  string `json:"content"`
					Priority string `json:"priority"`
				}
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					respondError(w, http.StatusBadRequest, "Invalid request body")
					return
				}

				req.Content = strings.TrimSpace(req.Content)
				req.Priority = strings.TrimSpace(req.Priority)
				if req.Content == "" {
					respondError(w, http.StatusBadRequest, "Missing content")
					return
				}
				if req.Priority == "" {
					req.Priority = "medium"
				}

				task := &storage.Task{
					ID:        generateID(),
					ProjectID: projectID,
					Content:   req.Content,
					Status:    "pending",
					Priority:  req.Priority,
				}

				if err := s.store.AddTask(ctx, task); err != nil {
					respondError(w, http.StatusInternalServerError, "Failed to create task: "+err.Error())
					return
				}

				respondJSON(w, http.StatusCreated, task)

			default:
				respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		} else if len(parts) == 3 {
			taskID := parts[2]
			if r.Method != http.MethodPatch {
				respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
				return
			}

			var req struct {
				Status   *string `json:"status,omitempty"`
				Content  *string `json:"content,omitempty"`
				Priority *string `json:"priority,omitempty"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondError(w, http.StatusBadRequest, "Invalid request body")
				return
			}

			tasks, err := s.store.ListTasksByProject(ctx, projectID)
			if err != nil {
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}

			var targetTask *storage.Task
			for _, t := range tasks {
				if t.ID == taskID {
					targetTask = t
					break
				}
			}

			if targetTask == nil {
				respondError(w, http.StatusNotFound, "Task not found")
				return
			}

			if req.Status != nil {
				status := strings.ToLower(*req.Status)
				if status != "pending" && status != "in_progress" && status != "completed" && status != "cancelled" {
					respondError(w, http.StatusBadRequest, "Invalid status")
					return
				}
				targetTask.Status = status
			}
			if req.Content != nil {
				targetTask.Content = *req.Content
			}
			if req.Priority != nil {
				targetTask.Priority = *req.Priority
			}

			if err := s.store.UpdateTask(ctx, targetTask); err != nil {
				respondError(w, http.StatusInternalServerError, "Failed to update task: "+err.Error())
				return
			}

			respondJSON(w, http.StatusOK, targetTask)
		} else {
			respondError(w, http.StatusNotFound, "Not Found")
		}

	case "skills":
		if len(parts) == 2 {
			switch r.Method {
			case http.MethodGet:
				skills, err := s.store.ListSkillsByProject(ctx, projectID)
				if err != nil {
					respondError(w, http.StatusInternalServerError, err.Error())
					return
				}
				respondJSON(w, http.StatusOK, skills)

			case http.MethodPost:
				var req struct {
					URL            string `json:"url"`
					Name           string `json:"name"`
					Description    string `json:"description"`
					TriggerPattern string `json:"trigger_pattern"`
					ExecutionType  string `json:"execution_type"`
					ExecutionPath  string `json:"execution_path"`
				}
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					respondError(w, http.StatusBadRequest, "Invalid request body")
					return
				}

				if req.URL != "" {
					sk, err := scaffold.DownloadRemoteSkill(proj.Path, req.URL)
					if err != nil {
						respondError(w, http.StatusInternalServerError, "Failed to download remote skill: "+err.Error())
						return
					}
					sk.ProjectID = projectID
					sk.ID = projectID + "_" + sk.ID
					if err := s.store.AddSkill(ctx, sk); err != nil {
						respondError(w, http.StatusInternalServerError, "Failed to register downloaded skill: "+err.Error())
						return
					}
					respondJSON(w, http.StatusOK, sk)
					return
				}

				req.Name = strings.TrimSpace(req.Name)
				req.ExecutionType = strings.ToLower(strings.TrimSpace(req.ExecutionType))
				req.ExecutionPath = strings.TrimSpace(req.ExecutionPath)

				if req.Name == "" || req.ExecutionType == "" || req.ExecutionPath == "" {
					respondError(w, http.StatusBadRequest, "Missing name, execution_type, or execution_path")
					return
				}

				if req.ExecutionType != "script" && req.ExecutionType != "binary" && req.ExecutionType != "mcp" {
					respondError(w, http.StatusBadRequest, "Invalid execution type (supported: script, binary, mcp)")
					return
				}

				skill := &storage.Skill{
					ID:             generateID(),
					ProjectID:      projectID,
					Name:           req.Name,
					Description:    req.Description,
					TriggerPattern: req.TriggerPattern,
					ExecutionType:  req.ExecutionType,
					ExecutionPath:  req.ExecutionPath,
				}

				if err := s.store.AddSkill(ctx, skill); err != nil {
					respondError(w, http.StatusInternalServerError, "Failed to register skill: "+err.Error())
					return
				}

				respondJSON(w, http.StatusCreated, skill)

			default:
				respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		} else if len(parts) == 3 {
			skillID := parts[2]
			if skillID == "export" {
				if r.Method != http.MethodPost {
					respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
					return
				}

				proj, err := s.store.GetProject(ctx, projectID)
				if err != nil {
					respondError(w, http.StatusInternalServerError, err.Error())
					return
				}

				skills, err := s.store.ListSkillsByProject(ctx, projectID)
				if err != nil {
					respondError(w, http.StatusInternalServerError, err.Error())
					return
				}

				if len(skills) == 0 {
					respondError(w, http.StatusBadRequest, "No skills registered to export")
					return
				}

				var exportErr error
				switch strings.ToLower(proj.TechStack) {
				case "go", "html", "python", "android":
					exportErr = exportToGoMakefile(proj.Path, skills)
				case "node", "nextjs":
					exportErr = exportToNodePackageJSON(proj.Path, skills)
				default:
					exportErr = fmt.Errorf("unsupported stack '%s'", proj.TechStack)
				}

				if exportErr != nil {
					respondError(w, http.StatusInternalServerError, "Export failed: "+exportErr.Error())
					return
				}

				respondJSON(w, http.StatusOK, map[string]interface{}{"success": true, "message": "Skills successfully exported!"})
			} else {
				switch r.Method {
				case http.MethodPut:
					var req struct {
						Name           string `json:"name"`
						Description    string `json:"description"`
						TriggerPattern string `json:"trigger_pattern"`
						ExecutionType  string `json:"execution_type"`
						ExecutionPath  string `json:"execution_path"`
					}
					if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
						respondError(w, http.StatusBadRequest, "Invalid request body")
						return
					}

					skills, err := s.store.ListSkillsByProject(ctx, projectID)
					if err != nil {
						respondError(w, http.StatusInternalServerError, err.Error())
						return
					}

					var targetSkill *storage.Skill
					for _, sk := range skills {
						if sk.ID == skillID {
							targetSkill = sk
							break
						}
					}

					if targetSkill == nil {
						respondError(w, http.StatusNotFound, "Skill not found")
						return
					}

					req.Name = strings.TrimSpace(req.Name)
					req.ExecutionType = strings.ToLower(strings.TrimSpace(req.ExecutionType))
					req.ExecutionPath = strings.TrimSpace(req.ExecutionPath)

					if req.Name != "" {
						targetSkill.Name = req.Name
					}
					if req.Description != "" {
						targetSkill.Description = req.Description
					}
					if req.TriggerPattern != "" {
						targetSkill.TriggerPattern = req.TriggerPattern
					}
					if req.ExecutionType != "" {
						if req.ExecutionType != "script" && req.ExecutionType != "binary" && req.ExecutionType != "mcp" {
							respondError(w, http.StatusBadRequest, "Invalid execution type")
							return
						}
						targetSkill.ExecutionType = req.ExecutionType
					}
					if req.ExecutionPath != "" {
						targetSkill.ExecutionPath = req.ExecutionPath
					}

					if err := s.store.UpdateSkill(ctx, targetSkill); err != nil {
						respondError(w, http.StatusInternalServerError, err.Error())
						return
					}

					// Auto-export on update
					updatedSkills, err := s.store.ListSkillsByProject(ctx, projectID)
					if err == nil {
						proj, _ := s.store.GetProject(ctx, projectID)
						switch strings.ToLower(proj.TechStack) {
						case "go", "html", "python", "android":
							_ = exportToGoMakefile(proj.Path, updatedSkills)
						case "node", "nextjs":
							_ = exportToNodePackageJSON(proj.Path, updatedSkills)
						}
					}

					respondJSON(w, http.StatusOK, targetSkill)

				case http.MethodDelete:
					if err := s.store.DeleteSkill(ctx, skillID); err != nil {
						respondError(w, http.StatusInternalServerError, err.Error())
						return
					}

					// Auto-export on delete
					updatedSkills, err := s.store.ListSkillsByProject(ctx, projectID)
					if err == nil {
						proj, _ := s.store.GetProject(ctx, projectID)
						switch strings.ToLower(proj.TechStack) {
						case "go", "html", "python", "android":
							_ = exportToGoMakefile(proj.Path, updatedSkills)
						case "node", "nextjs":
							_ = exportToNodePackageJSON(proj.Path, updatedSkills)
						}
					}

					respondJSON(w, http.StatusOK, map[string]bool{"success": true})

				default:
					respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
				}
			}
		} else {
			respondError(w, http.StatusNotFound, "Not Found")
		}

	case "plan":
		proj, err := s.store.GetProject(ctx, projectID)
		if err != nil {
			respondError(w, http.StatusNotFound, err.Error())
			return
		}
		if len(parts) == 3 && parts[2] == "import" {
			if r.Method != http.MethodPost {
				respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
				return
			}
			planPath := filepath.Join(proj.Path, "plan.md")
			data, err := os.ReadFile(planPath)
			if err != nil {
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			lines := strings.Split(string(data), "\n")
			importCount := 0

			existingTasks, _ := s.store.ListTasksByProject(ctx, projectID)
			existingSet := make(map[string]bool)
			for _, t := range existingTasks {
				existingSet[strings.ToLower(strings.TrimSpace(t.Content))] = true
			}

			for _, line := range lines {
				trimmed := strings.TrimSpace(line)
				if strings.HasPrefix(trimmed, "- [ ]") {
					taskContent := strings.TrimSpace(strings.TrimPrefix(trimmed, "- [ ]"))
					if taskContent == "" {
						continue
					}

					if existingSet[strings.ToLower(taskContent)] {
						continue
					}

					task := &storage.Task{
						ID:        generateID(),
						ProjectID: projectID,
						Content:   taskContent,
						Status:    "pending",
						Priority:  "medium",
					}
					if err := s.store.AddTask(ctx, task); err == nil {
						importCount++
						existingSet[strings.ToLower(taskContent)] = true
					}
				}
			}
			respondJSON(w, http.StatusOK, map[string]interface{}{"success": true, "imported": importCount})
			return
		}

		switch r.Method {
		case http.MethodGet:
			planPath := filepath.Join(proj.Path, "plan.md")
			content, err := os.ReadFile(planPath)
			if err != nil {
				if os.IsNotExist(err) {
					respondJSON(w, http.StatusOK, map[string]string{"content": ""})
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, map[string]string{"content": string(content)})

		case http.MethodPost:
			var req struct {
				Content string `json:"content"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondError(w, http.StatusBadRequest, "Invalid payload")
				return
			}
			planPath := filepath.Join(proj.Path, "plan.md")
			if err := os.WriteFile(planPath, []byte(req.Content), 0644); err != nil {
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, map[string]bool{"success": true})

		default:
			respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		}

	case "rules":
		proj, err := s.store.GetProject(ctx, projectID)
		if err != nil {
			respondError(w, http.StatusNotFound, err.Error())
			return
		}
		switch r.Method {
		case http.MethodGet:
			rulesPath := filepath.Join(proj.Path, "AGENTS.md")
			content, err := os.ReadFile(rulesPath)
			if err != nil {
				if os.IsNotExist(err) {
					respondJSON(w, http.StatusOK, map[string]string{"content": ""})
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, map[string]string{"content": string(content)})

		case http.MethodPost:
			var req struct {
				Content string `json:"content"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondError(w, http.StatusBadRequest, "Invalid payload")
				return
			}
			rulesPath := filepath.Join(proj.Path, "AGENTS.md")
			if err := os.WriteFile(rulesPath, []byte(req.Content), 0644); err != nil {
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			_ = scaffold.EnsureTUICompatibility(proj.Path)
			respondJSON(w, http.StatusOK, map[string]bool{"success": true})

		default:
			respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		}

	case "git":
		proj, err := s.store.GetProject(ctx, projectID)
		if err != nil {
			respondError(w, http.StatusNotFound, err.Error())
			return
		}
		if r.Method != http.MethodGet {
			respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
			return
		}

		cmd := exec.Command("git", "rev-parse", "--is-inside-work-tree")
		cmd.Dir = proj.Path
		if err := cmd.Run(); err != nil {
			respondJSON(w, http.StatusOK, map[string]interface{}{"is_repo": false})
			return
		}

		branchCmd := exec.Command("git", "branch", "--show-current")
		branchCmd.Dir = proj.Path
		branchBytes, _ := branchCmd.Output()
		branchName := strings.TrimSpace(string(branchBytes))

		commitCmd := exec.Command("git", "rev-parse", "--short", "HEAD")
		commitCmd.Dir = proj.Path
		commitBytes, _ := commitCmd.Output()
		commitHash := strings.TrimSpace(string(commitBytes))

		statusCmd := exec.Command("git", "status", "--porcelain")
		statusCmd.Dir = proj.Path
		statusBytes, _ := statusCmd.Output()
		statusLines := strings.Split(strings.TrimSpace(string(statusBytes)), "\n")
		dirtyCount := 0
		var dirtyFiles []string
		for _, line := range statusLines {
			trimmed := strings.TrimSpace(line)
			if trimmed != "" {
				dirtyCount++
				dirtyFiles = append(dirtyFiles, trimmed)
			}
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"is_repo":     true,
			"branch":      branchName,
			"commit":      commitHash,
			"is_dirty":    dirtyCount > 0,
			"dirty_count": dirtyCount,
			"dirty_files": dirtyFiles,
		})

	default:
		respondError(w, http.StatusNotFound, "Not Found")
	}
}

func exportToGoMakefile(projPath string, skills []*storage.Skill) error {
	makefile := filepath.Join(projPath, "Makefile")
	content, err := os.ReadFile(makefile)
	if err != nil && !os.IsNotExist(err) {
		return err
	}

	var sb strings.Builder
	sb.WriteString("\n# --- BEGIN NEURON SKILLS ---\n")
	for _, sk := range skills {
		if sk.Description != "" {
			sb.WriteString(fmt.Sprintf("# Skill: %s\n", sk.Description))
		}
		sb.WriteString(fmt.Sprintf("%s:\n\t%s\n\n", sk.Name, sk.ExecutionPath))
	}
	sb.WriteString("# --- END NEURON SKILLS ---\n")
	skillsSection := sb.String()

	original := string(content)
	startMarker := "# --- BEGIN NEURON SKILLS ---"
	endMarker := "# --- END NEURON SKILLS ---"

	var updated string
	if strings.Contains(original, startMarker) && strings.Contains(original, endMarker) {
		parts := strings.Split(original, startMarker)
		afterBlock := strings.Split(parts[1], endMarker)
		updated = parts[0] + strings.TrimSpace(skillsSection) + "\n" + afterBlock[1]
	} else {
		updated = original + skillsSection
	}

	return os.WriteFile(makefile, []byte(updated), 0644)
}

func exportToNodePackageJSON(projPath string, skills []*storage.Skill) error {
	pkgFile := filepath.Join(projPath, "package.json")
	content, err := os.ReadFile(pkgFile)
	if err != nil {
		return err
	}

	var data map[string]interface{}
	if err := json.Unmarshal(content, &data); err != nil {
		return err
	}

	scripts, ok := data["scripts"].(map[string]interface{})
	if !ok {
		scripts = make(map[string]interface{})
	}

	for _, sk := range skills {
		scripts[sk.Name] = sk.ExecutionPath
	}
	data["scripts"] = scripts

	updated, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(pkgFile, updated, 0644)
}

func generateID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func respondJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}

func respondError(w http.ResponseWriter, code int, message string) {
	respondJSON(w, code, map[string]string{"error": message})
}

func openBrowser(url string) {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start", url}
	case "darwin":
		cmd = "open"
		args = []string{url}
	default:
		cmd = "xdg-open"
		args = []string{url}
	}

	_ = exec.Command(cmd, args...).Start()
}

func (s *Server) handleCwd(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"cwd":         s.cwd,
			"startup_cwd": s.startupCwd,
			"is_custom":   s.cwd != s.startupCwd,
		})

	case http.MethodPost:
		var req struct {
			Cwd string `json:"cwd"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}

		cleanedPath := filepath.Clean(req.Cwd)
		if !filepath.IsAbs(cleanedPath) {
			absPath, err := filepath.Abs(cleanedPath)
			if err != nil {
				respondError(w, http.StatusBadRequest, "Invalid relative path: "+err.Error())
				return
			}
			cleanedPath = absPath
		}

		if !dirExists(cleanedPath) {
			respondError(w, http.StatusBadRequest, "Directory does not exist: "+cleanedPath)
			return
		}

		if err := s.store.SaveSetting(ctx, "workspace_root_path", cleanedPath); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		s.cwd = cleanedPath
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"cwd":       s.cwd,
			"is_custom": true,
			"message":   "Workspace root scope updated successfully",
		})

	case http.MethodDelete:
		if err := s.store.DeleteSetting(ctx, "workspace_root_path"); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		s.cwd = s.startupCwd
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"cwd":       s.cwd,
			"is_custom": false,
			"message":   "Workspace root scope reset to launch directory",
		})

	default:
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func isSubpath(parent, child string) bool {
	p := filepath.Clean(parent)
	c := filepath.Clean(child)
	if p == c {
		return true
	}
	return strings.HasPrefix(c, p+string(filepath.Separator))
}

func (s *Server) handleSetupMcp(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		Client string `json:"client"` // "opencode" or "claude"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	clientType := strings.ToLower(strings.TrimSpace(req.Client))
	if clientType != "opencode" && clientType != "claude" {
		respondError(w, http.StatusBadRequest, "Invalid client type (supported: opencode, claude)")
		return
	}

	execPath, err := os.Executable()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to resolve executable path: "+err.Error())
		return
	}
	absExecPath, err := filepath.Abs(execPath)
	if err != nil {
		absExecPath = execPath
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to locate user home directory: "+err.Error())
		return
	}

	var configPath string
	switch clientType {
	case "opencode":
		if runtime.GOOS == "windows" {
			appData := os.Getenv("APPDATA")
			configPath = filepath.Join(appData, "opencode", "opencode.json")
		} else {
			configPath = filepath.Join(homeDir, ".config", "opencode", "opencode.json")
		}
	case "claude":
		if runtime.GOOS == "windows" {
			appData := os.Getenv("APPDATA")
			configPath = filepath.Join(appData, "Claude", "claude_desktop_config.json")
		} else if runtime.GOOS == "darwin" {
			configPath = filepath.Join(homeDir, "Library", "Application Support", "Claude", "claude_desktop_config.json")
		} else {
			configPath = filepath.Join(homeDir, ".config", "Claude", "claude_desktop_config.json")
		}
	}

	if err := os.MkdirAll(filepath.Dir(configPath), 0755); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create config directories: "+err.Error())
		return
	}

	configData := make(map[string]interface{})
	data, err := os.ReadFile(configPath)
	if err == nil {
		_ = json.Unmarshal(data, &configData)
	}

	mcpServersRaw, ok := configData["mcpServers"]
	if !ok {
		mcpServersRaw = make(map[string]interface{})
	}
	mcpServers, ok := mcpServersRaw.(map[string]interface{})
	if !ok {
		mcpServers = make(map[string]interface{})
	}

	neuronConfig := map[string]interface{}{
		"command": absExecPath,
		"args":    []string{"mcp", "start"},
	}

	mcpServers["neuron"] = neuronConfig
	configData["mcpServers"] = mcpServers

	updatedJSON, err := json.MarshalIndent(configData, "", "  ")
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to encode updated configuration: "+err.Error())
		return
	}

	if err := os.WriteFile(configPath, updatedJSON, 0644); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to write updated configuration: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"path":    configPath,
		"message": fmt.Sprintf("Neuron MCP server successfully registered inside %s configuration!", req.Client),
	})
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}

func (s *Server) handleSystemTemplates(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		templates, err := s.store.ListTemplates(ctx)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, templates)

	case http.MethodPut:
		var req struct {
			TechStack string `json:"tech_stack"`
			AgentsMD  string `json:"agents_md"`
			PlanMD    string `json:"plan_md"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request payload")
			return
		}

		req.TechStack = strings.ToLower(strings.TrimSpace(req.TechStack))
		if req.TechStack == "" || req.AgentsMD == "" || req.PlanMD == "" {
			respondError(w, http.StatusBadRequest, "Missing fields")
			return
		}

		err := s.store.UpdateTemplate(ctx, req.TechStack, req.AgentsMD, req.PlanMD)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, map[string]bool{"success": true})

	default:
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func (s *Server) handleSystemSkills(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		skills, err := s.store.ListCatalogSkills(ctx)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, skills)

	case http.MethodPost:
		var req struct {
			URL       string `json:"url"`
			Label     string `json:"label"`
			TechStack string `json:"tech_stack"`
			IsChecked bool   `json:"is_checked"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request payload")
			return
		}

		req.URL = strings.TrimSpace(req.URL)
		req.Label = strings.TrimSpace(req.Label)
		req.TechStack = strings.ToLower(strings.TrimSpace(req.TechStack))

		if req.URL == "" || req.Label == "" || req.TechStack == "" {
			respondError(w, http.StatusBadRequest, "Missing fields")
			return
		}

		sk := &storage.CatalogSkill{
			URL:       req.URL,
			Label:     req.Label,
			TechStack: req.TechStack,
			IsChecked: req.IsChecked,
		}

		if err := s.store.AddCatalogSkill(ctx, sk); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusCreated, sk)

	case http.MethodPut:
		var req struct {
			URL       string `json:"url"`
			Label     string `json:"label"`
			TechStack string `json:"tech_stack"`
			IsChecked bool   `json:"is_checked"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request payload")
			return
		}

		req.URL = strings.TrimSpace(req.URL)
		req.Label = strings.TrimSpace(req.Label)
		req.TechStack = strings.ToLower(strings.TrimSpace(req.TechStack))

		if req.URL == "" || req.Label == "" || req.TechStack == "" {
			respondError(w, http.StatusBadRequest, "Missing fields")
			return
		}

		sk := &storage.CatalogSkill{
			URL:       req.URL,
			Label:     req.Label,
			TechStack: req.TechStack,
			IsChecked: req.IsChecked,
		}

		if err := s.store.UpdateCatalogSkill(ctx, sk); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, sk)

	case http.MethodDelete:
		url := r.URL.Query().Get("url")
		if url == "" {
			respondError(w, http.StatusBadRequest, "Missing url query parameter")
			return
		}

		if err := s.store.DeleteCatalogSkill(ctx, url); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, map[string]bool{"success": true})

	default:
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func (s *Server) handleShutdown(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Purge pid file if it exists
	configDir, err := os.UserConfigDir()
	if err == nil {
		pidFile := filepath.Join(configDir, "neuron", "neuron.pid")
		_ = os.Remove(pidFile)
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Neuron background server shutting down gracefully...",
	})

	// Spawn asynchronous graceful shutdown in 500ms
	go func() {
		time.Sleep(500 * time.Millisecond)
		fmt.Println("Graceful shutdown requested via Web HUD. Terminating server process.")
		os.Exit(0)
	}()
}
