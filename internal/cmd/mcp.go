package cmd

import (
	"fmt"
	"os"

	"neuron/internal/mcp"

	"github.com/spf13/cobra"
)

var (
	mcpCmd = &cobra.Command{
		Use:   "mcp",
		Short: "Interact with the Model Context Protocol (MCP) server",
	}

	mcpStartCmd = &cobra.Command{
		Use:   "start",
		Short: "Start the global MCP server (runs over stdio)",
		RunE: func(cmd *cobra.Command, args []string) error {
			// Print log to stderr to preserve stdout for JSON-RPC protocol
			fmt.Fprintln(os.Stderr, "Starting Neuron MCP server over stdio...")
			return mcp.StartServer(store)
		},
	}
)

func init() {
	mcpCmd.AddCommand(mcpStartCmd)
	rootCmd.AddCommand(mcpCmd)
}
