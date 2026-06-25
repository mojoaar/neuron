package tui

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"neuron/internal/storage"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type activePane int

const (
	projectPane activePane = iota
	taskPane
	skillPane
)

type model struct {
	store             *storage.Storage
	projects          []*storage.Project
	tasks             []*storage.Task
	skills            []*storage.Skill
	selectedProjIdx   int
	selectedTaskIdx   int
	selectedSkillIdx  int
	active            activePane
	width             int
	height            int
	statusMsg         string
	err               error
}

func NewModel(store *storage.Storage) model {
	return model{
		store: store,
	}
}

func (m model) Init() tea.Cmd {
	return m.loadProjects
}

func (m model) loadProjects() tea.Msg {
	ctx := context.Background()
	projects, err := m.store.ListProjects(ctx)
	if err != nil {
		return err
	}
	return projects
}

func (m model) loadDetails() tea.Msg {
	if len(m.projects) == 0 {
		return nil
	}
	ctx := context.Background()
	projID := m.projects[m.selectedProjIdx].ID

	tasks, err := m.store.ListTasksByProject(ctx, projID)
	if err != nil {
		return err
	}

	skills, err := m.store.ListSkillsByProject(ctx, projID)
	if err != nil {
		return err
	}

	return detailsMsg{tasks: tasks, skills: skills}
}

type detailsMsg struct {
	tasks  []*storage.Task
	skills []*storage.Skill
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit

		case "tab":
			m.active = (m.active + 1) % 3
			m.statusMsg = ""

		case "shift+tab":
			m.active = (m.active + 2) % 3
			m.statusMsg = ""

		case "up", "k":
			m.statusMsg = ""
			m.navigate(-1)

		case "down", "j":
			m.statusMsg = ""
			m.navigate(1)

		case "space", "enter":
			m.statusMsg = ""
			if m.active == taskPane && len(m.tasks) > 0 {
				return m, m.cycleTaskStatus
			}

		case "e":
			if len(m.projects) > 0 {
				return m, m.exportSkills
			}
		}

	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height

	case []*storage.Project:
		m.projects = msg
		if len(m.projects) > 0 {
			if m.selectedProjIdx >= len(m.projects) {
				m.selectedProjIdx = 0
			}
			return m, m.loadDetails
		}

	case detailsMsg:
		m.tasks = msg.tasks
		m.skills = msg.skills
		if m.selectedTaskIdx >= len(m.tasks) {
			m.selectedTaskIdx = 0
		}
		if m.selectedSkillIdx >= len(m.skills) {
			m.selectedSkillIdx = 0
		}

	case statusMsg:
		m.statusMsg = string(msg)

	case error:
		m.err = msg
	}

	return m, nil
}

type statusMsg string

func (m model) cycleTaskStatus() tea.Msg {
	ctx := context.Background()
	t := m.tasks[m.selectedTaskIdx]
	switch t.Status {
	case "pending":
		t.Status = "in_progress"
	case "in_progress":
		t.Status = "completed"
	case "completed":
		t.Status = "cancelled"
	default:
		t.Status = "pending"
	}

	if err := m.store.UpdateTask(ctx, t); err != nil {
		return err
	}
	return statusMsg(fmt.Sprintf("Updated task '%s' to %s", t.ID, t.Status))
}

func (m model) exportSkills() tea.Msg {
	proj := m.projects[m.selectedProjIdx]
	ctx := context.Background()
	skills, err := m.store.ListSkillsByProject(ctx, proj.ID)
	if err != nil {
		return err
	}
	if len(skills) == 0 {
		return statusMsg("No skills to export.")
	}

	var exportErr error
	if strings.ToLower(proj.TechStack) == "go" {
		makefile := filepath.Join(proj.Path, "Makefile")
		exportErr = exportMakefile(makefile, skills)
	} else if strings.ToLower(proj.TechStack) == "node" {
		pkgFile := filepath.Join(proj.Path, "package.json")
		exportErr = exportPackageJSON(pkgFile, skills)
	} else {
		return statusMsg("Unsupported tech stack for export")
	}

	if exportErr != nil {
		return exportErr
	}
	return statusMsg("Successfully exported project skills!")
}

func (m *model) navigate(dir int) {
	switch m.active {
	case projectPane:
		if len(m.projects) == 0 {
			return
		}
		m.selectedProjIdx = (m.selectedProjIdx + dir + len(m.projects)) % len(m.projects)
		m.selectedTaskIdx = 0
		m.selectedSkillIdx = 0
		m.tasks = nil
		m.skills = nil
	case taskPane:
		if len(m.tasks) == 0 {
			return
		}
		m.selectedTaskIdx = (m.selectedTaskIdx + dir + len(m.tasks)) % len(m.tasks)
	case skillPane:
		if len(m.skills) == 0 {
			return
		}
		m.selectedSkillIdx = (m.selectedSkillIdx + dir + len(m.skills)) % len(m.skills)
	}
}

var (
	purple = lipgloss.Color("99")
	cyan   = lipgloss.Color("36")
	gray   = lipgloss.Color("240")

	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("15")).
			Background(purple).
			Padding(0, 2).
			Align(lipgloss.Center)

	paneStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(gray).
			Padding(1, 1)

	activePaneStyle = paneStyle.Copy().
			BorderForeground(purple)

	selectedItemStyle = lipgloss.NewStyle().
				Bold(true).
				Foreground(purple)

	statusLineStyle = lipgloss.NewStyle().
			Foreground(cyan).
			Italic(true)

	helpStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("244"))
)

