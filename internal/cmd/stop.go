package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"

	"github.com/spf13/cobra"
)

var stopCmd = &cobra.Command{
	Use:   "stop",
	Short: "Stop any running Neuron background server daemon",
	RunE: func(cmd *cobra.Command, args []string) error {
		configDir, err := os.UserConfigDir()
		if err != nil {
			return fmt.Errorf("failed to get user config dir: %v", err)
		}
		pidFile := filepath.Join(configDir, "neuron", "neuron.pid")

		content, err := os.ReadFile(pidFile)
		if err != nil {
			if os.IsNotExist(err) {
				fmt.Println("No active Neuron background server PID file found.")
				return nil
			}
			return err
		}

		pidStr := strings.TrimSpace(string(content))
		pid, err := strconv.Atoi(pidStr)
		if err != nil {
			return fmt.Errorf("invalid PID stored in file: %s", pidStr)
		}

		fmt.Printf("Locating Neuron background server (PID: %d)...\n", pid)
		process, err := os.FindProcess(pid)
		if err != nil {
			fmt.Printf("Warning: process with PID %d not found. Purging stale PID file.\n", pid)
			_ = os.Remove(pidFile)
			return nil
		}

		// Send SIGTERM / Kill signal
		fmt.Printf("Sending graceful shutdown request...\n")
		err = process.Signal(syscall.SIGTERM)
		if err != nil {
			// On Windows, Signal might not be fully supported, fallback to Kill
			err = process.Kill()
		}

		if err != nil {
			return fmt.Errorf("failed to terminate process: %v", err)
		}

		_ = os.Remove(pidFile)
		fmt.Println("SUCCESS: Neuron background server gracefully terminated.")
		return nil
	},
}

func init() {
	rootCmd.AddCommand(stopCmd)
}
