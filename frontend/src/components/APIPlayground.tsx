import React from "react";
import { Play, RefreshCw } from "lucide-react";
import { ApiEndpoint } from "../types";
import { API_ENDPOINTS } from "../lib/endpoints";

interface APIPlaygroundProps {
  selectedApiIdx: number;
  setSelectedApiIdx: (idx: number) => void;
  apiInputs: Record<string, string>;
  setApiInputs: (inputs: Record<string, string>) => void;
  apiRequestBody: string;
  setApiRequestBody: (body: string) => void;
  apiResponse: string;
  apiResStatus: string;
  apiResTime: string;
  isSendingApi: boolean;
  onRunApiRequest: () => void;
}

export const APIPlayground: React.FC<APIPlaygroundProps> = ({
  selectedApiIdx,
  setSelectedApiIdx,
  apiInputs,
  setApiInputs,
  apiRequestBody,
  setApiRequestBody,
  apiResponse,
  apiResStatus,
  apiResTime,
  isSendingApi,
  onRunApiRequest,
}) => {
  return (
    <div className="flex-1 overflow-hidden flex font-mono">
      {/* Sidebar listing endpoints */}
      <div className="w-80 border-r border-terminal-border/40 bg-terminal-dark flex flex-col overflow-y-auto shrink-0">
        <div className="p-3.5 border-b border-terminal-border/40 font-bold text-[10px] text-terminal-green uppercase tracking-wider">
          [ API Endpoints Catalog ]
        </div>
        <div className="p-2 space-y-1">
          {API_ENDPOINTS.map((ep, idx) => {
            const isSelected = selectedApiIdx === idx;
            const isGet = ep.method === "GET";
            return (
              <button
                key={idx}
                onClick={() => setSelectedApiIdx(idx)}
                className={`w-full p-2.5 rounded text-left border transition-all flex flex-col space-y-1 ${
                  isSelected
                    ? "bg-terminal-green/5 border-terminal-green text-terminal-green"
                    : "border-transparent hover:bg-terminal-black/40 text-terminal-muted hover:text-terminal-text"
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    isGet ? "bg-terminal-green/10 border border-terminal-green/30 text-terminal-green" : "bg-yellow-500/10 border border-yellow-500/30 text-yellow-500"
                  }`}>
                    {ep.method}
                  </span>
                  <span className="font-bold text-[10px] truncate font-mono">{ep.path}</span>
                </div>
                <div className="text-[9px] text-terminal-muted leading-relaxed font-mono truncate">{ep.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main execute dashboard */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col space-y-6 max-w-4xl mx-auto w-full">
        <div className="border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between border-b border-terminal-border/40 pb-2.5 mb-4">
            <div className="flex items-center space-x-2 text-terminal-green">
              <Play className="w-4 h-4" />
              <h2 className="font-bold text-xs uppercase tracking-wider">[ REST API Sandbox Playground ]</h2>
            </div>
            <button
              onClick={onRunApiRequest}
              disabled={isSendingApi}
              className="py-1.5 px-4 rounded bg-terminal-green text-terminal-black font-bold hover:bg-terminal-green/90 text-xs uppercase flex items-center space-x-1.5 transition-all shadow-[0_0_10px_rgba(0,255,102,0.15)]"
            >
              {isSendingApi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Execute Call</span>
            </button>
          </div>

          <div className="space-y-4">
            {/* Dynamic URL parameters input */}
            {Object.keys(apiInputs).length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-terminal-muted uppercase">[ Path Parameters ]</div>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(apiInputs).map((key) => (
                    <div key={key} className="space-y-1">
                      <label className="text-[9px] font-bold text-terminal-text font-mono uppercase">{key}</label>
                      <input
                        type="text"
                        value={apiInputs[key]}
                        onChange={(e) => setApiInputs({ ...apiInputs, [key]: e.target.value })}
                        className="w-full bg-terminal-black border border-terminal-border text-terminal-text rounded px-2.5 py-1 text-xs outline-none focus:border-terminal-green"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request Body payload editor */}
            {API_ENDPOINTS[selectedApiIdx]?.method !== "GET" && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-terminal-muted uppercase">[ JSON Request Body Payload ]</div>
                <textarea
                  value={apiRequestBody}
                  onChange={(e) => setApiRequestBody(e.target.value)}
                  className="w-full h-44 bg-terminal-black border border-terminal-border text-terminal-text rounded p-3 text-[11px] font-mono outline-none focus:border-terminal-green leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>

        {/* Console response viewer */}
        {(apiResponse || apiResStatus) && (
          <div className="border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex flex-col min-h-64">
            <div className="flex items-center justify-between border-b border-terminal-border/40 pb-2.5 mb-4">
              <div className="text-[10px] font-bold text-terminal-green uppercase">[ Sandbox Response HUD Output ]</div>
              <div className="flex items-center space-x-3 text-[9px] font-bold font-mono">
                {apiResStatus && (
                  <span className={`px-1.5 py-0.5 border rounded uppercase ${
                    apiResStatus.startsWith("2") ? "border-terminal-green/30 text-terminal-green bg-terminal-green/5" : "border-red-500/35 text-red-500 bg-red-500/5"
                  }`}>
                    {apiResStatus}
                  </span>
                )}
                {apiResTime && (
                  <span className="px-1.5 py-0.5 border border-terminal-border text-terminal-muted bg-terminal-black/30 rounded uppercase">
                    Latency: {apiResTime}
                  </span>
                )}
              </div>
            </div>

            <pre className="flex-1 bg-terminal-black border border-terminal-border rounded p-4 text-[10px] text-terminal-green font-mono overflow-auto leading-relaxed max-h-96">
              <code>{apiResponse}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
