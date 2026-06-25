import React, { useEffect, useRef } from "react";
import { Search } from "lucide-react";

interface CommandPaletteOption {
  label: string;
  category: string;
  action: () => void;
}

interface CommandPaletteProps {
  showCommandPalette: boolean;
  setShowCommandPalette: (val: boolean) => void;
  paletteQuery: string;
  setPaletteQuery: (val: string) => void;
  paletteSelectedIndex: number;
  setPaletteSelectedIndex: (val: number | ((prev: number) => number)) => void;
  getPaletteFilteredOptions: () => CommandPaletteOption[];
  onSelectOption: (idx: number) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  showCommandPalette,
  setShowCommandPalette,
  paletteQuery,
  setPaletteQuery,
  paletteSelectedIndex,
  setPaletteSelectedIndex,
  getPaletteFilteredOptions,
  onSelectOption,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showCommandPalette && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCommandPalette]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(`[data-idx="${paletteSelectedIndex}"]`);
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [paletteSelectedIndex, showCommandPalette]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showCommandPalette) return;

      const visible = getPaletteFilteredOptions();

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPaletteSelectedIndex((prev) => (prev + 1) % Math.max(1, visible.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setPaletteSelectedIndex((prev) => (prev - 1 + visible.length) % Math.max(1, visible.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (visible.length > 0) {
          onSelectOption(paletteSelectedIndex);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowCommandPalette(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCommandPalette, paletteSelectedIndex, getPaletteFilteredOptions, onSelectOption, setPaletteSelectedIndex]);

  if (!showCommandPalette) return null;

  const visible = getPaletteFilteredOptions();

  return (
    <div className="fixed inset-0 bg-terminal-dark/80 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4 font-mono">
      <div
        ref={inputRef}
        className="max-w-xl w-full border border-terminal-border bg-terminal-black rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden"
      >
        {/* Input area */}
        <div className="flex items-center space-x-3 px-4 py-3 border-b border-terminal-border">
          <Search className="w-4 h-4 text-terminal-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={paletteQuery}
            onChange={(e) => {
              setPaletteQuery(e.target.value);
              setPaletteSelectedIndex(0);
            }}
            placeholder="Fuzzy-search workspaces, commands, and options..."
            className="w-full bg-transparent border-none outline-none text-xs text-terminal-text placeholder-terminal-muted focus:ring-0"
          />
          <span className="text-[9px] text-terminal-muted shrink-0 bg-terminal-gray border border-terminal-border px-1.5 py-0.5 rounded uppercase font-bold">[ ESC ]</span>
        </div>

        {/* Options list */}
        <div ref={listRef} className="max-h-72 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-terminal-border">
          {visible.length === 0 ? (
            <div className="text-center p-8 text-xs text-terminal-muted">
              No matching workspace search commands found.
            </div>
          ) : (
            visible.map((opt, idx) => {
              const isSelected = paletteSelectedIndex === idx;
              return (
                <div
                  data-idx={idx}
                  key={opt.label}
                  onClick={() => onSelectOption(idx)}
                  className={`p-2.5 rounded cursor-pointer flex items-center justify-between text-xs transition-all border ${
                    isSelected
                      ? "bg-terminal-green/10 border-terminal-green text-terminal-green shadow-[0_0_8px_rgba(0,255,102,0.05)]"
                      : "border-transparent hover:bg-terminal-gray/40 text-terminal-text"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold block truncate">{opt.label}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 border rounded uppercase shrink-0 font-mono ml-3 ${
                    isSelected ? "border-terminal-green/30 text-terminal-green bg-terminal-green/5" : "border-terminal-border text-terminal-muted bg-terminal-gray/20"
                  }`}>
                    {opt.category}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
