import React from "react";
import { Sparkles, Database, RefreshCw, Cpu, Layers, FileCode, Smartphone, Globe, Terminal as TerminalIcon } from "lucide-react";
import { CatalogSkill } from "../types";

interface ProvisionerProps {
  provName: string;
  setProvName: (val: string) => void;
  provPath: string;
  setProvPath: (val: string) => void;
  provTech: string;
  setProvTech: (val: string) => void;
  selectedSkillUrls: string[];
  setSelectedSkillUrls: (urls: string[]) => void;
  catalogSkills: CatalogSkill[];
  isProvisioning: boolean;
  discoveredDirs: { name: string; path: string; tech_stack?: string }[];
  discoveredStacks: Record<string, string>;
  setDiscoveredStacks: (val: Record<string, string>) => void;
  isDiscovering: boolean;
  onProvision: (e: React.FormEvent) => void;
  onQuickTrackProject: (dirName: string, dirPath: string, tech: string) => void;
  onRefreshDiscovery: () => void;
}

const getStackIcon = (stack: string) => {
  switch (stack) {
    case "go": return <Cpu className="w-3.5 h-3.5" />;
    case "node": return <Layers className="w-3.5 h-3.5" />;
    case "html": return <FileCode className="w-3.5 h-3.5" />;
    case "python": return <Cpu className="w-3.5 h-3.5" />;
    case "nextjs": return <Globe className="w-3.5 h-3.5" />;
    case "android": return <Smartphone className="w-3.5 h-3.5" />;
    default: return <TerminalIcon className="w-3.5 h-3.5" />;
  }
};

