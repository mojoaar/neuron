package scaffold

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"neuron/internal/storage"
)

type RemoteSkillPayload struct {
	Slug        string      `json:"slug"`
	Name        string      `json:"name"`
	Owner       string      `json:"owner"`
	Description string      `json:"description"`
	SkillMd     string      `json:"skillMd"`
	SkillFiles  []SkillFile `json:"skillFiles"`
}

type SkillFile struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

// GetDefaultSkills returns the standard list of automation skills for the given tech stack.
func GetDefaultSkills(projectName, tech string) []*storage.Skill {
	switch strings.ToLower(tech) {
	case "go":
		return []*storage.Skill{
			{
				ID:             "build",
				Name:           "build",
				Description:    "Build production binary",
				TriggerPattern: "^build$",
				ExecutionType:  "script",
				ExecutionPath:  fmt.Sprintf("go build -o %s main.go", projectName),
			},
			{
				ID:             "run",
				Name:           "run",
				Description:    "Execute standard run routine",
				TriggerPattern: "^run$",
				ExecutionType:  "script",
				ExecutionPath:  "go run main.go",
			},
			{
				ID:             "test",
				Name:           "test",
				Description:    "Execute complete unit tests",
				TriggerPattern: "^test$",
				ExecutionType:  "script",
				ExecutionPath:  "go test ./...",
			},
		}

	case "node":
		return []*storage.Skill{
			{
				ID:             "start",
				Name:           "start",
				Description:    "Boot local runtime entrypoint",
				TriggerPattern: "^start$",
				ExecutionType:  "script",
				ExecutionPath:  "node index.js",
			},
			{
				ID:             "test",
				Name:           "test",
				Description:    "Execute test scripts",
				TriggerPattern: "^test$",
				ExecutionType:  "script",
				ExecutionPath:  "npm test",
			},
		}

	case "html":
		return []*storage.Skill{
			{
				ID:             "serve",
				Name:           "serve",
				Description:    "Launch local static browser server",
				TriggerPattern: "^serve$",
				ExecutionType:  "script",
				ExecutionPath:  "python3 -m http.server 8000",
			},
		}

	case "powershell":
		return []*storage.Skill{
			{
				ID:             "run",
				Name:           "run",
				Description:    "Execute script file with bypass check",
				TriggerPattern: "^run$",
				ExecutionType:  "script",
				ExecutionPath:  "PowerShell -ExecutionPolicy Bypass -File .\\script.ps1",
			},
		}

	case "nextjs":
		return []*storage.Skill{
			{
				ID:             "dev",
				Name:           "dev",
				Description:    "Boot Next.js development hot-reloader",
				TriggerPattern: "^dev$",
				ExecutionType:  "script",
				ExecutionPath:  "next dev",
			},
			{
				ID:             "build",
				Name:           "build",
				Description:    "Compile production build",
				TriggerPattern: "^build$",
				ExecutionType:  "script",
				ExecutionPath:  "next build",
			},
			{
				ID:             "start",
				Name:           "start",
				Description:    "Launch production server",
				TriggerPattern: "^start$",
				ExecutionType:  "script",
				ExecutionPath:  "next start",
			},
		}

	case "python":
		return []*storage.Skill{
			{
				ID:             "run",
				Name:           "run",
				Description:    "Run local python script",
				TriggerPattern: "^run$",
				ExecutionType:  "script",
				ExecutionPath:  "python3 main.py",
			},
			{
				ID:             "test",
				Name:           "test",
				Description:    "Discover and run package unit tests",
				TriggerPattern: "^test$",
				ExecutionType:  "script",
				ExecutionPath:  "python3 -m unittest discover",
			},
		}

	case "android":
		return []*storage.Skill{
			{
				ID:             "build",
				Name:           "build",
				Description:    "Compile Android Gradle project",
				TriggerPattern: "^build$",
				ExecutionType:  "script",
				ExecutionPath:  "./gradlew assembleDebug",
			},
			{
				ID:             "test",
				Name:           "test",
				Description:    "Run local JVM unit tests",
				TriggerPattern: "^test$",
				ExecutionType:  "script",
				ExecutionPath:  "./gradlew test",
			},
			{
				ID:             "run",
				Name:           "run",
				Description:    "Install and boot debug APK on device",
				TriggerPattern: "^run$",
				ExecutionType:  "script",
				ExecutionPath:  "./gradlew installDebug",
			},
		}
	}

	return nil
}

