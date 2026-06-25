"use client";

import React from "react";
import { useNeuron } from "../hooks/useNeuron";
import { Sidebar } from "../components/Sidebar";
import { ConsoleLogs } from "../components/ConsoleLogs";
import { CommandPalette } from "../components/CommandPalette";
import { SystemSettings } from "../components/SystemSettings";
import { APIPlayground } from "../components/APIPlayground";
import { DocsReader } from "../components/DocsReader";
import { ProjectDashboard } from "../components/ProjectDashboard";
import { Provisioner } from "../components/Provisioner";
import { DbTableBrowser } from "../components/DbTableBrowser";
import { ClusterDashboard } from "../components/ClusterDashboard";

export default function Page() {
  const state = useNeuron();

  return (
    <div className={`h-screen flex flex-col bg-terminal-dark text-terminal-text overflow-hidden font-mono selection:bg-terminal-green/30 selection:text-terminal-green`}>
      {/* Visual background scanning grid overlay */}
      <div className="absolute inset-0 bg-[size:32px_32px] pointer-events-none z-0"
        style={{
          backgroundImage: "linear-gradient(var(--terminal-grid) 1px, transparent 1px), linear-gradient(90deg, var(--terminal-grid) 1px, transparent 1px)"
        }}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Sidebar */}
        <Sidebar
          projects={state.projects}
          selectedProject={state.selectedProject}
          hiddenProjectIds={state.hiddenProjectIds}
          darkMode={state.themeMode === "dark"}
          setDarkMode={(val: boolean) => state.setThemeMode(val ? "dark" : "light")}
          showDocs={state.showDocs}
          setShowDocs={state.setShowDocs}
          showApiDocs={state.showApiDocs}
          setShowApiDocs={state.setShowApiDocs}
          showSystemSettings={state.showSystemSettings}
          setShowSystemSettings={state.setShowSystemSettings}
          onSelectProject={state.handleSelectProject}
          onSelectProvisioner={() => {
            state.setSelectedProject(null);
            state.setShowDocs(false);
            state.setShowApiDocs(false);
            state.setShowSystemSettings(false);
            state.setShowDbViewer(false);
          }}
          onHideProject={state.handleHideProject}
          onShutdownServer={state.handleShutdownServer}
          onTriggerSearch={() => state.setShowCommandPalette(true)}
          onOpenDbViewer={() => {
            state.setShowDbViewer(true);
            state.setShowDocs(false);
            state.setShowApiDocs(false);
            state.setShowSystemSettings(false);
          }}
          clusters={state.clusters}
          selectedCluster={state.selectedCluster}
          onSelectCluster={state.handleSelectCluster}
          onRefreshClusters={state.fetchClusters}
          enableProjectClusters={state.enableProjectClusters}
          showDbViewer={state.showDbViewer}
          setShowDbViewer={state.setShowDbViewer}
          version={state.version}
        />

        {/* Dynamic Inner Panel Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden bg-terminal-black/40">
          {state.showDocs ? (
            <DocsReader
              selectedDocSlug={state.selectedDocSlug}
              setSelectedDocSlug={state.setSelectedDocSlug}
              tabEditorFontSize={state.tabEditorFontSize}
            />
          ) : state.showApiDocs ? (
            <APIPlayground
              selectedApiIdx={state.selectedApiIdx}
              setSelectedApiIdx={state.setSelectedApiIdx}
              apiInputs={state.apiInputs}
              setApiInputs={state.setApiInputs}
              apiRequestBody={state.apiRequestBody}
              setApiRequestBody={state.setApiRequestBody}
              apiResponse={state.apiResponse}
              apiResStatus={state.apiResStatus}
              apiResTime={state.apiResTime}
              isSendingApi={state.isSendingApi}
              onRunApiRequest={state.handleRunApiRequest}
              tabEditorFontSize={state.tabEditorFontSize}
            />
          ) : state.showDbViewer ? (
            <DbTableBrowser
              hiddenProjectIds={state.hiddenProjectIds}
              onUnhideProject={state.handleUnhideProject}
              onRefreshProjectsList={() => state.fetchProjects(true)}
            />
          ) : state.showSystemSettings ? (
            <SystemSettings
              cwd={state.cwd}
              customScopePath={state.customScopePath}
              setCustomScopePath={state.setCustomScopePath}
              isCustomScope={state.isCustomScope}
              isSavingScope={state.isSavingScope}
              systemTemplates={state.systemTemplates}
              selectedTemplateTech={state.selectedTemplateTech}
              setSelectedTemplateTech={state.setSelectedTemplateTech}
              tmplAgents={state.tmplAgents}
              setTmplAgents={state.setTmplAgents}
              tmplPlan={state.tmplPlan}
              setTmplPlan={state.setTmplPlan}
              isSavingTmpl={state.isSavingTmpl}
              catalogSkills={state.catalogSkills}
              isAddingCatalogSkill={state.isAddingCatalogSkill}
              setIsAddingCatalogSkill={state.setIsAddingCatalogSkill}
              newCatUrl={state.newCatUrl}
              setNewCatUrl={state.setNewCatUrl}
              newCatLabel={state.newCatLabel}
              setNewCatLabel={state.setNewCatLabel}
              newCatTech={state.newCatTech}
              setNewCatTech={state.setNewCatTech}
              newCatChecked={state.newCatChecked}
              setNewCatChecked={state.setNewCatChecked}
              isSavingCatSkill={state.isSavingCatSkill}
              onSaveScopePath={state.handleSaveScopePath}
              onResetScopePath={state.handleResetScopePath}
              onSaveTemplate={state.handleSaveTemplate}
              onAddCatalogSkill={state.handleAddCatalogSkill}
              onDeleteCatalogSkill={state.handleDeleteCatalogSkill}
              terminalCollapsedByDefault={state.terminalCollapsedByDefault}
              onToggleTerminalCollapseDefault={state.handleToggleTerminalCollapseDefault}
              tabEditorFontSize={state.tabEditorFontSize}
              onSetTabEditorFontSize={state.handleSetTabEditorFontSize}
              projects={state.projects}
              hiddenProjectIds={state.hiddenProjectIds}
              onUnhideProject={state.handleUnhideProject}
              enableProjectClusters={state.enableProjectClusters}
              onToggleEnableProjectClusters={state.handleToggleEnableProjectClusters}
              enableVerificationCi={state.enableVerificationCi}
              onToggleEnableVerificationCi={state.handleToggleEnableVerificationCi}
              themeName={state.themeName}
              onSetThemeName={state.handleSetThemeName}
              themeMode={state.themeMode}
              onSetThemeMode={state.handleSetThemeMode}
              fontFamily={state.fontFamily}
              onSetFontFamily={state.handleSetFontFamily}
              customStackLabels={state.customStackLabels}
              onSetTechStackLabel={state.handleSetTechStackLabel}
              onToggleCatalogSkillChecked={state.handleToggleCatalogSkillChecked}
              onTruncateDatabase={() => {
                state.handleTruncateDatabase();
                state.setShowDbViewer(false);
                state.setShowSystemSettings(false);
              }}
              apiKey={state.apiKey}
              onRegenerateApiKey={state.handleRegenerateApiKey}
            />
          ) : state.selectedCluster !== null ? (
            <ClusterDashboard
              cluster={state.selectedCluster}
              allProjects={state.projects}
              onSelectProject={state.handleSelectProject}
              onRefreshSidebar={() => {
                state.fetchClusters();
                state.fetchProjects(false);
              }}
              onExitCluster={() => state.handleSelectCluster(null)}
            />
          ) : state.selectedProject === null ? (
            <Provisioner
              provName={state.provName}
              setProvName={state.setProvName}
              provPath={state.provPath}
              setProvPath={state.setProvPath}
              provTech={state.provTech}
              setProvTech={state.setProvTech}
              selectedSkillUrls={state.selectedSkillUrls}
              setSelectedSkillUrls={state.setSelectedSkillUrls}
              catalogSkills={state.catalogSkills}
              isProvisioning={state.isProvisioning}
              discoveredDirs={state.discoveredDirs}
              discoveredStacks={state.discoveredStacks}
              setDiscoveredStacks={state.setDiscoveredStacks}
              isDiscovering={state.isDiscovering}
              onProvision={state.handleProvision}
              onQuickTrackProject={state.handleQuickTrackProject}
              onRefreshDiscovery={state.fetchDiscoveredDirs}
              darkMode={state.themeMode === "dark"}
            />
          ) : (
            <ProjectDashboard
              selectedProject={state.selectedProject}
              tasks={state.tasks}
              skills={state.skills}
              activeTab={state.activeTab}
              setActiveTab={state.setActiveTab}
              planContent={state.planContent}
              setPlanContent={state.setPlanContent}
              isSavingPlan={state.isSavingPlan}
              isImportingPlan={state.isImportingPlan}
              rulesContent={state.rulesContent}
              setRulesContent={state.setRulesContent}
              isSavingRules={state.isSavingRules}
              gitStatus={state.gitStatus}
              isRefreshingGit={state.isRefreshingGit}
              newTaskContent={state.newTaskContent}
              setNewTaskContent={state.setNewTaskContent}
              newTaskPriority={state.newTaskPriority}
              setNewTaskPriority={state.setNewTaskPriority}
              isAddingTask={state.isAddingTask}
              editingSkill={state.editingSkill}
              setEditingSkill={state.setEditingSkill}
              newSkillName={state.newSkillName}
              setNewSkillName={state.setNewSkillName}
              newSkillDesc={state.newSkillDesc}
              setNewSkillDesc={state.setNewSkillDesc}
              newSkillTrigger={state.newSkillTrigger}
              setNewSkillTrigger={state.setNewSkillTrigger}
              newSkillType={state.newSkillType}
              setNewSkillType={state.setNewSkillType}
              newSkillPath={state.newSkillPath}
              setNewSkillPath={state.setNewSkillPath}
              isAddingSkill={state.isAddingSkill}
              editSkillName={state.editSkillName}
              setEditSkillName={state.setEditSkillName}
              editSkillDesc={state.editSkillDesc}
              setEditSkillDesc={state.setEditSkillDesc}
              editSkillTrigger={state.editSkillTrigger}
              setEditSkillTrigger={state.setEditSkillTrigger}
              editSkillType={state.editSkillType}
              setEditSkillType={state.setEditSkillType}
              editSkillPath={state.editSkillPath}
              setEditSkillPath={state.setEditSkillPath}
              catalogSkills={state.catalogSkills}
              isInstallingSkillUrl={state.isInstallingSkillUrl}
              isExporting={state.isExporting}
              onRefreshGit={state.fetchGitStatus}
              onSavePlan={state.handleSavePlan}
              onImportPlanChecklist={state.handleImportPlanChecklist}
              onSaveRules={state.handleSaveRules}
              onAddTask={state.handleAddTask}
              onUpdateTaskStatus={state.handleUpdateTaskStatus}
              onAddSkill={state.handleAddSkill}
              onInstallCatalogSkill={state.handleInstallCatalogSkill}
              onOpenEditSkill={state.handleOpenEditSkill}
              onUpdateSkill={state.handleUpdateSkill}
              onDeleteSkill={state.handleDeleteSkill}
              onExportSkills={state.handleExportSkills}
              onSetupMcp={state.handleSetupMcp}
              tabEditorFontSize={state.tabEditorFontSize}
              checkStatus={state.checkStatus}
              isRefreshingCheck={state.isRefreshingCheck}
              onRefreshCheck={state.fetchCheckStatus}
              enableVerificationCi={state.enableVerificationCi}
              activityEntries={state.activityEntries}
            />
          )}
        </div>
      </div>

      {/* Terminal log console bar */}
      <ConsoleLogs
        logs={state.logs}
        isTerminalCollapsed={state.isTerminalCollapsed}
        setIsTerminalCollapsed={state.setIsTerminalCollapsed}
        isServerDisconnected={state.isServerDisconnected}
        onClearLogs={() => state.addLog("[ Console buffer cleared. Ready. ]", "info")}
      />

      {/* Keyboard Shortcuts Command search palette overlay */}
      <CommandPalette
        showCommandPalette={state.showCommandPalette}
        setShowCommandPalette={state.setShowCommandPalette}
        paletteQuery={state.paletteQuery}
        setPaletteQuery={state.setPaletteQuery}
        paletteSelectedIndex={state.paletteSelectedIndex}
        setPaletteSelectedIndex={state.setPaletteSelectedIndex}
        getPaletteFilteredOptions={state.getPaletteFilteredOptions}
        onSelectOption={state.handlePaletteSelectOption}
      />
    </div>
  );
}