export const Provisioner: React.FC<ProvisionerProps> = ({
  provName,
  setProvName,
  provPath,
  setProvPath,
  provTech,
  setProvTech,
  selectedSkillUrls,
  setSelectedSkillUrls,
  catalogSkills,
  isProvisioning,
  discoveredDirs,
  discoveredStacks,
  setDiscoveredStacks,
  isDiscovering,
  onProvision,
  onQuickTrackProject,
  onRefreshDiscovery,
}) => {
  const toggleSkillSelect = (url: string) => {
    if (selectedSkillUrls.includes(url)) {
      setSelectedSkillUrls(selectedSkillUrls.filter((u) => u !== url));
    } else {
      setSelectedSkillUrls([...selectedSkillUrls, url]);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto flex items-start justify-center max-w-6xl mx-auto w-full gap-6 font-mono">
      {/* Left Form: Manual Provisioning */}
      <div className="flex-1 max-w-xl border border-terminal-border bg-terminal-dark rounded-lg p-6 relative shadow-[0_0_20px_rgba(0,0,0,0.8)]">
        {/* Visual grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0.3)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none rounded-lg" />

        <div className="relative">
          <div className="flex items-center space-x-2 text-terminal-green border-b border-terminal-border pb-3 mb-4">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <h2 className="font-bold uppercase tracking-wider text-sm">[ SYSTEM PROVISIONING WIZARD ]</h2>
          </div>

          <p className="text-xs text-terminal-muted leading-relaxed mb-6">
            Neuron will scaffold a clean stack template structure, write local coding boundaries (<code className="text-terminal-green">AGENTS.md</code> & <code className="text-terminal-green">CLAUDE.md</code>), and register the database records.
          </p>

          <form onSubmit={onProvision} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-terminal-muted uppercase">System Project Name</label>
              <input
                type="text"
                required
                value={provName}
                onChange={(e) => setProvName(e.target.value)}
                placeholder="e.g. scaffolded-api"
                className="w-full bg-terminal-black border border-terminal-border text-terminal-text rounded px-3 py-2 text-xs outline-none focus:border-terminal-green"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-terminal-muted uppercase">Workspace Target Path (Absolute or Relative)</label>
              <input
                type="text"
                required
                value={provPath}
                onChange={(e) => setProvPath(e.target.value)}
                placeholder="e.g. ./scaffolded-api"
                className="w-full bg-terminal-black border border-terminal-border text-terminal-text rounded px-3 py-2 text-xs outline-none focus:border-terminal-green"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-bold text-terminal-muted uppercase">Target Technology Stack</label>
                <select
                  value={provTech}
                  onChange={(e) => setProvTech(e.target.value)}
                  className="w-full bg-terminal-black border border-terminal-border text-terminal-text rounded px-2.5 py-2 text-xs outline-none focus:border-terminal-green font-bold"
                >
                  <option value="go">Go (Golang API / Client)</option>
                  <option value="node">Node.js (JavaScript CLI / Server)</option>
                  <option value="nextjs">Next.js (TypeScript Web App Router)</option>
                  <option value="html">HTML5 / CSS / Vanilla Static Canvas</option>
                  <option value="python">Python (General Science / REST App)</option>
                  <option value="android">Android (Kotlin SDK Client)</option>
                  <option value="powershell">PowerShell Cmdlet Tools</option>
                </select>
              </div>
            </div>

            {/* Recommended Skills Checklist */}
            <div className="space-y-2 pt-2 border-t border-terminal-border/40">
              <label className="text-[10px] font-bold text-terminal-muted uppercase block">[ Auto-Install Recommended Skills ]</label>
              <div className="max-h-36 overflow-y-auto border border-terminal-border bg-terminal-black/40 rounded p-2.5 space-y-2">
                {catalogSkills.filter((sk) => sk.tech_stack === provTech || sk.tech_stack === "general").length === 0 ? (
                  <div className="text-center p-4 text-terminal-muted italic text-[11px]">No matching recommendations found for this tech stack.</div>
                ) : (
                  catalogSkills.filter((sk) => sk.tech_stack === provTech || sk.tech_stack === "general").map((item) => {
                    const isSelected = selectedSkillUrls.includes(item.url);
                    return (
                      <label key={item.url} className="flex items-start space-x-2.5 text-[11px] text-terminal-text cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSkillSelect(item.url)}
                          className="mt-0.5 rounded border-terminal-border bg-terminal-black text-terminal-green focus:ring-0"
                        />
                        <div className="min-w-0 flex-1 leading-relaxed">
                          <span className="font-bold">{item.label}</span>
                          <span className="text-[8px] font-bold text-terminal-muted ml-1.5 uppercase">({item.tech_stack})</span>
                          <div className="text-[9px] text-terminal-muted truncate">{item.url}</div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isProvisioning}
              className="w-full mt-4 py-2 px-4 rounded bg-terminal-green text-terminal-black font-bold text-xs uppercase flex items-center justify-center space-x-2 transition-all shadow-[0_0_15px_rgba(0,255,102,0.15)] hover:bg-terminal-green/90"
            >
              {isProvisioning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 animate-pulse" />}
              <span>Assemble & Scaffold Workspace</span>
            </button>
          </form>
        </div>
      </div>

      {/* Right List: Discovered directories */}
      <div className="w-[450px] border border-terminal-border bg-terminal-dark rounded-lg p-6 relative shadow-[0_0_20px_rgba(0,0,0,0.8)] shrink-0 flex flex-col max-h-[600px]">
        <div className="flex items-center justify-between border-b border-terminal-border pb-3 mb-4">
          <div className="flex items-center space-x-2 text-terminal-green">
            <Database className="w-5 h-5 animate-pulse" />
            <h2 className="font-bold uppercase tracking-wider text-sm">[ AUTO-DISCOVERED WORKSPACES ]</h2>
          </div>
          <button
            onClick={onRefreshDiscovery}
            disabled={isDiscovering}
            className="p-1.5 rounded border border-terminal-border text-terminal-muted hover:text-terminal-green bg-terminal-black"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? "animate-spin text-terminal-green" : ""}`} />
          </button>
        </div>

        <p className="text-[11px] text-terminal-muted leading-relaxed mb-4">
          Unregistered sub-folders found inside your active scope root. Select stack and click [ TRACK ] to instantly register and scaffold coding rules!
        </p>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-terminal-border">
          {discoveredDirs.length === 0 ? (
            <div className="text-center p-8 text-terminal-muted border border-dashed border-terminal-border rounded bg-terminal-black text-xs">
              {isDiscovering ? "Scanning active scope..." : "No unregistered sub-directories found in current scope."}
            </div>
          ) : (
            discoveredDirs.map((dir) => (
              <div key={dir.name} className="p-3 bg-terminal-black border border-terminal-border rounded flex items-center justify-between space-x-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    {getStackIcon(discoveredStacks[dir.name] || "go")}
                    <span className="font-bold text-xs text-terminal-text truncate">{dir.name}</span>
                  </div>
                  <div className="text-[9px] text-terminal-muted font-mono mt-0.5 truncate">{dir.path}</div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <select
                    value={discoveredStacks[dir.name] || "go"}
                    onChange={(e) => setDiscoveredStacks({ ...discoveredStacks, [dir.name]: e.target.value })}
                    className="bg-terminal-gray border border-terminal-border text-terminal-text rounded px-1.5 py-1 outline-none text-[10px] font-mono shrink-0"
                  >
                    <option value="go">Go</option>
                    <option value="node">Node</option>
                    <option value="nextjs">Next.js</option>
                    <option value="html">HTML</option>
                    <option value="python">Python</option>
                    <option value="android">Android</option>
                    <option value="powershell">PowerShell</option>
                  </select>
                  <button
                    onClick={() => onQuickTrackProject(dir.name, dir.path, discoveredStacks[dir.name] || "go")}
                    className="bg-terminal-green text-terminal-black hover:bg-terminal-green/90 font-bold text-[10px] py-1 px-3 rounded shadow-[0_0_6px_rgba(0,255,102,0.15)] shrink-0"
                  >
                    TRACK
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