// EnsureTUICompatibility sets up the zero-footprint mutual symlinks (.claude/skills -> ../.agents/skills) to ensure full compatibility with Claude TUI and OpenCode TUI.
func EnsureTUICompatibility(projectPath string) error {
	agentsSkillsDir := filepath.Join(projectPath, ".agents", "skills")
	if err := os.MkdirAll(agentsSkillsDir, 0755); err != nil {
		return fmt.Errorf("failed to create .agents/skills directory: %w", err)
	}

	claudeDir := filepath.Join(projectPath, ".claude")
	if err := os.MkdirAll(claudeDir, 0755); err != nil {
		return fmt.Errorf("failed to create .claude directory: %w", err)
	}

	claudeSkillsSymlink := filepath.Join(claudeDir, "skills")
	if err := os.Remove(claudeSkillsSymlink); err != nil && !os.IsNotExist(err) {
		fmt.Printf("Warning: failed to clear .claude/skills symlink: %v\n", err)
	}

	// Create relative symlink: .claude/skills -> ../.agents/skills
	err := os.Symlink("../.agents/skills", claudeSkillsSymlink)
	if err != nil {
		// Fallback for systems without symlink privileges
		fallbackDir := filepath.Join(claudeDir, "skills")
		if err := os.MkdirAll(fallbackDir, 0755); err != nil {
			fmt.Printf("Warning: failed to create fallback directory for skills: %v\n", err)
		}
	}

	return nil
}

