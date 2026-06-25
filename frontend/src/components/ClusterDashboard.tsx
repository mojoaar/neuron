import React, { useState, useEffect } from "react";
import { Layers, Plus, Trash, ArrowRight, Database, RefreshCw, Folder, GitBranch } from "lucide-react";
import { Cluster, Project } from "../types";
import { TechIcon } from "./TechIcon";

interface ClusterDashboardProps {
  cluster: Cluster;
  allProjects: Project[];
  onSelectProject: (proj: Project) => void;
  onRefreshSidebar: () => void;
  onExitCluster: () => void;
}

export const ClusterDashboard: React.FC<ClusterDashboardProps> = ({
  cluster,
  allProjects,
  onSelectProject,
  onRefreshSidebar,
  onExitCluster,
}) => {
  const [memberProjects, setMemberProjects] = useState<Project[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [selectedProjToAdd, setSelectedProjToAdd] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchMemberProjects = async () => {
    setIsQuerying(true);
    try {
      const res = await fetch(`/api/clusters/${cluster.id}/projects`);
      if (res.ok) {
        const data = await res.json();
        setMemberProjects(data || []);
      }
    } catch (err) {
      console.error("Failed to load cluster projects:", err);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjToAdd) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/clusters/${cluster.id}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: selectedProjToAdd }),
      });
      if (res.ok) {
        setSelectedProjToAdd("");
        await fetchMemberProjects();
        onRefreshSidebar();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveProject = async (projId: string) => {
    try {
      const res = await fetch(`/api/clusters/${cluster.id}/projects?project_id=${projId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchMemberProjects();
        onRefreshSidebar();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCluster = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete cluster "${cluster.name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/clusters/${cluster.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onRefreshSidebar();
        onExitCluster();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMemberProjects();
  }, [cluster.id]);

  // Filter out projects that are already members of this cluster
  const availableProjects = allProjects.filter(
    (p) => !memberProjects.some((m) => m.id === p.id)
  );

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-5xl mx-auto w-full font-mono">
      {/* Cluster Title Header */}
      <div className="border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Layers className="w-5 h-5 text-terminal-green animate-pulse" />
          <div>
            <h2 className="font-bold text-xs uppercase tracking-wider text-terminal-text">[ Cluster: {cluster.name} ]</h2>
            <div className="text-[9px] text-terminal-muted mt-1 uppercase">Grouped relational systems catalog workspace ({memberProjects.length} active systems)</div>
          </div>
        </div>
        <button
          onClick={handleDeleteCluster}
          className="py-1 px-3 rounded border border-red-950 hover:border-red-500 bg-red-950/10 hover:bg-red-500/10 text-red-500 text-[10px] font-bold uppercase transition-all flex items-center space-x-1"
        >
          <Trash className="w-3.5 h-3.5" />
          <span>Delete Cluster</span>
        </button>
      </div>

      {/* Add Project to Cluster */}
      {availableProjects.length > 0 && (
        <form onSubmit={handleAddProject} className="border border-terminal-border bg-terminal-dark rounded-lg p-4 shadow-[0_2px_8px_rgba(0,0,0,0.4)] flex items-center space-x-3 shrink-0">
          <span className="text-xs font-bold text-terminal-muted uppercase shrink-0">[ Bind Workspace ]</span>
          <select
            value={selectedProjToAdd}
            onChange={(e) => setSelectedProjToAdd(e.target.value)}
            className="flex-1 bg-terminal-black border border-terminal-border text-terminal-text rounded px-3 py-1.5 text-xs outline-none focus:border-terminal-green font-bold"
          >
            <option value="">Select registered project to map...</option>
            {availableProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.tech_stack})</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isAdding || !selectedProjToAdd}
            className="py-1.5 px-4 rounded bg-terminal-green text-terminal-black font-bold text-xs uppercase flex items-center space-x-1 transition-all shadow-[0_0_10px_rgba(0,255,102,0.1)]"
          >
            {isAdding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Map to Cluster</span>
          </button>
        </form>
      )}

      {/* Cluster Grid Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isQuerying ? (
          <div className="col-span-2 text-center p-12 text-terminal-muted italic text-xs space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-terminal-green" />
            <span>Scanning cluster members...</span>
          </div>
        ) : memberProjects.length === 0 ? (
          <div className="col-span-2 text-center p-12 text-terminal-muted italic border border-dashed border-terminal-border rounded bg-terminal-black/30 text-xs">
            Cluster empty. No mapped systems found. Use the binder select dropdown above to map systems!
          </div>
        ) : (
          memberProjects.map((proj) => (
            <div key={proj.id} className="p-5 bg-terminal-black border border-terminal-border rounded-lg flex flex-col justify-between hover:border-terminal-green/40 transition-all relative group">
              <div className="space-y-3.5 mb-5">
                <div className="flex items-center justify-between border-b border-terminal-border/30 pb-2">
                  <div className="flex items-center space-x-2">
                    <TechIcon tech={proj.tech_stack} />
                    <span className="font-bold text-xs text-terminal-text uppercase">{proj.name}</span>
                  </div>
                  <span className="text-[8px] font-bold text-terminal-green px-1.5 py-0.5 border border-terminal-green/30 bg-terminal-green/5 rounded uppercase shrink-0 font-mono">
                    {proj.tech_stack}
                  </span>
                </div>
                <div className="space-y-2 text-[11px] leading-relaxed">
                  <div className="flex items-start space-x-1.5">
                    <Folder className="w-3.5 h-3.5 text-terminal-muted mt-0.5 shrink-0" />
                    <span className="text-terminal-muted select-text truncate" title={proj.path}>{proj.path}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-terminal-border/30 pt-3">
                <button
                  onClick={() => handleRemoveProject(proj.id)}
                  className="py-1 px-2.5 rounded border border-red-950/40 hover:border-red-500 bg-red-950/10 hover:bg-red-500/10 text-red-500 text-[9px] font-bold uppercase transition-all opacity-0 group-hover:opacity-100"
                  title="Remove from Cluster"
                >
                  Unbind
                </button>
                <button
                  onClick={() => onSelectProject(proj)}
                  className="py-1 px-3 bg-terminal-green text-terminal-black rounded text-[10px] font-bold uppercase hover:bg-terminal-green/90 transition-all inline-flex items-center space-x-1 shadow-[0_0_8px_rgba(0,255,102,0.1)]"
                >
                  <span>Open HUD</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
