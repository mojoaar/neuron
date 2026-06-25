import React from "react";
import { 
  Database, 
  RefreshCw, 
  Save, 
  Trash, 
  Plus, 
  FileCode,
  Cpu,
  Eye,
  Monitor,
  Sun,
  Moon,
  Type,
  AlertTriangle
} from "lucide-react";
import { SystemTemplate, CatalogSkill, Project, ThemeName, ThemeMode, FontFamily, THEMES, FONTS } from "../types";
import { TECH_STACKS } from "../lib/techstack";
import { TechIcon } from "./TechIcon";

interface SystemSettingsProps {
  cwd: string;
  customScopePath: string;
  setCustomScopePath: (val: string) => void;
  isCustomScope: boolean;
  isSavingScope: boolean;
  systemTemplates: SystemTemplate[];
  selectedTemplateTech: string;
  setSelectedTemplateTech: (val: string) => void;
  tmplAgents: string;
  setTmplAgents: (val: string) => void;
  tmplPlan: string;
  setTmplPlan: (val: string) => void;
  isSavingTmpl: boolean;
  catalogSkills: CatalogSkill[];
  isAddingCatalogSkill: boolean;
  setIsAddingCatalogSkill: (val: boolean) => void;
  newCatUrl: string;
  setNewCatUrl: (val: string) => void;
  newCatLabel: string;
  setNewCatLabel: (val: string) => void;
  newCatTech: string;
  setNewCatTech: (val: string) => void;
  newCatChecked: boolean;
  setNewCatChecked: (val: boolean) => void;
  isSavingCatSkill: boolean;
  onSaveScopePath: () => void;
  onResetScopePath: () => void;
  onSaveTemplate: () => void;
  onAddCatalogSkill: (e: React.FormEvent) => void;
  onDeleteCatalogSkill: (url: string, label: string) => void;
  terminalCollapsedByDefault: boolean;
  onToggleTerminalCollapseDefault: (val: boolean) => void;
  tabEditorFontSize: string;
  onSetTabEditorFontSize: (val: string) => void;
  projects: Project[];
  hiddenProjectIds: string[];
  onUnhideProject: (id: string) => void;
  enableProjectClusters: boolean;
  onToggleEnableProjectClusters: (val: boolean) => void;
  enableVerificationCi: boolean;
  onToggleEnableVerificationCi: (val: boolean) => void;
  themeName: ThemeName;
  onSetThemeName: (val: ThemeName) => void;
  themeMode: ThemeMode;
  onSetThemeMode: (val: ThemeMode) => void;
  fontFamily: FontFamily;
  onSetFontFamily: (val: FontFamily) => void;
  customStackLabels: Record<string, string>;
  onSetTechStackLabel: (stack: string, label: string) => void;
  onToggleCatalogSkillChecked: (url: string, isChecked: boolean) => void;
  onTruncateDatabase: () => void;
  apiKey: string;
  onRegenerateApiKey: () => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({
  cwd,
  customScopePath,
  setCustomScopePath,
  isCustomScope,
  isSavingScope,
  systemTemplates,
  selectedTemplateTech,
  setSelectedTemplateTech,
  tmplAgents,
  setTmplAgents,
  tmplPlan,
  setTmplPlan,
  isSavingTmpl,
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
  onSaveScopePath,
  onResetScopePath,
  onSaveTemplate,
  onAddCatalogSkill,
  onDeleteCatalogSkill,
  terminalCollapsedByDefault,
  onToggleTerminalCollapseDefault,
  tabEditorFontSize,
  onSetTabEditorFontSize,
  projects,
  hiddenProjectIds,
  onUnhideProject,
  enableProjectClusters,
  onToggleEnableProjectClusters,
  enableVerificationCi,
  onToggleEnableVerificationCi,
  themeName,
  onSetThemeName,
  themeMode,
  onSetThemeMode,
  fontFamily,
  onSetFontFamily,
  customStackLabels,
  onSetTechStackLabel,
  onToggleCatalogSkillChecked,
  onTruncateDatabase,
  apiKey,
  onRegenerateApiKey,
}) => {
  const [confirmTruncate, setConfirmTruncate] = React.useState(false);
  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 w-full font-mono">
      {/* Scope Settings */}
      <div className="border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
        <div className="flex items-center space-x-2 text-terminal-green border-b border-terminal-border/40 pb-2.5 mb-4">
          <Database className="w-4 h-4" />
          <h2 className="font-bold text-xs uppercase tracking-wider">[ Workspace Scope Root Path ]</h2>
        </div>
        <p className="text-[11px] text-terminal-muted leading-relaxed mb-4">
          By default, Neuron dynamically scans the process launching folder. Lock a static absolute directory path below to consistently track the same workspace scope across reboots.
        </p>
        <div className="flex items-center space-x-2.5">
          <input
            type="text"
            value={customScopePath}
            onChange={(e) => setCustomScopePath(e.target.value)}
            placeholder="e.g. /Users/name/Development"
            className="flex-1 bg-terminal-black border border-terminal-border text-terminal-text rounded px-3 py-1.5 text-xs outline-none focus:border-terminal-green transition-all"
          />
          <button
            onClick={onSaveScopePath}
            disabled={isSavingScope}
            className="py-1.5 px-4 rounded bg-terminal-green text-terminal-black font-bold hover:bg-terminal-green/90 text-xs uppercase flex items-center space-x-1.5 shrink-0 transition-all shadow-[0_0_10px_rgba(0,255,102,0.1)]"
          >
            {isSavingScope ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Lock Scope</span>
          </button>
          {isCustomScope && (
            <button
              onClick={onResetScopePath}
              disabled={isSavingScope}
              className="py-1.5 px-4 rounded border border-terminal-border hover:border-terminal-red hover:text-terminal-red bg-terminal-black text-terminal-muted font-bold text-xs uppercase shrink-0 transition-all"
            >
              Reset
            </button>
          )}
        </div>
        {isCustomScope && (
          <div className="text-[10px] text-terminal-green mt-2 flex items-center space-x-1 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" />
            <span>Scope Lock Active: {cwd}</span>
          </div>
        )}

        {/* Toggle default terminal collapse setting */}
        <div className="border-t border-terminal-border/30 pt-4 mt-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-terminal-text">[ Collapse HUD Console by default ]</div>
            <p className="text-[10px] text-terminal-muted leading-relaxed">Keep the diagnostic terminal collapsed on initial page load to maximize viewport space.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={terminalCollapsedByDefault}
              onChange={(e) => onToggleTerminalCollapseDefault(e.target.checked)}
              className="rounded border-terminal-border bg-terminal-black text-terminal-green focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        {/* Toggle enable project clusters setting */}
        <div className="border-t border-terminal-border/30 pt-4 mt-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-terminal-text">[ Enable Project Clusters ]</div>
            <p className="text-[10px] text-terminal-muted leading-relaxed">Toggle the visibility of the multi-project Clusters section inside your sidebar panel.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enableProjectClusters}
              onChange={(e) => onToggleEnableProjectClusters(e.target.checked)}
              className="rounded border-terminal-border bg-terminal-black text-terminal-green focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        {/* Toggle enable verification CI setting */}
        <div className="border-t border-terminal-border/30 pt-4 mt-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-terminal-text">[ Enable Verification CI Bar ]</div>
            <p className="text-[10px] text-terminal-muted leading-relaxed">Toggle the visibility of the interactive unit testing & linting Verification CI panel inside your project dashboard.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enableVerificationCi}
              onChange={(e) => onToggleEnableVerificationCi(e.target.checked)}
              className="rounded border-terminal-border bg-terminal-black text-terminal-green focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Unhide projects container */}
      {hiddenProjectIds.length > 0 && (
        <div className="border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <div className="flex items-center space-x-2 text-terminal-green border-b border-terminal-border/40 pb-2.5 mb-4">
            <Eye className="w-4 h-4" />
            <h2 className="font-bold text-xs uppercase tracking-wider">[ Restore Hidden Workspaces ]</h2>
          </div>
          <p className="text-[11px] text-terminal-muted leading-relaxed mb-4">
            The following registered systems have been hidden from your active sidebar menu. Click [ Restore ] to reveal them again!
          </p>
          <div className="space-y-2">
            {projects.filter((p) => hiddenProjectIds.includes(p.id)).map((p) => (
              <div key={p.id} className="p-3 bg-terminal-black border border-terminal-border rounded flex items-center justify-between space-x-3 text-xs">
                <div>
                  <span className="font-bold text-terminal-text">{p.name}</span>
                  <span className="text-[9px] text-terminal-muted ml-2 font-mono">({p.id})</span>
                </div>
                <button
                  onClick={() => onUnhideProject(p.id)}
                  className="py-1 px-3 border border-terminal-border hover:border-terminal-green hover:text-terminal-green text-[10px] font-bold uppercase rounded transition-all"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Theme, Mode & Typography Card */}
      <div className="border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
        <div className="flex items-center space-x-2 text-terminal-green border-b border-terminal-border/40 pb-2.5 mb-4">
          <Monitor className="w-4 h-4" />
          <h2 className="font-bold text-xs uppercase tracking-wider">[ Visual Theme, Mode & Typography ]</h2>
        </div>

        <div className="space-y-4">
          {/* Theme selector */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-terminal-text">[ Interface Theme ]</div>
              <p className="text-[10px] text-terminal-muted leading-relaxed">Select your color palette for the terminal HUD dashboard.</p>
            </div>
            <select
              value={themeName}
              onChange={(e) => onSetThemeName(e.target.value as ThemeName)}
              className="bg-terminal-black border border-terminal-border text-terminal-text rounded px-2.5 py-1.5 text-xs outline-none focus:border-terminal-green font-bold cursor-pointer max-w-[220px]"
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Mode toggle */}
          <div className="border-t border-terminal-border/25 pt-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-terminal-text">[ Display Mode ]</div>
              <p className="text-[10px] text-terminal-muted leading-relaxed">Choose dark-mode or light-mode rendering for your active theme.</p>
            </div>
            <div className="flex items-center space-x-2 text-[10px] font-bold bg-terminal-black border border-terminal-border rounded overflow-hidden">
              <button
                onClick={() => onSetThemeMode("dark")}
                className={`px-3 py-1.5 flex items-center space-x-1 transition-colors ${themeMode === "dark" ? "bg-terminal-green/10 text-terminal-green" : "text-terminal-muted hover:text-terminal-text"}`}
              >
                <Moon className="w-3 h-3" />
                <span>DARK</span>
              </button>
              <button
                onClick={() => onSetThemeMode("light")}
                className={`px-3 py-1.5 flex items-center space-x-1 transition-colors ${themeMode === "light" ? "bg-terminal-green/10 text-terminal-green" : "text-terminal-muted hover:text-terminal-text"}`}
              >
                <Sun className="w-3 h-3" />
                <span>LIGHT</span>
              </button>
            </div>
          </div>

          {/* Font selector */}
          <div className="border-t border-terminal-border/25 pt-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-terminal-text">[ Monospace Font ]</div>
              <p className="text-[10px] text-terminal-muted leading-relaxed">Choose the monospace font family for the entire terminal HUD.</p>
            </div>
            <select
              value={fontFamily}
              onChange={(e) => onSetFontFamily(e.target.value as FontFamily)}
              className="bg-terminal-black border border-terminal-border text-terminal-text rounded px-2.5 py-1.5 text-xs outline-none focus:border-terminal-green font-bold cursor-pointer max-w-[220px]"
            >
              {FONTS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Configurable tab editor font size setting */}
          <div className="border-t border-terminal-border/25 pt-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-terminal-text">[ Tab Editors & Previews Font Size ]</div>
              <p className="text-[10px] text-terminal-muted leading-relaxed">Adjust the editor and preview font size inside your Plan, Agent Rules, and Markdown panels.</p>
            </div>
            <select
              value={tabEditorFontSize}
              onChange={(e) => onSetTabEditorFontSize(e.target.value)}
              className="bg-terminal-black border border-terminal-border text-terminal-text rounded px-2.5 py-1.5 text-xs outline-none focus:border-terminal-green font-bold cursor-pointer"
            >
              <option value="11px">11px (Default)</option>
              <option value="13px">13px</option>
              <option value="15px">15px</option>
              <option value="17px">17px</option>
            </select>
          </div>
        </div>
      </div>

      {/* API Key Settings Card */}
      <div className="border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
        <div className="flex items-center space-x-2 text-terminal-green border-b border-terminal-border/40 pb-2.5 mb-4">
          <Database className="w-4 h-4" />
          <h2 className="font-bold text-xs uppercase tracking-wider">[ API Authentication Key ]</h2>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <input
              type="password"
              value={apiKey}
              readOnly
              className="bg-terminal-black border border-terminal-border text-terminal-text rounded px-3 py-1.5 text-[11px] font-mono outline-none flex-1 min-w-0 cursor-text select-all"
              onFocus={(e) => e.target.select()}
            />
          </div>
          <button
            onClick={onRegenerateApiKey}
            className="py-1.5 px-4 rounded bg-terminal-green text-terminal-black font-bold text-xs uppercase flex items-center space-x-1.5 transition-all shadow-[0_0_10px_rgba(0,255,102,0.1)] shrink-0 ml-3"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate</span>
          </button>
        </div>
        <p className="text-[10px] text-terminal-muted leading-relaxed mt-3">
          This API key is used to authenticate external tools connecting to the Neuron HTTP daemon. It is auto-generated on first launch. Click to select the key, copy it, and store it securely.
        </p>
      </div>

      {/* Templates Panel */}
      <div className="border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex flex-col">
          <div className="flex items-center justify-between border-b border-terminal-border/40 pb-2.5 mb-4">
            <div className="flex items-center space-x-2 text-terminal-green">
              <FileCode className="w-4 h-4" />
              <h2 className="font-bold text-xs uppercase tracking-wider">[ System Templates Customizer ]</h2>
            </div>
            <select
              value={selectedTemplateTech}
              onChange={(e) => setSelectedTemplateTech(e.target.value)}
              className="bg-terminal-black border border-terminal-border text-terminal-text rounded px-2.5 py-1 text-xs outline-none font-bold"
            >
              {TECH_STACKS.map((ts) => (
                <option key={ts.id} value={ts.id}>
                  {customStackLabels[ts.id] || ts.label}
                </option>
              ))}
            </select>
          </div>

          {/* Editable label for the selected stack */}
          <div className="flex items-center space-x-2 pb-2 mb-1">
            <span className="text-[9px] font-bold text-terminal-muted uppercase shrink-0">[ Custom Label for this stack ]</span>
            <input
              type="text"
              value={customStackLabels[selectedTemplateTech] || ""}
              onChange={(e) => onSetTechStackLabel(selectedTemplateTech, e.target.value)}
              placeholder={TECH_STACKS.find((ts) => ts.id === selectedTemplateTech)?.label || ""}
              className="flex-1 bg-terminal-black border border-terminal-border text-terminal-text rounded px-2 py-1 text-[11px] outline-none focus:border-terminal-green"
            />
            <span className="text-[9px] italic text-terminal-muted">leave empty to use default</span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-terminal-muted uppercase block">[ Default AGENTS.md rules context ]</label>
              <textarea
                value={tmplAgents}
                onChange={(e) => setTmplAgents(e.target.value)}
                style={{ fontSize: tabEditorFontSize }}
                className="w-full h-96 bg-terminal-black border border-terminal-border text-terminal-text rounded p-3 font-mono outline-none focus:border-terminal-green leading-relaxed scrollbar-thin scrollbar-thumb-terminal-border"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-terminal-muted uppercase block">[ Default plan.md checklist structure ]</label>
              <textarea
                value={tmplPlan}
                onChange={(e) => setTmplPlan(e.target.value)}
                style={{ fontSize: tabEditorFontSize }}
                className="w-full h-96 bg-terminal-black border border-terminal-border text-terminal-text rounded p-3 font-mono outline-none focus:border-terminal-green leading-relaxed scrollbar-thin scrollbar-thumb-terminal-border"
              />
            </div>
          </div>

          {/* Filtered Recommended Skills for Selected Stack */}
          <div className="border-t border-terminal-border/30 pt-4 mt-4">
            <div className="text-[10px] font-bold text-terminal-green uppercase mb-3">
              [ Recommended Skills for {TECH_STACKS.find((ts) => ts.id === selectedTemplateTech)?.label || selectedTemplateTech.toUpperCase()} ]
            </div>
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 mb-3 scrollbar-thin scrollbar-thumb-terminal-border">
              {catalogSkills.filter((sk) => sk.tech_stack === selectedTemplateTech || sk.tech_stack === "general").length === 0 ? (
                <div className="text-center py-4 text-[10px] text-terminal-muted italic border border-dashed border-terminal-border rounded bg-terminal-black/20">
                  No recommended skills registered for this stack.
                </div>
              ) : (
                catalogSkills.filter((sk) => sk.tech_stack === selectedTemplateTech || sk.tech_stack === "general").map((sk) => (
                  <div key={sk.url} className="flex items-center justify-between p-2 bg-terminal-black border border-terminal-border rounded text-[11px] group">
                    <label className="flex items-center space-x-2.5 min-w-0 flex-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sk.is_checked}
                        onChange={(e) => onToggleCatalogSkillChecked(sk.url, e.target.checked)}
                        className="rounded border-terminal-border bg-terminal-black text-terminal-green focus:ring-0 w-3.5 h-3.5 cursor-pointer shrink-0"
                      />
                      <span className="font-bold text-terminal-text truncate">{sk.label}</span>
                      <span className="text-[8px] text-terminal-muted font-mono hidden group-hover:inline truncate">{sk.url}</span>
                    </label>
                    <button
                      onClick={() => onDeleteCatalogSkill(sk.url, sk.label)}
                      className="p-0.5 rounded text-terminal-muted hover:text-terminal-red shrink-0"
                    >
                      <Trash className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-terminal-border/40 pt-4 mt-4 shrink-0 flex justify-end">
            <button
              onClick={onSaveTemplate}
              disabled={isSavingTmpl}
              className="py-1.5 px-4 rounded bg-terminal-green text-terminal-black font-bold hover:bg-terminal-green/90 text-xs uppercase flex items-center space-x-1.5 transition-all shadow-[0_0_10px_rgba(0,255,102,0.1)]"
            >
              {isSavingTmpl ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Templates</span>
            </button>
          </div>
        </div>

      {/* Recommended Catalog Panel */}
      <div className="border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex flex-col max-h-[750px]">
          <div className="flex items-center justify-between border-b border-terminal-border/40 pb-2.5 mb-4">
            <div className="flex items-center space-x-2 text-terminal-green">
              <Cpu className="w-4 h-4" />
              <h2 className="font-bold text-xs uppercase tracking-wider">[ Recommended Skills Catalog ]</h2>
            </div>
            <button
              onClick={() => setIsAddingCatalogSkill(!isAddingCatalogSkill)}
              className="py-1 px-2.5 rounded border border-terminal-border bg-terminal-black text-terminal-muted hover:text-terminal-green hover:border-terminal-green text-[10px] font-bold uppercase transition-all"
            >
              {isAddingCatalogSkill ? "[ Cancel ]" : "[ Add custom ]"}
            </button>
          </div>

          {isAddingCatalogSkill && (
            <form onSubmit={onAddCatalogSkill} className="mb-4 p-3 bg-terminal-black border border-terminal-border rounded space-y-3">
              <div className="text-[10px] font-bold text-terminal-green uppercase border-b border-terminal-border/30 pb-1 mb-2">
                [ Catalog Registration ]
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-bold text-terminal-muted uppercase">Skill Git/HTTP URL</label>
                  <input
                    type="text"
                    required
                    value={newCatUrl}
                    onChange={(e) => setNewCatUrl(e.target.value)}
                    placeholder="e.g. github.com/username/skill"
                    className="w-full bg-terminal-gray border border-terminal-border text-terminal-text rounded px-2.5 py-1 text-[11px] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-terminal-muted uppercase">Display Label</label>
                  <input
                    type="text"
                    required
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    placeholder="e.g. coverage-guard"
                    className="w-full bg-terminal-gray border border-terminal-border text-terminal-text rounded px-2.5 py-1 text-[11px] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-terminal-muted uppercase">Tech Stack Category</label>
                  <select
                    value={newCatTech}
                    onChange={(e) => setNewCatTech(e.target.value)}
                    className="w-full bg-terminal-gray border border-terminal-border text-terminal-text rounded px-2 py-1 text-[11px] outline-none"
                  >
                    <option value="general">General</option>
                    <option value="go">Go</option>
                    <option value="node">Node</option>
                    <option value="nextjs">Next.js</option>
                    <option value="html">HTML</option>
                    <option value="python">Python</option>
                    <option value="android">Android</option>
                    <option value="powershell">PowerShell</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-[9px] font-bold text-terminal-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newCatChecked}
                    onChange={(e) => setNewCatChecked(e.target.checked)}
                    className="rounded border-terminal-border bg-terminal-black text-terminal-green focus:ring-0"
                  />
                  <span>Install by default on new projects</span>
                </label>
                <button
                  type="submit"
                  disabled={isSavingCatSkill}
                  className="py-1 px-3 bg-terminal-green text-terminal-black rounded text-[10px] font-bold uppercase hover:bg-terminal-green/90 transition-all inline-flex items-center space-x-1"
                >
                  {isSavingCatSkill ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  <span>Add to Catalog</span>
                </button>
              </div>
            </form>
          )}

          {/* High max-height settings catalog list panel */}
          <div className="flex-1 overflow-y-auto max-h-[650px] space-y-2 pr-1">
            {catalogSkills.length === 0 ? (
              <div className="text-center p-8 text-xs text-terminal-muted italic border border-dashed border-terminal-border rounded bg-terminal-black/30">
                Skills Catalog empty.
              </div>
            ) : (
              catalogSkills.map((sk) => (
                <div key={sk.url} className="p-3 bg-terminal-black border border-terminal-border rounded flex items-center justify-between space-x-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <TechIcon tech={sk.tech_stack} />
                      <span className="font-bold text-xs text-terminal-text truncate">{sk.label}</span>
                      <span className="text-[8px] font-bold text-terminal-green px-1 border border-terminal-green/30 bg-terminal-green/5 rounded uppercase shrink-0 font-mono">
                        {sk.tech_stack}
                      </span>
                    </div>
                    <div className="text-[9px] text-terminal-muted font-mono truncate">{sk.url}</div>
                  </div>
                  <button
                    onClick={() => onDeleteCatalogSkill(sk.url, sk.label)}
                    className="p-1 rounded border border-terminal-border text-terminal-muted hover:text-terminal-red hover:bg-terminal-red/10 transition-all shrink-0"
                    title="Remove from Catalog"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      {/* Danger Zone: Truncate All Database Tables */}
      <div className="border border-terminal-red/30 bg-terminal-red/5 rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
        <div className="flex items-center space-x-2 text-terminal-red border-b border-terminal-red/20 pb-2.5 mb-4">
          <AlertTriangle className="w-4 h-4 animate-pulse" />
          <h2 className="font-bold text-xs uppercase tracking-wider">[ Danger Zone: Truncate Full Database ]</h2>
        </div>

        {confirmTruncate ? (
          <div className="space-y-3">
            <p className="text-[11px] text-terminal-muted leading-relaxed">
              This action will permanently delete <strong className="text-terminal-red">ALL data</strong> from every table in the DuckDB catalog:
              <code className="text-[10px] block mt-1 text-terminal-red font-mono bg-terminal-black border border-terminal-red/30 rounded p-2 leading-relaxed">
                projects · tasks · skills · clusters · cluster_projects · templates · skill_catalog · system_settings
              </code>
              System defaults and recommended skills catalog will be automatically re-seeded. <strong className="text-terminal-text">This cannot be undone.</strong>
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={onTruncateDatabase}
                className="py-1.5 px-4 rounded bg-terminal-red hover:bg-terminal-red text-white font-bold text-xs uppercase flex items-center space-x-1.5 transition-all"
              >
                <Trash className="w-3.5 h-3.5" />
                <span>CONFIRM: Truncate Everything</span>
              </button>
              <button
                onClick={() => setConfirmTruncate(false)}
                className="py-1.5 px-4 rounded border border-terminal-border text-terminal-muted hover:text-terminal-text text-xs uppercase font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-terminal-muted leading-relaxed flex-1 mr-4">
              Purge all projects, tasks, skills, clusters, settings, and re-seed default template and skill catalog entries from scratch.
            </p>
            <button
              onClick={() => setConfirmTruncate(true)}
              className="py-1.5 px-4 rounded border border-terminal-red hover:border-terminal-red bg-terminal-red/20 hover:bg-terminal-red/10 text-terminal-red font-bold text-xs uppercase whitespace-nowrap transition-all flex items-center space-x-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
              <span>Truncate Database</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
