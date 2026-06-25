package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"neuron/internal/storage"
	"neuron/internal/web"

	"github.com/spf13/cobra"
)

var (
	dbPath  string
	store   *storage.Storage
	rootCmd = &cobra.Command{
		Use:     "neuron",
		Version: "1.4.0",
		Short:   "Neuron is an AI-native Lifecycle Manager for software projects",
		Long:    `A robust CLI tool that binds conceptual specifications like plan.md to actual code implementations and manages tasks.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			srv := web.NewServer(store, 8080, "1.4.0")
			return srv.Start()
		},
	}
)

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(initDB)

	rootCmd.PersistentFlags().StringVar(&dbPath, "db", "", "path to DuckDB file (defaults to ~/.config/neuron/neuron.db)")
}

func initDB() {
	if dbPath == "" {
		configDir, err := os.UserConfigDir()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting user config directory: %v\n", err)
			os.Exit(1)
		}
		neuronDir := filepath.Join(configDir, "neuron")
		if err := os.MkdirAll(neuronDir, 0755); err != nil {
			fmt.Fprintf(os.Stderr, "Error creating config directory: %v\n", err)
			os.Exit(1)
		}
		dbPath = filepath.Join(neuronDir, "neuron.db")
	} else {
		parent := filepath.Dir(dbPath)
		if err := os.MkdirAll(parent, 0755); err != nil {
			fmt.Fprintf(os.Stderr, "Error creating database directory: %v\n", err)
			os.Exit(1)
		}
	}

	var err error
	store, err = storage.New(dbPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error initializing DuckDB storage at %s: %v\n", dbPath, err)
		os.Exit(1)
	}
}
