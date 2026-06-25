package export

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"neuron/internal/storage"
)

func ExportToGoMakefile(projPath string, skills []*storage.Skill) error {
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

func ExportToNodePackageJSON(projPath string, skills []*storage.Skill) error {
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
