package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
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

		// Validate process is actually a Neuron process to avoid race conditions and random killings
		if !isNeuronProcess(pid) {
			fmt.Printf("Warning: Process %d is not a valid Neuron background process. Purging stale PID file.\n", pid)
			if err := os.Remove(pidFile); err != nil && !os.IsNotExist(err) {
				fmt.Printf("Warning: failed to remove stale PID file: %v\n", err)
			}
			return nil
		}

		process, err := os.FindProcess(pid)
		if err != nil {
			fmt.Printf("Warning: process with PID %d not found. Purging stale PID file.\n", pid)
			if err := os.Remove(pidFile); err != nil && !os.IsNotExist(err) {
				fmt.Printf("Warning: failed to remove stale PID file: %v\n", err)
			}
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

		if err := os.Remove(pidFile); err != nil && !os.IsNotExist(err) {
			fmt.Printf("Warning: failed to remove PID file on termination: %v\n", err)
		}
		fmt.Println("SUCCESS: Neuron background server gracefully terminated.")
		return nil
	},
}

func isNeuronProcess(pid int) bool {
	if runtime.GOOS == "windows" {
		// Fallback gracefully on Windows
		return true
	}

	// On Unix, query standard command name via ps tool
	cmd := exec.Command("ps", "-p", strconv.Itoa(pid), "-o", "comm=")
	out, err := cmd.Output()
	if err != nil {
		return false
	}
	name := strings.ToLower(strings.TrimSpace(string(out)))
	return strings.Contains(name, "neuron")
}

func init() {
	rootCmd.AddCommand(stopCmd)
}
