import { useState, useEffect, useRef, useCallback } from "react";
import { Project, Task, Skill, LogLine, GitStatus, SystemTemplate, CatalogSkill, ApiEndpoint, Cluster, CheckStatus, ThemeName, ThemeMode, FontFamily, FONTS, ActivityEntry } from "../types";
import { API_ENDPOINTS } from "../lib/endpoints";

export const useNeuron = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activeTab, setActiveTab] = useState<"plan" | "rules" | "tasks" | "skills" | "mcp" | "timeline">("plan");

  // Path aware state
  const [cwd, setCwd] = useState("");
  const [customScopePath, setCustomScopePath] = useState("");
  const [isCustomScope, setIsCustomScope] = useState(false);
  const [startupCwd, setStartupCwd] = useState("");
  const [isSavingScope, setIsSavingScope] = useState(false);

  // Theme state
  const [themeName, setThemeName] = useState<ThemeName>("neuron");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [fontFamily, setFontFamily] = useState<FontFamily>("jetbrains-mono");

  // Views toggles
  const [showDocs, setShowDocs] = useState(false);
  const [showApiDocs, setShowApiDocs] = useState(false);
  const [showDbViewer, setShowDbViewer] = useState(false);
  const [selectedDocSlug, setSelectedDocSlug] = useState<"started" | "mcp" | "skills" | "taskboard" | "service">("started");
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);
  const [isServerDisconnected, setIsServerDisconnected] = useState(false);
  const [hiddenProjectIds, setHiddenProjectIds] = useState<string[]>([]);
  const [discoveredDirs, setDiscoveredDirs] = useState<{ name: string; path: string; tech_stack?: string }[]>([]);
  const [discoveredStacks, setDiscoveredStacks] = useState<Record<string, string>>({});
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [terminalCollapsedByDefault, setTerminalCollapsedByDefault] = useState(false);
  const [tabEditorFontSize, setTabEditorFontSize] = useState("11px");

  // Clusters & CI Check states
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [checkStatus, setCheckStatus] = useState<CheckStatus | null>(null);
  const [isRefreshingCheck, setIsRefreshingCheck] = useState(false);
  const [enableProjectClusters, setEnableProjectClusters] = useState(false);
  const [enableVerificationCi, setEnableVerificationCi] = useState(false);

  // Command Palette
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteSelectedIndex, setPaletteSelectedIndex] = useState(0);

  // System templates Customizer state
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [systemTemplates, setSystemTemplates] = useState<SystemTemplate[]>([]);
  const [selectedTemplateTech, setSelectedTemplateTech] = useState("go");
  const [tmplAgents, setTmplAgents] = useState("");
  const [tmplPlan, setTmplPlan] = useState("");
  const [isSavingTmpl, setIsSavingTmpl] = useState(false);

  // Interactive Sandbox state
  const [selectedApiIdx, setSelectedApiIdx] = useState(0);
  const [apiInputs, setApiInputs] = useState<Record<string, string>>({});
  const [apiRequestBody, setApiRequestBody] = useState("");
  const [apiResponse, setApiResponse] = useState("");
  const [apiResStatus, setApiResponseStatus] = useState("");
  const [apiResTime, setApiResponseLatency] = useState("");
  const [isSendingApi, setIsSendingApi] = useState(false);

  // Recommended skills Catalog state
  const [catalogSkills, setCatalogSkills] = useState<CatalogSkill[]>([]);
  const [customStackLabels, setCustomStackLabels] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState("");
  const [version, setVersion] = useState("");
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [isAddingCatalogSkill, setIsAddingCatalogSkill] = useState(false);
  const [newCatUrl, setNewCatUrl] = useState("");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatTech, setNewCatTech] = useState("general");
  const [newCatChecked, setNewCatChecked] = useState(false);
  const [isSavingCatSkill, setIsSavingCatSkill] = useState(false);

  // Refinement editors
  const [planContent, setPlanContent] = useState("");
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isImportingPlan, setIsImportingPlan] = useState(false);

  const [rulesContent, setRulesContent] = useState("");
  const [isSavingRules, setIsSavingRules] = useState(false);

  // Source Control Status
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [isRefreshingGit, setIsRefreshingGit] = useState(false);

  // Provisioning form states
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provName, setProvName] = useState("");
  const [provPath, setProvPath] = useState("");
  const [provTech, setProvTech] = useState("go");
  const [skillSelectionsByStack, setSkillSelectionsByStack] = useState<Record<string, string[]>>({});

  const selectedSkillUrls = skillSelectionsByStack[provTech] || [];

  const setSelectedSkillUrls = (urls: string[] | ((prev: string[]) => string[])) => {
    setSkillSelectionsByStack((prev) => {
      const current = prev[provTech] || [];
      const updated = typeof urls === "function" ? urls(current) : urls;
      return { ...prev, [provTech]: updated };
    });
  };

  // New task form state
  const [newTaskContent, setNewTaskContent] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // New/Edit skill form states
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [newSkillTrigger, setNewSkillTrigger] = useState("");
  const [newSkillType, setNewSkillType] = useState("script");
  const [newSkillPath, setNewSkillPath] = useState("");
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  const [editSkillName, setEditSkillName] = useState("");
  const [editSkillDesc, setEditSkillDesc] = useState("");
  const [editSkillTrigger, setEditSkillTrigger] = useState("");
  const [editSkillType, setEditSkillType] = useState("script");
  const [editSkillPath, setEditSkillPath] = useState("");

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [isInstallingSkillUrl, setIsInstallingSkillUrl] = useState<string | null>(null);

  // Terminal logging
  const [logs, setLogs] = useState<LogLine[]>([]);

  const addLog = (text: string, type: "system" | "success" | "error" | "info" = "info") => {
    const time = new Date().toLocaleTimeString(undefined, { hour12: false });
    setLogs((prev) => [...prev, { timestamp: time, text, type }]);
  };

  const fetchCwd = async () => {
    try {
      const res = await fetch("/api/system/cwd");
      if (res.ok) {
        const data = await res.json();
        setCwd(data.cwd || "");
        setStartupCwd(data.startup_cwd || "");
        setIsCustomScope(data.is_custom || false);
        setCustomScopePath(data.cwd || "");
        addLog(`Active Workspace Scope: ${data.cwd} ${data.is_custom ? "[STATIC]" : "[DYNAMIC]"}`, "system");
      }
    } catch (err: any) {
      console.error("Failed to load CWD:", err);
    }
  };

  const fetchSystemTemplates = async () => {
    try {
      const res = await fetch("/api/system/templates");
      if (res.ok) {
        const data = await res.json();
        setSystemTemplates(data || []);
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    }
  };

  const fetchCatalogSkills = async () => {
    try {
      const res = await fetch("/api/system/skills");
      if (res.ok) {
        const data = await res.json();
        setCatalogSkills(data || []);
      }
    } catch (err) {
      console.error("Failed to load skills catalog:", err);
    }
  };

  // Synchronize HTML Theme and Mode on state change
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeName);
    if (themeMode === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, [themeName, themeMode]);

  // Inject/Remove dynamic Google Font link and CSS variable on font change
  useEffect(() => {
    if (fontFamily === "jetbrains-mono") {
      document.documentElement.style.removeProperty("--font-mono");
      return;
    }
    const font = FONTS.find(f => f.id === fontFamily);
    if (!font) return;

    const linkId = "neuron-dynamic-font";
    const existing = document.getElementById(linkId);
    if (existing) existing.remove();

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${font.googleFont}:wght@300;400;500;700&display=swap`;
    document.head.appendChild(link);

    document.documentElement.style.setProperty("--font-mono", `"${font.label}", var(--font-jetbrains-mono), monospace`);

    return () => {
      const el = document.getElementById(linkId);
      if (el) el.remove();
    };
  }, [fontFamily]);

  // Global Hotkeys: ⌘K / Ctrl+K (Fuzzy Search) & ⌘J / Ctrl+J (Collapse Terminal Console)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        setPaletteQuery("");
        setPaletteSelectedIndex(0);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setIsTerminalCollapsed((prev) => !prev);
      }
      if (e.key === "Escape") {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Set API sandbox defaults on endpoint change
  useEffect(() => {
    const ep = API_ENDPOINTS[selectedApiIdx];
    if (ep) {
      setApiInputs(ep.mockParams);
      setApiRequestBody(ep.mockBody || "");
      setApiResponse("");
      setApiResponseStatus("");
      setApiResponseLatency("");
    }
  }, [selectedApiIdx]);

  useEffect(() => {
    addLog("Initializing Neuron Core HUD...", "system");
    addLog("Connecting to local DuckDB transactional engine...", "system");
    fetchCwd();
    fetchSystemTemplates();
    fetchCatalogSkills();
    fetchHiddenProjectIds();
    fetchTerminalSettings();
    fetchTabEditorFontSize();
    fetchClusterSettings();
    fetchCiSettings();
    fetchThemeSettings();
    fetchCustomStackLabels();
    fetchApiKey();
    fetchVersion();
    fetchActivityLog();
    fetchClusters();
    fetchDiscoveredDirs();
    fetchProjects(true);
  }, []);

  // Update editor values when selected template tech changes
  useEffect(() => {
    const tmpl = systemTemplates.find((t) => t.tech_stack === selectedTemplateTech);
    if (tmpl) {
      setTmplAgents(tmpl.agents_md || "");
      setTmplPlan(tmpl.plan_md || "");
    } else {
      setTmplAgents("");
      setTmplPlan("");
    }
  }, [selectedTemplateTech, systemTemplates]);

  // If provName changes, update default path
  useEffect(() => {
    if (provName.trim() !== "") {
      const suffix = provName.trim().toLowerCase().replace(/\s+/g, "-");
      if (cwd) {
        const sep = cwd.includes("\\") ? "\\" : "/";
        setProvPath(`${cwd}${sep}${suffix}`);
      } else {
        setProvPath(`./${suffix}`);
      }
    } else {
      setProvPath("");
    }
  }, [provName, cwd]);

  // Set default recommended skills when catalog loads or stack changes (if not visited yet)
  useEffect(() => {
    if (catalogSkills.length === 0) return;

    setSkillSelectionsByStack((prev) => {
      if (prev[provTech] !== undefined) {
        return prev;
      }
      const recs = catalogSkills.filter((sk) => sk.tech_stack === provTech && sk.is_checked);
      const gens = catalogSkills.filter((sk) => sk.tech_stack === "general" && sk.is_checked);
      const defaults = [...recs.map((r) => r.url), ...gens.map((g) => g.url)];
      return { ...prev, [provTech]: defaults };
    });
  }, [provTech, catalogSkills]);

  const fetchClusters = async () => {
    try {
      const res = await fetch("/api/clusters");
      if (res.ok) {
        const data = await res.json();
        setClusters(data || []);
      }
    } catch (err) {
      console.error("Failed to load clusters:", err);
    }
  };

  const handleSelectCluster = async (cl: Cluster | null) => {
    setSelectedProject(null);
    setSelectedCluster(cl);
    setShowSystemSettings(false);
    setShowDocs(false);
    setShowApiDocs(false);
    setShowDbViewer(false);
    if (cl) {
      addLog(`Mounting project cluster view: [${cl.name.toUpperCase()}]`, "system");
    }
  };

  const fetchCheckStatus = async (projectId: string) => {
    setIsRefreshingCheck(true);
    addLog(`Running CI verification suite (Tests & Linter) on workspace...`, "system");
    try {
      const res = await fetch(`/api/projects/${projectId}/check`);
      if (res.ok) {
        const data = await res.json();
        setCheckStatus(data);
        addLog(`CI verification checks executed on workspace. Tests: ${data.test_passed ? "PASS" : "FAIL"}, Lint: ${data.lint_passed ? "PASS" : "WARN"}`, data.test_passed && data.lint_passed ? "success" : "error");
      }
    } catch (err) {
      console.error("Failed to fetch check status:", err);
    } finally {
      setIsRefreshingCheck(false);
    }
  };

  const fetchProjects = async (selectFirst = false) => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load systems");
      const data = await res.json();
      const list = data || [];
      setProjects(list);
      addLog(`Discovered ${list.length} registered project files in DuckDB database.`, "success");

      if (selectFirst && list.length > 0) {
        handleSelectProject(list[0]);
      } else if (list.length === 0) {
        addLog("No active systems registered. Standing by for provisioning wizard.", "info");
      }
    } catch (err: any) {
      addLog(`Error loading systems: ${err.message}`, "error");
    }
  };

  const handleSelectProject = async (proj: Project) => {
    setShowSystemSettings(false);
    setShowDocs(false);
    setShowApiDocs(false);
    setShowDbViewer(false);
    setSelectedCluster(null);
    setCheckStatus(null);
    setSelectedProject(proj);
    setActiveTab("plan");
    addLog(`Mounting project environment: [${proj.id.toUpperCase()}] ...`, "system");
    addLog(`Path bound: ${proj.path}`, "info");

    fetchProjectTasks(proj.id);
    fetchProjectSkills(proj.id);
    fetchProjectPlan(proj.id);
    fetchProjectRules(proj.id);
    fetchGitStatus(proj.id);
  };

  const fetchProjectTasks = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data || []);
      }
    } catch (err) {
      console.error("Failed to load project tasks:", err);
    }
  };

  const fetchProjectSkills = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/skills`);
      if (res.ok) {
        const data = await res.json();
        setSkills(data || []);
      }
    } catch (err) {
      console.error("Failed to load project skills:", err);
    }
  };

  const fetchProjectPlan = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/plan`);
      if (res.ok) {
        const data = await res.json();
        setPlanContent(data.content || "");
      }
    } catch (err) {
      console.error("Failed to load project plan:", err);
    }
  };

  const fetchProjectRules = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/rules`);
      if (res.ok) {
        const data = await res.json();
        setRulesContent(data.content || "");
      }
    } catch (err) {
      console.error("Failed to load project rules:", err);
    }
  };

  const fetchGitStatus = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/git`);
      if (res.ok) {
        const data = await res.json();
        setGitStatus(data);
        if (data.is_repo) {
          addLog(`Git status updated: branch '${data.branch}' (${data.is_dirty ? `dirty, ${data.dirty_count} files` : "clean"})`, "info");
        }
      }
    } catch (err) {
      console.error("Failed to fetch git status:", err);
    }
  };

  const handleSavePlan = async () => {
    if (!selectedProject) return;
    setIsSavingPlan(true);
    addLog(`Writing plan context to database schema & project path...`, "system");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: planContent }),
      });
      if (res.ok) {
        addLog("SUCCESS: plan.md updated.", "success");
      } else {
        const d = await res.json();
        addLog(`Failed to write plan: ${d.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Failed to write plan: ${err.message}`, "error");
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleImportPlanChecklist = async () => {
    if (!selectedProject) return;
    setIsImportingPlan(true);
    addLog(`Importing checklist tasks from local plan.md file...`, "system");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/plan/import`, {
        method: "POST",
      });
      if (res.ok) {
        const d = await res.json();
        addLog(`SUCCESS: Parsed plan markdown. Imported ${d.imported_count || 0} items dynamically.`, "success");
        await fetchProjectTasks(selectedProject.id);
      } else {
        const d = await res.json();
        addLog(`Import checklist failed: ${d.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Import checklist failed: ${err.message}`, "error");
    } finally {
      setIsImportingPlan(false);
    }
  };

  const handleSaveRules = async () => {
    if (!selectedProject) return;
    setIsSavingRules(true);
    addLog(`Saving custom agent boundaries and instruction contexts...`, "system");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: rulesContent }),
      });
      if (res.ok) {
        addLog("SUCCESS: AGENTS.md rules context written.", "success");
      } else {
        const d = await res.json();
        addLog(`Failed to write rules: ${d.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Failed to write rules: ${err.message}`, "error");
    } finally {
      setIsSavingRules(false);
    }
  };

  const fetchHiddenProjectIds = async () => {
    try {
      const res = await fetch("/api/system/settings?key=hidden_projects");
      if (res.ok) {
        const data = await res.json();
        if (data.value) {
          try {
            setHiddenProjectIds(JSON.parse(data.value));
          } catch {
            setHiddenProjectIds([]);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTerminalSettings = async () => {
    try {
      const res = await fetch("/api/system/settings?key=terminal_collapsed_by_default");
      if (res.ok) {
        const data = await res.json();
        const collapsed = data.value === "true";
        setTerminalCollapsedByDefault(collapsed);
        setIsTerminalCollapsed(collapsed);
      }
    } catch (err) {
      console.error("Failed to load terminal settings:", err);
    }
  };

  const fetchTabEditorFontSize = async () => {
    try {
      const res = await fetch("/api/system/settings?key=tab_editor_font_size");
      if (res.ok) {
        const data = await res.json();
        if (data.value) {
          setTabEditorFontSize(data.value);
        }
      }
    } catch (err) {
      console.error("Failed to load editor font size:", err);
    }
  };

  const fetchClusterSettings = async () => {
    try {
      const res = await fetch("/api/system/settings?key=enable_project_clusters");
      if (res.ok) {
        const data = await res.json();
        setEnableProjectClusters(data.value === "true");
      }
    } catch (err) {
      console.error("Failed to load cluster settings:", err);
    }
  };

  const fetchCiSettings = async () => {
    try {
      const res = await fetch("/api/system/settings?key=enable_verification_ci");
      if (res.ok) {
        const data = await res.json();
        setEnableVerificationCi(data.value === "true");
      }
    } catch (err) {
      console.error("Failed to load CI settings:", err);
    }
  };

  const handleToggleEnableProjectClusters = async (val: boolean) => {
    setEnableProjectClusters(val);
    try {
      await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "enable_project_clusters",
          value: val ? "true" : "false",
        }),
      });
      addLog(`SUCCESS: Project Clusters panel visibility updated: ${val ? "ENABLED" : "DISABLED"}`, "success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleEnableVerificationCi = async (val: boolean) => {
    setEnableVerificationCi(val);
    try {
      await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "enable_verification_ci",
          value: val ? "true" : "false",
        }),
      });
      addLog(`SUCCESS: Verification CI dashboard bar visibility updated: ${val ? "ENABLED" : "DISABLED"}`, "success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleTruncateDatabase = async () => {
    addLog(`Purging all DuckDB relational catalog data...`, "system");
    try {
      const res = await fetch("/api/system/db/truncate", { method: "POST" });
      if (res.ok) {
        addLog("SUCCESS: All tables truncated and default catalogs re-seeded from system templates.", "success");
        setSelectedProject(null);
        fetchProjects(true);
        fetchClusters();
      } else {
        const d = await res.json();
        addLog(`Truncation failed: ${d.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Truncation failed: ${err.message}`, "error");
    }
  };

  const fetchCustomStackLabels = async () => {
    const stacks = ["go", "node", "nextjs", "html", "python", "android", "powershell"];
    const labels: Record<string, string> = {};
    for (const stack of stacks) {
      try {
        const res = await fetch(`/api/system/settings?key=tech_stack_label_${stack}`);
        if (res.ok) {
          const data = await res.json();
          if (data.value) labels[stack] = data.value;
        }
      } catch (_) { /* fallback to defaults */ }
    }
    setCustomStackLabels(labels);
  };

  const handleSetTechStackLabel = async (stack: string, label: string) => {
    setCustomStackLabels((prev) => ({ ...prev, [stack]: label }));
    try {
      await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: `tech_stack_label_${stack}`, value: label }),
      });
    } catch (err) { console.error(err); }
  };

  const handleToggleCatalogSkillChecked = async (url: string, isChecked: boolean) => {
    setCatalogSkills((prev) => prev.map((sk) => sk.url === url ? { ...sk, is_checked: isChecked } : sk));
    try {
      const sk = catalogSkills.find((s) => s.url === url);
      if (!sk) return;
      await fetch("/api/system/skills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: sk.url,
          label: sk.label,
          tech_stack: sk.tech_stack,
          is_checked: isChecked,
        }),
      });
    } catch (err) { console.error(err); }
  };

  const fetchApiKey = async () => {
    try {
      const res = await fetch("/api/system/api-key");
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.api_key || "");
      }
    } catch (err) { console.error(err); }
  };

  const fetchVersion = async () => {
    try {
      const res = await fetch("/api/system/version");
      if (res.ok) {
        const data = await res.json();
        setVersion(data.version || "");
      }
    } catch (err) { console.error(err); }
  };

  const handleRegenerateApiKey = async () => {
    try {
      const res = await fetch("/api/system/api-key", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.api_key || "");
        addLog("SUCCESS: API authentication key regenerated.", "success");
      }
    } catch (err) { console.error(err); }
  };

  const fetchActivityLog = async () => {
    try {
      const res = await fetch("/api/system/activity");
      if (res.ok) {
        const data = await res.json();
        setActivityEntries(data || []);
      }
    } catch (err) { console.error(err); }
  };

  const fetchThemeSettings = async () => {
    try {
      const res = await fetch("/api/system/settings?key=theme_name");
      if (res.ok) {
        const data = await res.json();
        if (data.value) setThemeName(data.value as ThemeName);
      }
    } catch (err) { console.error("Failed to load theme name:", err); }

    try {
      const res = await fetch("/api/system/settings?key=theme_mode");
      if (res.ok) {
        const data = await res.json();
        if (data.value) setThemeMode(data.value as ThemeMode);
      }
    } catch (err) { console.error("Failed to load theme mode:", err); }

    try {
      const res = await fetch("/api/system/settings?key=font_family");
      if (res.ok) {
        const data = await res.json();
        if (data.value) setFontFamily(data.value as FontFamily);
      }
    } catch (err) { console.error("Failed to load font family:", err); }
  };

  const handleSetThemeName = async (val: ThemeName) => {
    setThemeName(val);
    try {
      await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "theme_name", value: val }),
      });
      addLog(`SUCCESS: Visual theme switched to: ${val.toUpperCase()}`, "success");
    } catch (err) { console.error(err); }
  };

  const handleSetThemeMode = async (val: ThemeMode) => {
    setThemeMode(val);
    try {
      await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "theme_mode", value: val }),
      });
      addLog(`SUCCESS: Display mode toggled to: ${val.toUpperCase()}`, "success");
    } catch (err) { console.error(err); }
  };

  const handleSetFontFamily = async (val: FontFamily) => {
    setFontFamily(val);
    try {
      await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "font_family", value: val }),
      });
      addLog(`SUCCESS: Font family configured to: ${val}`, "success");
    } catch (err) { console.error(err); }
  };

  const handleSetTabEditorFontSize = async (val: string) => {
    setTabEditorFontSize(val);
    try {
      await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "tab_editor_font_size",
          value: val,
        }),
      });
      addLog(`SUCCESS: Editor and Preview font size configured to: ${val}`, "success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTerminalCollapseDefault = async (val: boolean) => {
    setTerminalCollapsedByDefault(val);
    try {
      await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "terminal_collapsed_by_default",
          value: val ? "true" : "false",
        }),
      });
      addLog(`SUCCESS: Console logs default layout updated. Default collapse: ${String(val).toUpperCase()}`, "success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleHideProject = async (projectId: string) => {
    const newList = [...hiddenProjectIds, projectId];
    try {
      const res = await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "hidden_projects", value: JSON.stringify(newList) }),
      });
      if (res.ok) {
        setHiddenProjectIds(newList);
        addLog(`SUCCESS: Project [${projectId}] hidden from active listings.`, "success");
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnhideProject = async (projectId: string) => {
    const newList = hiddenProjectIds.filter((id) => id !== projectId);
    try {
      const res = await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "hidden_projects", value: JSON.stringify(newList) }),
      });
      if (res.ok) {
        setHiddenProjectIds(newList);
        addLog(`SUCCESS: Project [${projectId}] restored.`, "success");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDiscoveredDirs = async () => {
    setIsDiscovering(true);
    try {
      const res = await fetch("/api/system/discover");
      if (res.ok) {
        const data = await res.json();
        setDiscoveredDirs(data || []);
        const defaults: Record<string, string> = {};
        (data || []).forEach((dir: { name: string; path: string; tech_stack?: string }) => {
          defaults[dir.name] = dir.tech_stack || "go";
        });
        setDiscoveredStacks(defaults);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleQuickTrackProject = async (dirName: string, dirPath: string, tech: string) => {
    addLog(`Tracking pre-existing workspace: '${dirName}' [${tech.toUpperCase()}]...`, "system");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dirName,
          path: dirPath,
          tech_stack: tech,
          skill_urls: []
        }),
      });
      const data = await res.json();
      if (res.ok) {
        addLog(`SUCCESS: Rules context configured and registered.`, "success");
        await fetchProjects();
        await fetchDiscoveredDirs();
        handleSelectProject(data);
      } else {
        throw new Error(data.error || "Tracking failed");
      }
    } catch (err: any) {
      addLog(`Quick-track failed: ${err.message}`, "error");
    }
  };

  const handleSaveScopePath = async () => {
    if (!customScopePath.trim()) return;
    setIsSavingScope(true);
    addLog(`Locking permanent root directory tracking to path: ${customScopePath}`, "system");
    try {
      const res = await fetch("/api/system/cwd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cwd: customScopePath }),
      });
      if (res.ok) {
        addLog(`SUCCESS: Scope configured. Reloading projects...`, "success");
        await fetchCwd();
        await fetchDiscoveredDirs();
        await fetchProjects(true);
      } else {
        const data = await res.json();
        addLog(`Scope configuration failed: ${data.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Scope Configuration failed: ${err.message}`, "error");
    } finally {
      setIsSavingScope(false);
    }
  };

  const handleResetScopePath = async () => {
    setIsSavingScope(true);
    addLog("Releasing scope lock. Reverting workspace tracking to process launch directory...", "system");
    try {
      const res = await fetch("/api/system/cwd", { method: "DELETE" });
      if (res.ok) {
        addLog("SUCCESS: Reset to dynamic launch scope directory tracking.", "success");
        await fetchCwd();
        await fetchDiscoveredDirs();
        await fetchProjects(true);
      } else {
        const data = await res.json();
        addLog(`Scope Reset failed: ${data.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Scope Reset failed: ${err.message}`, "error");
    } finally {
      setIsSavingScope(false);
    }
  };

  const handleSaveTemplate = async () => {
    setIsSavingTmpl(true);
    addLog(`Writing custom template profiles for stack type [${selectedTemplateTech}]...`, "system");
    try {
      const res = await fetch("/api/system/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tech_stack: selectedTemplateTech,
          agents_md: tmplAgents,
          plan_md: tmplPlan,
        }),
      });
      if (res.ok) {
        addLog(`SUCCESS: System templates updated inside DuckDB catalog.`, "success");
        await fetchSystemTemplates();
      } else {
        const d = await res.json();
        addLog(`Save template failed: ${d.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Save template failed: ${err.message}`, "error");
    } finally {
      setIsSavingTmpl(false);
    }
  };

  const handleAddCatalogSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatUrl.trim() || !newCatLabel.trim()) return;
    setIsSavingCatSkill(true);
    addLog(`Registering new skill inside Global Recommended Catalog: '${newCatLabel}'...`, "system");
    try {
      const res = await fetch("/api/system/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newCatUrl.trim(),
          label: newCatLabel.trim(),
          tech_stack: newCatTech,
          is_checked: newCatChecked,
        }),
      });
      if (res.ok) {
        addLog(`SUCCESS: '${newCatLabel}' registered.`, "success");
        setNewCatUrl("");
        setNewCatLabel("");
        setNewCatTech("general");
        setNewCatChecked(false);
        setIsAddingCatalogSkill(false);
        await fetchCatalogSkills();
      } else {
        const d = await res.json();
        addLog(`Failed to add skill: ${d.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Failed to add skill: ${err.message}`, "error");
    } finally {
      setIsSavingCatSkill(false);
    }
  };

  const handleDeleteCatalogSkill = async (url: string, label: string) => {
    addLog(`Unregistering skill '${label}' from recommendations table...`, "system");
    try {
      const res = await fetch(`/api/system/skills?url=${encodeURIComponent(url)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        addLog(`SUCCESS: '${label}' removed.`, "success");
        await fetchCatalogSkills();
      } else {
        const d = await res.json();
        addLog(`Deletion failed: ${d.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Deletion failed: ${err.message}`, "error");
    }
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (provName.trim() === "" || provPath.trim() === "") {
      addLog("Provisioning Error: System Name and Workspace Path are required fields.", "error");
      return;
    }
    setIsProvisioning(true);
    addLog(`Spawning Provisioner pipeline... [Stack: ${provTech.toUpperCase()}]`, "system");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: provName,
          path: provPath,
          tech_stack: provTech,
          skill_urls: selectedSkillUrls,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        addLog(`SUCCESS: Project filesystem structure scaffolded and metadata registered in DuckDB.`, "success");
        setProvName("");
        await fetchProjects();
        handleSelectProject(data);
      } else {
        addLog(`Provisioning failed: ${data.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Provisioning failed: ${err.message}`, "error");
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || newTaskContent.trim() === "") return;
    setIsAddingTask(true);
    addLog(`Appending task item to database...`, "system");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newTaskContent,
          priority: newTaskPriority,
        }),
      });
      if (res.ok) {
        setNewTaskContent("");
        addLog("SUCCESS: Task board row inserted.", "success");
        await fetchProjectTasks(selectedProject.id);
      } else {
        const d = await res.json();
        addLog(`Failed to add task: ${d.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Failed to add task: ${err.message}`, "error");
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchProjectTasks(selectedProject.id);
      } else {
        const d = await res.json();
        addLog(`Failed to update task: ${d.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Failed to update task: ${err.message}`, "error");
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || newSkillName.trim() === "") return;
    setIsAddingSkill(true);
    addLog(`Registering custom project skill context: '${newSkillName}'...`, "system");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSkillName.trim(),
          description: newSkillDesc.trim(),
          trigger_pattern: newSkillTrigger.trim(),
          execution_type: newSkillType,
          execution_path: newSkillPath.trim(),
        }),
      });
      if (res.ok) {
        setNewSkillName("");
        setNewSkillDesc("");
        setNewSkillTrigger("");
        setNewSkillPath("");
        setIsAddingSkill(false);
        addLog(`SUCCESS: Skill '${newSkillName}' registered.`, "success");
        await fetchProjectSkills(selectedProject.id);
      } else {
        const d = await res.json();
        addLog(`Failed to add skill: ${d.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Failed to add skill: ${err.message}`, "error");
    } finally {
      setIsAddingSkill(false);
    }
  };

  const handleInstallCatalogSkill = async (url: string, label: string) => {
    if (!selectedProject) return;
    setIsInstallingSkillUrl(url);
    addLog(`Downloading skill template from marketplace: ${label}...`, "system");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/skills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        addLog(`SUCCESS: Downstream logic compiled, symlinks configured, and registered.`, "success");
        await fetchProjectSkills(selectedProject.id);
      } else {
        const d = await res.json();
        addLog(`Download failed: ${d.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Download failed: ${err.message}`, "error");
    } finally {
      setIsInstallingSkillUrl(null);
    }
  };

  const handleShutdownServer = async () => {
    addLog("Requesting HTTP Server shutdown sequence from backend daemon...", "system");
    try {
      await fetch("/api/system/shutdown", { method: "POST" });
      addLog("Shutdown command delivered. Connection severed.", "info");
      setIsServerDisconnected(true);
    } catch {
      setIsServerDisconnected(true);
    }
  };

  const handleOpenEditSkill = (sk: Skill) => {
    setEditingSkill(sk);
    setEditSkillName(sk.name);
    setEditSkillDesc(sk.description);
    setEditSkillTrigger(sk.trigger_pattern);
    setEditSkillType(sk.execution_type);
    setEditSkillPath(sk.execution_path);
  };

  const handleUpdateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !editingSkill) return;
    addLog(`Updating skill metadata for: '${editSkillName}'...`, "system");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/skills?id=${editingSkill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editSkillName.trim(),
          description: editSkillDesc.trim(),
          trigger_pattern: editSkillTrigger.trim(),
          execution_type: editSkillType,
          execution_path: editSkillPath.trim(),
        }),
      });
      if (res.ok) {
        addLog(`SUCCESS: Skill updated.`, "success");
        setEditingSkill(null);
        await fetchProjectSkills(selectedProject.id);
      } else {
        const d = await res.json();
        addLog(`Failed to update skill: ${d.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Failed to update skill: ${err.message}`, "error");
    }
  };

  const handleDeleteSkill = async (skillId: string, skillName: string) => {
    if (!selectedProject) return;
    addLog(`Removing skill [${skillName}] from index catalog...`, "system");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/skills?id=${skillId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        addLog(`SUCCESS: Skill removed.`, "success");
        await fetchProjectSkills(selectedProject.id);
      } else {
        const d = await res.json();
        addLog(`Deletion failed: ${d.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Deletion failed: ${err.message}`, "error");
    }
  };

  const handleExportSkills = async () => {
    if (!selectedProject) return;
    setIsExporting(true);
    addLog(`Compiling conceptual skills and writing to native scripts runner configuration...`, "system");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/skills/export`, {
        method: "POST",
      });
      if (res.ok) {
        addLog(`SUCCESS: Native runner configuration written. Code blocks fully updated.`, "success");
      } else {
        const d = await res.json();
        addLog(`Export failed: ${d.error}`, "error");
      }
    } catch (err: any) {
      addLog(`Export failed: ${err.message}`, "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSetupMcp = async (client: "opencode" | "claude" | "claude-code") => {
    addLog(`Writing local integration JSON config for target client: ${client.toUpperCase()}...`, "system");
    try {
      const res = await fetch("/api/system/mcp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client }),
      });
      if (res.ok) {
        addLog(`SUCCESS: Server registered on client profile cleanly!`, "success");
      } else {
        const d = await res.json();
        addLog(`MCP Setup failed: ${d.error}`, "error");
      }
    } catch (err: any) {
      addLog(`MCP Setup failed: ${err.message}`, "error");
    }
  };

  const handleRunApiRequest = async () => {
    const ep = API_ENDPOINTS[selectedApiIdx];
    if (!ep) return;
    setIsSendingApi(true);
    setApiResponse("");
    setApiResponseStatus("");
    setApiResponseLatency("");

    let urlPath = ep.path;
    Object.keys(apiInputs).forEach((key) => {
      urlPath = urlPath.replace(`:${key}`, encodeURIComponent(apiInputs[key]));
    });

    const start = performance.now();
    try {
      const fetchOpts: RequestInit = {
        method: ep.method,
        headers: { "Content-Type": "application/json" },
      };
      if (ep.method !== "GET" && apiRequestBody) {
        fetchOpts.body = apiRequestBody;
      }

      const res = await fetch(urlPath, fetchOpts);
      const end = performance.now();
      setApiResponseLatency(`${Math.round(end - start)}ms`);
      setApiResponseStatus(`${res.status} ${res.statusText}`);

      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      const end = performance.now();
      setApiResponseLatency(`${Math.round(end - start)}ms`);
      setApiResponseStatus("ERROR");
      setApiResponse(err.message || "Network Error");
    } finally {
      setIsSendingApi(false);
    }
  };

  const handlePaletteSelectOption = (idx: number) => {
    const visible = getPaletteFilteredOptions();
    const opt = visible[idx];
    if (!opt) return;

    setShowCommandPalette(false);
    opt.action();
  };

  const getPaletteFilteredOptions = useCallback(() => {
    const items = [
      {
        label: "Open Global Settings [⌘S / Ctrl+S]",
        category: "Navigation",
        action: () => setShowSystemSettings(true),
      },
      {
        label: "Open Help Documentation [⌘H / Ctrl+H]",
        category: "Navigation",
        action: () => setShowDocs(true),
      },
      {
        label: "Open API Playground Sandboxes",
        category: "Navigation",
        action: () => setShowApiDocs(true),
      },
      {
        label: "Open DuckDB Relational Table Viewer",
        category: "Navigation",
        action: () => {
          setShowDbViewer(true);
          setShowDocs(false);
          setShowApiDocs(false);
          setShowSystemSettings(false);
        },
      },
      {
        label: "Show Active Sub-Workspaces",
        category: "Navigation",
        action: () => setSelectedProject(null),
      },
      {
        label: "Trigger HUD Safe Shutdown Sequence",
        category: "Command Control",
        action: handleShutdownServer,
      },
      {
        label: "Toggle Visual Dark/Light Contrast",
        category: "Style Settings",
        action: () => setThemeMode((prev) => prev === "dark" ? "light" : "dark"),
      },
      {
        label: "Toggle Diagnostic Terminal HUD logs [⌘J / Ctrl+J]",
        category: "Command Control",
        action: () => setIsTerminalCollapsed((prev) => !prev),
      },
      {
        label: "Open Neuron GitHub Repository",
        category: "Source Code",
        action: () => window.open("https://github.com/mojoaar/neuron", "_blank"),
      },
    ];

    projects.forEach((proj) => {
      items.push({
        label: `Mount Workspace: ${proj.name} [${proj.tech_stack.toUpperCase()}]`,
        category: "Active Projects",
        action: () => handleSelectProject(proj),
      });
    });

    if (!paletteQuery.trim()) return items;
    const q = paletteQuery.toLowerCase();
    return items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q)
    );
  }, [projects, paletteQuery, setShowSystemSettings, setShowDocs, setShowApiDocs, setShowDbViewer, setSelectedProject, handleShutdownServer, setThemeMode, setIsTerminalCollapsed, handleSelectProject]);

  return {
    projects,
    selectedProject,
    setSelectedProject,
    tasks,
    skills,
    activeTab,
    setActiveTab,
    cwd,
    customScopePath,
    setCustomScopePath,
    isCustomScope,
    startupCwd,
    isSavingScope,
    themeName,
    setThemeName,
    themeMode,
    setThemeMode,
    fontFamily,
    setFontFamily,
    apiKey,
    setApiKey,
    version,
    activityEntries,
    showDocs,
    setShowDocs,
    showApiDocs,
    setShowApiDocs,
    showDbViewer,
    setShowDbViewer,
    terminalCollapsedByDefault,
    setTerminalCollapsedByDefault,
    tabEditorFontSize,
    setTabEditorFontSize,
    enableProjectClusters,
    setEnableProjectClusters,
    enableVerificationCi,
    setEnableVerificationCi,
    clusters,
    selectedCluster,
    setSelectedCluster,
    checkStatus,
    setCheckStatus,
    isRefreshingCheck,
    selectedDocSlug,
    setSelectedDocSlug,
    isTerminalCollapsed,
    setIsTerminalCollapsed,
    isServerDisconnected,
    hiddenProjectIds,
    discoveredDirs,
    discoveredStacks,
    setDiscoveredStacks,
    isDiscovering,
    fetchDiscoveredDirs,
    showCommandPalette,
    setShowCommandPalette,
    paletteQuery,
    setPaletteQuery,
    paletteSelectedIndex,
    setPaletteSelectedIndex,
    showSystemSettings,
    setShowSystemSettings,
    systemTemplates,
    selectedTemplateTech,
    setSelectedTemplateTech,
    tmplAgents,
    setTmplAgents,
    tmplPlan,
    setTmplPlan,
    isSavingTmpl,
    selectedApiIdx,
    setSelectedApiIdx,
    apiInputs,
    setApiInputs,
    apiRequestBody,
    setApiRequestBody,
    apiResponse,
    apiResStatus,
    apiResTime,
    isSendingApi,
    catalogSkills,
    isAddingCatalogSkill,
    setIsAddingCatalogSkill,
    newCatUrl,
    setNewCatUrl,
    newCatLabel,
    setNewCatLabel,
    newCatTech,
    setNewCatTech,
    newCatChecked,
    setNewCatChecked,
    isSavingCatSkill,
    planContent,
    setPlanContent,
    isSavingPlan,
    isImportingPlan,
    rulesContent,
    setRulesContent,
    isSavingRules,
    gitStatus,
    isRefreshingGit,
    isProvisioning,
    provName,
    setProvName,
    provPath,
    setProvPath,
    provTech,
    setProvTech,
    selectedSkillUrls,
    setSelectedSkillUrls,
    newTaskContent,
    setNewTaskContent,
    newTaskPriority,
    setNewTaskPriority,
    isAddingTask,
    editingSkill,
    setEditingSkill,
    newSkillName,
    setNewSkillName,
    newSkillDesc,
    setNewSkillDesc,
    newSkillTrigger,
    setNewSkillTrigger,
    newSkillType,
    setNewSkillType,
    newSkillPath,
    setNewSkillPath,
    isAddingSkill,
    editSkillName,
    setEditSkillName,
    editSkillDesc,
    setEditSkillDesc,
    editSkillTrigger,
    setEditSkillTrigger,
    editSkillType,
    setEditSkillType,
    editSkillPath,
    setEditSkillPath,
    isExporting,
    isInstallingSkillUrl,
    logs,
    addLog,
    fetchProjects,
    fetchClusters,
    handleSelectCluster,
    fetchCheckStatus,
    handleSelectProject,
    handleSavePlan,
    handleImportPlanChecklist,
    handleSaveRules,
    handleHideProject,
    handleUnhideProject,
    handleQuickTrackProject,
    handleSaveScopePath,
    handleResetScopePath,
    handleSaveTemplate,
    handleToggleTerminalCollapseDefault,
    handleToggleEnableProjectClusters,
    handleToggleEnableVerificationCi,
    handleSetThemeName,
    handleSetThemeMode,
    handleSetFontFamily,
    customStackLabels,
    setCustomStackLabels,
    handleSetTechStackLabel,
    handleToggleCatalogSkillChecked,
    handleRegenerateApiKey,
    handleTruncateDatabase,
    handleSetTabEditorFontSize,
    handleAddCatalogSkill,
    handleDeleteCatalogSkill,
    handleProvision,
    handleAddTask,
    handleUpdateTaskStatus,
    handleAddSkill,
    handleInstallCatalogSkill,
    handleShutdownServer,
    handleOpenEditSkill,
    handleUpdateSkill,
    handleDeleteSkill,
    handleExportSkills,
    handleSetupMcp,
    handleRunApiRequest,
    handlePaletteSelectOption,
    getPaletteFilteredOptions,
    fetchProjectTasks,
    fetchProjectSkills,
    fetchProjectPlan,
    fetchProjectRules,
    fetchGitStatus,
  };
};