// DownloadRemoteSkill fetches a skill from agentskill.sh, saves it locally under the project, and returns the DB struct.
func DownloadRemoteSkill(projectPath, urlStr string) (*storage.Skill, error) {
	urlStr = strings.TrimSpace(urlStr)
	if urlStr == "" {
		return nil, fmt.Errorf("empty URL")
	}

	slug := urlStr
	if strings.Contains(slug, "agentskill.sh/") {
		parts := strings.Split(slug, "agentskill.sh/")
		slug = parts[len(parts)-1]
	}
	slug = strings.TrimPrefix(slug, "@")
	slug = strings.TrimPrefix(slug, "api/agent/skills/")
	slug = strings.TrimSuffix(slug, "/install")
	slug = strings.TrimSuffix(slug, "/")

	// Slug should now be owner/name
	slugParts := strings.Split(slug, "/")
	if len(slugParts) < 2 {
		return nil, fmt.Errorf("invalid skill slug or URL format: %s", urlStr)
	}
	owner := slugParts[0]
	name := slugParts[1]

	apiURL := fmt.Sprintf("https://agentskill.sh/api/agent/skills/%s/%s/install", owner, name)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(apiURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to agentskill.sh: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("agentskill.sh API returned HTTP status %d", resp.StatusCode)
	}

	// Limit download size to 1 MB max to prevent memory bloat DOS
	limitedBody := io.LimitReader(resp.Body, 1<<20)

	var payload RemoteSkillPayload
	if err := json.NewDecoder(limitedBody).Decode(&payload); err != nil {
		return nil, fmt.Errorf("failed to decode response JSON: %w", err)
	}

	if len(payload.SkillFiles) > 20 {
		return nil, fmt.Errorf("remote skill contains too many auxiliary files (max 20)")
	}

	if len(payload.SkillMd) > 500000 {
		return nil, fmt.Errorf("remote SKILL.md size exceeds maximum allowed capacity")
	}

	// Ensure TUI symlinks exist
	if err := EnsureTUICompatibility(projectPath); err != nil {
		return nil, err
	}

	// Create local directories under .agents/skills/owner/name
	localSkillDir := filepath.Join(projectPath, ".agents", "skills", owner, name)
	localSkillDirAbs, err := filepath.Abs(localSkillDir)
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute local path: %w", err)
	}

	if err := os.MkdirAll(localSkillDirAbs, 0755); err != nil {
		return nil, fmt.Errorf("failed to create skill directory: %w", err)
	}

	// Allowed plaintext configuration / instruction extensions
	allowedExts := map[string]bool{
		".md":         true,
		".json":       true,
		".yaml":       true,
		".yml":        true,
		".toml":       true,
		".txt":        true,
		".sh":         true,
		".py":         true,
		".js":         true,
		".ts":         true,
		".ps1":        true,
		".cfg":        true,
		".conf":       true,
		".go":         true,
		".html":       true,
		".css":        true,
		".properties": true,
	}

	// Write SKILL.md
	skillMdPath := filepath.Join(localSkillDirAbs, "SKILL.md")
	if err := os.WriteFile(skillMdPath, []byte(payload.SkillMd), 0644); err != nil {
		return nil, fmt.Errorf("failed to write SKILL.md: %w", err)
	}

	// Write auxiliary files
	for _, sf := range payload.SkillFiles {
		ext := strings.ToLower(filepath.Ext(sf.Path))
		if !allowedExts[ext] && sf.Path != "SKILL.md" {
			return nil, fmt.Errorf("file type not allowed for custom skills: %s", sf.Path)
		}

		// Prevent path traversal escapes
		sfPath := filepath.Join(localSkillDirAbs, sf.Path)
		sfPathAbs, err := filepath.Abs(sfPath)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve absolute file path: %w", err)
		}

		if !strings.HasPrefix(sfPathAbs, localSkillDirAbs) {
			return nil, fmt.Errorf("malicious path traversal detected in auxiliary skill files: %s", sf.Path)
		}

		if err := os.MkdirAll(filepath.Dir(sfPathAbs), 0755); err != nil {
			return nil, fmt.Errorf("failed to create subdirectories for skill file: %w", err)
		}
		if err := os.WriteFile(sfPathAbs, []byte(sf.Content), 0644); err != nil {
			return nil, fmt.Errorf("failed to write auxiliary skill file %s: %w", sf.Path, err)
		}
	}

	// Prepare database skill struct
	sk := &storage.Skill{
		ID:             name,
		ProjectID:      "", // Will be set by caller
		Name:           name,
		Description:    payload.Description,
		TriggerPattern: fmt.Sprintf("^%s$", name),
		ExecutionType:  "script",
		ExecutionPath:  fmt.Sprintf("./.agents/skills/%s/%s/SKILL.md", owner, name),
	}

	return sk, nil
}

// WriteDefaultSkillFiles writes built-in default skill definitions as SKILL.md files inside .agents/skills/neuron/
// so that filesystem-scanning AI agents (Claude TUI, OpenCode TUI) can discover them without MCP.
func WriteDefaultSkillFiles(projectPath string, skills []*storage.Skill) error {
	for _, sk := range skills {
		skillDir := filepath.Join(projectPath, ".agents", "skills", "neuron", sk.Name)
		if err := os.MkdirAll(skillDir, 0755); err != nil {
			return fmt.Errorf("failed to create skill directory %s: %w", skillDir, err)
		}

		content := fmt.Sprintf(`# %s

**Description:** %s
**Trigger:** %s
**Execution Type:** %s
**Execution Path:** %s
`, sk.Name, sk.Description, sk.TriggerPattern, sk.ExecutionType, sk.ExecutionPath)

		skillPath := filepath.Join(skillDir, "SKILL.md")
		if err := os.WriteFile(skillPath, []byte(content), 0644); err != nil {
			return fmt.Errorf("failed to write SKILL.md at %s: %w", skillPath, err)
		}
	}
	return nil
}
