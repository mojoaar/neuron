import React from "react";
import { 
  GitBranch, 
  RefreshCw, 
  Save, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Play, 
  Trash, 
  Sparkles,
  Database,
  ExternalLink,
  Copy
} from "lucide-react";
import { Project, Task, Skill, GitStatus, CatalogSkill, CheckStatus, ActivityEntry } from "../types";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ProjectDashboardProps {
  selectedProject: Project;
  tasks: Task[];
  skills: Skill[];
  activeTab: "plan" | "rules" | "tasks" | "skills" | "timeline" | "readme";
  setActiveTab: (tab: "plan" | "rules" | "tasks" | "skills" | "timeline" | "readme") => void;
  planContent: string;
  setPlanContent: (val: string) => void;
  isSavingPlan: boolean;
  rulesContent: string;
  setRulesContent: (val: string) => void;
  isSavingRules: boolean;
  readmeContent: string;
  setReadmeContent: (val: string) => void;
  onSaveReadme: () => void;
  gitStatus: GitStatus | null;
  isRefreshingGit: boolean;
  newTaskContent: string;
  setNewTaskContent: (val: string) => void;
  newTaskPriority: string;
  setNewTaskPriority: (val: string) => void;
  isAddingTask: boolean;
  editingSkill: Skill | null;
  setEditingSkill: (sk: Skill | null) => void;
  newSkillName: string;
  setNewSkillName: (val: string) => void;
  newSkillDesc: string;
  setNewSkillDesc: (val: string) => void;
  newSkillTrigger: string;
  setNewSkillTrigger: (val: string) => void;
  newSkillType: string;
  setNewSkillType: (val: string) => void;
  newSkillPath: string;
  setNewSkillPath: (val: string) => void;
  isAddingSkill: boolean;
  editSkillName: string;
  setEditSkillName: (val: string) => void;
  editSkillDesc: string;
  setEditSkillDesc: (val: string) => void;
  editSkillTrigger: string;
  setEditSkillTrigger: (val: string) => void;
  editSkillType: string;
  setEditSkillType: (val: string) => void;
  editSkillPath: string;
  setEditSkillPath: (val: string) => void;
  catalogSkills: CatalogSkill[];
  isInstallingSkillUrl: string | null;
  isExporting: boolean;
  onRefreshGit: (id: string) => void;
  onSavePlan: () => void;
  onSaveRules: () => void;
  onAddTask: (e: React.FormEvent) => void;
  onUpdateTaskStatus: (id: string, status: string) => void;
  onAddSkill: (e: React.FormEvent) => void;
  onInstallCatalogSkill: (url: string, label: string) => void;
  onOpenEditSkill: (sk: Skill) => void;
  onUpdateSkill: (e: React.FormEvent) => void;
  onDeleteSkill: (id: string, name: string) => void;
  onExportSkills: () => void;
  tabEditorFontSize: string;
  checkStatus: CheckStatus | null;
  isRefreshingCheck: boolean;
  onRefreshCheck: (id: string) => void;
  enableVerificationCi: boolean;
  activityEntries: ActivityEntry[];
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  selectedProject,
  tasks,
  skills,
  activeTab,
  setActiveTab,
  planContent,
  setPlanContent,
  isSavingPlan,
  rulesContent,
  setRulesContent,
  isSavingRules,
  readmeContent,
  setReadmeContent,
  onSaveReadme,
  gitStatus,
  isRefreshingGit,
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
  catalogSkills,
  isInstallingSkillUrl,
  isExporting,
  onRefreshGit,
  onSavePlan,
  onSaveRules,
  onAddTask,
  onUpdateTaskStatus,
  onAddSkill,
  onInstallCatalogSkill,
  onOpenEditSkill,
  onUpdateSkill,
  onDeleteSkill,
  onExportSkills,
  tabEditorFontSize,
  checkStatus,
  isRefreshingCheck,
  onRefreshCheck,
  enableVerificationCi,
  activityEntries,
}) => {
  const getTaskPriorityBorder = (prio: string) => {
    switch (prio) {
      case "high": return "border-terminal-red/40 bg-terminal-red/5 text-terminal-red";
      case "low": return "border-blue-500/40 bg-blue-500/5 text-blue-400";
      default: return "border-terminal-yellow/40 bg-terminal-yellow/5 text-yellow-400";
    }
  };

  const [showCheckDetails, setShowCheckDetails] = React.useState(false);

  return (
    <div className="flex-1 overflow-hidden flex flex-col font-mono">
      {/* Git Status Bar */}
      <div className="px-6 py-2.5 border-b border-terminal-border/40 bg-terminal-dark flex items-center justify-between text-[11px] text-terminal-muted">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-terminal-text uppercase text-[10px] tracking-wider">[ Workspace Env: {selectedProject.name} ]</span>
          <div className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" />
          <span className="truncate max-w-sm" title={selectedProject.path}>{selectedProject.path}</span>
        </div>
        {gitStatus && gitStatus.is_repo && (
          <div className="flex items-center space-x-3 font-bold font-mono">
            <div className="flex items-center space-x-1.5">
              <GitBranch className="w-3.5 h-3.5 text-terminal-green" />
              <span className="text-terminal-text">{gitStatus.branch}</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${gitStatus.is_dirty ? "border border-terminal-red/30 text-terminal-red bg-terminal-red/5" : "border border-terminal-green/30 text-terminal-green bg-terminal-green/5"}`}>
              {gitStatus.is_dirty ? `Dirty (+${gitStatus.dirty_count})` : "Clean"}
            </span>
            <button
              onClick={() => onRefreshGit(selectedProject.id)}
              disabled={isRefreshingGit}
              className="p-1 rounded hover:bg-terminal-gray border border-terminal-border text-terminal-muted hover:text-terminal-text"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingGit ? "animate-spin" : ""}`} />
            </button>
          </div>
        )}
      </div>

      {/* CI Test & Lint Verification Status Bar */}
      {enableVerificationCi && (
        <div className="px-6 py-2 border-b border-terminal-border/40 bg-terminal-dark flex flex-col shrink-0 text-[11px] text-terminal-muted">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="font-bold text-terminal-text uppercase text-[10px] tracking-wider select-none">[ Verification CI ]</span>
              
              {/* Test Suite badge */}
              <button
                type="button"
                onClick={() => setShowCheckDetails(!showCheckDetails)}
                className="flex items-center space-x-1.5 select-none hover:opacity-85"
              >
                <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase border font-bold cursor-pointer transition-all ${
                  checkStatus 
                    ? checkStatus.test_passed 
                      ? "border-terminal-green/30 text-terminal-green bg-terminal-green/5 hover:border-terminal-green/60" 
                      : "border-terminal-red/30 text-terminal-red bg-terminal-red/5 hover:border-terminal-red/60"
                    : "border-terminal-border text-terminal-muted bg-terminal-black/30"
                }`}>
                  Tests: {checkStatus ? (checkStatus.test_passed ? "PASS" : "FAIL") : "UNRUN"}
                </span>
              </button>

              {/* Linter suite badge */}
              <button
                type="button"
                onClick={() => setShowCheckDetails(!showCheckDetails)}
                className="flex items-center space-x-1.5 select-none hover:opacity-85"
              >
                <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase border font-bold cursor-pointer transition-all ${
                  checkStatus 
                    ? checkStatus.lint_passed 
                      ? "border-terminal-green/30 text-terminal-green bg-terminal-green/5 hover:border-terminal-green/60" 
                      : "border-terminal-yellow/30 text-terminal-yellow bg-terminal-yellow/5 hover:border-terminal-yellow/60"
                    : "border-terminal-border text-terminal-muted bg-terminal-black/30"
                }`}>
                  Lint: {checkStatus ? (checkStatus.lint_passed ? "PASS" : "WARN") : "UNRUN"}
                </span>
              </button>
            </div>

            <button
              onClick={() => onRefreshCheck(selectedProject.id)}
              disabled={isRefreshingCheck}
              className="p-1 rounded hover:bg-terminal-gray border border-terminal-border text-terminal-muted hover:text-terminal-text"
              title="Execute Linter and Testing Suites"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingCheck ? "animate-spin text-terminal-green" : ""}`} />
            </button>
          </div>

          {/* Collapsible details output tray */}
          {showCheckDetails && checkStatus && (
            <div className="mt-3 grid grid-cols-2 gap-4 max-h-56 overflow-hidden select-text border-t border-terminal-border/20 pt-3">
              <div className="flex flex-col space-y-1 overflow-hidden">
                <span className="text-[9px] font-bold text-terminal-muted uppercase">[ Test suite stdout / stderr ]</span>
                <pre className="flex-1 bg-terminal-black border border-terminal-border rounded p-2.5 text-[9px] font-mono overflow-auto leading-relaxed text-terminal-text">
                  <code>{checkStatus.test_output || "No output captured."}</code>
                </pre>
              </div>
              <div className="flex flex-col space-y-1 overflow-hidden">
                <span className="text-[9px] font-bold text-terminal-muted uppercase">[ Linter stdout / stderr ]</span>
                <pre className="flex-1 bg-terminal-black border border-terminal-border rounded p-2.5 text-[9px] font-mono overflow-auto leading-relaxed text-terminal-text">
                  <code>{checkStatus.lint_output || "No output captured."}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs list */}
      <div className="flex border-b border-terminal-border bg-terminal-dark/50 shrink-0">
        {(["plan", "rules", "readme", "skills", "tasks", "timeline"] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 border-r border-terminal-border text-xs font-bold uppercase transition-all font-mono tracking-wider ${
                isActive
                  ? "bg-terminal-black text-terminal-green border-b-2 border-b-terminal-green"
                  : "text-terminal-muted hover:text-terminal-text hover:bg-terminal-black/30"
              }`}
            >
              {tab === "plan" ? "01_PLAN.MD" : tab === "rules" ? "02_AGENTS.MD" : tab === "readme" ? "03_README.MD" : tab === "skills" ? "04_SKILLS_CONSOLE" : tab === "tasks" ? "05_TASKBOARD" : "06_TIMELINE"}
            </button>
          );
        })}
      </div>

      {/* Main Tab content panel */}
      <div className="flex-1 overflow-hidden flex flex-col p-6">
        {activeTab === "plan" && (
          <div className="flex-1 flex gap-6 overflow-hidden">
            {/* Split Left: markdown text editor */}
            <div className="flex-1 flex flex-col border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between border-b border-terminal-border/40 pb-2.5 mb-4">
                <div className="text-[10px] font-bold text-terminal-green uppercase">[ Edit plan.md ]</div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={onSavePlan}
                    disabled={isSavingPlan}
                    className="py-1 px-3 bg-terminal-green text-terminal-black hover:bg-terminal-green/90 text-[10px] font-bold uppercase rounded transition-all inline-flex items-center space-x-1 shadow-[0_0_10px_rgba(0,255,102,0.1)]"
                  >
                    {isSavingPlan ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    <span>Save Plan</span>
                  </button>
                </div>
              </div>
              <textarea
                value={planContent}
                onChange={(e) => setPlanContent(e.target.value)}
                style={{ fontSize: tabEditorFontSize }}
                className="flex-1 w-full bg-terminal-black border border-terminal-border text-terminal-text rounded p-4 font-mono outline-none focus:border-terminal-green leading-relaxed resize-none scrollbar-thin scrollbar-thumb-terminal-border"
              />
            </div>

            {/* Split Right: secure renderer container */}
            <div className="flex-1 flex flex-col border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="text-[10px] font-bold text-terminal-green uppercase border-b border-terminal-border/40 pb-2.5 mb-4">
                [ Interactive Plan Preview ]
              </div>
              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-terminal-border" style={{ fontSize: tabEditorFontSize }}>
                {planContent ? (
                  <MarkdownRenderer content={planContent} style={{ fontSize: tabEditorFontSize }} />
                ) : (
                  <div className="text-center p-8 text-terminal-muted italic text-xs">Plan content empty.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="flex-1 flex gap-6 overflow-hidden">
            {/* Left: Editor */}
            <div className="flex-1 flex flex-col border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between border-b border-terminal-border/40 pb-2.5 mb-4">
                <div className="text-[10px] font-bold text-terminal-green uppercase">[ Edit AGENTS.md ]</div>
                <button
                  onClick={onSaveRules}
                  disabled={isSavingRules}
                  className="py-1 px-3 bg-terminal-green text-terminal-black hover:bg-terminal-green/90 text-[10px] font-bold uppercase rounded transition-all inline-flex items-center space-x-1 shadow-[0_0_10px_rgba(0,255,102,0.1)]"
                >
                  {isSavingRules ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  <span>Save Rules</span>
                </button>
              </div>
              <textarea
                value={rulesContent}
                onChange={(e) => setRulesContent(e.target.value)}
                style={{ fontSize: tabEditorFontSize }}
                className="flex-1 w-full bg-terminal-black border border-terminal-border text-terminal-text rounded p-4 font-mono outline-none focus:border-terminal-green leading-relaxed resize-none scrollbar-thin scrollbar-thumb-terminal-border"
              />
            </div>

            {/* Right: Render preview */}
            <div className="flex-1 flex flex-col border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="text-[10px] font-bold text-terminal-green uppercase border-b border-terminal-border/40 pb-2.5 mb-4">
                [ Rules Preview ]
              </div>
              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-terminal-border" style={{ fontSize: tabEditorFontSize }}>
                {rulesContent ? (
                  <MarkdownRenderer content={rulesContent} style={{ fontSize: tabEditorFontSize }} />
                ) : (
                  <div className="text-center p-8 text-terminal-muted italic text-xs">Rules content empty.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-4">
            {/* Quick adding form */}
            <form onSubmit={onAddTask} className="border border-terminal-border bg-terminal-dark rounded-lg p-4 shadow-[0_2px_8px_rgba(0,0,0,0.4)] flex items-center space-x-3 shrink-0">
              <input
                type="text"
                required
                value={newTaskContent}
                onChange={(e) => setNewTaskContent(e.target.value)}
                placeholder="Append a new workspace action item..."
                className="flex-1 bg-terminal-black border border-terminal-border text-terminal-text rounded px-3 py-1.5 text-xs outline-none focus:border-terminal-green"
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
                className="bg-terminal-black border border-terminal-border text-terminal-text rounded px-2.5 py-1.5 text-xs outline-none focus:border-terminal-green"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <button
                type="submit"
                disabled={isAddingTask}
                className="py-1.5 px-4 rounded bg-terminal-green text-terminal-black font-bold text-xs uppercase flex items-center space-x-1 transition-all shadow-[0_0_10px_rgba(0,255,102,0.1)]"
              >
                {isAddingTask ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Add Task</span>
              </button>
            </form>

            {/* Kanban Columns */}
            <div className="flex-1 grid grid-cols-4 gap-4 overflow-hidden">
              {(["pending", "in_progress", "completed", "cancelled"] as const).map((status) => {
                const columnTasks = tasks.filter((t) => t.status === status);
                return (
                  <div key={status} className="border border-terminal-border bg-terminal-dark rounded-lg p-3.5 flex flex-col max-h-full">
                    <div className="flex items-center justify-between border-b border-terminal-border/30 pb-2 mb-3 shrink-0">
                      <div className="flex items-center space-x-1.5 font-bold text-[10px] uppercase font-mono tracking-wider">
                        {status === "pending" && <Plus className="w-3.5 h-3.5 text-terminal-muted" />}
                        {status === "in_progress" && <RefreshCw className="w-3.5 h-3.5 text-terminal-yellow animate-spin" />}
                        {status === "completed" && <CheckCircle className="w-3.5 h-3.5 text-terminal-green" />}
                        {status === "cancelled" && <XCircle className="w-3.5 h-3.5 text-terminal-red" />}
                        <span className={status === "in_progress" ? "text-terminal-yellow" : status === "completed" ? "text-terminal-green" : status === "cancelled" ? "text-terminal-red" : "text-terminal-text"}>
                          {status.replace("_", " ")}
                        </span>
                      </div>
                      <span className="bg-terminal-black border border-terminal-border text-[9px] font-mono font-bold px-1.5 py-0.5 rounded text-terminal-muted shrink-0">
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-terminal-border">
                      {columnTasks.map((task) => (
                        <div key={task.id} className="p-3 bg-terminal-black border border-terminal-border rounded flex flex-col space-y-2.5 relative group hover:border-terminal-green/40 transition-all">
                          <p className="text-xs text-terminal-text leading-relaxed font-mono select-text">{task.content}</p>
                          <div className="flex items-center justify-between">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 border rounded uppercase font-mono ${getTaskPriorityBorder(task.priority)}`}>
                              {task.priority}
                            </span>
                            <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-all">
                              {status !== "pending" && (
                                <button onClick={() => onUpdateTaskStatus(task.id, "pending")} className="p-0.5 rounded border border-terminal-border bg-terminal-gray hover:text-terminal-text text-terminal-muted font-bold text-[8px] uppercase font-mono">PND</button>
                              )}
                              {status !== "in_progress" && (
                                <button onClick={() => onUpdateTaskStatus(task.id, "in_progress")} className="p-0.5 rounded border border-terminal-border bg-terminal-gray hover:text-terminal-yellow text-terminal-muted font-bold text-[8px] uppercase font-mono">WRK</button>
                              )}
                              {status !== "completed" && (
                                <button onClick={() => onUpdateTaskStatus(task.id, "completed")} className="p-0.5 rounded border border-terminal-border bg-terminal-gray hover:text-terminal-green text-terminal-muted font-bold text-[8px] uppercase font-mono">DON</button>
                              )}
                              {status !== "cancelled" && (
                                <button onClick={() => onUpdateTaskStatus(task.id, "cancelled")} className="p-0.5 rounded border border-terminal-border bg-terminal-gray hover:text-terminal-red text-terminal-muted font-bold text-[8px] uppercase font-mono">CNL</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "skills" && (
          <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
            {/* Left: Custom skill adder form */}
            <div className="col-span-12 lg:col-span-4 border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex flex-col overflow-y-auto">
              <div className="text-[10px] font-bold text-terminal-green uppercase border-b border-terminal-border/40 pb-2.5 mb-4">
                {editingSkill ? `[ Edit Skill: ${editingSkill.name} ]` : "[ Register Custom Skill ]"}
              </div>
              <form onSubmit={editingSkill ? onUpdateSkill : onAddSkill} className="space-y-4 text-xs font-mono">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-terminal-muted uppercase">Skill Name / Identifier</label>
                  <input
                    type="text"
                    required
                    value={editingSkill ? editSkillName : newSkillName}
                    onChange={(e) => editingSkill ? setEditSkillName(e.target.value) : setNewSkillName(e.target.value)}
                    placeholder="e.g. coverage-guard"
                    className="w-full bg-terminal-black border border-terminal-border text-terminal-text rounded px-3 py-1.5 text-xs outline-none focus:border-terminal-green"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-terminal-muted uppercase">Description / Purpose</label>
                  <input
                    type="text"
                    value={editingSkill ? editSkillDesc : newSkillDesc}
                    onChange={(e) => editingSkill ? setEditSkillDesc(e.target.value) : setNewSkillDesc(e.target.value)}
                    placeholder="e.g. Validate test coverage scores"
                    className="w-full bg-terminal-black border border-terminal-border text-terminal-text rounded px-3 py-1.5 text-xs outline-none focus:border-terminal-green"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-terminal-muted uppercase">Intent trigger regex / patterns</label>
                  <input
                    type="text"
                    value={editingSkill ? editSkillTrigger : newSkillTrigger}
                    onChange={(e) => editingSkill ? setEditSkillTrigger(e.target.value) : setNewSkillTrigger(e.target.value)}
                    placeholder="e.g. ^coverage$|^test coverage$"
                    className="w-full bg-terminal-black border border-terminal-border text-terminal-text rounded px-3 py-1.5 text-xs outline-none focus:border-terminal-green"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-terminal-muted uppercase">Execution Type</label>
                    <select
                      value={editingSkill ? editSkillType : newSkillType}
                      onChange={(e) => editingSkill ? setEditSkillType(e.target.value) : setNewSkillType(e.target.value)}
                      className="w-full bg-terminal-black border border-terminal-border text-terminal-text rounded px-2.5 py-1.5 text-xs outline-none focus:border-terminal-green"
                    >
                      <option value="script">Script Runner</option>
                      <option value="mcp">MCP Native</option>
                      <option value="binary">Compiled Binary</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-terminal-muted uppercase">Execution Target Path</label>
                    <input
                      type="text"
                      value={editingSkill ? editSkillPath : newSkillPath}
                      onChange={(e) => editingSkill ? setEditSkillPath(e.target.value) : setNewSkillPath(e.target.value)}
                      placeholder="e.g. npm run test --coverage"
                      className="w-full bg-terminal-black border border-terminal-border text-terminal-text rounded px-3 py-1.5 text-xs outline-none focus:border-terminal-green"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-terminal-border/30">
                  {editingSkill && (
                    <button
                      type="button"
                      onClick={() => setEditingSkill(null)}
                      className="py-1.5 px-3 rounded border border-terminal-border text-terminal-muted hover:text-terminal-text bg-terminal-black text-xs uppercase"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isAddingSkill}
                    className="py-1.5 px-4 rounded bg-terminal-green text-terminal-black font-bold text-xs uppercase flex items-center space-x-1.5 transition-all shadow-[0_0_10px_rgba(0,255,102,0.1)] animate-pulse"
                  >
                    {isAddingSkill ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{editingSkill ? "Update Skill" : "Save Skill"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Registered project-specific skills and recommendations catalog */}
            <div className="col-span-12 lg:col-span-8 flex flex-col space-y-6 max-h-full overflow-hidden">
              {/* Active registered list */}
              <div className="border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center justify-between border-b border-terminal-border/40 pb-2.5 mb-4 shrink-0">
                  <div className="text-[10px] font-bold text-terminal-green uppercase">[ Registered Active Skills ]</div>
                  <button
                    onClick={onExportSkills}
                    disabled={isExporting}
                    className="py-1.5 px-4 rounded bg-terminal-green text-terminal-black font-bold text-[10px] uppercase flex items-center space-x-1.5 transition-all shadow-[0_0_10px_rgba(0,255,102,0.1)]"
                  >
                    {isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Compile & Export Skills</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-terminal-border">
                  {skills.length === 0 ? (
                    <div className="text-center p-8 text-xs text-terminal-muted italic border border-dashed border-terminal-border rounded bg-terminal-black/30">
                      No skills registered for this project yet. Use the left form or import from recommendations!
                    </div>
                  ) : (
                    skills.map((sk) => (
                      <div key={sk.id} className="p-3 bg-terminal-black border border-terminal-border rounded flex items-center justify-between space-x-3 hover:border-terminal-green/40 transition-all">
                        <div className="min-w-0 flex-1 space-y-1 font-mono">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-terminal-text">{sk.name}</span>
                            <span className="text-[8px] font-bold text-terminal-green px-1 border border-terminal-green/30 bg-terminal-green/5 rounded uppercase shrink-0">
                              {sk.execution_type}
                            </span>
                          </div>
                          <div className="text-[10px] text-terminal-muted leading-relaxed select-text">{sk.description}</div>
                          {sk.trigger_pattern && (
                            <div className="text-[9px] text-terminal-muted select-text">Trigger: <code className="text-terminal-green">{sk.trigger_pattern}</code></div>
                          )}
                          <div className="text-[9px] text-terminal-muted select-text">Path: <code className="text-terminal-text">{sk.execution_path}</code></div>
                        </div>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            onClick={() => onOpenEditSkill(sk)}
                            className="py-1 px-2.5 rounded border border-terminal-border text-terminal-muted hover:text-terminal-text bg-terminal-gray hover:bg-terminal-border text-[9px] uppercase font-bold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDeleteSkill(sk.id, sk.name)}
                            className="p-1 rounded border border-terminal-border text-terminal-muted hover:text-terminal-red hover:bg-terminal-red/10 transition-all"
                            title="Remove Skill"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recommendations Catalog */}
              <div className="border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex flex-col h-[400px] shrink-0 overflow-hidden">
                <div className="text-[10px] font-bold text-terminal-green uppercase border-b border-terminal-border/40 pb-2.5 mb-3 shrink-0">
                  [ Recommended skills Catalog Market ]
                </div>
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-terminal-border">
                  {catalogSkills.filter((r) => r.tech_stack === selectedProject.tech_stack || r.tech_stack === "general").map((item) => {
                    const isInstalled = skills.some((s) => s.name === item.label);
                    return (
                      <div key={item.url} className="p-2.5 bg-terminal-black border border-terminal-border rounded flex items-center justify-between space-x-3 font-mono">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-terminal-text truncate">{item.label}</div>
                          <div className="text-[9px] text-terminal-muted truncate">{item.url}</div>
                        </div>
                        <button
                          onClick={() => onInstallCatalogSkill(item.url, item.label)}
                          disabled={isInstalled || isInstallingSkillUrl === item.url}
                          className={`py-1.5 px-3 rounded font-bold text-[9px] uppercase shrink-0 transition-all ${
                            isInstalled
                              ? "border border-terminal-green/30 text-terminal-green bg-terminal-green/5 cursor-not-allowed"
                              : "bg-terminal-green text-terminal-black hover:bg-terminal-green/90 shadow-[0_0_8px_rgba(0,255,102,0.1)]"
                          }`}
                        >
                          {isInstallingSkillUrl === item.url ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-terminal-black" />
                          ) : isInstalled ? (
                            "Installed"
                          ) : (
                            "Install"
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "readme" && (
          <div className="flex-1 flex gap-6 overflow-hidden">
            {/* Split Left: markdown text editor */}
            <div className="flex-1 flex flex-col border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between border-b border-terminal-border/40 pb-2.5 mb-4">
                <div className="text-[10px] font-bold text-terminal-green uppercase">[ Edit README.md ]</div>
                <button
                  onClick={onSaveReadme}
                  className="py-1 px-3 bg-terminal-green text-terminal-black hover:bg-terminal-green/90 text-[10px] font-bold uppercase rounded inline-flex items-center space-x-1 shadow-[0_0_10px_rgba(0,255,102,0.1)]"
                >
                  <Save className="w-3 h-3" />
                  <span>Save README</span>
                </button>
              </div>
              <textarea
                value={readmeContent}
                onChange={(e) => setReadmeContent(e.target.value)}
                style={{ fontSize: tabEditorFontSize }}
                className="flex-1 w-full bg-terminal-black border border-terminal-border text-terminal-text rounded p-4 font-mono outline-none focus:border-terminal-green leading-relaxed resize-none scrollbar-thin scrollbar-thumb-terminal-border"
              />
            </div>

            {/* Split Right: secure renderer container */}
            <div className="flex-1 flex flex-col border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="text-[10px] font-bold text-terminal-green uppercase border-b border-terminal-border/40 pb-2.5 mb-4">
                [ README Preview ]
              </div>
              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-terminal-border" style={{ fontSize: tabEditorFontSize }}>
                {readmeContent ? (
                  <MarkdownRenderer content={readmeContent} style={{ fontSize: tabEditorFontSize }} />
                ) : (
                  <div className="text-center p-8 text-terminal-muted italic text-xs">README content empty.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="flex-1 border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] overflow-y-auto w-full">
            <div className="flex items-center space-x-2 text-terminal-green border-b border-terminal-border/40 pb-2.5 mb-4 shrink-0">
              <RefreshCw className="w-4 h-4 animate-pulse" />
              <h2 className="font-bold text-xs uppercase tracking-wider">[ 05_ACTIVITY_LOG & TIMELINE ]</h2>
            </div>
            <div className="space-y-2">
              {activityEntries.length === 0 ? (
                <div className="text-center py-12 text-terminal-muted italic text-xs">
                  No activity recorded yet. Start provisioning and managing your projects to see events here!
                </div>
              ) : (
                activityEntries.map((entry, idx) => (
                  <div key={entry.created_at + entry.entity_type + entry.entity_id + idx} className="flex items-start space-x-2.5 p-2.5 bg-terminal-black border border-terminal-border rounded text-xs">
                    <div className="text-[9px] text-terminal-muted font-mono shrink-0 w-16 text-right">
                      {new Date(entry.created_at).toLocaleTimeString(undefined, { hour12: false })}
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {entry.action === "created" && <Plus className="w-3.5 h-3.5 text-terminal-green" />}
                      {entry.action === "updated" && <RefreshCw className="w-3.5 h-3.5 text-terminal-yellow" />}
                      {entry.action === "deleted" && <Trash className="w-3.5 h-3.5 text-terminal-red" />}
                    </div>
                    <span className="font-bold text-terminal-text">{entry.entity_type}</span>
                    <span className="text-terminal-muted">{entry.action}</span>
                    {entry.label && <span className="text-terminal-text truncate max-w-[200px]">"{entry.label}"</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
