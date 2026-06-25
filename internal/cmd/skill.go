package cmd

import (
	"context"
	"fmt"
	"strings"

	"neuron/internal/export"
	"neuron/internal/storage"

	"github.com/spf13/cobra"
)

var (
	skillDesc    string
	skillTrigger string

	skillCmd = &cobra.Command{
		Use:   "skill",
		Short: "Manage project skills registered with Neuron",
	}

	skillListCmd = &cobra.Command{
		Use:   "list [project-id]",
		Short: "List all skills registered for a project",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := context.Background()
			projectID := args[0]

			_, err := store.GetProject(ctx, projectID)
			if err != nil {
				return err
			}

			skills, err := store.ListSkillsByProject(ctx, projectID)
			if err != nil {
				return err
			}

			if len(skills) == 0 {
				fmt.Println("No skills registered for this project.")
				return nil
			}

			fmt.Printf("%-15s %-20s %-12s %s\n", "ID", "NAME", "TYPE", "EXECUTION PATH")
			fmt.Println("----------------------------------------------------------------------")
			for _, sk := range skills {
				fmt.Printf("%-15s %-20s %-12s %s\n", sk.ID, sk.Name, sk.ExecutionType, sk.ExecutionPath)
			}
			return nil
		},
	}

	skillAddCmd = &cobra.Command{
		Use:   "add [project-id] [skill-id] [name] [execution-type] [execution-path]",
		Short: "Register a new conceptual skill mapping to a codebase path",
		Args:  cobra.ExactArgs(5),
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := context.Background()
			projectID := args[0]
			skillID := args[1]
			name := args[2]
			execType := args[3]
			execPath := args[4]

			if execType != "script" && execType != "binary" && execType != "mcp" {
				return fmt.Errorf("invalid execution type '%s' (supported: script, binary, mcp)", execType)
			}

			_, err := store.GetProject(ctx, projectID)
			if err != nil {
				return err
			}

			sk := &storage.Skill{
				ID:             skillID,
				ProjectID:      projectID,
				Name:           name,
				Description:    skillDesc,
				TriggerPattern: skillTrigger,
				ExecutionType:  execType,
				ExecutionPath:  execPath,
			}

			if err := store.AddSkill(ctx, sk); err != nil {
				return err
			}

			fmt.Printf("Successfully registered skill '%s' (%s) for project '%s'.\n", sk.Name, sk.ID, projectID)
			return nil
		},
	}

	skillExportCmd = &cobra.Command{
		Use:   "export [project-id]",
		Short: "Export registered database skills to standard task-runner files (Makefile or package.json)",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := context.Background()
			projectID := args[0]

			proj, err := store.GetProject(ctx, projectID)
			if err != nil {
				return err
			}

			skills, err := store.ListSkillsByProject(ctx, projectID)
			if err != nil {
				return err
			}

			if len(skills) == 0 {
				return fmt.Errorf("no skills registered to export for project '%s'", projectID)
			}

			switch strings.ToLower(proj.TechStack) {
			case "go", "html", "python", "android":
				if err := export.ExportToGoMakefile(proj.Path, skills); err != nil {
					return fmt.Errorf("failed to export to Makefile: %w", err)
				}
				fmt.Println("Successfully exported skills to Makefile!")
			case "node", "nextjs":
				if err := export.ExportToNodePackageJSON(proj.Path, skills); err != nil {
					return fmt.Errorf("failed to export to package.json: %w", err)
				}
				fmt.Println("Successfully exported skills to package.json!")
			default:
				return fmt.Errorf("unsupported stack '%s' for auto-export", proj.TechStack)
			}

			return nil
		},
	}
)

func init() {
	skillAddCmd.Flags().StringVarP(&skillDesc, "desc", "d", "", "description of the skill")
	skillAddCmd.Flags().StringVarP(&skillTrigger, "trigger", "t", "", "trigger regex or pattern")

	skillCmd.AddCommand(skillListCmd)
	skillCmd.AddCommand(skillAddCmd)
	skillCmd.AddCommand(skillExportCmd)
	rootCmd.AddCommand(skillCmd)
}
