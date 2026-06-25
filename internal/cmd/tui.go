package cmd

import (
	"neuron/internal/tui"

	"github.com/spf13/cobra"
)

var tuiCmd = &cobra.Command{
	Use:   "tui",
	Short: "Launch the interactive Terminal User Interface (TUI)",
	RunE: func(cmd *cobra.Command, args []string) error {
		return tui.StartApp(store)
	},
}

func init() {
	rootCmd.AddCommand(tuiCmd)
}
