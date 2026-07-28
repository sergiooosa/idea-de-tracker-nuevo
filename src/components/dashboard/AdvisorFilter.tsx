"use client";

import { useState, useRef, useEffect } from "react";
import { User, X, ChevronDown, UserCheck, UserX } from "lucide-react";
import { usePerformanceFilter, type AdvisorFilterMode } from "@/contexts/PerformanceFilterContext";

export default function AdvisorFilter() {
  const { selectedAdvisors, filterMode, toggleAdvisor, setFilterMode, clearAdvisors, advisorOptions } =
    usePerformanceFilter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (advisorOptions.length < 2) return null;

  const modeLabel: Record<AdvisorFilterMode, string> = {
    include: "Solo ver",
    exclude: "Excluir",
  };

  const hasFilter = selectedAdvisors.length > 0;
  const selectedNames = selectedAdvisors
    .map((k) => advisorOptions.find((a) => a.key === k)?.name ?? k)
    .join(", ");

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
          hasFilter
            ? filterMode === "exclude"
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-accent-purple/10 border-accent-purple/30 text-accent-purple"
            : "bg-surface-700 border-surface-500 text-gray-400 hover:text-white hover:border-surface-400"
        }`}
      >
        <User className="w-3.5 h-3.5" />
        {hasFilter ? (
          <span className="max-w-[180px] truncate">
            {modeLabel[filterMode]}: {selectedNames}
          </span>
        ) : (
          "Filtrar asesores"
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {hasFilter && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            clearAdvisors();
          }}
          className="ml-1 p-1 rounded-md text-gray-400 hover:text-white hover:bg-surface-600 transition-colors"
          title="Quitar filtro de asesores"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-lg bg-surface-800 border border-surface-500 shadow-xl">
          <div className="flex items-center border-b border-surface-500">
            {(["include", "exclude"] as const).map((mode) => {
              const Icon = mode === "include" ? UserCheck : UserX;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors ${
                    filterMode === mode
                      ? mode === "include"
                        ? "bg-accent-purple/10 text-accent-purple"
                        : "bg-red-500/10 text-red-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {modeLabel[mode]}
                </button>
              );
            })}
          </div>
          <div className="max-h-[240px] overflow-y-auto py-1">
            {advisorOptions.map((advisor) => {
              const isSelected = selectedAdvisors.includes(advisor.key);
              return (
                <button
                  key={advisor.key}
                  type="button"
                  onClick={() => toggleAdvisor(advisor.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                    isSelected
                      ? filterMode === "include"
                        ? "bg-accent-purple/10 text-accent-purple"
                        : "bg-red-500/10 text-red-400"
                      : "text-gray-300 hover:bg-surface-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? filterMode === "include"
                          ? "bg-accent-purple border-accent-purple"
                          : "bg-red-500 border-red-500"
                        : "border-surface-400"
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  <span className="truncate">{advisor.name}</span>
                </button>
              );
            })}
          </div>
          {selectedAdvisors.length > 0 && (
            <div className="border-t border-surface-500 px-3 py-2">
              <button
                type="button"
                onClick={clearAdvisors}
                className="text-[10px] text-gray-500 hover:text-white underline"
              >
                Limpiar selección
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
