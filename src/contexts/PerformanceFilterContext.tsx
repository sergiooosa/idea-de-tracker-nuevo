"use client";

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

export type AdvisorFilterMode = "include" | "exclude";

export interface AdvisorOption {
  key: string;
  name: string;
}

export interface PerformanceFilterContextValue {
  selectedAdvisors: string[];
  filterMode: AdvisorFilterMode;
  toggleAdvisor: (key: string) => void;
  setFilterMode: (mode: AdvisorFilterMode) => void;
  clearAdvisors: () => void;
  isAdvisorVisible: (advisorKey: string) => boolean;
  advisorOptions: AdvisorOption[];
  setAdvisorOptions: (options: AdvisorOption[]) => void;
}

const PerformanceFilterContext = createContext<PerformanceFilterContextValue | null>(null);

export function PerformanceFilterProvider({ children }: { children: ReactNode }) {
  const [selectedAdvisors, setSelectedAdvisors] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<AdvisorFilterMode>("include");
  const [advisorOptions, setAdvisorOptionsRaw] = useState<AdvisorOption[]>([]);

  const setAdvisorOptions = useCallback((options: AdvisorOption[]) => {
    setAdvisorOptionsRaw((prev) => {
      if (prev.length === options.length && prev.every((p, i) => p.key === options[i].key)) return prev;
      return options;
    });
  }, []);

  const toggleAdvisor = useCallback((key: string) => {
    setSelectedAdvisors((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  const clearAdvisors = useCallback(() => {
    setSelectedAdvisors([]);
  }, []);

  const isAdvisorVisible = useCallback(
    (advisorKey: string) => {
      if (selectedAdvisors.length === 0) return true;
      if (filterMode === "include") return selectedAdvisors.includes(advisorKey);
      return !selectedAdvisors.includes(advisorKey);
    },
    [selectedAdvisors, filterMode],
  );

  const value = useMemo<PerformanceFilterContextValue>(
    () => ({
      selectedAdvisors,
      filterMode,
      toggleAdvisor,
      setFilterMode,
      clearAdvisors,
      isAdvisorVisible,
      advisorOptions,
      setAdvisorOptions,
    }),
    [selectedAdvisors, filterMode, toggleAdvisor, setFilterMode, clearAdvisors, isAdvisorVisible, advisorOptions, setAdvisorOptions],
  );

  return (
    <PerformanceFilterContext.Provider value={value}>
      {children}
    </PerformanceFilterContext.Provider>
  );
}

export function usePerformanceFilter() {
  const ctx = useContext(PerformanceFilterContext);
  if (!ctx) throw new Error("usePerformanceFilter must be used within PerformanceFilterProvider");
  return ctx;
}
