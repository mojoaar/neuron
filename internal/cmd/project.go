package cmd

import (
	"context"
	"fmt"
	"neuron/internal/storage"

	"github.com/spf13/cobra"
)

var (
	projectCmd = &cobra.Command{
		Use:   "project",
		Short: "Manage projects registered with Neuron",
	}

	projectListCmd = &cobra.Command{
		Use:   "list",
		Short: "List all registered projects",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := context.Background()
			projects, err := store.ListProjects(ctx)
			if err != nil {
				return err
			}

			if len(projects) == 0 {
				fmt.Println("No projects registered yet.")
				return nil
			}

			fmt.Printf("%-15s %-20s %-12s %s\n", "ID", "NAME", "TECH STACK", "PATH")
			fmt.Println("----------------------------------------------------------------------")
			for _, p := range projects {
				fmt.Printf("%-15s %-20s %-12s %s\n", p.ID, p.Name, p.TechStack, p.Path)
			}
			return nil
		},
	}

	projectAddCmd = &cobra.Command{
		Use:   "add [id] [name] [path] [tech-stack]",
		Short: "Register an existing project with Neuron",
		Args:  cobra.ExactArgs(4),
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := context.Background()
			p := &storage.Project{
				ID:        args[0],
				Name:      args[1],
				Path:      args[2],
				TechStack: args[3],
			}

			if err := store.AddProject(ctx, p); err != nil {
				return err
			}

			fmt.Printf("Successfully registered project '%s' (%s)\n", p.Name, p.ID)
			return nil
		},
	}
)

func init() {
	projectCmd.AddCommand(projectListCmd)
	projectCmd.AddCommand(projectAddCmd)
	rootCmd.AddCommand(projectCmd)
}
