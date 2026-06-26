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
	"sync"
	"time"

	"neuron/internal/export"
	"neuron/internal/scaffold"
	"neuron/internal/storage"
	"neuron/internal/techstack"
)

//go:embed all:frontend/out
var frontendFS embed.FS

type Server struct {
	store      *storage.Storage
	port       int
	cwd        string
	startupCwd string
	httpServer *http.Server
	mu         sync.RWMutex
	version    string
}

func NewServer(store *storage.Storage, port int, version string) *Server {
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
			fmt.Printf("DUCKDB: Loaded locked workspace scope root path setting: %s\n", cwd)
		}
	}

	return &Server{
		store:      store,
		port:       port,
		cwd:        cwd,
		startupCwd: startupCwd,
		version:    version,
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
	mux.HandleFunc("/api/system/settings", s.handleSystemSettings)
	mux.HandleFunc("/api/system/discover", s.handleDiscover)
	mux.HandleFunc("/api/system/db/tables", s.handleDbTables)
	mux.HandleFunc("/api/system/db/table", s.handleDbTable)
	mux.HandleFunc("/api/system/db/truncate", s.handleDbTruncate)
	mux.HandleFunc("/api/system/activity", s.handleActivity)
	mux.HandleFunc("/api/system/api-key", s.handleApiKey)
	mux.HandleFunc("/api/system/mcp/config", s.handleMcpConfig)
	mux.HandleFunc("/api/system/version", s.handleVersion)
	mux.HandleFunc("/api/clusters", s.handleClusters)
	mux.HandleFunc("/api/clusters/", s.handleClusterSubroutes)

	// Security headers middleware — wraps the main mux to set baseline response headers
	securityHeaders := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			w.Header().Set("Referrer-Policy", "same-origin")
			next.ServeHTTP(w, r)
		})
	}

	// Embed static client
	sub, err := fs.Sub(frontendFS, "frontend/out")
	if err != nil {
		// If frontend/out is empty during development, serve a minimal placeholder
		sub = nil
	}

	var indexHTML []byte
	if sub != nil {
		indexHTML, _ = fs.ReadFile(sub, "index.html")
	}

	var fileServer http.Handler
	if sub != nil {
		fileServer = http.FileServer(http.FS(sub))
	}

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if sub == nil {
			http.Error(w, "Frontend assets not compiled. Run 'make build' first.", http.StatusNotFound)
			return
		}
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

	s.httpServer = &http.Server{
		Addr:         addr,
		Handler:      securityHeaders(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}
	return s.httpServer.ListenAndServe()
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
			Name          string   `json:"name"`
			Path          string   `json:"path"`
			TechStack     string   `json:"tech_stack"`
			SkillURLs     []string `json:"skill_urls"`
			TrackExisting bool     `json:"track_existing"`
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

		if !techstack.IsValid(req.TechStack) {
			respondError(w, http.StatusBadRequest, "Unsupported tech stack (supported: " + techstack.SupportedList() + ")")
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

		if !req.TrackExisting {
			// For fresh provisioning: check that target directory is empty (skip for tracked projects)
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

			if err := scaffold.ScaffoldProject(req.Name, absPath, req.TechStack, planTemplate); err != nil {
				respondError(w, http.StatusInternalServerError, "Scaffolding failed: "+err.Error())
				return
			}

			if err := scaffold.GenerateAgentsContext(req.Name, absPath, req.TechStack, agentsTemplate); err != nil {
				respondError(w, http.StatusInternalServerError, "Failed to generate AGENTS.md context: "+err.Error())
				return
			}
		} else {
			// For tracked pre-existing projects: set up TUI compatibility without touching existing files
			if err := scaffold.EnsureTUICompatibility(absPath); err != nil {
				fmt.Printf("Warning: failed to set up TUI compatibility: %v\n", err)
			}
		}

		// Save project to database
		pid := req.Name
		p := &storage.Project{
			ID:        pid,
			Name:      req.Name,
			Path:      absPath,
			TechStack: req.TechStack,
		}

		if err := s.store.AddProject(ctx, p); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to register project in database: "+err.Error())
			return
		}

		// Save default skills to DuckDB
		defaultSkills := scaffold.GetDefaultSkills(p.Name, p.TechStack)
		for _, sk := range defaultSkills {
			sk.ProjectID = p.ID
			sk.ID = p.ID + "_" + sk.ID
			if err := s.store.AddSkill(ctx, sk); err != nil {
				fmt.Printf("Warning: failed to add default skill %s: %v\n", sk.ID, err)
			}
		}

		// Write default skills as SKILL.md files inside .agents/skills/neuron/ (for TUI agent discovery)
		if req.TrackExisting {
			if err := scaffold.WriteDefaultSkillFiles(absPath, defaultSkills); err != nil {
				fmt.Printf("Warning: failed to write default skill files: %v\n", err)
			}

			// Auto-install recommended catalog skills for the tech stack
			catalogSkills, _ := s.store.ListCatalogSkills(ctx)
			for _, cs := range catalogSkills {
				if cs.TechStack != req.TechStack || !cs.IsChecked {
					continue
				}
				sk, err := scaffold.DownloadRemoteSkill(absPath, cs.URL)
				if err != nil {
					fmt.Printf("Warning: failed to download catalog skill '%s': %v\n", cs.Label, err)
					continue
				}
				sk.ProjectID = p.ID
				sk.ID = p.ID + "_" + sk.ID
				if err := s.store.AddSkill(ctx, sk); err != nil {
					fmt.Printf("Warning: failed to add catalog skill '%s': %v\n", cs.Label, err)
				}
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

		// Auto-export all active skills (skip for tracked projects to avoid modifying their files)
		if !req.TrackExisting {
			skills, err := s.store.ListSkillsByProject(ctx, p.ID)
			if err == nil && len(skills) > 0 {
				var exportErr error
				switch strings.ToLower(p.TechStack) {
				case "go", "html", "python", "android":
					exportErr = export.ExportToGoMakefile(p.Path, skills)
				case "node", "nextjs":
					exportErr = export.ExportToNodePackageJSON(p.Path, skills)
				}
				if exportErr != nil {
					fmt.Printf("Warning: failed to auto-export skills on provision: %v\n", exportErr)
				}
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

			targetTask, err := s.store.GetTask(ctx, taskID)
			if err != nil {
				respondError(w, http.StatusNotFound, "Task not found: "+err.Error())
				return
			}

			if targetTask.ProjectID != projectID {
				respondError(w, http.StatusForbidden, "Task does not belong to this project")
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
					exportErr = export.ExportToGoMakefile(proj.Path, skills)
				case "node", "nextjs":
					exportErr = export.ExportToNodePackageJSON(proj.Path, skills)
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
							_ = export.ExportToGoMakefile(proj.Path, updatedSkills)
						case "node", "nextjs":
							_ = export.ExportToNodePackageJSON(proj.Path, updatedSkills)
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
							_ = export.ExportToGoMakefile(proj.Path, updatedSkills)
						case "node", "nextjs":
							_ = export.ExportToNodePackageJSON(proj.Path, updatedSkills)
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
			r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
			var req struct {
				Content string `json:"content"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondError(w, http.StatusBadRequest, "Invalid payload or payload too large")
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
			r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
			var req struct {
				Content string `json:"content"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondError(w, http.StatusBadRequest, "Invalid payload or payload too large")
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

	case "readme":
		proj, err := s.store.GetProject(ctx, projectID)
		if err != nil {
			respondError(w, http.StatusNotFound, err.Error())
			return
		}
		switch r.Method {
		case http.MethodGet:
			readmePath := filepath.Join(proj.Path, "README.md")
			content, err := os.ReadFile(readmePath)
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
			r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
			var req struct {
				Content string `json:"content"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondError(w, http.StatusBadRequest, "Invalid payload or payload too large")
				return
			}
			readmePath := filepath.Join(proj.Path, "README.md")
			if err := os.WriteFile(readmePath, []byte(req.Content), 0644); err != nil {
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, map[string]bool{"success": true})

		default:
			respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		}

	case "license":
		proj, err := s.store.GetProject(ctx, projectID)
		if err != nil {
			respondError(w, http.StatusNotFound, err.Error())
			return
		}
		switch r.Method {
		case http.MethodGet:
			licensePath := filepath.Join(proj.Path, "LICENSE")
			content, err := os.ReadFile(licensePath)
			if err != nil {
				if os.IsNotExist(err) {
					respondJSON(w, http.StatusOK, map[string]string{"license": "", "template": ""})
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, map[string]string{"license": string(content), "template": ""})

		case http.MethodPost:
			var req struct {
				Name string `json:"name"` // license name: mit, gpl-3.0, etc.
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondError(w, http.StatusBadRequest, "Invalid payload")
				return
			}
			req.Name = strings.ToLower(strings.TrimSpace(req.Name))
			if req.Name == "" {
				respondError(w, http.StatusBadRequest, "Missing license name")
				return
			}
			template := storage.GetLicenseTemplate(req.Name)
			if template == "" {
				respondError(w, http.StatusBadRequest, "Unsupported license type")
				return
			}
			licensePath := filepath.Join(proj.Path, "LICENSE")
			if err := os.WriteFile(licensePath, []byte(template), 0644); err != nil {
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
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

		gitCtx, gitCancel := context.WithTimeout(ctx, 15*time.Second)
		defer gitCancel()

		cmd := exec.CommandContext(gitCtx, "git", "rev-parse", "--is-inside-work-tree")
		cmd.Dir = proj.Path
		if err := cmd.Run(); err != nil {
			respondJSON(w, http.StatusOK, map[string]interface{}{"is_repo": false})
			return
		}

		branchCmd := exec.CommandContext(gitCtx, "git", "branch", "--show-current")
		branchCmd.Dir = proj.Path
		branchBytes, _ := branchCmd.Output()
		branchName := strings.TrimSpace(string(branchBytes))

		commitCmd := exec.CommandContext(gitCtx, "git", "rev-parse", "--short", "HEAD")
		commitCmd.Dir = proj.Path
		commitBytes, _ := commitCmd.Output()
		commitHash := strings.TrimSpace(string(commitBytes))

		statusCmd := exec.CommandContext(gitCtx, "git", "status", "--porcelain")
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

	case "check":
		proj, err := s.store.GetProject(ctx, projectID)
		if err != nil {
			respondError(w, http.StatusNotFound, err.Error())
			return
		}
		if r.Method != http.MethodGet {
			respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
			return
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
		case "android":
			testCmd = exec.CommandContext(timeoutCtx, "./gradlew", "test")
			lintCmd = exec.CommandContext(timeoutCtx, "./gradlew", "lint")
		default:
			testCmd = exec.CommandContext(timeoutCtx, "echo", "No test command configured")
			lintCmd = exec.CommandContext(timeoutCtx, "echo", "No linter command configured")
		}

		testCmd.Dir = proj.Path
		testBytes, _ := testCmd.CombinedOutput()
		testPassed := testCmd.ProcessState != nil && testCmd.ProcessState.Success()

		lintCmd.Dir = proj.Path
		lintBytes, _ := lintCmd.CombinedOutput()
		lintPassed := lintCmd.ProcessState != nil && lintCmd.ProcessState.Success()

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"test_passed": testPassed,
			"test_output": string(testBytes),
			"lint_passed": lintPassed,
			"lint_output": string(lintBytes),
			"checked_at":  time.Now().Format(time.RFC3339),
		})

	default:
		respondError(w, http.StatusNotFound, "Not Found")
	}
}

func generateID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		panic("crypto/rand failed to generate secure entropy: " + err.Error())
	}
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
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		fmt.Printf("Warning: refusing to open non-http URL in browser: %s\n", url)
		return
	}

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
		Client string `json:"client"` // "opencode", "claude", or "claude-code"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	clientType := strings.ToLower(strings.TrimSpace(req.Client))
	if clientType != "opencode" && clientType != "claude" && clientType != "claude-code" {
		respondError(w, http.StatusBadRequest, "Invalid client type (supported: opencode, claude, claude-code)")
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
		} else {
			configPath = filepath.Join(homeDir, "Library", "Application Support", "Claude", "claude_desktop_config.json")
		}
	case "claude-code":
		configPath = filepath.Join(homeDir, ".claude.json")
	}

	if err := os.MkdirAll(filepath.Dir(configPath), 0755); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create config directories: "+err.Error())
		return
	}

	configData := make(map[string]interface{})
	data, err := os.ReadFile(configPath)
	if err == nil {
		if err := json.Unmarshal(data, &configData); err != nil {
			fmt.Printf("Warning: failed to parse existing MCP client config file: %v\n", err)
		}
	}

	// Per-client top-level key and entry format
	var mcpKey string
	var neuronConfig map[string]interface{}

	if clientType == "opencode" {
		mcpKey = "mcp"
		neuronConfig = map[string]interface{}{
			"type":    "local",
			"command": []string{absExecPath, "mcp", "start"},
			"enabled": true,
		}
	} else {
		mcpKey = "mcpServers"
		neuronConfig = map[string]interface{}{
			"type":    "stdio",
			"command": absExecPath,
			"args":    []string{"mcp", "start"},
		}
	}

	mcpRaw, ok := configData[mcpKey]
	if !ok {
		mcpRaw = make(map[string]interface{})
	}
	mcpData, ok := mcpRaw.(map[string]interface{})
	if !ok {
		mcpData = make(map[string]interface{})
	}

	mcpData["neuron"] = neuronConfig
	configData[mcpKey] = mcpData

	updatedJSON, err := json.MarshalIndent(configData, "", "  ")
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to encode updated configuration: "+err.Error())
		return
	}

	// Backup existing config before overwriting
	if origData, err := os.ReadFile(configPath); err == nil {
		_ = os.WriteFile(configPath+".bak", origData, 0644)
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

// handleMcpConfig returns the formatted JSON snippet for a client type that the user can copy-paste.
func (s *Server) handleMcpConfig(w http.ResponseWriter, r *http.Request) {
	client := r.URL.Query().Get("client")
	if client != "opencode" && client != "claude" && client != "claude-code" {
		respondError(w, http.StatusBadRequest, "Invalid client (supported: opencode, claude, claude-code)")
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

	var config map[string]interface{}
	if client == "opencode" {
		config = map[string]interface{}{
			"mcp": map[string]interface{}{
				"neuron": map[string]interface{}{
					"type":    "local",
					"command": []string{absExecPath, "mcp", "start"},
					"enabled": true,
				},
			},
		}
	} else {
		config = map[string]interface{}{
			"mcpServers": map[string]interface{}{
				"neuron": map[string]interface{}{
					"type":    "stdio",
					"command": absExecPath,
					"args":    []string{"mcp", "start"},
				},
			},
		}
	}

	raw, _ := json.MarshalIndent(config, "", "  ")
	respondJSON(w, http.StatusOK, map[string]string{"config": string(raw)})
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
		if err := os.Remove(pidFile); err != nil && !os.IsNotExist(err) {
			fmt.Printf("Warning: failed to remove PID file on shutdown: %v\n", err)
		}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Neuron background server shutting down gracefully...",
	})

	// Spawn asynchronous graceful shutdown in 500ms
	go func() {
		time.Sleep(500 * time.Millisecond)
		fmt.Println("Graceful shutdown requested via Web HUD. Terminating server process.")

		// Drain in-flight connections gracefully
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if s.httpServer != nil {
			_ = s.httpServer.Shutdown(ctx)
		}

		// Close DuckDB database connections and release exclusive lock
		if s.store != nil {
			_ = s.store.Close()
		}

		os.Exit(0)
	}()
}

func (s *Server) handleDiscover(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	entries, err := os.ReadDir(s.cwd)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to read active directory: "+err.Error())
		return
	}

	projects, err := s.store.ListProjects(ctx)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	registeredPaths := make(map[string]bool)
	for _, p := range projects {
		registeredPaths[filepath.Clean(p.Path)] = true
	}

	type DiscoveredFolder struct {
		Name      string `json:"name"`
		Path      string `json:"path"`
		TechStack string `json:"tech_stack"`
	}

	var discovered []DiscoveredFolder

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		name := entry.Name()
		if strings.HasPrefix(name, ".") || name == "node_modules" || name == "vendor" || name == "dist" || name == "out" {
			continue
		}

		absPath := filepath.Join(s.cwd, name)
		cleanedPath := filepath.Clean(absPath)

		if !registeredPaths[cleanedPath] {
			detected := techstack.Detect(absPath)
			discovered = append(discovered, DiscoveredFolder{
				Name:      name,
				Path:      absPath,
				TechStack: detected,
			})
		}
	}

	respondJSON(w, http.StatusOK, discovered)
}

func (s *Server) handleSystemSettings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		key := r.URL.Query().Get("key")
		if key == "" {
			respondError(w, http.StatusBadRequest, "Missing key parameter")
			return
		}
		val, err := s.store.GetSetting(ctx, key)
		if err != nil {
			respondJSON(w, http.StatusOK, map[string]string{"key": key, "value": ""})
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"key": key, "value": val})

	case http.MethodPost:
		var req struct {
			Key   string `json:"key"`
			Value string `json:"value"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		if req.Key == "" {
			respondError(w, http.StatusBadRequest, "Missing key")
			return
		}
		if err := s.store.SaveSetting(ctx, req.Key, req.Value); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"key": req.Key, "value": req.Value})

	case http.MethodDelete:
		key := r.URL.Query().Get("key")
		if key == "" {
			respondError(w, http.StatusBadRequest, "Missing key")
			return
		}
		if err := s.store.DeleteSetting(ctx, key); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, map[string]bool{"success": true})

	default:
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func (s *Server) handleDbTables(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	tables, err := s.store.ListTableNames(ctx)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to load database tables: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, tables)
}

func (s *Server) handleDbTable(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tableName := r.URL.Query().Get("name")
	if tableName == "" {
		respondError(w, http.StatusBadRequest, "Missing name query parameter")
		return
	}

	switch r.Method {
	case http.MethodGet:
		columns, rows, err := s.store.QueryTableData(ctx, tableName)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"columns": columns,
			"rows":    rows,
		})

	case http.MethodDelete:
		if tableName != "projects" {
			respondError(w, http.StatusBadRequest, "Deletion only allowed for projects table")
			return
		}

		projectID := r.URL.Query().Get("id")
		if projectID == "" {
			respondError(w, http.StatusBadRequest, "Missing project id query parameter")
			return
		}

		if err := s.store.DeleteProject(ctx, projectID); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to delete project: "+err.Error())
			return
		}

		respondJSON(w, http.StatusOK, map[string]bool{"success": true})

	default:
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func (s *Server) handleDbTruncate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	ctx := r.Context()
	if err := s.store.TruncateAllTables(ctx); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to truncate database: "+err.Error())
		return
	}

	// Reset server CWD to startup default
	s.cwd = s.startupCwd

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "All DuckDB tables purged and catalog entries re-seeded successfully.",
	})
}

