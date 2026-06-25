import React, { useRef, useEffect } from "react";
import { Terminal as TerminalIcon, AlertTriangle, CheckCircle, Info, RefreshCw } from "lucide-react";
import { LogLine } from "../types";

interface ConsoleLogsProps {
  logs: LogLine[];
  isTerminalCollapsed: boolean;
  setIsTerminalCollapsed: (val: boolean) => void;
  isServerDisconnected: boolean;
  onClearLogs: () => void;
}

export const ConsoleLogs: React.FC<ConsoleLogsProps> = ({
  logs,
  isTerminalCollapsed,
  setIsTerminalCollapsed,
  isServerDisconnected,
  onClearLogs,
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current && !isTerminalCollapsed) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isTerminalCollapsed]);

  const getLogColorClass = (type: string) => {
    switch (type) {
      case "success": return "text-terminal-green";
      case "error": return "text-red-500";
      case "system": return "text-[#00ffff]"; // Cyan HUD log line
      default: return "text-terminal-text";
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle className="w-3 h-3 text-terminal-green" />;
      case "error": return <AlertTriangle className="w-3 h-3 text-red-500" />;
      case "system": return <TerminalIcon className="w-3 h-3 text-[#00ffff]" />;
      default: return <Info className="w-3 h-3 text-terminal-muted" />;
    }
  };

  return (
    <div className="border-t border-terminal-border bg-terminal-black flex flex-col shrink-0">
      {/* HUD Header Bar */}
      <div className="px-4 py-2 border-b border-terminal-border/40 flex items-center justify-between font-mono text-[10px] text-terminal-muted font-bold">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="w-3.5 h-3.5 text-terminal-green animate-pulse" />
          <span className="uppercase tracking-wider">HUD_CONSOLE_OUTPUT</span>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={onClearLogs} className="hover:text-terminal-text">[ CLEAR ]</button>
          <button onClick={() => setIsTerminalCollapsed(!isTerminalCollapsed)}>
            {isTerminalCollapsed ? "[ COLLAPSE: FALSE ]" : "[ COLLAPSE: TRUE ]"}
          </button>
        </div>
      </div>

      {/* Terminal logs listing */}
      {!isTerminalCollapsed && (
        <div className="h-40 overflow-y-auto p-4 font-mono text-[11px] space-y-1.5 scrollbar-thin scrollbar-thumb-terminal-border">
          {logs.length === 0 ? (
            <div className="text-terminal-muted italic">[ Console stream empty. Standing by for transaction records... ]</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className={`flex items-start space-x-2 ${getLogColorClass(log.type)}`}>
                <span className="text-terminal-muted shrink-0 select-none">[{log.timestamp}]</span>
                <span className="shrink-0 pt-0.5">{getLogIcon(log.type)}</span>
                <span className="break-all whitespace-pre-wrap leading-relaxed">{log.text}</span>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      )}

      {/* Connection severed critical overlay */}
      {isServerDisconnected && (
        <div className="fixed inset-0 bg-terminal-dark/95 z-50 flex flex-col items-center justify-center p-6 text-center font-mono">
          <div className="border border-red-500/35 bg-terminal-black max-w-md w-full p-8 rounded-lg shadow-[0_0_50px_rgba(239,68,68,0.15)] relative">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none rounded-lg" />
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-sm font-bold uppercase text-red-500 tracking-wider mb-2">[ CRITICAL: HUD_DAEMON_OFFLINE ]</h2>
            <p className="text-xs text-terminal-muted leading-relaxed mb-6">
              The HTTP daemon process has terminated or the network connection has been severed. Launch the local daemon process inside your shell terminal to reconnect.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="py-1.5 px-4 rounded border border-terminal-border bg-terminal-gray hover:border-terminal-green text-terminal-text hover:text-terminal-green font-bold text-xs uppercase transition-all inline-flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
