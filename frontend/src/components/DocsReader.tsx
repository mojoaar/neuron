import React from "react";
import { HelpCircle, RefreshCw } from "lucide-react";
import { 
  DOCS_GETTING_STARTED, 
  DOCS_MCP_SERVER, 
  DOCS_SKILLS_GUIDE, 
  DOCS_TASKBOARD_GUIDE, 
  DOCS_SYSTEM_SERVICE 
} from "../docs/data";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface DocsReaderProps {
  selectedDocSlug: "started" | "mcp" | "skills" | "taskboard" | "service";
  setSelectedDocSlug: (slug: "started" | "mcp" | "skills" | "taskboard" | "service") => void;
  tabEditorFontSize: string;
}

const DOC_CHAPTERS = [
  { slug: "started", title: "01_GETTING_STARTED", data: DOCS_GETTING_STARTED },
  { slug: "mcp", title: "02_MCP_SERVER", data: DOCS_MCP_SERVER },
  { slug: "skills", title: "03_SKILLS_CONSOLE", data: DOCS_SKILLS_GUIDE },
  { slug: "taskboard", title: "04_TASKBOARD_GUIDE", data: DOCS_TASKBOARD_GUIDE },
  { slug: "service", title: "05_SYSTEM_SERVICE", data: DOCS_SYSTEM_SERVICE },
];

export const DocsReader: React.FC<DocsReaderProps> = ({
  selectedDocSlug,
  setSelectedDocSlug,
  tabEditorFontSize,
}) => {
  const currentChapter = DOC_CHAPTERS.find((ch) => ch.slug === selectedDocSlug);

  return (
    <div className="flex-1 overflow-hidden flex font-mono">
      {/* Chapters selection sidebar */}
      <div className="w-64 border-r border-terminal-border/40 bg-terminal-dark flex flex-col overflow-y-auto shrink-0">
        <div className="p-3.5 border-b border-terminal-border/40 font-bold text-[10px] text-terminal-green uppercase tracking-wider">
          [ Manual Chapters ]
        </div>
        <div className="p-2 space-y-1">
          {DOC_CHAPTERS.map((ch) => {
            const isSelected = selectedDocSlug === ch.slug;
            return (
              <button
                key={ch.slug}
                onClick={() => setSelectedDocSlug(ch.slug as any)}
                className={`w-full p-2.5 rounded text-left border transition-all text-xs font-mono font-bold ${
                  isSelected
                    ? "bg-terminal-green/5 border-terminal-green text-terminal-green"
                    : "border-transparent hover:bg-terminal-black/40 text-terminal-muted hover:text-terminal-text"
                }`}
              >
                {ch.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chapter markdown body reader */}
      <div className="flex-1 p-6 overflow-y-auto w-full">
        {currentChapter ? (
          <div className="border border-terminal-border bg-terminal-dark rounded-lg p-6 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            <MarkdownRenderer content={currentChapter.data} style={{ fontSize: tabEditorFontSize }} />
          </div>
        ) : (
          <div className="text-center p-8 text-terminal-muted italic">
            Chapter select offline.
          </div>
        )}
      </div>
    </div>
  );
};
