package cmd

import (
	"context"
	"fmt"
	"time"

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
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
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
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
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

	projectDeleteCmd = &cobra.Command{
		Use:   "delete [id]",
		Short: "Delete a registered project and all associated tasks/skills",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			id := args[0]

			proj, err := store.GetProject(ctx, id)
			if err != nil {
				return err
			}

			if err := store.DeleteProject(ctx, id); err != nil {
				return err
			}

			fmt.Printf("Successfully deleted project '%s' (%s) and all associated tasks/skills.\n", proj.Name, id)
			return nil
		},
	}
)

func init() {
	projectCmd.AddCommand(projectListCmd)
	projectCmd.AddCommand(projectAddCmd)
	projectCmd.AddCommand(projectDeleteCmd)
	rootCmd.AddCommand(projectCmd)
}
