"use client";

import React, { useState, useEffect, useRef } from "react";
import { DOCS_GETTING_STARTED, DOCS_MCP_SERVER, DOCS_SKILLS_GUIDE, DOCS_TASKBOARD_GUIDE, DOCS_SYSTEM_SERVICE } from "../docs/data";
import {
  Cpu,
  FileCode,
  Layers,
  Database,
  Terminal as TerminalIcon,
  Plus,
  Play,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Folder,
  ArrowRight,
  ChevronRight,
  Trash,
  Settings,
  HelpCircle,
  ArrowLeftRight,
  Sparkles,
  Globe,
  Smartphone,
  Edit,
  Save,
  FileText,
  GitBranch,
  RefreshCw,
  ExternalLink,
  Sun,
  Moon
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  path: string;
  tech_stack: string;
  created_at: string;
}

interface Task {
  id: string;
  project_id: string;
  content: string;
  status: string; // pending, in_progress, completed, cancelled
  priority: string; // high, medium, low
  updated_at: string;
}

interface Skill {
  id: string;
  project_id: string;
  name: string;
  description: string;
  trigger_pattern: string;
  execution_type: string; // script, mcp, binary
  execution_path: string;
}

interface LogLine {
  timestamp: string;
  text: string;
  type: "system" | "success" | "error" | "info";
}

interface GitStatus {
  is_repo: boolean;
  branch?: string;
  commit?: string;
  is_dirty?: boolean;
  dirty_count?: number;
  dirty_files?: string[];
}

interface SystemTemplate {
  tech_stack: string;
  agents_md: string;
  plan_md: string;
}

interface CatalogSkill {
  url: string;
  label: string;
  tech_stack: string;
  is_checked: boolean;
}

const getRulesByTech = (tech: string) => {
  switch (tech) {
    case "go":
      return {
        always: [
          "Run standard linter and typecheck tests before finishing task.",
          "Handle all return errors explicitly with clear logs.",
          "Compile and verify package syntax."
        ],
        askFirst: [
          "Adding third-party dependencies/external packages.",
          "Creating packages outside standard Go project conventions."
        ],
        never: [
          "Commit secrets, API keys, credentials, or `.env` files.",
          "Bypass returned error channels using blank identifier (_)."
        ]
      };
    case "node":
      return {
        always: [
          "Run npm test before declaring task completion.",
          "Verify node dependencies are stored cleanly."
        ],
        askFirst: [
          "Installing new npm package dependencies.",
          "Modifying major entry-point configurations."
        ],
        never: [
          "Commit secrets, `.env` files, or private credentials.",
          "Force push to main branches."
        ]
      };
    case "html":
      return {
        always: [
          "Verify styling layout on responsive viewports.",
          "Check relative file paths for images/scripts."
        ],
        askFirst: [
          "Copying bulky styling CDN libraries like Bootstrap or Tailwind."
        ],
        never: [
          "Hardcode full credentials, endpoints, or keys inside static files.",
          "Put inline styles directly into HTML structures."
        ]
      };
    case "powershell":
      return {
        always: [
          "Document parameters and usage inside the script headers.",
          "Gracefully handle default errors with try/catch blocks."
        ],
        askFirst: [
          "Modifying structural OS registers or registry items."
        ],
        never: [
          "Commit personal system credentials inside PowerShell execution blocks.",
          "Use script aliases (like cat or ls) within shared cmdlets."
        ]
      };
    case "nextjs":
      return {
        always: [
          "Run standard Next.js build validation (npm run build) before declaring success.",
          "Isolate client hooks under components directory."
        ],
        askFirst: [
          "Importing massive external state-management or UI animation packages."
        ],
        never: [
          "Store local keys or private keys in Git records.",
          "Render server environment variables directly in client components."
        ]
      };
    case "python":
      return {
        always: [
          "Isolate package dependencies inside local virtual environments (.venv).",
          "Run formatter (black or ruff) before submitting files."
        ],
        askFirst: [
          "Adding third-party package dependencies to requirements.txt."
        ],
        never: [
          "Commit virtual environment folders (.venv) or active user keys.",
          "Leave trailing debug prints in production code paths."
        ]
      };
    case "android":
      return {
        always: [
          "Decouple credentials and API secrets; read from local.properties only.",
          "Run lint validation before committing changes."
        ],
        askFirst: [
          "Adding third-party package dependencies to build.gradle."
        ],
        never: [
          "Commit compiled outputs (build/), SDK caches (.gradle/), or built APK assets to Git.",
          "Run synchronous networking requests directly on Main thread pathways."
        ]
      };
    default:
      return {
        always: ["Compile and run build commands", "Ensure no syntax errors exist"],
        askFirst: ["Adding massive packages"],
        never: ["Commit secrets or passwords"]
      };
  }
};

const formatPathScope = (pathStr: string) => {
  if (!pathStr) return "SYSTEMS";
  const parts = pathStr.split(/[/\\]/);
  const last = parts[parts.length - 1];
  if (!last) return "SYSTEMS";
  if (last.length > 15) {
    return last.slice(0, 13) + "...";
  }
  return last;
};

const renderMarkdown = (md: string) => {
  if (!md) return "<p class='text-terminal-muted italic'>No plan specified yet.</p>";
  
  const codeBlocks: string[] = [];
  let parsedMd = md;

  // 1. Capture all code blocks ( ```lang ... ``` ) globally first before paragraph splits
  parsedMd = parsedMd.replace(/```(?:[a-z]+)?\s*\n([\s\S]+?)\n\s*```/gim, (match, code) => {
    const escapedCode = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const html = `
      <div class="relative group my-3">
        <button 
          data-copy-btn 
          class="absolute top-2 right-2 md:opacity-60 group-hover:opacity-100 bg-terminal-gray border border-terminal-border text-[9px] font-bold text-terminal-muted hover:text-terminal-green hover:border-terminal-green px-2 py-1 rounded transition-all select-none focus:outline-none"
          title="Copy to clipboard"
        >
          [ COPY ]
        </button>
        <pre class="bg-terminal-black border border-terminal-border p-3 rounded font-mono text-[11.5px] text-terminal-green overflow-auto leading-relaxed pr-16">${escapedCode}</pre>
      </div>
    `;
    const placeholder = `__CODEBLOCK_PLACEHOLDER_${codeBlocks.length}__`;
    codeBlocks.push(html);
    return placeholder;
  });

  // 2. Parse line by line
  const lines = parsedMd.split(/\r?\n/);
  
  const parsedLines = lines.map(line => {
    let trimmed = line.trim();
    if (!trimmed) return "";

    // If it's a code block placeholder, return it untouched
    if (trimmed.startsWith("__CODEBLOCK_PLACEHOLDER_")) {
      return trimmed;
    }

    // Escape basic HTML inside other blocks
    let html = trimmed
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Horizontal Rules
    if (html === "---" || html === "___") {
      return `<hr class="border-terminal-border my-6" />`;
    }

    // Headers
    if (html.startsWith("### ")) {
      return `<h4 class="text-xs font-bold text-terminal-cyan uppercase mt-4 mb-1.5">${html.substring(4)}</h4>`;
    }
    if (html.startsWith("## ")) {
      return `<h3 class="text-[14.5px] font-bold text-terminal-green uppercase mt-5 border-b border-terminal-border pb-1.5 mb-2.5">${html.substring(3)}</h3>`;
    }
    if (html.startsWith("# ")) {
      return `<h2 class="text-[16.5px] font-bold text-terminal-text uppercase mt-3 border-b-2 border-terminal-green pb-2 mb-3.5">${html.substring(2)}</h2>`;
    }

    // Task checklists
    if (html.startsWith("- [x]") || html.startsWith("- [X]")) {
      return `<div class="flex items-center space-x-2 text-terminal-muted line-through py-0.5 text-[13px]"><span class="text-terminal-green font-bold">[X]</span> <span>${html.substring(5)}</span></div>`;
    }
    if (html.startsWith("- [ ]")) {
      return `<div class="flex items-center space-x-2 text-terminal-text py-0.5 text-[13px]"><span class="text-terminal-muted">[ ]</span> <span>${html.substring(5)}</span></div>`;
    }

    // Standard lists
    if (html.startsWith("- ")) {
      return `<div class="flex items-start space-x-2 text-terminal-text py-0.5 text-[13px]"><span class="text-terminal-green">&bull;</span> <span>${html.substring(2)}</span></div>`;
    }

    // Inline formatting: Bold, Italics, Links, Inline Code
    html = html
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-terminal-cyan hover:underline hover:text-terminal-cyan/80 inline-flex items-center space-x-0.5">$1 <span class="text-[9px] opacity-70 ml-0.5">↗</span></a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-terminal-green">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em class="italic text-terminal-muted">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-terminal-gray border border-terminal-border text-terminal-green px-1.5 py-0.2 rounded font-mono text-[11px]">$1</code>');

    // Standard naked paragraph
    return `<p class="text-[13px] text-terminal-text leading-relaxed py-0.5">${html}</p>`;
  });

  // 3. Re-substitute Code Block HTML
  let finalHtml = parsedLines.join("\n");
  codeBlocks.forEach((htmlBlock, idx) => {
    finalHtml = finalHtml.replace(`__CODEBLOCK_PLACEHOLDER_${idx}__`, htmlBlock);
  });

  return finalHtml;
};

