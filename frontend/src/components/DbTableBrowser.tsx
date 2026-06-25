import React, { useState, useEffect } from "react";
import { Database, RefreshCw, FileText, Table } from "lucide-react";
import { DbTableData } from "../types";

export const DbTableBrowser: React.FC = () => {
  const [tables, setDbTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tableData, setDbTableData] = useState<DbTableData | null>(null);
  const [isListing, setIsListing] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);

  const fetchTables = async () => {
    setIsListing(true);
    try {
      const res = await fetch("/api/system/db/tables");
      if (res.ok) {
        const data = await res.json();
        setDbTables(data || []);
        if (data && data.length > 0) {
          setSelectedTable(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to list tables:", err);
    } finally {
      setIsListing(false);
    }
  };

  const fetchTableData = async (name: string) => {
    if (!name) return;
    setIsQuerying(true);
    try {
      const res = await fetch(`/api/system/db/table?name=${name}`);
      if (res.ok) {
        const data = await res.json();
        setDbTableData(data);
      }
    } catch (err) {
      console.error("Failed to query table data:", err);
    } finally {
      setIsQuerying(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable);
    }
  }, [selectedTable]);

  return (
    <div className="flex-1 overflow-hidden flex font-mono">
      {/* Tables sidebar selection */}
      <div className="w-64 border-r border-terminal-border/40 bg-terminal-dark flex flex-col shrink-0">
        <div className="p-3.5 border-b border-terminal-border/40 flex items-center justify-between">
          <span className="font-bold text-[10px] text-terminal-green uppercase tracking-wider">
            [ Tables Catalog ]
          </span>
          <button
            onClick={fetchTables}
            disabled={isListing}
            className="p-1 rounded border border-terminal-border text-terminal-muted hover:text-terminal-green bg-terminal-black"
          >
            <RefreshCw className={`w-3 h-3 ${isListing ? "animate-spin text-terminal-green" : ""}`} />
          </button>
        </div>
        <div className="p-2 space-y-1 overflow-y-auto">
          {tables.map((t) => {
            const isSelected = selectedTable === t;
            return (
              <button
                key={t}
                onClick={() => setSelectedTable(t)}
                className={`w-full p-2.5 rounded text-left border transition-all text-xs font-bold font-mono flex items-center space-x-2 ${
                  isSelected
                    ? "bg-terminal-green/5 border-terminal-green text-terminal-green"
                    : "border-transparent hover:bg-terminal-black/40 text-terminal-muted hover:text-terminal-text"
                }`}
              >
                <Table className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid display viewport */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col space-y-4">
        {selectedTable ? (
          <div className="flex-1 border border-terminal-border bg-terminal-dark rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-terminal-border/40 pb-2.5 mb-4 shrink-0">
              <div className="flex items-center space-x-2 text-terminal-green">
                <Database className="w-4 h-4 animate-pulse" />
                <h2 className="font-bold text-xs uppercase tracking-wider">
                  [ Query: SELECT * FROM {selectedTable} LIMIT 500; ]
                </h2>
              </div>
              <button
                onClick={() => fetchTableData(selectedTable)}
                disabled={isQuerying}
                className="py-1.5 px-3 border border-terminal-border hover:border-terminal-green hover:text-terminal-green text-[10px] font-bold uppercase rounded transition-all inline-flex items-center space-x-1"
              >
                <RefreshCw className={`w-3 h-3 ${isQuerying ? "animate-spin text-terminal-green" : ""}`} />
                <span>Execute Scan</span>
              </button>
            </div>

            {/* Scrollable Data Table Grid */}
            <div className="flex-1 overflow-auto border border-terminal-border bg-terminal-black rounded">
              {isQuerying ? (
                <div className="flex flex-col items-center justify-center p-12 text-terminal-muted text-xs space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-terminal-green" />
                  <span>Scanning rows...</span>
                </div>
              ) : tableData ? (
                <table className="w-full border-collapse text-left text-[11px] font-mono whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-terminal-border bg-terminal-gray/40 select-none">
                      {tableData.columns.map((col) => (
                        <th
                          key={col}
                          className="px-3.5 py-2.5 font-bold uppercase text-terminal-green border-r border-terminal-border/30 last:border-r-0"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={tableData.columns.length}
                          className="px-4 py-8 text-center text-terminal-muted italic"
                        >
                          Table empty. No rows found.
                        </td>
                      </tr>
                    ) : (
                      tableData.rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className="border-b border-terminal-border/20 last:border-b-0 hover:bg-terminal-gray/25 transition-colors"
                        >
                          {row.map((cell, cIdx) => {
                            const strVal = cell === null || cell === undefined ? "NULL" : String(cell);
                            const isLong = strVal.length > 50;
                            return (
                              <td
                                key={cIdx}
                                className="px-3.5 py-2.5 border-r border-terminal-border/20 last:border-r-0 max-w-xs truncate text-terminal-text select-text"
                                title={strVal}
                              >
                                {isLong ? `${strVal.slice(0, 50)}...` : strVal}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="text-center p-12 text-terminal-muted italic text-xs">
                  No query results loaded.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center p-12 text-terminal-muted italic text-xs">
            Select a table to browse its relational rows catalog.
          </div>
        )}
      </div>
    </div>
  );
};
