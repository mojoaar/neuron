package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the compiled version number of Neuron",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("Neuron AI-native software lifecycle manager v%s\n", rootCmd.Version)
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}