// handleActivity returns recent activity log entries.
func (s *Server) handleActivity(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	entries, err := s.store.ListActivity(r.Context(), 200)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, entries)
}

// handleApiKey returns or regenerates the API authentication key.
func (s *Server) handleApiKey(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		key, err := s.store.GetSetting(ctx, "api_key")
		if err != nil {
			// Auto-generate one if missing
			b := make([]byte, 32)
			if _, err := rand.Read(b); err != nil {
				respondError(w, http.StatusInternalServerError, "Failed to generate API key")
				return
			}
			key = hex.EncodeToString(b)
			if err := s.store.SaveSetting(ctx, "api_key", key); err != nil {
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
		}
		respondJSON(w, http.StatusOK, map[string]string{"api_key": key})

	case http.MethodPost:
		b := make([]byte, 32)
		if _, err := rand.Read(b); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to generate API key")
			return
		}
		key := hex.EncodeToString(b)
		if err := s.store.SaveSetting(ctx, "api_key", key); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"api_key": key})

	default:
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

// handleVersion returns the application version.
func (s *Server) handleVersion(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"version": s.version})
}

func (s *Server) handleClusters(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		clusters, err := s.store.ListClusters(ctx)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, clusters)

	case http.MethodPost:
		var req struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request payload")
			return
		}

		req.Name = strings.TrimSpace(req.Name)
		if req.Name == "" {
			respondError(w, http.StatusBadRequest, "Missing cluster name")
			return
		}

		c := &storage.Cluster{
			ID:   generateID(),
			Name: req.Name,
		}

		if err := s.store.AddCluster(ctx, c); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusCreated, c)

	default:
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func (s *Server) handleClusterSubroutes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/clusters/"), "/")
	if len(parts) < 1 || parts[0] == "" {
		respondError(w, http.StatusNotFound, "Not Found")
		return
	}

	clusterID := parts[0]

	// /{id}/projects sub-route
	if len(parts) > 1 && parts[1] == "projects" {
		switch r.Method {
		case http.MethodGet:
			projects, err := s.store.ListClusterProjects(ctx, clusterID)
			if err != nil {
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, projects)

		case http.MethodPost:
			var req struct {
				ProjectID string `json:"project_id"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondError(w, http.StatusBadRequest, "Invalid request payload")
				return
			}

			if err := s.store.AddProjectToCluster(ctx, clusterID, req.ProjectID); err != nil {
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, map[string]bool{"success": true})

		case http.MethodDelete:
			projectID := r.URL.Query().Get("project_id")
			if projectID == "" {
				respondError(w, http.StatusBadRequest, "Missing project_id query parameter")
				return
			}

			if err := s.store.RemoveProjectFromCluster(ctx, clusterID, projectID); err != nil {
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, map[string]bool{"success": true})

		default:
			respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
		return
	}

	// Direct /{id} route
	if r.Method == http.MethodDelete {
		if err := s.store.DeleteCluster(ctx, clusterID); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, map[string]bool{"success": true})
		return
	}

	respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
}
