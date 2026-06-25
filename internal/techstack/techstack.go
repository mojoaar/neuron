package techstack

import (
	"os"
	"path/filepath"
	"strings"
)

type Stack struct {
	ID          string   `json:"id"`
	Label       string   `json:"label"`
	DetectFiles []string `json:"detect_files"`
}

var All = []Stack{
	{ID: "go", Label: "Go (Golang)", DetectFiles: []string{"go.mod"}},
	{ID: "node", Label: "Node.js", DetectFiles: []string{"package.json"}},
	{ID: "nextjs", Label: "Next.js", DetectFiles: []string{"next.config.js", "next.config.mjs"}},
	{ID: "html", Label: "HTML5 Static", DetectFiles: []string{"index.html"}},
	{ID: "python", Label: "Python", DetectFiles: []string{"requirements.txt", "pyproject.toml"}},
	{ID: "android", Label: "Android (Kotlin)", DetectFiles: []string{"build.gradle", "build.gradle.kts"}},
	{ID: "powershell", Label: "PowerShell", DetectFiles: []string{}}, // requires scan
}

func IsValid(id string) bool {
	id = strings.ToLower(strings.TrimSpace(id))
	for _, s := range All {
		if s.ID == id {
			return true
		}
	}
	return false
}

func SupportedList() string {
	var list []string
	for _, s := range All {
		list = append(list, s.ID)
	}
	return strings.Join(list, ", ")
}

func Detect(dirPath string) string {
	// Check standard file signatures
	for _, s := range All {
		for _, f := range s.DetectFiles {
			if _, err := os.Stat(filepath.Join(dirPath, f)); err == nil {
				return s.ID
			}
		}
	}

	// PowerShell specific scan
	if files, err := os.ReadDir(dirPath); err == nil {
		for _, file := range files {
			if !file.IsDir() && strings.HasSuffix(file.Name(), ".ps1") {
				return "powershell"
			}
		}
	}

	return "go" // default fallback
}