interface ApiEndpoint {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  desc: string;
  mockParams: Record<string, string>;
  mockBody?: string;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  { 
    method: "GET", 
    path: "/api/projects", 
    desc: "Fetch all registered projects scoped under CWD",
    mockParams: {} 
  },
  { 
    method: "POST", 
    path: "/api/projects", 
    desc: "Provision and register a new technological stack project",
    mockParams: {},
    mockBody: '{\n  "name": "scaffolded-api",\n  "path": "./scaffolded-api",\n  "tech_stack": "go",\n  "skill_urls": []\n}'
  },
  { 
    method: "GET", 
    path: "/api/projects/:id/tasks", 
    desc: "List all task board TODOs for a specific project",
    mockParams: { "id": "my-go-app" } 
  },
  { 
    method: "POST", 
    path: "/api/projects/:id/tasks", 
    desc: "Append a new task/TODO to the project catalog",
    mockParams: { "id": "my-go-app" },
    mockBody: '{\n  "content": "Add unit test coverages for routing layer",\n  "priority": "high"\n}'
  },
  { 
    method: "PATCH", 
    path: "/api/projects/:id/tasks/:task_id", 
    desc: "Update status, content, or priority of a task",
    mockParams: { "id": "my-go-app", "task_id": "example-id" },
    mockBody: '{\n  "status": "in_progress"\n}'
  },
  { 
    method: "GET", 
    path: "/api/projects/:id/skills", 
    desc: "List registered project skills",
    mockParams: { "id": "my-go-app" } 
  },
  { 
    method: "POST", 
    path: "/api/projects/:id/skills", 
    desc: "Register a new conceptual skill",
    mockParams: { "id": "my-go-app" },
    mockBody: '{\n  "name": "generate-docs",\n  "description": "Compile technical schemas",\n  "trigger_pattern": "^docs$",\n  "execution_type": "script",\n  "execution_path": "make docs"\n}'
  },
  { 
    method: "POST", 
    path: "/api/projects/:id/skills/export", 
    desc: "Export skills to native project Makefile/package.json",
    mockParams: { "id": "my-go-app" } 
  },
  { 
    method: "POST", 
    path: "/api/system/mcp/setup", 
    desc: "Configure Claude/OpenCode MCP server client configs",
    mockParams: {},
    mockBody: '{\n  "client": "opencode"\n}'
  },
  { 
    method: "GET", 
    path: "/api/system/cwd", 
    desc: "Query running backend execution CWD",
    mockParams: {} 
  }
];

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activeTab, setActiveTab] = useState<"plan" | "rules" | "tasks" | "skills" | "mcp">("plan");

  // Path aware state
  const [cwd, setCwd] = useState("");
  const [customScopePath, setCustomScopePath] = useState("");
  const [isCustomScope, setIsCustomScope] = useState(false);
  const [startupCwd, setStartupCwd] = useState("");
  const [isSavingScope, setIsSavingScope] = useState(false);

  // Theme state
  const [darkMode, setDarkMode] = useState(true);

  // Views toggles
  const [showDocs, setShowDocs] = useState(false);
  const [showApiDocs, setShowApiDocs] = useState(false);
  const [selectedDocSlug, setSelectedDocSlug] = useState<"started" | "mcp" | "skills" | "taskboard" | "service">("started");
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);
  const [isServerDisconnected, setIsServerDisconnected] = useState(false);

  // Command Palette
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteSelectedIndex, setPaletteSelectedIndex] = useState(0);
  const paletteInputRef = useRef<HTMLInputElement>(null);

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
  const [selectedSkillUrls, setSelectedSkillUrls] = useState<string[]>([]);

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
  const terminalEndRef = useRef<HTMLDivElement>(null);

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

  // Synchronize HTML Light Mode class on theme state change
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [darkMode]);

  // Keyboard Shortcuts for Universal Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        setPaletteQuery("");
        setPaletteSelectedIndex(0);
      }
      if (e.key === "Escape") {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (showCommandPalette && paletteInputRef.current) {
      paletteInputRef.current.focus();
    }
  }, [showCommandPalette]);

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

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

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

  // Set default recommended skills when stack changes or catalog loaded
  useEffect(() => {
    const recs = catalogSkills.filter((sk) => sk.tech_stack === provTech && sk.is_checked);
    const gens = catalogSkills.filter((sk) => sk.tech_stack === "general" && sk.is_checked);
    setSelectedSkillUrls([...recs.map((r) => r.url), ...gens.map((g) => g.url)]);
  }, [provTech, catalogSkills]);

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
      if (!res.ok) throw new Error("Failed to load tasks");
      const data = await res.json();
      setTasks(data || []);
    } catch (err: any) {
      addLog(`Failed to fetch tasks: ${err.message}`, "error");
    }
  };

  const fetchProjectSkills = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/skills`);
      if (!res.ok) throw new Error("Failed to load skills");
      const data = await res.json();
      setSkills(data || []);
    } catch (err: any) {
      addLog(`Failed to fetch skills: ${err.message}`, "error");
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
      console.error(err);
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
      console.error(err);
    }
  };

  const fetchGitStatus = async (projectId: string) => {
    setIsRefreshingGit(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/git`);
      if (res.ok) {
        const data = await res.json();
        setGitStatus(data);
        if (data.is_repo) {
          addLog(`Git status updated: branch '${data.branch}' (${data.is_dirty ? data.dirty_count + " files dirty" : "clean"})`, "info");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshingGit(false);
    }
  };

  const handleSavePlan = async () => {
    if (!selectedProject) return;
    setIsSavingPlan(true);
    addLog(`Saving plan details to ${selectedProject.name}/plan.md...`, "system");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: planContent }),
      });
      if (res.ok) {
        addLog(`SUCCESS: plan.md specifications saved.`, "success");
      } else {
        throw new Error("Failed to save");
      }
    } catch (err: any) {
      addLog(`Failed to save plan: ${err.message}`, "error");
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleImportPlanChecklist = async () => {
    if (!selectedProject) return;
    setIsImportingPlan(true);
    addLog(`Parsing plan.md checkboxes to register task board backlog...`, "system");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/plan/import`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        addLog(`SUCCESS: Imported ${data.imported} new backlog tasks into task board!`, "success");
        fetchProjectTasks(selectedProject.id);
      } else {
        throw new Error(data.error || "Import failed");
      }
    } catch (err: any) {
      addLog(`Failed to import plan list: ${err.message}`, "error");
    } finally {
      setIsImportingPlan(false);
    }
  };

  const handleSaveRules = async () => {
    if (!selectedProject) return;
    setIsSavingRules(true);
    addLog(`Overwriting AGENTS.md and rebuilding CLAUDE.md symlinks...`, "system");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: rulesContent }),
      });
      if (res.ok) {
        addLog(`SUCCESS: AGENTS.md guidelines successfully synchronized!`, "success");
      } else {
        throw new Error("Failed to save");
      }
    } catch (err: any) {
      addLog(`Failed to save rules: ${err.message}`, "error");
    } finally {
      setIsSavingRules(false);
    }
  };

  const handleSaveScopePath = async () => {
    if (!customScopePath.trim()) return;
    setIsSavingScope(true);
    addLog(`Setting permanent Workspace Scope path to: ${customScopePath}...`, "system");
    try {
      const res = await fetch("/api/system/cwd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cwd: customScopePath.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        addLog(`SUCCESS: Scope configured. Reloading projects...`, "success");
        await fetchCwd();
        await fetchProjects(true);
      } else {
        throw new Error(data.error || "Failed to update workspace path");
      }
    } catch (err: any) {
      addLog(`Failed to configure path: ${err.message}`, "error");
    } finally {
      setIsSavingScope(false);
    }
  };

  const handleResetScopePath = async () => {
    setIsSavingScope(true);
    addLog("Clearing custom Workspace Scope path config...", "system");
    try {
      const res = await fetch("/api/system/cwd", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        addLog("SUCCESS: Reset to dynamic launch scope directory tracking.", "success");
        await fetchCwd();
        await fetchProjects(true);
      } else {
        throw new Error(data.error || "Failed to clear path");
      }
    } catch (err: any) {
      addLog(`Failed to clear custom scope path: ${err.message}`, "error");
    } finally {
      setIsSavingScope(false);
    }
  };

  const handleSaveTemplate = async () => {
    setIsSavingTmpl(true);
    addLog(`Overwriting system-wide default scaffolding template for [${selectedTemplateTech.toUpperCase()}] ...`, "system");
    try {
      const res = await fetch("/api/system/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tech_stack: selectedTemplateTech,
          agents_md: tmplAgents,
          plan_md: tmplPlan,
        }),
      });
      if (res.ok) {
        addLog(`SUCCESS: Scaffolding templates updated successfully inside DuckDB.`, "success");
        fetchSystemTemplates();
      } else {
        throw new Error("Failed to update template");
      }
    } catch (err: any) {
      addLog(`Failed to update template: ${err.message}`, "error");
    } finally {
      setIsSavingTmpl(false);
    }
  };

  const handleAddCatalogSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatUrl.trim() || !newCatLabel.trim()) return;

    setIsSavingCatSkill(true);
    addLog(`Adding new skill recommendation to system catalog: '${newCatLabel}'...`, "info");
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
        addLog(`SUCCESS: Skill '${newCatLabel}' registered inside dynamic recommended catalog.`, "success");
        setNewCatUrl("");
        setNewCatLabel("");
        setNewCatChecked(false);
        setIsAddingCatalogSkill(false);
        fetchCatalogSkills();
      } else {
        throw new Error("Failed to add skill");
      }
    } catch (err: any) {
      addLog(`Failed to add skill: ${err.message}`, "error");
    } finally {
      setIsSavingCatSkill(false);
    }
  };

  const handleDeleteCatalogSkill = async (url: string, label: string) => {
    if (!confirm(`Are you sure you want to remove '${label}' from your recommended skills catalog?`)) return;

    addLog(`Purging skill recommendation '${label}' from system catalog...`, "system");
    try {
      const res = await fetch(`/api/system/skills?url=${encodeURIComponent(url)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        addLog(`SUCCESS: Skill recommendation purged.`, "success");
        fetchCatalogSkills();
      } else {
        throw new Error("Failed to purge skill");
      }
    } catch (err: any) {
      addLog(`Failed to purge skill: ${err.message}`, "error");
    }
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provName.trim() || !provPath.trim()) return;

    setIsProvisioning(true);
    addLog(`Triggering provision request for system: '${provName}' [${provTech}]...`, "system");
    addLog(`Scaffolding standard file layout in destination path...`, "info");
    if (selectedSkillUrls.length > 0) {
      addLog(`Preparing to download and inject ${selectedSkillUrls.length} remote agent skills...`, "info");
    }

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: provName.trim(),
          path: provPath.trim(),
          tech_stack: provTech,
          skill_urls: selectedSkillUrls,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Provisioning failed");

      addLog(`Created directory layout successfully!`, "success");
      addLog(`Auto-generated template configurations: [AGENTS.md, CLAUDE.md, plan.md]`, "success");
      if (selectedSkillUrls.length > 0) {
        addLog(`Successfully downloaded and embedded remote skills in .agents/skills/`, "success");
      }
      addLog(`Auto-generated and exported default stack skills to target runner.`, "success");
      addLog(`Registered metadata inside DuckDB catalog.`, "success");
      
      setProvName("");
      setProvPath("");
      
      await fetchProjects();
      const newProj = data as Project;
      handleSelectProject(newProj);
    } catch (err: any) {
      addLog(`Provisioning engine aborted: ${err.message}`, "error");
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newTaskContent.trim()) return;

    addLog(`Adding new task inside [${selectedProject.id}] context...`, "info");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newTaskContent.trim(),
          priority: newTaskPriority,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add task");

      addLog(`Task successfully appended! ID: ${data.id}`, "success");
      setNewTaskContent("");
      setIsAddingTask(false);
      fetchProjectTasks(selectedProject.id);
    } catch (err: any) {
      addLog(`Failed to add task: ${err.message}`, "error");
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update task");

      addLog(`Updated task [${taskId}] status to '${newStatus.toUpperCase()}'`, "success");
      fetchProjectTasks(selectedProject.id);
    } catch (err: any) {
      addLog(`Failed to update task: ${err.message}`, "error");
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newSkillName.trim() || !newSkillPath.trim()) return;

    addLog(`Registering custom execution skill: '${newSkillName}'...`, "info");
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register skill");

      addLog(`Skill registered successfully in database catalog.`, "success");
      setNewSkillName("");
      setNewSkillDesc("");
      setNewSkillTrigger("");
      setNewSkillPath("");
      setIsAddingSkill(false);
      fetchProjectSkills(selectedProject.id);
    } catch (err: any) {
      addLog(`Failed to register skill: ${err.message}`, "error");
    }
  };

  const handleInstallCatalogSkill = async (url: string, label: string) => {
    if (!selectedProject) return;
    setIsInstallingSkillUrl(url);
    addLog(`Downloading and installing remote catalog skill: '${label}'...`, "system");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (res.ok) {
        addLog(`SUCCESS: Skill '${label}' installed successfully!`, "success");
        fetchProjectSkills(selectedProject.id);
      } else {
        throw new Error(data.error || "Failed to install skill");
      }
    } catch (err: any) {
      addLog(`Failed to install catalog skill: ${err.message}`, "error");
    } finally {
      setIsInstallingSkillUrl(null);
    }
  };

  const handleShutdownServer = async () => {
    if (!confirm("Are you sure you want to gracefully terminate and stand down the Neuron backend server? This will close your Web HUD connection.")) return;
    addLog("Sending graceful shutdown request to Go daemon...", "system");
    try {
      const res = await fetch("/api/system/shutdown", { method: "POST" });
      if (res.ok) {
        addLog("Graceful termination signal accepted. Standing down connection.", "success");
        setIsServerDisconnected(true);
      } else {
        throw new Error("Shutdown endpoint refused request");
      }
    } catch (err: any) {
      addLog(`Shutdown requested failed: ${err.message}`, "error");
    }
  };

  const handleOpenEditSkill = (sk: Skill) => {
    setEditingSkill(sk);
    setEditSkillName(sk.name);
    setEditSkillDesc(sk.description || "");
    setEditSkillTrigger(sk.trigger_pattern || "");
    setEditSkillType(sk.execution_type);
    setEditSkillPath(sk.execution_path);
  };

  const handleUpdateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !editingSkill) return;

    addLog(`Updating skill '${editingSkill.name}' inside database...`, "info");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/skills/${editingSkill.id}`, {
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update skill");

      addLog(`Skill '${data.name}' successfully updated!`, "success");
      setEditingSkill(null);
      fetchProjectSkills(selectedProject.id);
    } catch (err: any) {
      addLog(`Failed to update skill: ${err.message}`, "error");
    }
  };

  const handleDeleteSkill = async (skillId: string, skillName: string) => {
    if (!selectedProject || !confirm(`Are you sure you want to delete skill '${skillName}'?`)) return;

    addLog(`Purging skill '${skillName}' from database and updating runner files...`, "system");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/skills/${skillId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete skill");

      addLog(`Skill successfully purged.`, "success");
      fetchProjectSkills(selectedProject.id);
    } catch (err: any) {
      addLog(`Failed to delete skill: ${err.message}`, "error");
    }
  };

  const handleExportSkills = async () => {
    if (!selectedProject) return;

    setIsExporting(true);
    addLog(`Exporting registered skills into native stack project manifests...`, "system");
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/skills/export`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");

      addLog(`SUCCESS: ${data.message}`, "success");
    } catch (err: any) {
      addLog(`Export failed: ${err.message}`, "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSetupMcp = async (client: "opencode" | "claude") => {
    addLog(`Initiating auto-setup for ${client} desktop configuration...`, "system");
    try {
      const res = await fetch("/api/system/mcp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client }),
      });
      const data = await res.json();
      if (res.ok) {
        addLog(`SUCCESS: ${data.message}`, "success");
        addLog(`Config Path: ${data.path}`, "info");
      } else {
        throw new Error(data.error || "Setup failed");
      }
    } catch (err: any) {
      addLog(`MCP Setup Failed: ${err.message}`, "error");
    }
  };

  const handleRunApiRequest = async () => {
    const ep = API_ENDPOINTS[selectedApiIdx];
    if (!ep) return;

    setIsSendingApi(true);
    setApiResponse("");
    setApiResponseStatus("");
    setApiResponseLatency("");

    // Resolve path variables
    let finalPath = ep.path;
    for (const [key, val] of Object.entries(apiInputs)) {
      finalPath = finalPath.replace(`:${key}`, encodeURIComponent(val));
    }

    const start = performance.now();
    try {
      const fetchOpts: RequestInit = {
        method: ep.method,
        headers: { "Content-Type": "application/json" }
      };
      if (ep.method !== "GET" && apiRequestBody.trim() !== "") {
        fetchOpts.body = apiRequestBody.trim();
      }

      const res = await fetch(finalPath, fetchOpts);
      const latency = Math.round(performance.now() - start);
      setApiResponseLatency(`${latency}ms`);
      setApiResponseStatus(`${res.status} ${res.statusText}`);

      const bodyText = await res.text();
      try {
        const parsed = JSON.parse(bodyText);
        setApiResponse(JSON.stringify(parsed, null, 2));
      } catch {
        setApiResponse(bodyText);
      }
    } catch (err: any) {
      setApiResponse(`NETWORK ERROR: ${err.message}`);
    } finally {
      setIsSendingApi(false);
    }
  };

  // Group catalogSkills into dynamic checkboxes
  const getRecommendedSkillsForTech = (tech: string) => {
    return catalogSkills.filter((sk) => sk.tech_stack === tech);
  };

  const getGeneralSkills = () => {
    return catalogSkills.filter((sk) => sk.tech_stack === "general");
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter((t) => t.status === status);
  };

  const getFilteredPaletteOptions = () => {
    const q = paletteQuery.toLowerCase().trim();
    
    const options = [
      { type: "nav", label: "New Project / Provisioning Wizard", action: () => { setSelectedProject(null); setShowDocs(false); setShowApiDocs(false); setShowSystemSettings(false); } },
      { type: "nav", label: "Go to System Documentation Center", action: () => { setShowDocs(true); setShowApiDocs(false); setShowSystemSettings(false); setSelectedProject(null); } },
      { type: "nav", label: "Go to Interactive API Sandbox Playground", action: () => { setShowApiDocs(true); setShowDocs(false); setShowSystemSettings(false); setSelectedProject(null); } },
      { type: "nav", label: "Go to Global System Settings Customizer", action: () => { setShowSystemSettings(true); setShowDocs(false); setShowApiDocs(false); setSelectedProject(null); } },
      { type: "nav", label: "Open Neuron GitHub Repository in new tab", action: () => { window.open("https://github.com/mojoaar/neuron", "_blank"); } },
      { type: "nav", label: "Clear Terminal console feedback logs", action: () => { setLogs([]); } }
    ];

    if (selectedProject) {
      options.push(
        { type: "action", label: `⚡ Export [${selectedProject.name}] skills to target runner`, action: () => handleExportSkills() },
        { type: "action", label: `+ Add a new backlog task inside [${selectedProject.name}]`, action: () => { setActiveTab("tasks"); setIsAddingTask(true); } },
        { type: "action", label: `+ Register a new custom skill for [${selectedProject.name}]`, action: () => { setActiveTab("skills"); setIsAddingSkill(true); } },
        { type: "action", label: ` Refresh Git repository status logs`, action: () => fetchGitStatus(selectedProject.id) }
      );
    }

    projects.forEach((proj) => {
      options.push({
        type: "project",
        label: `📂 Mount Project: ${proj.name} [${proj.tech_stack.toUpperCase()}] (${formatPathScope(proj.path)})`,
        action: () => handleSelectProject(proj)
      });
    });

    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  };

  const handlePaletteSelectOption = (idx: number) => {
    const filtered = getFilteredPaletteOptions();
    const opt = filtered[idx];
    if (opt) {
      opt.action();
      setShowCommandPalette(false);
      setPaletteQuery("");
    }
  };

  if (isServerDisconnected) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-terminal-black text-terminal-green font-mono p-6 relative">
        <div className="max-w-md w-full border border-terminal-red bg-terminal-dark rounded-lg p-6 shadow-[0_0_24px_rgba(239,68,68,0.3)] space-y-4 text-center">
          <div className="w-12 h-12 rounded-full border border-terminal-red text-terminal-red flex items-center justify-center text-lg font-bold mx-auto animate-pulse">
            !
          </div>
          <h2 className="text-sm font-bold text-terminal-red uppercase tracking-wider">[ HUD CONNECTION DISCONNECTED ]</h2>
          <p className="text-xs text-terminal-text leading-relaxed">
            The local Go background process has exited gracefully and released its DuckDB lock.
          </p>
          <div className="bg-terminal-black border border-terminal-border p-3 rounded font-mono text-[10px] text-terminal-muted leading-relaxed text-left">
            <span className="text-terminal-green font-bold">To restart the server:</span><br />
            $ ./neuron ui<br /><br />
            <span className="text-terminal-green font-bold">To start as background daemon:</span><br />
            $ ./neuron ui --daemon
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-terminal-black text-terminal-text font-mono border-4 border-terminal-gray relative">
      
      {/* Universal Command Palette Overlay (⌘K) */}
      {showCommandPalette && (
        <div className="absolute inset-0 bg-terminal-black/75 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4">
          <div className="max-w-xl w-full border border-terminal-green bg-terminal-dark rounded-lg shadow-[0_0_24px_rgba(0,255,102,0.3)] overflow-hidden flex flex-col max-h-[400px]">
            <div className="p-3 border-b border-terminal-green flex items-center space-x-2 bg-terminal-black">
              <TerminalIcon className="w-4 h-4 text-terminal-green" />
              <input
                ref={paletteInputRef}
                type="text"
                value={paletteQuery}
                onChange={(e) => {
                  setPaletteQuery(e.target.value);
                  setPaletteSelectedIndex(0);
                }}
                onKeyDown={(e) => {
                  const filtered = getFilteredPaletteOptions();
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setPaletteSelectedIndex((prev) => (prev + 1) % filtered.length);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setPaletteSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    handlePaletteSelectOption(paletteSelectedIndex);
                  }
                }}
                placeholder="Fuzzy search projects, navigation steps, or active HUD commands..."
                className="flex-1 bg-transparent border-none text-terminal-text outline-none text-xs focus:border-transparent focus:ring-0 p-0"
              />
              <span className="text-[10px] text-terminal-muted border border-terminal-border px-1.5 py-0.2 rounded">ESC</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-[320px]">
              {getFilteredPaletteOptions().length === 0 ? (
                <div className="p-4 text-center text-xs text-terminal-muted">No commands or systems found matching queries.</div>
              ) : (
                getFilteredPaletteOptions().map((opt, idx) => {
                  const isSelected = idx === paletteSelectedIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => handlePaletteSelectOption(idx)}
                      className={`w-full text-left p-2.5 rounded text-[11px] flex items-center justify-between transition-all ${
                        isSelected 
                          ? "bg-terminal-green text-terminal-black font-bold" 
                          : "text-terminal-text hover:bg-terminal-gray"
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      <span className={`text-[9px] uppercase font-bold border px-1 rounded ${
                        isSelected 
                          ? "border-terminal-black/40 text-terminal-black" 
                          : opt.type === "project" 
                          ? "border-cyan-500/30 text-cyan-400 bg-cyan-950/20" 
                          : opt.type === "nav" 
                          ? "border-terminal-green/30 text-terminal-green bg-terminal-green/10" 
                          : "border-terminal-yellow/30 text-terminal-yellow bg-terminal-yellow/10"
                      }`}>
                        {opt.type}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. Header Row */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-terminal-border bg-terminal-dark">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-terminal-green rounded-full animate-pulse shadow-[0_0_8px_#00ff66]" />
          <h1 
            onClick={() => {
              setShowDocs(false);
              setShowApiDocs(false);
              setShowSystemSettings(false);
              addLog("Returning to principal workspace dashboard context...", "system");
            }}
            className="text-lg font-bold tracking-wider text-terminal-green flex items-center space-x-2 cursor-pointer select-none hover:opacity-80 active:scale-95 transition-all"
          >
            <span>NEURON // SYSTEM_HUD</span>
            <span className="text-terminal-muted font-light text-xs bg-terminal-gray border border-terminal-border px-1.5 py-0.5 rounded">v1.4.0</span>
          </h1>
        </div>
        <button 
          onClick={() => setShowCommandPalette(true)}
          className="text-xs text-terminal-muted flex items-center space-x-2 hover:text-terminal-green bg-terminal-gray border border-terminal-border px-3 py-1.5 rounded transition-all select-none"
        >
          <TerminalIcon className="w-3.5 h-3.5" />
          <span>Fuzzy search commands...</span>
          <kbd className="bg-terminal-black border border-terminal-border px-1.5 rounded text-[10px]">⌘K</kbd>
        </button>
        <div className="flex items-center space-x-6 text-xs text-terminal-muted">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center justify-center p-2 rounded border border-terminal-border bg-terminal-gray text-terminal-muted hover:text-terminal-green hover:border-terminal-green transition-all"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-terminal-yellow animate-pulse" /> : <Moon className="w-3.5 h-3.5 text-terminal-cyan" />}
          </button>

          <div className="flex items-center space-x-1.5 bg-terminal-gray px-3 py-1.5 rounded border border-terminal-border">
            <Database className="w-3.5 h-3.5 text-terminal-green" />
            <span className="text-terminal-text">duckdb:active</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-terminal-gray px-3 py-1.5 rounded border border-terminal-border">
            <div className="w-2 h-2 rounded-full bg-terminal-green" />
            <span className="text-terminal-text">server:127.0.0.1:8080</span>
          </div>
        </div>
      </header>

      {/* 2. Main Area split into Sidebar and Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR: System Explorer */}
        <aside className="w-80 border-r border-terminal-border bg-terminal-dark flex flex-col justify-between overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-terminal-border bg-terminal-black">
              <div className="text-xs text-terminal-green font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>[ Scope: {formatPathScope(cwd).toUpperCase()} ]</span>
                <span className="text-[10px] text-terminal-muted bg-terminal-gray px-1.5 py-0.2 rounded border border-terminal-border">n={projects.length}</span>
              </div>
              <p className="text-[11px] text-terminal-muted leading-relaxed">
                Registered local environments tracked by DuckDB database.
              </p>
            </div>

            {/* Project List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {projects.length === 0 ? (
                <div className="p-4 text-center text-xs text-terminal-muted border border-dashed border-terminal-border rounded mt-4 mx-2">
                  No registered systems found. Use provisioner wizard below.
                </div>
              ) : (
                projects.map((proj) => {
                  const isActive = selectedProject?.id === proj.id && !showSystemSettings && !showDocs && !showApiDocs;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => handleSelectProject(proj)}
                      className={`w-full text-left p-3 rounded border transition-all flex items-start space-x-3 group ${
                        isActive
                          ? "bg-terminal-green/5 border-terminal-green text-terminal-green shadow-[inset_0_0_4px_rgba(0,255,102,0.15)]"
                          : "bg-transparent border-transparent text-terminal-text hover:bg-terminal-gray hover:border-terminal-border"
                      }`}
                    >
                      <div className={`mt-0.5 p-1 rounded border ${isActive ? "border-terminal-green text-terminal-green" : "border-terminal-border text-terminal-muted group-hover:text-terminal-text"}`}>
                        {proj.tech_stack === "go" ? (
                          <Cpu className="w-4 h-4" />
                        ) : proj.tech_stack === "node" ? (
                          <FileCode className="w-4 h-4" />
                        ) : proj.tech_stack === "html" ? (
                          <Globe className="w-4 h-4" />
                        ) : proj.tech_stack === "powershell" ? (
                          <TerminalIcon className="w-4 h-4" />
                        ) : proj.tech_stack === "python" ? (
                          <Sparkles className="w-4 h-4" />
                        ) : proj.tech_stack === "android" ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Layers className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-xs truncate ${isActive ? "text-terminal-green" : "text-terminal-text"}`}>
                            {proj.name}
                          </span>
                          <span className={`text-[9px] uppercase border px-1 rounded font-bold ${
                            proj.tech_stack === "go"
                              ? "border-cyan-500/30 text-cyan-400 bg-cyan-950/20"
                              : proj.tech_stack === "node"
                              ? "border-yellow-500/30 text-yellow-500 bg-yellow-950/20"
                              : proj.tech_stack === "html"
                              ? "border-emerald-500/30 text-emerald-400 bg-emerald-950/20"
                              : proj.tech_stack === "powershell"
                              ? "border-blue-500/30 text-blue-400 bg-blue-950/20"
                              : proj.tech_stack === "python"
                              ? "border-amber-500/30 text-amber-500 bg-amber-950/20"
                              : proj.tech_stack === "android"
                              ? "border-pink-500/30 text-pink-400 bg-pink-950/20"
                              : "border-purple-500/30 text-purple-400 bg-purple-950/20"
                          }`}>
                            {proj.tech_stack}
                          </span>
                        </div>
                        <div className="text-[10px] text-terminal-muted truncate mt-1 flex items-center space-x-1">
                          <Folder className="w-3 h-3 flex-shrink-0 text-terminal-muted" />
                          <span className="truncate">{proj.path}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Static Sidebar Navigation Links */}
          <div className="p-3 border-t border-terminal-border bg-terminal-dark space-y-1.5">
            <button
              onClick={() => {
                setShowDocs(true);
                setShowApiDocs(false);
                setShowSystemSettings(false);
                setSelectedProject(null);
                addLog("Loading System Documentation Center...", "system");
              }}
              className={`w-full text-left p-2 rounded text-xs font-bold flex items-center space-x-2 border transition-all ${
                showDocs
                  ? "bg-terminal-cyan/5 border-terminal-cyan text-terminal-cyan shadow-[inset_0_0_4px_rgba(0,229,255,0.15)]"
                  : "bg-transparent border-transparent text-terminal-muted hover:bg-terminal-gray hover:text-terminal-text"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>[ 📖 DOCUMENTATION ]</span>
            </button>
            <button
              onClick={() => {
                setShowApiDocs(true);
                setShowDocs(false);
                setShowSystemSettings(false);
                setSelectedProject(null);
                addLog("Loading Interactive API Sandbox...", "system");
              }}
              className={`w-full text-left p-2 rounded text-xs font-bold flex items-center space-x-2 border transition-all ${
                showApiDocs
                  ? "bg-terminal-green/5 border-terminal-green text-terminal-green shadow-[inset_0_0_4px_rgba(0,255,102,0.15)]"
                  : "bg-transparent border-transparent text-terminal-muted hover:bg-terminal-gray hover:text-terminal-text"
              }`}
            >
              <TerminalIcon className="w-4 h-4" />
              <span>[ 🔌 API_SANDBOX_PLAY ]</span>
            </button>
          </div>

          {/* Sidebar Footer Action */}
          <div className="p-3 border-t border-terminal-border bg-terminal-black flex items-center space-x-2">
            <button
              onClick={() => {
                setSelectedProject(null);
                setShowSystemSettings(false);
                setShowDocs(false);
                setShowApiDocs(false);
              }}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded border text-center flex items-center justify-center space-x-2 transition-all ${
                selectedProject === null && !showSystemSettings && !showDocs && !showApiDocs
                  ? "bg-terminal-green text-terminal-black border-terminal-green font-bold shadow-[0_0_8px_rgba(0,255,102,0.3)]"
                  : "bg-terminal-gray text-terminal-text border-terminal-border hover:border-terminal-green hover:text-terminal-green"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>PROVISION ENV</span>
            </button>

            <button
              onClick={() => {
                setShowSystemSettings(true);
                setShowDocs(false);
                setShowApiDocs(false);
                setSelectedProject(null);
                addLog("Loading Global System Configurator Panels...", "system");
              }}
              className={`p-2 rounded border transition-all ${
                showSystemSettings
                  ? "bg-terminal-yellow text-terminal-black border-terminal-yellow shadow-[0_0_8px_rgba(234,179,8,0.3)]"
                  : "bg-terminal-gray border-terminal-border text-terminal-text hover:border-terminal-yellow hover:text-terminal-yellow"
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* WORKSPACE AREA */}
        <main className="flex-1 flex flex-col overflow-hidden bg-terminal-black">
          {showDocs ? (
            /* 📖 DOCUMENTATION HUB SCENE */
            <div className="flex-1 flex overflow-hidden">
              {/* Left Sub-nav */}
              <div className="w-64 border-r border-terminal-border bg-terminal-dark p-3 space-y-2 flex flex-col">
                <div className="text-[10px] uppercase font-bold text-terminal-muted tracking-wider border-b border-terminal-border pb-1.5 mb-1">[ Doc chapters ]</div>
                <button
                  onClick={() => setSelectedDocSlug("started")}
                  className={`w-full text-left p-2 rounded text-xs font-bold transition-all ${
                    selectedDocSlug === "started"
                      ? "bg-terminal-cyan/15 text-terminal-cyan font-bold border border-terminal-cyan/30"
                      : "text-terminal-muted hover:text-terminal-text"
                  }`}
                >
                  01_Getting_Started
                </button>
                <button
                  onClick={() => setSelectedDocSlug("mcp")}
                  className={`w-full text-left p-2 rounded text-xs font-bold transition-all ${
                    selectedDocSlug === "mcp"
                      ? "bg-terminal-cyan/15 text-terminal-cyan font-bold border border-terminal-cyan/30"
                      : "text-terminal-muted hover:text-terminal-text"
                  }`}
                >
                  02_MCP_Integration
                </button>
                <button
                  onClick={() => setSelectedDocSlug("skills")}
                  className={`w-full text-left p-2 rounded text-xs font-bold transition-all ${
                    selectedDocSlug === "skills"
                      ? "bg-terminal-cyan/15 text-terminal-cyan font-bold border border-terminal-cyan/30"
                      : "text-terminal-muted hover:text-terminal-text"
                  }`}
                >
                  03_Custom_Skills
                </button>
                <button
                  onClick={() => setSelectedDocSlug("taskboard")}
                  className={`w-full text-left p-2 rounded text-xs font-bold transition-all ${
                    selectedDocSlug === "taskboard"
                      ? "bg-terminal-cyan/15 text-terminal-cyan font-bold border border-terminal-cyan/30"
                      : "text-terminal-muted hover:text-terminal-text"
                  }`}
                >
                  04_Kanban_Taskboard
                </button>
                <button
                  onClick={() => setSelectedDocSlug("service")}
                  className={`w-full text-left p-2 rounded text-xs font-bold transition-all ${
                    selectedDocSlug === "service"
                      ? "bg-terminal-cyan/15 text-terminal-cyan font-bold border border-terminal-cyan/30"
                      : "text-terminal-muted hover:text-terminal-text"
                  }`}
                >
                  05_System_Service
                </button>
              </div>

              {/* Right Doc Viewer */}
              <div className="flex-1 p-6 overflow-y-auto bg-terminal-black text-terminal-text">
                <div 
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    const copyBtn = target.closest("[data-copy-btn]");
                    if (copyBtn) {
                      // Find neighboring pre element inside group container
                      const container = copyBtn.closest(".group");
                      const pre = container?.querySelector("pre");
                      if (pre) {
                        const text = pre.innerText || pre.textContent || "";
                        navigator.clipboard.writeText(text);
                        const originalText = copyBtn.innerHTML;
                        copyBtn.innerHTML = "[ COPIED! ]";
                        copyBtn.classList.remove("text-terminal-muted");
                        copyBtn.classList.add("text-terminal-green", "border-terminal-green");
                        setTimeout(() => {
                          copyBtn.innerHTML = originalText;
                          copyBtn.classList.add("text-terminal-muted");
                          copyBtn.classList.remove("text-terminal-green", "border-terminal-green");
                        }, 1500);
                      }
                    }
                  }}
                  className="prose prose-invert font-mono text-[13px] leading-relaxed max-w-2xl space-y-3"
                  dangerouslySetInnerHTML={{ 
                    __html: renderMarkdown(
                      selectedDocSlug === "started"
                        ? DOCS_GETTING_STARTED
                        : selectedDocSlug === "mcp"
                        ? DOCS_MCP_SERVER
                        : selectedDocSlug === "skills"
                        ? DOCS_SKILLS_GUIDE
                        : selectedDocSlug === "taskboard"
                        ? DOCS_TASKBOARD_GUIDE
                        : DOCS_SYSTEM_SERVICE
                    ) 
                  }}
                />
              </div>
            </div>
          ) : showApiDocs ? (
            /* 🔌 INTERACTIVE API PLAYGROUND SCENE */
            <div className="flex-1 flex overflow-hidden">
              {/* Left Endpoint List */}
              <div className="w-[300px] border-r border-terminal-border bg-terminal-dark p-3 space-y-1.5 flex flex-col overflow-y-auto shrink-0 font-mono">
                <div className="text-[10px] uppercase font-bold text-terminal-muted tracking-wider border-b border-terminal-border pb-1.5 mb-2">[ REST endpoints ]</div>
                {API_ENDPOINTS.map((ep, idx) => {
                  const isSelected = selectedApiIdx === idx;
                  const methodColors = {
                    GET: "text-terminal-green border-terminal-green/30 bg-terminal-green/5",
                    POST: "text-terminal-cyan border-terminal-cyan/30 bg-terminal-cyan/5",
                    PATCH: "text-terminal-yellow border-terminal-yellow/30 bg-terminal-yellow/5",
                    PUT: "text-terminal-yellow border-terminal-yellow/30 bg-terminal-yellow/5",
                    DELETE: "text-terminal-red border-terminal-red/30 bg-terminal-red/5"
                  };
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedApiIdx(idx)}
                      className={`w-full text-left p-2 rounded border text-[11px] transition-all flex items-start space-x-2 ${
                        isSelected 
                          ? "border-terminal-green bg-terminal-green/5 shadow-[inset_0_0_4px_rgba(0,255,102,0.1)] text-terminal-text font-bold" 
                          : "border-transparent text-terminal-muted hover:bg-terminal-gray hover:text-terminal-text"
                      }`}
                    >
                      <span className={`text-[8px] border px-1 rounded font-bold shrink-0 ${methodColors[ep.method]}`}>{ep.method}</span>
                      <span className="truncate">{ep.path}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Console Sandbox */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-terminal-black text-xs">
                {/* Method & Path Card */}
                <div className="border border-terminal-border bg-terminal-dark p-4 rounded-lg">
                  <div className="flex items-center space-x-2.5 font-mono mb-1">
                    <span className={`text-[10px] border px-2 py-0.5 rounded font-bold uppercase ${
                      API_ENDPOINTS[selectedApiIdx].method === "GET" 
                        ? "text-terminal-green border-terminal-green bg-terminal-green/5" 
                        : "text-terminal-cyan border-terminal-cyan bg-terminal-cyan/5"
                    }`}>{API_ENDPOINTS[selectedApiIdx].method}</span>
                    <span className="text-sm font-bold text-terminal-text">{API_ENDPOINTS[selectedApiIdx].path}</span>
                  </div>
                  <p className="text-[11px] text-terminal-muted leading-relaxed mt-2">{API_ENDPOINTS[selectedApiIdx].desc}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Request Specs */}
                  <div className="space-y-4">
                    {/* Path Parameters */}
                    {Object.keys(API_ENDPOINTS[selectedApiIdx].mockParams).length > 0 && (
                      <div className="border border-terminal-border p-3 rounded bg-terminal-dark space-y-3">
                        <h4 className="font-bold text-[10px] text-terminal-muted uppercase tracking-wider border-b border-terminal-border/40 pb-1 mb-2">[ Path Parameters ]</h4>
                        {Object.keys(API_ENDPOINTS[selectedApiIdx].mockParams).map((paramKey) => (
                          <div key={paramKey} className="flex flex-col space-y-1 text-[11px]">
                            <span className="font-bold text-terminal-text font-mono">{paramKey}</span>
                            <input
                              type="text"
                              value={apiInputs[paramKey] || ""}
                              onChange={(e) => setApiInputs({...apiInputs, [paramKey]: e.target.value})}
                              className="w-full bg-terminal-black border border-terminal-border p-1 text-terminal-text rounded font-mono text-xs focus:border-terminal-green focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Request Payload JSON */}
                    {API_ENDPOINTS[selectedApiIdx].mockBody && (
                      <div className="border border-terminal-border rounded overflow-hidden flex flex-col bg-terminal-dark h-[200px]">
                        <div className="p-2 border-b border-terminal-border text-[10px] font-bold text-terminal-muted font-mono">
                          REQUEST_BODY_PAYLOAD_JSON
                        </div>
                        <textarea
                          value={apiRequestBody}
                          onChange={(e) => setApiRequestBody(e.target.value)}
                          className="flex-1 p-2 bg-terminal-black text-terminal-text font-mono text-[11px] border-0 outline-none resize-none focus:ring-0 focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleRunApiRequest}
                        disabled={isSendingApi}
                        className="bg-terminal-green text-terminal-black hover:bg-terminal-green/90 font-bold text-xs py-2.5 px-6 rounded shadow-[0_0_12px_rgba(0,255,102,0.35)] flex items-center space-x-1.5"
                      >
                        {isSendingApi ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-terminal-black border-t-transparent rounded-full animate-spin" />
                            <span>SENDING...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current" />
                            <span>RUN_LIVE_REQUEST</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Response CRT logs */}
                  <div className="flex flex-col border border-terminal-border rounded overflow-hidden bg-terminal-black h-[350px]">
                    <div className="p-2 border-b border-terminal-border bg-terminal-dark text-[10px] font-bold text-terminal-muted flex items-center justify-between font-mono">
                      <span>RESPONSE_HUD</span>
                      <div className="flex items-center space-x-3">
                        {apiResStatus && <span className="text-terminal-green font-bold">status: {apiResStatus}</span>}
                        {apiResTime && <span className="text-terminal-cyan">latency: {apiResTime}</span>}
                      </div>
                    </div>
                    <pre className="flex-1 p-3 overflow-auto font-mono text-[11px] text-terminal-green leading-relaxed bg-terminal-black/95">
                      {apiResponse || "[Standing by for sandbox execution logs...]"}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : showSystemSettings ? (
            /* GLOBAL SYSTEM SETTINGS SCENE */
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* WORKSPACE ROOT SCOPE PATH CONFIGURATION */}
              <div className="border border-terminal-border bg-terminal-dark rounded-lg p-5">
                <div className="flex items-center space-x-2 border-b border-terminal-border pb-2.5 mb-4">
                  <Database className="w-5 h-5 text-terminal-green" />
                  <h3 className="font-bold text-sm text-terminal-green uppercase">[ WORKSPACE SCOPE ROOT PATH ]</h3>
                  <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                    isCustomScope 
                      ? "border border-terminal-green/30 text-terminal-green bg-terminal-green/5" 
                      : "border border-terminal-muted/30 text-terminal-muted bg-terminal-gray/5"
                  }`}>
                    {isCustomScope ? "static configuration active" : "dynamic launch tracking"}
                  </span>
                </div>
                <p className="text-[11px] text-terminal-muted leading-relaxed mb-4">
                  Forces Neuron to filter, scope, and provision projects relative to this custom directory root. If unconfigured, it dynamically tracks the folder where the binary is executed.
                </p>

                <div className="space-y-4">
                  <div className="flex flex-col space-y-1.5 text-xs">
                    <label className="font-bold text-terminal-text uppercase">ACTIVE DIRECTORY PATH ROOT:</label>
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="text"
                        value={customScopePath}
                        onChange={(e) => setCustomScopePath(e.target.value)}
                        placeholder="e.g. /Users/mojoaar/Development/"
                        className="flex-1 font-mono text-xs"
                      />
                      <button
                        onClick={handleSaveScopePath}
                        disabled={isSavingScope || !customScopePath.trim()}
                        className="bg-terminal-green text-terminal-black hover:bg-terminal-green/90 font-bold px-4 py-2 rounded shadow-[0_0_8px_rgba(0,255,102,0.25)] shrink-0"
                      >
                        {isSavingScope ? "SAVING..." : "LOCK_SCOPE"}
                      </button>
                      {isCustomScope && (
                        <button
                          onClick={handleResetScopePath}
                          disabled={isSavingScope}
                          className="bg-terminal-gray hover:border-terminal-red hover:text-terminal-red border border-terminal-border text-terminal-text font-bold px-4 py-2 rounded shrink-0"
                        >
                          {isSavingScope ? "REVERTING..." : "CLEAR_AND_RESET"}
                        </button>
                      )}
                    </div>
                    {isCustomScope ? (
                      <span className="text-[10px] text-terminal-green block mt-1">
                        Locked to: <code className="bg-terminal-black/30 border border-terminal-green/20 px-1 py-0.2 rounded font-mono">{cwd}</code> (startup was: {startupCwd})
                      </span>
                    ) : (
                      <span className="text-[10px] text-terminal-muted block mt-1">
                        Currently tracking launch directory: <code className="bg-terminal-black/30 border border-terminal-border/20 px-1 py-0.2 rounded font-mono">{cwd}</code>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="border border-terminal-border bg-terminal-dark rounded-lg p-5">
                <div className="flex items-center space-x-2 border-b border-terminal-border pb-2.5 mb-4">
                  <Settings className="w-5 h-5 text-terminal-yellow" />
                  <h3 className="font-bold text-sm text-terminal-yellow uppercase">[ SYSTEM TEMPLATES CUSTOMIZER ]</h3>
                </div>
                <p className="text-[11px] text-terminal-muted leading-relaxed mb-4">
                  Overwrites the default rules (<code className="text-terminal-green">AGENTS.md</code>) and planning (<code className="text-terminal-green">plan.md</code>) boilerplates pre-provisioned inside new codebases.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-xs">
                    <label className="font-bold text-terminal-text uppercase shrink-0">SELECT TECH STACK:</label>
                    <select
                      value={selectedTemplateTech}
                      onChange={(e) => setSelectedTemplateTech(e.target.value)}
                      className="bg-terminal-black text-terminal-text border border-terminal-border rounded px-3 py-1 outline-none"
                    >
                      <option value="go">Go (Golang)</option>
                      <option value="node">Node.js</option>
                      <option value="html">HTML / CSS</option>
                      <option value="powershell">PowerShell</option>
                      <option value="nextjs">Next.js App</option>
                      <option value="python">Python</option>
                      <option value="android">Android</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Default AGENTS.md template */}
                    <div className="flex flex-col h-[250px] border border-terminal-border rounded bg-terminal-black overflow-hidden">
                      <div className="p-2 border-b border-terminal-border bg-terminal-dark text-[10px] font-bold text-terminal-muted">
                        DEFAULT_AGENTS.MD_TEMPLATE
                      </div>
                      <textarea
                        value={tmplAgents}
                        onChange={(e) => setTmplAgents(e.target.value)}
                        className="flex-1 p-3 bg-terminal-black font-mono text-[11px] text-terminal-text border-0 outline-none resize-none focus:ring-0"
                      />
                    </div>

                    {/* Default plan.md template */}
                    <div className="flex flex-col h-[250px] border border-terminal-border rounded bg-terminal-black overflow-hidden">
                      <div className="p-2 border-b border-terminal-border bg-terminal-dark text-[10px] font-bold text-terminal-muted">
                        DEFAULT_PLAN.MD_TEMPLATE
                      </div>
                      <textarea
                        value={tmplPlan}
                        onChange={(e) => setTmplPlan(e.target.value)}
                        className="flex-1 p-3 bg-terminal-black font-mono text-[11px] text-terminal-text border-0 outline-none resize-none focus:ring-0"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <button
                      onClick={handleShutdownServer}
                      className="bg-terminal-red/10 border border-terminal-red hover:bg-terminal-red hover:text-terminal-black text-terminal-red font-bold text-xs py-2 px-6 rounded shadow-[0_0_8px_rgba(239,68,68,0.15)] flex items-center space-x-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>SHUTDOWN_HUD_SERVER</span>
                    </button>

                    <button
                      onClick={handleSaveTemplate}
                      disabled={isSavingTmpl}
                      className="bg-terminal-yellow text-terminal-black hover:bg-terminal-yellow/90 font-bold text-xs py-2 px-6 rounded shadow-[0_0_8px_rgba(234,179,8,0.25)]"
                    >
                      {isSavingTmpl ? "SAVING..." : "SAVE_TEMPLATE_CHANGES"}
                    </button>
                  </div>
                </div>
              </div>

              {/* RECOMMENDED SKILLS CATALOG CRUD */}
              <div className="border border-terminal-border bg-terminal-dark rounded-lg p-5">
                <div className="flex items-center justify-between border-b border-terminal-border pb-2.5 mb-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-terminal-green" />
                    <h3 className="font-bold text-sm text-terminal-green uppercase">[ RECOMMENDED SKILLS CATALOG ]</h3>
                  </div>
                  {!isAddingCatalogSkill && (
                    <button
                      onClick={() => setIsAddingCatalogSkill(true)}
                      className="bg-terminal-green text-terminal-black font-bold text-xs py-1.5 px-4 rounded shadow-[0_0_8px_rgba(0,255,102,0.25)] flex items-center space-x-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>REGISTER_CATALOG_SKILL</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-terminal-muted leading-relaxed mb-4">
                  Dynamically manages skills registered inside recommended checklists in the Provisioning Wizard.
                </p>

                {/* Add Catalog Skill Form */}
                {isAddingCatalogSkill && (
                  <form onSubmit={handleAddCatalogSkill} className="bg-terminal-black border border-terminal-green p-4 rounded-lg text-xs space-y-3 mb-4">
                    <div className="flex items-center justify-between border-b border-terminal-border pb-2">
                      <span className="font-bold text-terminal-green uppercase">ADD RECOMMENDED CATALOG SKILL</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingCatalogSkill(false)}
                        className="text-terminal-muted hover:text-terminal-red"
                      >
                        [ CANCEL ]
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-terminal-muted mb-1 font-bold">DISPLAY LABEL</label>
                        <input
                          type="text"
                          value={newCatLabel}
                          onChange={(e) => setNewCatLabel(e.target.value)}
                          placeholder="e.g. Drizzle ORM Expert"
                          className="w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-terminal-muted mb-1 font-bold">AGENTSKILL.SH URL / SLUG</label>
                        <input
                          type="text"
                          value={newCatUrl}
                          onChange={(e) => setNewCatUrl(e.target.value)}
                          placeholder="https://agentskill.sh/@sickn33/drizzle-orm-expert"
                          className="w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-terminal-muted mb-1 font-bold">TARGET TECH STACK</label>
                        <select
                          value={newCatTech}
                          onChange={(e) => setNewCatTech(e.target.value)}
                          className="w-full bg-terminal-gray border border-terminal-border text-terminal-text rounded px-3 py-1.5 focus:outline-none focus:border-terminal-green font-mono text-xs"
                        >
                          <option value="general">General (All Projects)</option>
                          <option value="go">Go (Golang)</option>
                          <option value="node">Node.js</option>
                          <option value="html">HTML / CSS</option>
                          <option value="powershell">PowerShell</option>
                          <option value="nextjs">Next.js App</option>
                          <option value="python">Python</option>
                          <option value="android">Android</option>
                        </select>
                      </div>
                      <div className="flex items-center pt-5">
                        <label className="flex items-center space-x-2.5 cursor-pointer text-terminal-text hover:text-terminal-green select-none">
                          <input
                            type="checkbox"
                            checked={newCatChecked}
                            onChange={() => setNewCatChecked(!newCatChecked)}
                            className="rounded border-terminal-border text-terminal-green bg-terminal-gray focus:ring-0 focus:ring-offset-0"
                          />
                          <span className="font-bold">Checked by default in Provisioning wizard</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isSavingCatSkill}
                        className="bg-terminal-green text-terminal-black font-bold px-5 py-2 rounded shadow-[0_0_8px_rgba(0,255,102,0.25)]"
                      >
                        {isSavingCatSkill ? "SAVING..." : "REGISTER_RECOMMENDED_SKILL"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Catalog Skills Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
                  {catalogSkills.map((sk) => (
                    <div key={sk.url} className="p-3 bg-terminal-black border border-terminal-border rounded flex flex-col justify-between space-y-2 relative group">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-xs text-terminal-green">{sk.label}</div>
                          <div className="text-[9px] text-terminal-muted truncate max-w-[240px] font-mono mt-0.5">{sk.url}</div>
                        </div>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className="text-[9px] uppercase border border-terminal-border px-1.5 rounded text-terminal-muted bg-terminal-dark">
                            {sk.tech_stack}
                          </span>
                          {sk.is_checked && (
                            <span className="text-[9px] border border-terminal-green/30 text-terminal-green px-1 rounded font-bold">def</span>
                          )}
                          <button
                            onClick={() => handleDeleteCatalogSkill(sk.url, sk.label)}
                            className="p-0.5 text-terminal-muted hover:text-terminal-red opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedProject === null ? (
            /* PROVISIONER SCENE */
            <div className="flex-1 p-8 overflow-y-auto flex items-center justify-center">
              <div className="max-w-xl w-full border border-terminal-border bg-terminal-dark rounded-lg p-6 relative shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                {/* Visual grid background */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0.3)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none rounded-lg" />

                <div className="relative">
                  <div className="flex items-center space-x-2 text-terminal-green border-b border-terminal-border pb-3 mb-4">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    <h2 className="font-bold uppercase tracking-wider text-sm">
                      [ SYSTEM PROVISIONING WIZARD ]
                    </h2>
                  </div>

                  <p className="text-xs text-terminal-muted leading-relaxed mb-6">
                    Neuron will scaffold a clean stack template structure, write local coding boundaries (<code className="text-terminal-green">AGENTS.md</code> & <code className="text-terminal-green">CLAUDE.md</code>), and register the database records.
                  </p>

                  <form onSubmit={handleProvision} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-terminal-text font-bold mb-1.5 uppercase tracking-wide">
                        System Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. core-auth-service"
                        value={provName}
                        onChange={(e) => setProvName(e.target.value)}
                        disabled={isProvisioning}
                        className="w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-terminal-text font-bold mb-1.5 uppercase tracking-wide">
                        Absolute Target Path
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ./core-auth-service"
                        value={provPath}
                        onChange={(e) => setProvPath(e.target.value)}
                        disabled={isProvisioning}
                        className="w-full"
                        required
                      />
                      <span className="text-[10px] text-terminal-muted block mt-1">
                        Absolute or local relative system path directory to create.
                      </span>
                    </div>

                    <div>
                      <label className="block text-terminal-text font-bold mb-1.5 uppercase tracking-wide">
                        Technological Stack
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setProvTech("go")}
                          disabled={isProvisioning}
                          className={`p-3 rounded border text-left flex items-center justify-between transition-all ${
                            provTech === "go"
                              ? "bg-cyan-950/20 border-cyan-500 text-cyan-400 font-bold"
                              : "bg-terminal-gray border-terminal-border text-terminal-muted hover:text-terminal-text"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Cpu className="w-4 h-4" />
                            <span>Go (Golang)</span>
                          </div>
                          <span className="text-[9px] uppercase border px-1 border-cyan-500/40 rounded">1.22+</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProvTech("node")}
                          disabled={isProvisioning}
                          className={`p-3 rounded border text-left flex items-center justify-between transition-all ${
                            provTech === "node"
                              ? "bg-yellow-950/20 border-yellow-500 text-yellow-500 font-bold"
                              : "bg-terminal-gray border-terminal-border text-terminal-muted hover:text-terminal-text"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <FileCode className="w-4 h-4" />
                            <span>Node.js</span>
                          </div>
                          <span className="text-[9px] uppercase border px-1 border-yellow-500/40 rounded">ES6</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProvTech("html")}
                          disabled={isProvisioning}
                          className={`p-3 rounded border text-left flex items-center justify-between transition-all ${
                            provTech === "html"
                              ? "bg-emerald-950/20 border-emerald-500 text-emerald-400 font-bold"
                              : "bg-terminal-gray border-terminal-border text-terminal-muted hover:text-terminal-text"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Globe className="w-4 h-4" />
                            <span>HTML / CSS</span>
                          </div>
                          <span className="text-[9px] uppercase border px-1 border-emerald-500/40 rounded">Vanilla</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProvTech("powershell")}
                          disabled={isProvisioning}
                          className={`p-3 rounded border text-left flex items-center justify-between transition-all ${
                            provTech === "powershell"
                              ? "bg-blue-950/20 border-blue-500 text-blue-400 font-bold"
                              : "bg-terminal-gray border-terminal-border text-terminal-muted hover:text-terminal-text"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <TerminalIcon className="w-4 h-4" />
                            <span>PowerShell</span>
                          </div>
                          <span className="text-[9px] uppercase border px-1 border-blue-500/40 rounded">ps1</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProvTech("nextjs")}
                          disabled={isProvisioning}
                          className={`p-3 rounded border text-left flex items-center justify-between transition-all ${
                            provTech === "nextjs"
                              ? "bg-purple-950/20 border-purple-500 text-purple-400 font-bold"
                              : "bg-terminal-gray border-terminal-border text-terminal-muted hover:text-terminal-text"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Layers className="w-4 h-4" />
                            <span>Next.js App</span>
                          </div>
                          <span className="text-[9px] uppercase border px-1 border-purple-500/40 rounded">v14+</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProvTech("python")}
                          disabled={isProvisioning}
                          className={`p-3 rounded border text-left flex items-center justify-between transition-all ${
                            provTech === "python"
                              ? "bg-amber-950/20 border-amber-500 text-amber-500 font-bold"
                              : "bg-terminal-gray border-terminal-border text-terminal-muted hover:text-terminal-text"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Sparkles className="w-4 h-4" />
                            <span>Python</span>
                          </div>
                          <span className="text-[9px] uppercase border px-1 border-amber-500/40 rounded">3.10+</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProvTech("android")}
                          disabled={isProvisioning}
                          className={`p-3 rounded border text-left flex items-center justify-between transition-all ${
                            provTech === "android"
                              ? "bg-pink-950/20 border-pink-500 text-pink-400 font-bold"
                              : "bg-terminal-gray border-terminal-border text-terminal-muted hover:text-terminal-text"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Smartphone className="w-4 h-4" />
                            <span>Android</span>
                          </div>
                          <span className="text-[9px] uppercase border px-1 border-pink-500/40 rounded">Kotlin</span>
                        </button>
                      </div>
                    </div>

                    {getRecommendedSkillsForTech(provTech).length > 0 && (
                      <div>
                        <label className="block text-terminal-text font-bold mb-1.5 uppercase tracking-wide">
                          [ Stack-Specific Automation Skills ]
                        </label>
                        <div className="space-y-2 border border-terminal-border p-3 rounded bg-terminal-black max-h-48 overflow-y-auto">
                          {getRecommendedSkillsForTech(provTech).map((skill) => {
                            const isChecked = selectedSkillUrls.includes(skill.url);
                            return (
                              <label key={skill.url} className="flex items-start space-x-2.5 cursor-pointer text-terminal-text hover:text-terminal-green py-0.5 select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedSkillUrls(selectedSkillUrls.filter(u => u !== skill.url));
                                    } else {
                                      setSelectedSkillUrls([...selectedSkillUrls, skill.url]);
                                    }
                                  }}
                                  disabled={isProvisioning}
                                  className="mt-0.5 rounded border-terminal-border text-terminal-green bg-terminal-gray focus:ring-0 focus:ring-offset-0 focus:outline-none"
                                />
                                <div className="flex-1">
                                  <div className="font-bold text-[11px] flex items-center space-x-1.5">
                                    <span>{skill.label}</span>
                                    <span className="text-[9px] text-terminal-muted italic font-normal truncate max-w-[280px]">({skill.url})</span>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {getGeneralSkills().length > 0 && (
                      <div>
                        <label className="block text-terminal-text font-bold mb-1.5 uppercase tracking-wide">
                          [ General Agent Capabilities (All Stacks) ]
                        </label>
                        <div className="space-y-2 border border-terminal-border p-3 rounded bg-terminal-black max-h-48 overflow-y-auto">
                          {getGeneralSkills().map((skill) => {
                            const isChecked = selectedSkillUrls.includes(skill.url);
                            return (
                              <label key={skill.url} className="flex items-start space-x-2.5 cursor-pointer text-terminal-text hover:text-terminal-green py-0.5 select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedSkillUrls(selectedSkillUrls.filter(u => u !== skill.url));
                                    } else {
                                      setSelectedSkillUrls([...selectedSkillUrls, skill.url]);
                                    }
                                  }}
                                  disabled={isProvisioning}
                                  className="mt-0.5 rounded border-terminal-border text-terminal-green bg-terminal-gray focus:ring-0 focus:ring-offset-0 focus:outline-none"
                                />
                                <div className="flex-1">
                                  <div className="font-bold text-[11px] flex items-center space-x-1.5">
                                    <span>{skill.label}</span>
                                    <span className="text-[9px] text-terminal-muted italic font-normal truncate max-w-[280px]">({skill.url})</span>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-terminal-border flex justify-end">
                      <button
                        type="submit"
                        disabled={isProvisioning || !provName.trim() || !provPath.trim()}
                        className="bg-terminal-green text-terminal-black hover:bg-terminal-green/90 font-bold py-2.5 px-6 rounded transition-all flex items-center space-x-2 text-xs shadow-[0_0_12px_rgba(0,255,102,0.35)] disabled:opacity-50"
                      >
                        {isProvisioning ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-terminal-black border-t-transparent rounded-full animate-spin" />
                            <span>PROVISIONING_ENGINES...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current" />
                            <span>PROVISION SYSTEM</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE PROJECT DASHBOARD */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Project Title Bar */}
              <div className="p-4 border-b border-terminal-border bg-terminal-dark flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] text-terminal-muted flex items-center space-x-1.5 uppercase font-bold tracking-wider mb-0.5">
                    <span>SYSTEM_CATALOG</span>
                    <ChevronRight className="w-3.5 h-3.5 text-terminal-muted" />
                    <span className="text-terminal-green">{selectedProject.id}</span>
                  </div>
                  <h2 className="text-base font-bold text-terminal-text tracking-wider flex items-center space-x-2">
                    <span className="text-terminal-green font-bold">sys@neuron:~/{selectedProject.name}$</span>
                    <span className="w-2 h-4 bg-terminal-green animate-blink" />
                  </h2>
                </div>
                
                {/* Source Control status HUD */}
                <div className="flex items-center space-x-4 text-xs">
                  {gitStatus && (
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => fetchGitStatus(selectedProject.id)}
                        disabled={isRefreshingGit}
                        className="p-1 rounded border border-terminal-border text-terminal-muted hover:text-terminal-green bg-terminal-black"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRefreshingGit ? "animate-spin text-terminal-green" : ""}`} />
                      </button>
                      {gitStatus.is_repo ? (
                        <div className={`flex items-center space-x-1.5 border px-2.5 py-1 rounded bg-terminal-black ${
                          gitStatus.is_dirty 
                            ? "border-terminal-yellow/40 text-terminal-yellow" 
                            : "border-terminal-green/40 text-terminal-green"
                        }`}>
                          <GitBranch className="w-3.5 h-3.5" />
                          <span className="font-bold">{gitStatus.branch}</span>
                          <span className="text-terminal-muted">|</span>
                          <span>{gitStatus.is_dirty ? `dirty (${gitStatus.dirty_count})` : "clean"}</span>
                        </div>
                      ) : (
                        <span className="text-terminal-muted text-[10px] border border-terminal-border/40 px-2 py-0.5 rounded">no git repo</span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 text-[10px]">
                    <span className="text-terminal-muted font-bold uppercase">Path:</span>
                    <code className="bg-terminal-gray border border-terminal-border px-2 py-1 rounded text-terminal-text font-mono max-w-sm truncate">
                      {selectedProject.path}
                    </code>
                  </div>
                </div>
              </div>

              {/* Sub-tab Navigation */}
              <div className="flex border-b border-terminal-border bg-terminal-black px-4 pt-2">
                <button
                  onClick={() => setActiveTab("plan")}
                  className={`text-xs font-bold py-2 px-4 border-t border-x rounded-t transition-all flex items-center space-x-1.5 ${
                    activeTab === "plan"
                      ? "bg-terminal-dark border-terminal-border text-terminal-green border-t-2 border-t-terminal-green font-bold"
                      : "bg-transparent border-transparent text-terminal-muted hover:text-terminal-text"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>[ 01_PLAN_REFINEMENT ]</span>
                </button>
                <button
                  onClick={() => setActiveTab("rules")}
                  className={`text-xs font-bold py-2 px-4 border-t border-x rounded-t transition-all flex items-center space-x-1.5 ${
                    activeTab === "rules"
                      ? "bg-terminal-dark border-terminal-border text-terminal-green border-t-2 border-t-terminal-green font-bold"
                      : "bg-transparent border-transparent text-terminal-muted hover:text-terminal-text"
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>[ 02_AGENTS_RULES ]</span>
                </button>
                <button
                  onClick={() => setActiveTab("tasks")}
                  className={`text-xs font-bold py-2 px-4 border-t border-x rounded-t transition-all flex items-center space-x-2 ${
                    activeTab === "tasks"
                      ? "bg-terminal-dark border-terminal-border text-terminal-green border-t-2 border-t-terminal-green font-bold"
                      : "bg-transparent border-transparent text-terminal-muted hover:text-terminal-text"
                  }`}
                >
                  <span>[ 03_TASKS_BOARD ]</span>
                  {tasks.length > 0 && (
                    <span className="text-[9px] font-bold bg-terminal-gray border border-terminal-border px-1.5 rounded-full text-terminal-text">
                      {tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("skills")}
                  className={`text-xs font-bold py-2 px-4 border-t border-x rounded-t transition-all flex items-center space-x-2 ${
                    activeTab === "skills"
                      ? "bg-terminal-dark border-terminal-border text-terminal-green border-t-2 border-t-terminal-green font-bold"
                      : "bg-transparent border-transparent text-terminal-muted hover:text-terminal-text"
                  }`}
                >
                  <span>[ 04_SKILLS_CONSOLE ]</span>
                  {skills.length > 0 && (
                    <span className="text-[9px] font-bold bg-terminal-gray border border-terminal-border px-1.5 rounded-full text-terminal-text">
                      {skills.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("mcp")}
                  className={`text-xs font-bold py-2 px-4 border-t border-x rounded-t transition-all flex items-center space-x-1.5 ${
                    activeTab === "mcp"
                      ? "bg-terminal-dark border-terminal-border text-terminal-green border-t-2 border-t-terminal-green font-bold"
                      : "bg-transparent border-transparent text-terminal-muted hover:text-terminal-text"
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>[ 05_MCP_INTEGRATOR ]</span>
                </button>
              </div>

              {/* TAB VIEWS WORKSPACE */}
              <div className="flex-1 overflow-y-auto p-4 bg-terminal-dark">
                {activeTab === "plan" && (
                  /* TAB 1: PLAN REFINEMENT */
                  <div className="h-full flex flex-col space-y-4">
                    <div className="flex justify-between items-center bg-terminal-black border border-terminal-border p-3 rounded">
                      <div className="text-xs text-terminal-muted">
                        Define specifications and scope in your project's root <code className="text-terminal-green">plan.md</code>.
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleImportPlanChecklist}
                          disabled={isImportingPlan || !planContent}
                          className="bg-terminal-green text-terminal-black hover:bg-terminal-green/90 font-bold text-xs py-1.5 px-4 rounded flex items-center space-x-1.5 shadow-[0_0_8px_rgba(0,255,102,0.25)] disabled:opacity-50"
                        >
                          <span>IMPORT_PLAN_TO_KANBAN</span>
                        </button>
                        <button
                          onClick={handleSavePlan}
                          disabled={isSavingPlan}
                          className="bg-terminal-gray hover:border-terminal-green border border-terminal-border text-terminal-text font-bold text-xs py-1.5 px-4 rounded"
                        >
                          {isSavingPlan ? "SAVING..." : "SAVE_PLAN_MD"}
                        </button>
                      </div>
                    </div>

                    {/* Split Screen Editor */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 h-[350px]">
                      {/* Editor Left */}
                      <div className="flex flex-col h-full border border-terminal-border rounded bg-terminal-black overflow-hidden">
                        <div className="p-2 border-b border-terminal-border bg-terminal-dark text-[10px] font-bold text-terminal-muted flex justify-between items-center">
                          <span>EDIT_RAW_PLAN.MD</span>
                          <span className="text-terminal-green">utf-8</span>
                        </div>
                        <textarea
                          value={planContent}
                          onChange={(e) => setPlanContent(e.target.value)}
                          placeholder="# Write your project specs here..."
                          className="flex-1 p-3 bg-terminal-black font-mono text-[11px] text-terminal-text border-0 outline-none resize-none focus:ring-0"
                        />
                      </div>

                      {/* Preview Right */}
                      <div className="flex flex-col h-full border border-terminal-border rounded bg-terminal-black overflow-hidden">
                        <div className="p-2 border-b border-terminal-border bg-terminal-dark text-[10px] font-bold text-terminal-muted">
                          PREVIEW_plan.md
                        </div>
                        <div 
                          className="flex-1 p-4 overflow-y-auto space-y-2 border-0 prose prose-invert font-mono max-h-[310px]"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(planContent) }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "rules" && (
                  /* TAB 2: AGENTS.MD RULES EDITOR */
                  <div className="h-full flex flex-col space-y-4">
                    <div className="flex justify-between items-center bg-terminal-black border border-terminal-border p-3 rounded">
                      <div className="text-xs text-terminal-muted">
                        Edit code style and guidelines inside your project's root <code className="text-terminal-green">AGENTS.md</code> & <code className="text-terminal-green">CLAUDE.md</code> files.
                      </div>
                      <button
                        onClick={handleSaveRules}
                        disabled={isSavingRules}
                        className="bg-terminal-green text-terminal-black hover:bg-terminal-green/90 font-bold text-xs py-1.5 px-4 rounded shadow-[0_0_8px_rgba(0,255,102,0.25)]"
                      >
                        {isSavingRules ? "SAVING..." : "SAVE_GUIDELINES_MD"}
                      </button>
                    </div>

                    {/* Single Large Editor */}
                    <div className="flex-1 flex flex-col border border-terminal-border rounded bg-terminal-black overflow-hidden h-[350px]">
                      <div className="p-2 border-b border-terminal-border bg-terminal-dark text-[10px] font-bold text-terminal-muted flex justify-between items-center">
                        <span>EDIT_AGENTS.MD</span>
                        <span className="text-terminal-green">boundaries</span>
                      </div>
                      <textarea
                        value={rulesContent}
                        onChange={(e) => setRulesContent(e.target.value)}
                        placeholder="# ALWAYS..."
                        className="flex-1 p-4 bg-terminal-black font-mono text-[11px] text-terminal-text border-0 outline-none resize-none focus:ring-0"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "tasks" && (
                  /* TAB 3: TASKS KANBAN */
                  <div className="space-y-4">
                    {/* Add Task Control Toggle */}
                    <div className="flex justify-between items-center bg-terminal-black border border-terminal-border p-3 rounded">
                      <span className="text-xs text-terminal-muted">
                        Task backlog registered with local sqlite/duckdb metadata store.
                      </span>
                      {!isAddingTask && (
                        <button
                          onClick={() => setIsAddingTask(true)}
                          className="bg-terminal-green text-terminal-black font-bold text-xs py-1 px-3 rounded flex items-center space-x-1.5 shadow-[0_0_8px_rgba(0,255,102,0.25)]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>ADD_NEW_TASK</span>
                        </button>
                      )}
                    </div>

                    {/* New Task Inline Panel */}
                    {isAddingTask && (
                      <form onSubmit={handleAddTask} className="bg-terminal-black border border-terminal-green p-4 rounded-lg text-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-terminal-border pb-2">
                          <span className="font-bold text-terminal-green uppercase">CREATE NEW BACKLOG ITEM</span>
                          <button
                            type="button"
                            onClick={() => setIsAddingTask(false)}
                            className="text-terminal-muted hover:text-terminal-red"
                          >
                            [ CANCEL ]
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-3">
                            <label className="block text-terminal-muted mb-1 font-bold">TASK SPECIFICATION</label>
                            <input
                              type="text"
                              value={newTaskContent}
                              onChange={(e) => setNewTaskContent(e.target.value)}
                              placeholder="e.g. Write integration test suit for auth handlers"
                              className="w-full"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-terminal-muted mb-1 font-bold">PRIORITY LEVEL</label>
                            <select
                              value={newTaskPriority}
                              onChange={(e) => setNewTaskPriority(e.target.value)}
                              className="w-full bg-terminal-gray border border-terminal-border text-terminal-text rounded px-3 py-1.5 focus:outline-none focus:border-terminal-green font-mono"
                            >
                              <option value="high">High (Red)</option>
                              <option value="medium">Medium (Yellow)</option>
                              <option value="low">Low (Green)</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="submit"
                            className="bg-terminal-green text-terminal-black font-bold px-4 py-1.5 rounded shadow-[0_0_8px_rgba(0,255,102,0.25)]"
                          >
                            APPEND_BACKLOG
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Kanban Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* COLUMN: PENDING */}
                      <div className="bg-terminal-black border border-terminal-border rounded-lg flex flex-col h-[400px]">
                        <div className="p-3 border-b border-terminal-border bg-terminal-dark flex items-center justify-between">
                          <span className="text-xs font-bold text-terminal-text">PENDING</span>
                          <span className="text-[10px] text-terminal-muted font-bold">n={getTasksByStatus("pending").length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                          {getTasksByStatus("pending").map((task) => (
                            <div key={task.id} className="p-3 bg-terminal-dark border border-terminal-border rounded flex flex-col justify-between space-y-2 group">
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className={`text-[8px] uppercase border px-1 rounded font-bold ${
                                    task.priority === "high"
                                      ? "border-terminal-red/40 text-terminal-red bg-terminal-red/10"
                                      : task.priority === "medium"
                                      ? "border-terminal-yellow/40 text-terminal-yellow bg-terminal-yellow/10"
                                      : "border-terminal-green/40 text-terminal-green bg-terminal-green/10"
                                  }`}>
                                    {task.priority}
                                  </span>
                                  <span className="text-[9px] text-terminal-muted">#{task.id}</span>
                                </div>
                                <p className="text-xs text-terminal-text leading-snug break-words">{task.content}</p>
                              </div>
                              <div className="flex items-center justify-end space-x-1.5 pt-1.5 border-t border-terminal-border/40">
                                <button
                                  onClick={() => handleUpdateTaskStatus(task.id, "cancelled")}
                                  className="text-[9px] text-terminal-muted hover:text-terminal-red border border-transparent hover:border-terminal-red/30 px-1 rounded"
                                >
                                  cancel
                                </button>
                                <button
                                  onClick={() => handleUpdateTaskStatus(task.id, "in_progress")}
                                  className="text-[9px] text-terminal-green hover:bg-terminal-green hover:text-terminal-black border border-terminal-green px-1.5 py-0.5 rounded transition-colors font-bold"
                                >
                                  start &rarr;
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* COLUMN: IN_PROGRESS */}
                      <div className="bg-terminal-black border border-terminal-border rounded-lg flex flex-col h-[400px]">
                        <div className="p-3 border-b border-terminal-border bg-terminal-dark flex items-center justify-between">
                          <span className="text-xs font-bold text-terminal-yellow">IN PROGRESS</span>
                          <span className="text-[10px] text-terminal-muted font-bold">n={getTasksByStatus("in_progress").length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                          {getTasksByStatus("in_progress").map((task) => (
                            <div key={task.id} className="p-3 bg-terminal-dark border border-terminal-border rounded flex flex-col justify-between space-y-2">
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className={`text-[8px] uppercase border px-1 rounded font-bold ${
                                    task.priority === "high"
                                      ? "border-terminal-red/40 text-terminal-red bg-terminal-red/10"
                                      : task.priority === "medium"
                                      ? "border-terminal-yellow/40 text-terminal-yellow bg-terminal-yellow/10"
                                      : "border-terminal-green/40 text-terminal-green bg-terminal-green/10"
                                  }`}>
                                    {task.priority}
                                  </span>
                                  <span className="text-[9px] text-terminal-muted">#{task.id}</span>
                                </div>
                                <p className="text-xs text-terminal-text leading-snug break-words">{task.content}</p>
                              </div>
                              <div className="flex items-center justify-between pt-1.5 border-t border-terminal-border/40 text-[9px]">
                                <button
                                  onClick={() => handleUpdateTaskStatus(task.id, "pending")}
                                  className="text-terminal-muted hover:text-terminal-text font-bold"
                                >
                                  &larr; defer
                                </button>
                                <button
                                  onClick={() => handleUpdateTaskStatus(task.id, "completed")}
                                  className="text-terminal-green hover:bg-terminal-green hover:text-terminal-black border border-terminal-green px-1.5 py-0.5 rounded transition-colors font-bold"
                                >
                                  complete &rarr;
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* COLUMN: COMPLETED */}
                      <div className="bg-terminal-black border border-terminal-border rounded-lg flex flex-col h-[400px]">
                        <div className="p-3 border-b border-terminal-border bg-terminal-dark flex items-center justify-between">
                          <span className="text-xs font-bold text-terminal-green">COMPLETED</span>
                          <span className="text-[10px] text-terminal-muted font-bold">n={getTasksByStatus("completed").length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                          {getTasksByStatus("completed").map((task) => (
                            <div key={task.id} className="p-3 bg-terminal-dark/50 border border-terminal-border/60 rounded flex flex-col justify-between opacity-80">
                              <div>
                                <div className="flex items-center justify-between mb-1.5 text-terminal-muted">
                                  <span className="text-[8px] uppercase border px-1 border-terminal-border rounded">
                                    {task.priority}
                                  </span>
                                  <span className="text-[9px]">#{task.id}</span>
                                </div>
                                <p className="text-xs text-terminal-muted line-through leading-snug break-words">{task.content}</p>
                              </div>
                              <div className="flex justify-start pt-1 border-t border-terminal-border/20">
                                <button
                                  onClick={() => handleUpdateTaskStatus(task.id, "in_progress")}
                                  className="text-[9px] text-terminal-muted hover:text-terminal-green"
                                >
                                  &larr; reopen
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* COLUMN: CANCELLED */}
                      <div className="bg-terminal-black border border-terminal-border rounded-lg flex flex-col h-[400px]">
                        <div className="p-3 border-b border-terminal-border bg-terminal-dark flex items-center justify-between">
                          <span className="text-xs font-bold text-terminal-red">CANCELLED</span>
                          <span className="text-[10px] text-terminal-muted font-bold">n={getTasksByStatus("cancelled").length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                          {getTasksByStatus("cancelled").map((task) => (
                            <div key={task.id} className="p-3 bg-terminal-dark/50 border border-terminal-border/40 rounded flex flex-col justify-between opacity-60">
                              <div>
                                <div className="flex items-center justify-between mb-1.5 text-terminal-muted">
                                  <span className="text-[8px] uppercase border px-1 border-terminal-border rounded">
                                    {task.priority}
                                  </span>
                                  <span className="text-[9px]">#{task.id}</span>
                                </div>
                                <p className="text-xs text-terminal-muted line-through leading-snug break-words">{task.content}</p>
                              </div>
                              <div className="flex justify-start pt-1 border-t border-terminal-border/20">
                                <button
                                  onClick={() => handleUpdateTaskStatus(task.id, "pending")}
                                  className="text-[9px] text-terminal-muted hover:text-terminal-text"
                                >
                                  &larr; restore
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "skills" && (
                  /* TAB 4: SKILLS ENGINE */
                  <div className="space-y-4">
                    {/* Skills Backlog Toolbar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-terminal-black border border-terminal-border p-3 rounded">
                      <p className="text-xs text-terminal-muted">
                        Registered skills map conceptual LLM steps straight to technical task-runner scripts.
                      </p>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleExportSkills}
                          disabled={isExporting || skills.length === 0}
                          className="bg-terminal-green text-terminal-black hover:bg-terminal-green/90 font-bold text-xs py-1.5 px-4 rounded flex items-center space-x-1.5 disabled:opacity-50 transition-all shadow-[0_0_8px_rgba(0,255,102,0.25)]"
                        >
                          <span>EXPORT_TO_NATIVE_STACK</span>
                        </button>

                        {!isAddingSkill && !editingSkill && (
                          <button
                            onClick={() => setIsAddingSkill(true)}
                            className="bg-terminal-gray text-terminal-text hover:border-terminal-green hover:text-terminal-green border border-terminal-border font-bold text-xs py-1.5 px-4 rounded flex items-center space-x-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>REGISTER_SKILL</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Skill Create Form */}
                    {isAddingSkill && (
                      <form onSubmit={handleAddSkill} className="bg-terminal-black border border-terminal-green p-4 rounded-lg text-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-terminal-border pb-2">
                          <span className="font-bold text-terminal-green uppercase">REGISTER NEW SYSTEM SKILL</span>
                          <button
                            type="button"
                            onClick={() => setIsAddingSkill(false)}
                            className="text-terminal-muted hover:text-terminal-red"
                          >
                            [ CANCEL ]
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-terminal-muted mb-1 font-bold">SKILL ID / NAME</label>
                            <input
                              type="text"
                              value={newSkillName}
                              onChange={(e) => setNewSkillName(e.target.value)}
                              placeholder="e.g. generate-models"
                              className="w-full"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-terminal-muted mb-1 font-bold">EXECUTION PATH / SCRIPT</label>
                            <input
                              type="text"
                              value={newSkillPath}
                              onChange={(e) => setNewSkillPath(e.target.value)}
                              placeholder="e.g. ./scripts/generate-db.sh"
                              className="w-full"
                              required
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-terminal-muted mb-1 font-bold">DESCRIPTION</label>
                            <input
                              type="text"
                              value={newSkillDesc}
                              onChange={(e) => setNewSkillDesc(e.target.value)}
                              placeholder="Generate model structs directly from SQL schemas"
                              className="w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-terminal-muted mb-1 font-bold">TRIGGER REGEX PATTERN</label>
                            <input
                              type="text"
                              value={newSkillTrigger}
                              onChange={(e) => setNewSkillTrigger(e.target.value)}
                              placeholder="e.g. ^generate-models$"
                              className="w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-terminal-muted mb-1 font-bold">EXECUTION CONTEXT TYPE</label>
                            <select
                              value={newSkillType}
                              onChange={(e) => setNewSkillType(e.target.value)}
                              className="w-full bg-terminal-gray border border-terminal-border text-terminal-text rounded px-3 py-1.5 focus:outline-none focus:border-terminal-green font-mono"
                            >
                              <option value="script">Script (Standard file execution)</option>
                              <option value="binary">Binary (Compiled artifact)</option>
                              <option value="mcp">MCP (Model Context Protocol server)</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="submit"
                            className="bg-terminal-green text-terminal-black font-bold px-4 py-1.5 rounded shadow-[0_0_8px_rgba(0,255,102,0.25)]"
                          >
                            REGISTER_SKILL_CATALOG
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Skill Edit Form */}
                    {editingSkill && (
                      <form onSubmit={handleUpdateSkill} className="bg-terminal-black border border-terminal-yellow p-4 rounded-lg text-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-terminal-border pb-2">
                          <span className="font-bold text-terminal-yellow uppercase">EDIT SYSTEM SKILL: {editingSkill.name}</span>
                          <button
                            type="button"
                            onClick={() => setEditingSkill(null)}
                            className="text-terminal-muted hover:text-terminal-red"
                          >
                            [ CANCEL ]
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-terminal-muted mb-1 font-bold">SKILL NAME (TARGET KEY)</label>
                            <input
                              type="text"
                              value={editSkillName}
                              onChange={(e) => setEditSkillName(e.target.value)}
                              className="w-full text-terminal-yellow"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-terminal-muted mb-1 font-bold">EXECUTION PATH / SCRIPT</label>
                            <input
                              type="text"
                              value={editSkillPath}
                              onChange={(e) => setEditSkillPath(e.target.value)}
                              className="w-full"
                              required
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-terminal-muted mb-1 font-bold">DESCRIPTION</label>
                            <input
                              type="text"
                              value={editSkillDesc}
                              onChange={(e) => setEditSkillDesc(e.target.value)}
                              className="w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-terminal-muted mb-1 font-bold">TRIGGER REGEX PATTERN</label>
                            <input
                              type="text"
                              value={editSkillTrigger}
                              onChange={(e) => setEditSkillTrigger(e.target.value)}
                              className="w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-terminal-muted mb-1 font-bold">EXECUTION CONTEXT TYPE</label>
                            <select
                              value={editSkillType}
                              onChange={(e) => setEditSkillType(e.target.value)}
                              className="w-full bg-terminal-gray border border-terminal-border text-terminal-text rounded px-3 py-1.5 focus:outline-none focus:border-terminal-green font-mono"
                            >
                              <option value="script">Script (Standard file execution)</option>
                              <option value="binary">Binary (Compiled artifact)</option>
                              <option value="mcp">MCP (Model Context Protocol server)</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="submit"
                            className="bg-terminal-yellow text-terminal-black font-bold px-4 py-1.5 rounded shadow-[0_0_8px_rgba(234,179,8,0.25)]"
                          >
                            UPDATE_SKILL_CATALOG
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Skill Cards grid */}
                    {skills.length === 0 ? (
                      <div className="text-center p-8 text-terminal-muted border border-dashed border-terminal-border rounded bg-terminal-black">
                        No skills mapped for this system yet. Register one above to inject targets in Makefile / package.json!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {skills.map((sk) => (
                          <div key={sk.id} className="p-4 bg-terminal-black border border-terminal-border rounded-lg flex flex-col justify-between space-y-3 relative group">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-xs text-terminal-green">{sk.name}</h4>
                                <div className="flex items-center space-x-2">
                                  <span className="text-[9px] uppercase border border-terminal-border px-1.5 rounded text-terminal-muted bg-terminal-dark">
                                    {sk.execution_type}
                                  </span>
                                  {/* Edit / Delete overlay controls */}
                                  <button 
                                    onClick={() => handleOpenEditSkill(sk)}
                                    className="p-1 rounded text-terminal-muted hover:text-terminal-yellow hover:border-terminal-yellow/30 border border-transparent transition-all"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteSkill(sk.id, sk.name)}
                                    className="p-1 rounded text-terminal-muted hover:text-terminal-red hover:border-terminal-red/30 border border-transparent transition-all"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              {sk.description && (
                                <p className="text-[11px] text-terminal-text leading-snug mb-2">{sk.description}</p>
                              )}
                              <div className="space-y-1 text-[10px] text-terminal-muted font-mono">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold">Cmd:</span>
                                  <code className="text-terminal-text bg-terminal-gray border border-terminal-border px-1.5 py-0.2 rounded truncate max-w-[200px]">
                                    {sk.execution_path}
                                  </code>
                                </div>
                                {sk.trigger_pattern && (
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-bold">Regex:</span>
                                    <code className="text-terminal-text bg-terminal-gray border border-terminal-border px-1.5 py-0.2 rounded">
                                      {sk.trigger_pattern}
                                    </code>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Available Skills Catalog to Install */}
                    <div className="border border-terminal-border bg-terminal-dark rounded-lg p-5 mt-6">
                      <div className="flex items-center space-x-2 border-b border-terminal-border pb-2.5 mb-4">
                        <Sparkles className="w-5 h-5 text-terminal-green animate-pulse" />
                        <h3 className="font-bold text-sm text-terminal-green uppercase">[ INSTALL RECOMMENDED PLATFORM SKILLS ]</h3>
                      </div>
                      <p className="text-[11px] text-terminal-muted leading-relaxed mb-4">
                        Dynamically inject premium programmatic capabilities into this project straight from Neuron's recommended catalog list.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[250px] overflow-y-auto pr-1">
                        {catalogSkills
                          .filter((catSk) => catSk.tech_stack === selectedProject.tech_stack || catSk.tech_stack === "general")
                          .map((catSk) => {
                            // Check if already installed
                            const isInstalled = skills.some((s) => s.name === catSk.label || s.execution_path.includes(catSk.url.split('/').pop() || ""));
                            const isInstalling = isInstallingSkillUrl === catSk.url;
                            return (
                              <div key={catSk.url} className="p-3 bg-terminal-black border border-terminal-border rounded flex items-center justify-between space-x-3 group relative">
                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-terminal-green truncate">{catSk.label}</div>
                                  <div className="text-[9px] text-terminal-muted truncate max-w-[200px] mt-0.5">{catSk.url}</div>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0">
                                  <span className="text-[9px] uppercase border border-terminal-border px-1.5 rounded text-terminal-muted bg-terminal-dark">
                                    {catSk.tech_stack}
                                  </span>
                                  {isInstalled ? (
                                    <span className="text-[10px] text-terminal-muted border border-terminal-muted/30 px-2 py-0.5 rounded font-bold uppercase select-none">
                                      Installed
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleInstallCatalogSkill(catSk.url, catSk.label)}
                                      disabled={isInstallingSkillUrl !== null}
                                      className="bg-terminal-green text-terminal-black hover:bg-terminal-green/90 font-bold text-[10px] py-1 px-2.5 rounded shadow-[0_0_6px_rgba(0,255,102,0.15)] transition-all flex items-center space-x-1"
                                    >
                                      {isInstalling ? (
                                        <>
                                          <div className="w-2.5 h-2.5 border border-terminal-black border-t-transparent rounded-full animate-spin" />
                                          <span>INSTALLING...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="w-3 h-3" />
                                          <span>INSTALL</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "mcp" && (
                  /* TAB 5: MCP INTEGRATION CENTER */
                  <div className="space-y-6">
                    <div className="bg-terminal-black border border-terminal-border p-4 rounded-lg">
                      <div className="flex items-center space-x-2 border-b border-terminal-border pb-2.5 mb-3">
                        <ArrowLeftRight className="w-5 h-5 text-terminal-green" />
                        <h3 className="font-bold text-sm text-terminal-green uppercase">[ Model Context Protocol Setup ]</h3>
                      </div>
                      <p className="text-xs text-terminal-text leading-relaxed mb-4">
                        Neuron hosts an in-process MCP JSON-RPC Server pointing directly to your local DuckDB projects database. Connecting an AI client allows it to interactively browse and control your active projects, checklists, and skills natively!
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* Option 1: OpenCode */}
                        <div className="p-4 border border-terminal-border bg-terminal-dark rounded-lg flex flex-col justify-between">
                          <div>
                            <div className="flex items-center space-x-2 text-terminal-green font-bold text-xs uppercase mb-1">
                              <TerminalIcon className="w-4 h-4" />
                              <span>OpenCode TUI Client</span>
                            </div>
                            <p className="text-[11px] text-terminal-muted leading-relaxed mb-4">
                              Registers the running neuron command directly inside your user config: <code className="text-terminal-green">~/.config/opencode/opencode.json</code>.
                            </p>
                          </div>
                          <button
                            onClick={() => handleSetupMcp("opencode")}
                            className="bg-terminal-green hover:bg-terminal-green/90 text-terminal-black font-bold text-xs py-2 px-4 rounded text-center w-full shadow-[0_0_8px_rgba(0,255,102,0.25)]"
                          >
                            CONNECT_OPENCODE_TUI
                          </button>
                        </div>

                        {/* Option 2: Claude Desktop */}
                        <div className="p-4 border border-terminal-border bg-terminal-dark rounded-lg flex flex-col justify-between">
                          <div>
                            <div className="flex items-center space-x-2 text-terminal-cyan font-bold text-xs uppercase mb-1">
                              <Sparkles className="w-4 h-4" />
                              <span>Claude Desktop App</span>
                            </div>
                            <p className="text-[11px] text-terminal-muted leading-relaxed mb-4">
                              Auto-merges setup definitions into Claude's macOS/Windows settings: <code className="text-terminal-cyan">claude_desktop_config.json</code>.
                            </p>
                          </div>
                          <button
                            onClick={() => handleSetupMcp("claude")}
                            className="bg-terminal-cyan hover:bg-terminal-cyan/90 text-terminal-black font-bold text-xs py-2 px-4 rounded text-center w-full shadow-[0_0_8px_rgba(0,229,255,0.25)]"
                          >
                            CONNECT_CLAUDE_DESKTOP
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Exposed capabilities console */}
                    <div className="bg-terminal-black border border-terminal-border p-4 rounded-lg">
                      <h4 className="font-bold text-xs text-terminal-muted uppercase tracking-wider mb-2">[ Exposed MCP Tools Schema ]</h4>
                      <div className="space-y-1.5 text-[11px] text-terminal-text font-mono">
                        <div className="flex items-center justify-between border-b border-terminal-border/20 py-1">
                          <span className="text-terminal-green">list_projects</span>
                          <span className="text-terminal-muted">List all registered projects managed by Neuron</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-terminal-border/20 py-1">
                          <span className="text-terminal-green">list_tasks(project_id)</span>
                          <span className="text-terminal-muted">List all tasks/TODOs for a specific project</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-terminal-border/20 py-1">
                          <span className="text-terminal-green">add_task(project_id, task_id, content, priority)</span>
                          <span className="text-terminal-muted">Add a new task/TODO item to a project</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-terminal-border/20 py-1">
                          <span className="text-terminal-green">update_task_status(project_id, task_id, status)</span>
                          <span className="text-terminal-muted">Update the status of an existing task</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-terminal-border/20 py-1">
                          <span className="text-terminal-green">list_skills(project_id)</span>
                          <span className="text-terminal-muted">List all skills registered for a specific project</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. TERMINAL CONSOLE LOGS VIEW */}
          <section className={`border-t border-terminal-border bg-terminal-dark flex flex-col overflow-hidden transition-all duration-200 ${
            isTerminalCollapsed ? "h-8" : "h-44"
          }`}>
            <div className="p-1.5 border-b border-terminal-border bg-terminal-black flex items-center justify-between px-4 text-[10px] font-bold text-terminal-muted">
              <span className="flex items-center space-x-1.5 uppercase tracking-wide">
                <TerminalIcon className="w-3.5 h-3.5 text-terminal-green" />
                <span>TERMINAL_OUTPUT_FEEDBACK_LOG</span>
              </span>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="hover:text-terminal-red text-[9px] uppercase hover:underline"
                >
                  [ Clear Logs ]
                </button>
                <button
                  type="button"
                  onClick={() => setIsTerminalCollapsed(!isTerminalCollapsed)}
                  className="hover:text-terminal-green text-[9px] uppercase hover:underline"
                >
                  {isTerminalCollapsed ? "[ Expand ]" : "[ Collapse ]"}
                </button>
              </div>
            </div>
            {!isTerminalCollapsed && (
              <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1.5 bg-terminal-black/90">
                {logs.map((log, idx) => {
                  let colorClass = "text-terminal-text";
                  if (log.type === "system") colorClass = "text-terminal-cyan";
                  else if (log.type === "success") colorClass = "text-terminal-green";
                  else if (log.type === "error") colorClass = "text-terminal-red";

                  return (
                    <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                      <span className="text-terminal-muted shrink-0">[{log.timestamp}]</span>
                      <span className={colorClass}>{log.text}</span>
                    </div>
                  );
                })}
                <div ref={terminalEndRef} />
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
