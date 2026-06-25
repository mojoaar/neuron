# System Service Installation Guide

You can install and run Neuron as a persistent, background **System Service** on both Linux and Windows. This ensures that the Web HUD server and MCP bindings start automatically when your computer boots up and recover gracefully on any process failures.

---

## 🐧 1. Linux (systemd Setup)

Linux distributions (such as Ubuntu, Debian, Fedora, and Arch) utilize `systemd` to coordinate background services.

### 1. Create Service File
Write a new service descriptor file under `/etc/systemd/system/neuron.service`:
```ini
[Unit]
Description=Neuron AI Project Lifecycle Manager Web HUD
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/neuron/
ExecStart=/home/your-username/neuron/neuron ui --port 8080
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```
*Make sure to replace `your-username` with your actual Linux user account name, and ensure the paths point directly to your compiled `neuron` binary!*

### 2. Register & Launch Service
Run the following commands inside your terminal:
```bash
# Reload systemd configuration registers
sudo systemctl daemon-reload

# Enable service to run automatically on system bootup
sudo systemctl enable neuron.service

# Launch the server in the background immediately
sudo systemctl start neuron.service
```

### 3. Service Commands & Logs
* **Check service status**:
  ```bash
  sudo systemctl status neuron.service
  ```
* **Read live execution logs**:
  ```bash
  journalctl -u neuron.service -f --no-tail
  ```
* **Restart the server**:
  ```bash
  sudo systemctl restart neuron.service
  ```

---

## 🪟 2. Windows (Background Service Setup)

To run Neuron cleanly as an automated background process on Windows, you can configure it either as a native Service or via the Windows Task Scheduler.

### Method A: Windows Task Scheduler (Recommended)
This is the most reliable, detached background method for Windows, as it avoids standard Service Control Manager (SCM) timeout limits.

#### 1. Via PowerShell (One-Liner Administrator Setup):
Open PowerShell as **Administrator** and execute the following block:
```powershell
$Action = New-ScheduledTaskAction -Execute "C:\neuron\neuron.exe" -Argument "ui --port 8080"
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "NeuronServer" -Action $Action -Trigger $Trigger -Settings $Settings -User "NT AUTHORITY\SYSTEM"
Start-ScheduledTask -TaskName "NeuronServer"
```
*Ensure the execute path points directly to your absolute compiled `neuron.exe` executable!*

#### 2. Via Graphical Task Scheduler:
1. Press `Win + R`, type `taskschd.msc`, and press Enter to open Task Scheduler.
2. Click **Create Task** on the Actions sidebar.
3. Under the **General** tab:
   * Name: `NeuronServer`
   * Select **Run whether user is logged on or not** and **Run with highest privileges**.
4. Under the **Triggers** tab:
   * Click **New** and set *Begin the task* to **At startup**.
5. Under the **Actions** tab:
   * Click **New**, set *Action* to **Start a program**, and select your absolute executable path `C:\neuron\neuron.exe`. Add arguments `ui --port 8080`.
6. Click **OK**, save the task, and start it!

---

### Method B: Native Windows Service (sc.exe)
If you prefer SCM-coordinated system services:
1. Open Command Prompt or PowerShell as **Administrator**:
   ```cmd
   sc.exe create Neuron binPath= "C:\neuron\neuron.exe ui --port 8080" start= auto DisplayName= "Neuron Lifecycle Manager"
   ```
2. Launch the service immediately:
   ```cmd
   net start Neuron
   ```
