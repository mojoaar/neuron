package cmd

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"neuron/internal/export"
	"neuron/internal/scaffold"
	"neuron/internal/storage"
	"neuron/internal/techstack"

	"github.com/spf13/cobra"
)

var (
	techStack   string
	targetPath  string
	skillsInput string

	initCmd = &cobra.Command{
		Use:   "init [project-name]",
		Short: "Initialize a new project scaffolded with high-signal context",
		Long:  `Creates a clean, standard project scaffold with a template-specific AGENTS.md file and instantly registers it with Neuron's DuckDB database.`,
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			projectName := args[0]
			tech := strings.ToLower(techStack)

			if !techstack.IsValid(tech) {
				return fmt.Errorf("unsupported tech stack '%s' (supported: %s)", techStack, techstack.SupportedList())
			}

			p := targetPath
			if p == "" {
				p = filepath.Join(".", projectName)
			}

			absPath, err := filepath.Abs(p)
			if err != nil {
				return fmt.Errorf("failed to resolve absolute path: %w", err)
			}

			if err := os.MkdirAll(absPath, 0755); err != nil {
				return fmt.Errorf("failed to create directory %s: %w", absPath, err)
			}

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
					return fmt.Errorf("target directory %s is not empty", absPath)
				}
			}

			fmt.Printf("Scaffolding %s project in %s...\n", tech, absPath)

			ctx := context.Background()
			tmpl, err := store.GetTemplate(ctx, tech)
			var agentsTemplate, planTemplate string
			if err == nil {
				agentsTemplate = tmpl.AgentsMD
				planTemplate = tmpl.PlanMD
			} else {
				agentsTemplate = storage.GetDefaultAgentsTemplate(tech)
				planTemplate = storage.GetDefaultPlanTemplate(tech)
			}

			if err := scaffold.ScaffoldProject(projectName, absPath, tech, planTemplate); err != nil {
				return fmt.Errorf("scaffolding failed: %w", err)
			}

			if err := scaffold.GenerateAgentsContext(projectName, absPath, tech, agentsTemplate); err != nil {
				return fmt.Errorf("failed to generate AGENTS.md context: %w", err)
			}

			proj := &storage.Project{
				ID:        projectName,
				Name:      projectName,
				Path:      absPath,
				TechStack: tech,
			}

			if err := store.AddProject(ctx, proj); err != nil {
				return fmt.Errorf("scaffolding succeeded but failed to register project in database: %w", err)
			}

			// Save default skills
			defaultSkills := scaffold.GetDefaultSkills(projectName, tech)
			for _, sk := range defaultSkills {
				sk.ProjectID = projectName
				sk.ID = projectName + "_" + sk.ID
				if err := store.AddSkill(ctx, sk); err != nil {
					fmt.Printf("Warning: failed to add default skill %s: %v\n", sk.ID, err)
				}
			}

			// Download and save remote skills
			if skillsInput != "" {
				urls := strings.Split(skillsInput, ",")
				for _, url := range urls {
					url = strings.TrimSpace(url)
					if url == "" {
						continue
					}
					fmt.Printf("Downloading remote skill: %s ...\n", url)
					sk, err := scaffold.DownloadRemoteSkill(absPath, url)
					if err != nil {
						fmt.Printf("Warning: failed to download remote skill %s: %v\n", url, err)
						continue
					}
					sk.ProjectID = projectName
					sk.ID = projectName + "_" + sk.ID
					if err := store.AddSkill(ctx, sk); err != nil {
						fmt.Printf("Warning: failed to add remote skill %s: %v\n", sk.ID, err)
					}
				}
			}

			// Auto-export all skills to the project manifest
			skills, err := store.ListSkillsByProject(ctx, projectName)
			if err == nil && len(skills) > 0 {
				var exportErr error
				switch strings.ToLower(tech) {
				case "go", "html", "python", "android":
					exportErr = export.ExportToGoMakefile(absPath, skills)
				case "node", "nextjs":
					exportErr = export.ExportToNodePackageJSON(absPath, skills)
				}
				if exportErr != nil {
					fmt.Printf("Warning: failed to auto-export skills: %v\n", exportErr)
				}
			}

			fmt.Printf("\nProject '%s' successfully initialized and registered!\n", projectName)
			fmt.Printf("Target directory: %s\n", absPath)
			return nil
		},
	}
)

func init() {
	initCmd.Flags().StringVarP(&techStack, "tech", "t", "go", "tech stack to use (go, node, html, powershell, nextjs, python, android)")
	initCmd.Flags().StringVarP(&targetPath, "path", "p", "", "destination path (defaults to ./[project-name])")
	initCmd.Flags().StringVarP(&skillsInput, "skills", "s", "", "comma-separated list of agentskill.sh URLs to install")
	rootCmd.AddCommand(initCmd)
}