func (m model) View() string {
	if m.err != nil {
		return fmt.Sprintf("Error: %v\nPress q to quit.", m.err)
	}

	header := titleStyle.Render("PROJECT NEURON LIFECYCLE MANAGER")

	var leftView, rightTasksView, rightSkillsView string

	var sb strings.Builder
	if len(m.projects) == 0 {
		sb.WriteString("No projects registered.\nUse 'neuron init <name>' to scaffold a project.")
	} else {
		for i, p := range m.projects {
			marker := "  "
			if i == m.selectedProjIdx {
				marker = "➔ "
			}
			line := fmt.Sprintf("%s%-12s (%s)", marker, p.ID, p.TechStack)
			if i == m.selectedProjIdx && m.active == projectPane {
				sb.WriteString(selectedItemStyle.Render(line) + "\n")
			} else {
				sb.WriteString(line + "\n")
			}
		}
	}
	leftStyle := paneStyle
	if m.active == projectPane {
		leftStyle = activePaneStyle
	}
	leftView = leftStyle.Height(10).Width(35).Render("📁 PROJECTS\n\n" + sb.String())

	sb.Reset()
	if len(m.tasks) == 0 {
		sb.WriteString("No tasks registered.")
	} else {
		for i, t := range m.tasks {
			marker := "  "
			if i == m.selectedTaskIdx {
				marker = "➔ "
			}
			statusMarker := "[ ]"
			switch t.Status {
			case "in_progress":
				statusMarker = "[-]"
			case "completed":
				statusMarker = "[x]"
			case "cancelled":
				statusMarker = "[c]"
			}
			line := fmt.Sprintf("%s%s %-12s - %s", marker, statusMarker, t.ID, t.Content)
			if i == m.selectedTaskIdx && m.active == taskPane {
				sb.WriteString(selectedItemStyle.Render(line) + "\n")
			} else {
				sb.WriteString(line + "\n")
			}
		}
	}
	taskStyle := paneStyle
	if m.active == taskPane {
		taskStyle = activePaneStyle
	}
	rightTasksView = taskStyle.Height(10).Width(60).Render("📋 TASKS\n\n" + sb.String())

	sb.Reset()
	if len(m.skills) == 0 {
		sb.WriteString("No skills registered.")
	} else {
		for i, s := range m.skills {
			marker := "  "
			if i == m.selectedSkillIdx {
				marker = "➔ "
			}
			line := fmt.Sprintf("%s%-15s (%s)", marker, s.ID, s.ExecutionType)
			if i == m.selectedSkillIdx && m.active == skillPane {
				sb.WriteString(selectedItemStyle.Render(line) + "\n")
			} else {
				sb.WriteString(line + "\n")
			}
		}
	}
	skillStyle := paneStyle
	if m.active == skillPane {
		skillStyle = activePaneStyle
	}
	rightSkillsView = skillStyle.Height(10).Width(60).Render("⚡ SKILLS\n\n" + sb.String())

	rightCombined := lipgloss.JoinVertical(lipgloss.Left, rightTasksView, rightSkillsView)
	mainContent := lipgloss.JoinHorizontal(lipgloss.Top, leftView, rightCombined)

	var statusLine string
	if m.statusMsg != "" {
		statusLine = statusLineStyle.Render(m.statusMsg) + "\n"
	}

	helpText := helpStyle.Render("tab: switch pane • ↑/↓: navigate • space: cycle task status • e: export skills • q: quit")

	return lipgloss.JoinVertical(lipgloss.Left,
		header,
		"\n",
		mainContent,
		"\n",
		statusLine,
		helpText,
	)
}

func exportMakefile(makefile string, skills []*storage.Skill) error {
	content, err := os.ReadFile(makefile)
	if err != nil && !os.IsNotExist(err) {
		return err
	}

	var sb strings.Builder
	sb.WriteString("\n# --- BEGIN NEURON SKILLS ---\n")
	for _, sk := range skills {
		if sk.Description != "" {
			sb.WriteString(fmt.Sprintf("# Skill: %s\n", sk.Description))
		}
		sb.WriteString(fmt.Sprintf("%s:\n\t%s\n\n", sk.ID, sk.ExecutionPath))
	}
	sb.WriteString("# --- END NEURON SKILLS ---\n")
	skillsSection := sb.String()

	original := string(content)
	startMarker := "# --- BEGIN NEURON SKILLS ---"
	endMarker := "# --- END NEURON SKILLS ---"

	var updated string
	if strings.Contains(original, startMarker) && strings.Contains(original, endMarker) {
		parts := strings.Split(original, startMarker)
		afterBlock := strings.Split(parts[1], endMarker)
		updated = parts[0] + strings.TrimSpace(skillsSection) + "\n" + afterBlock[1]
	} else {
		updated = original + skillsSection
	}

	return os.WriteFile(makefile, []byte(updated), 0644)
}

func exportPackageJSON(pkgFile string, skills []*storage.Skill) error {
	content, err := os.ReadFile(pkgFile)
	if err != nil {
		return err
	}

	var data map[string]interface{}
	if err := json.Unmarshal(content, &data); err != nil {
		return err
	}

	scripts, ok := data["scripts"].(map[string]interface{})
	if !ok {
		scripts = make(map[string]interface{})
	}

	for _, sk := range skills {
		scripts[sk.ID] = sk.ExecutionPath
	}
	data["scripts"] = scripts

	updated, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(pkgFile, updated, 0644)
}

func StartApp(store *storage.Storage) error {
	p := tea.NewProgram(NewModel(store), tea.WithAltScreen())
	_, err := p.Run()
	return err
}
