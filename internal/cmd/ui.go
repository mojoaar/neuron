package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"

	"neuron/internal/web"

	"github.com/spf13/cobra"
)

var (
	uiPort     int
	daemonMode bool

	uiCmd = &cobra.Command{
		Use:   "ui",
		Short: "Launch the beautiful Next.js Web UI dashboard",
		RunE: func(cmd *cobra.Command, args []string) error {
			configDir, err := os.UserConfigDir()
			if err != nil {
				return err
			}
			pidFile := filepath.Join(configDir, "neuron", "neuron.pid")

			if daemonMode {
				execPath, err := os.Executable()
				if err != nil {
					return fmt.Errorf("failed to resolve neuron executable path: %v", err)
				}

				// Spawn detached child process of ourselves without the daemon flag
				var filteredArgs []string
				for _, arg := range os.Args[1:] {
					if arg != "--daemon" && arg != "-d" {
						filteredArgs = append(filteredArgs, arg)
					}
				}

				child := exec.Command(execPath, filteredArgs...)
				child.Stdout = nil
				child.Stderr = nil
				child.Stdin = nil

				if err := child.Start(); err != nil {
					return fmt.Errorf("failed to start background daemon: %v", err)
				}

				// Write child's PID into the pidfile
				if err := os.WriteFile(pidFile, []byte(strconv.Itoa(child.Process.Pid)), 0644); err != nil {
					return fmt.Errorf("failed to write PID file: %v", err)
				}

				fmt.Printf("Neuron Web HUD background server started cleanly! (PID: %d)\n", child.Process.Pid)
				fmt.Println("Run 'neuron stop' to terminate the background daemon process.")
				return nil
			}

			// If not in daemon mode, write the current parent PID to the file
			if err := os.WriteFile(pidFile, []byte(strconv.Itoa(os.Getpid())), 0644); err != nil {
				fmt.Printf("Warning: failed to write PID file: %v\n", err)
			}
			defer func() {
				if err := os.Remove(pidFile); err != nil {
					fmt.Printf("Warning: failed to remove PID file: %v\n", err)
				}
			}()

			srv := web.NewServer(store, uiPort, "1.5.0")
			return srv.Start()
		},
	}
)

func init() {
	uiCmd.Flags().IntVarP(&uiPort, "port", "p", 8080, "port to run the web server on")
	uiCmd.Flags().BoolVarP(&daemonMode, "daemon", "d", false, "run Neuron Web HUD in the background as a daemon process")
	rootCmd.AddCommand(uiCmd)
}
