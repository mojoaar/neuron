import React from "react";
import { 
  Settings, 
  HelpCircle, 
  FileCode, 
  Terminal as TerminalIcon, 
  Plus, 
  Trash, 
  AlertTriangle, 
  Sun, 
  Moon,
  Github,
  Database
} from "lucide-react";
import { Project } from "../types";
import { TechIcon } from "./TechIcon";

interface SidebarProps {
  projects: Project[];
  selectedProject: Project | null;
  hiddenProjectIds: string[];
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  showDocs: boolean;
  setShowDocs: (val: boolean) => void;
  showApiDocs: boolean;
  setShowApiDocs: (val: boolean) => void;
  showSystemSettings: boolean;
  setShowSystemSettings: (val: boolean) => void;
  onSelectProject: (proj: Project) => void;
  onSelectProvisioner: () => void;
  onHideProject: (id: string) => void;
  onShutdownServer: () => void;
  onTriggerSearch: () => void;
  onOpenDbViewer: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  selectedProject,
  hiddenProjectIds,
  darkMode,
  setDarkMode,
  showDocs,
  setShowDocs,
  showApiDocs,
  setShowApiDocs,
  showSystemSettings,
  setShowSystemSettings,
  onSelectProject,
  onSelectProvisioner,
  onHideProject,
  onShutdownServer,
  onTriggerSearch,
  onOpenDbViewer,
}) => {
  const visibleProjects = projects.filter((p) => !hiddenProjectIds.includes(p.id));

  return (
    <div className="w-64 border-r border-terminal-border bg-terminal-dark flex flex-col shrink-0">
      {/* Title Header */}
      <div className="p-4 border-b border-terminal-border flex flex-col space-y-3 shrink-0 bg-terminal-black/15">
        <div className="flex items-center justify-between">
          <button
            onClick={onSelectProvisioner}
            className="flex items-center space-x-2 text-left group"
            title="Return to Systems Provisioner Wizard"
          >
            <TerminalIcon className="w-5 h-5 text-terminal-green animate-pulse group-hover:scale-105 transition-transform" />
            <span className="font-bold text-xs uppercase tracking-wider text-terminal-text font-mono group-hover:text-terminal-green transition-colors">
              [ NEURON_HUD ]
            </span>
          </button>
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => window.open("https://github.com/mojoaar/neuron", "_blank")}
              className="p-1 rounded hover:bg-terminal-gray border border-terminal-border text-terminal-muted hover:text-terminal-text"
              title="Open GitHub Repository"
            >
              <Github className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1 rounded hover:bg-terminal-gray border border-terminal-border text-terminal-muted hover:text-terminal-text"
              title="Toggle Dark/Light Mode"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-yellow-500 animate-pulse" /> : <Moon className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Clickable search button */}
        <button
          onClick={onTriggerSearch}
          className="w-full text-[10px] text-terminal-muted flex items-center justify-between hover:text-terminal-green bg-terminal-black hover:bg-terminal-black/75 border border-terminal-border px-2.5 py-1.5 rounded transition-all select-none font-mono"
        >
          <span className="flex items-center space-x-1.5">
            <TerminalIcon className="w-3 h-3 text-terminal-green" />
            <span>Search HUD...</span>
          </span>
          <kbd className="bg-terminal-gray border border-terminal-border px-1.5 rounded text-[8px] shrink-0 font-sans">⌘K</kbd>
        </button>
      </div>

      {/* Systems Directory Section */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-terminal-muted tracking-wider mb-2 font-mono">
            <span>[ Active Systems ]</span>
            <button
              onClick={onSelectProvisioner}
              className="p-0.5 rounded border border-terminal-border bg-terminal-black hover:border-terminal-green text-terminal-muted hover:text-terminal-green"
              title="Spawn Scaffolding Wizard"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1">
            {visibleProjects.length === 0 ? (
              <div className="text-[10px] text-terminal-muted italic p-2 border border-dashed border-terminal-border rounded text-center">
                No systems registered.
              </div>
            ) : (
              visibleProjects.map((p) => {
                const isSelected = selectedProject?.id === p.id && !showSystemSettings && !showDocs && !showApiDocs;
                return (
                  <div
                    key={p.id}
                    className={`group flex items-center justify-between p-2 rounded text-xs font-mono transition-all border ${
                      isSelected
                        ? "bg-terminal-green/10 border-terminal-green text-terminal-green shadow-[0_0_10px_rgba(0,255,102,0.1)]"
                        : "border-transparent text-terminal-muted hover:bg-terminal-gray hover:text-terminal-text"
                    }`}
                  >
                    <button
                      onClick={() => onSelectProject(p)}
                      className="flex items-center space-x-2 min-w-0 flex-1 text-left"
                    >
                      <TechIcon tech={p.tech_stack} />
                      <span className="truncate font-bold">{p.name}</span>
                    </button>
                    <button
                      onClick={() => onHideProject(p.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-terminal-muted hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                      title="Hide from dashboard listings"
                    >
                      <Trash className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Global Control Plane Links */}
        <div className="space-y-1 pt-2 border-t border-terminal-border">
          <div className="text-[10px] uppercase font-bold text-terminal-muted tracking-wider mb-2 font-mono">
            [ Global Plane ]
          </div>
          <button
            onClick={() => {
              setShowSystemSettings(true);
              setShowDocs(false);
              setShowApiDocs(false);
            }}
            className={`w-full flex items-center space-x-2 p-2 rounded text-xs font-mono border ${
              showSystemSettings
                ? "bg-terminal-green/10 border-terminal-green text-terminal-green"
                : "border-transparent text-terminal-muted hover:bg-terminal-gray hover:text-terminal-text"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="font-bold">SYSTEM_SETTINGS</span>
          </button>

          <button
            onClick={() => {
              setShowDocs(true);
              setShowSystemSettings(false);
              setShowApiDocs(false);
            }}
            className={`w-full flex items-center space-x-2 p-2 rounded text-xs font-mono border ${
              showDocs
                ? "bg-terminal-green/10 border-terminal-green text-terminal-green"
                : "border-transparent text-terminal-muted hover:bg-terminal-gray hover:text-terminal-text"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="font-bold">SYSTEM_MANUAL</span>
          </button>

          <button
            onClick={() => {
              setShowApiDocs(true);
              setShowDocs(false);
              setShowSystemSettings(false);
            }}
            className={`w-full flex items-center space-x-2 p-2 rounded text-xs font-mono border ${
              showApiDocs
                ? "bg-terminal-green/10 border-terminal-green text-terminal-green"
                : "border-transparent text-terminal-muted hover:bg-terminal-gray hover:text-terminal-text"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span className="font-bold">API_SANDBOX</span>
          </button>
        </div>
      </div>

      {/* Shutdown Trigger Area */}
      <div className="p-3 border-t border-terminal-border bg-terminal-black/30 space-y-2">
        <div className="flex flex-col space-y-1 font-mono text-[9px] text-terminal-muted font-bold select-none mb-1">
          <button
            onClick={onOpenDbViewer}
            className="w-full flex items-center space-x-1.5 bg-terminal-gray/10 px-2 py-1.5 rounded border border-terminal-border/40 hover:border-terminal-green/50 hover:bg-terminal-green/5 text-left transition-all text-terminal-muted hover:text-terminal-green group"
            title="Open DuckDB Relational Table Viewer"
          >
            <Database className="w-3 h-3 text-terminal-green group-hover:scale-105 transition-transform" />
            <span className="font-bold">DUCKDB:ACTIVE</span>
          </button>
          <div className="flex items-center space-x-1.5 bg-terminal-gray/10 px-2 py-1.5 rounded border border-terminal-border/40">
            <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse shrink-0" />
            <span>SERVER:127.0.0.1:8080</span>
          </div>
        </div>

        <button
          onClick={onShutdownServer}
          className="w-full py-1.5 px-3 rounded border border-red-950 hover:border-red-500 bg-red-950/20 hover:bg-red-500/10 text-red-500 font-mono text-[10px] font-bold uppercase transition-all flex items-center justify-center space-x-1"
        >
          <AlertTriangle className="w-3 h-3 animate-pulse" />
          <span>Shutdown Daemon</span>
        </button>
      </div>
    </div>
  );
};
