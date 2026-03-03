"use client";

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { useSession, type SessionInfo } from "@/hooks/useSession";

interface UserFilterContextValue {
  session: SessionInfo | null;
  sessionLoading: boolean;
  soloMisDatos: boolean;
  toggleSoloMisDatos: () => void;
  canViewAll: boolean;
  canEdit: boolean;
  effectiveCloserEmail: string | undefined;
}

const UserFilterContext = createContext<UserFilterContextValue | null>(null);

const LS_KEY = "autokpi_solo_mis_datos";

export function UserFilterProvider({ children }: { children: ReactNode }) {
  const { session, loading: sessionLoading, canViewAll, canEdit } = useSession();

  const [soloMisDatos, setSoloMisDatos] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_KEY) === "true";
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, String(soloMisDatos));
  }, [soloMisDatos]);

  useEffect(() => {
    if (!sessionLoading && session && !canViewAll) {
      setSoloMisDatos(true);
    }
  }, [sessionLoading, session, canViewAll]);

  const toggleSoloMisDatos = () => {
    if (!canViewAll) return;
    setSoloMisDatos((prev) => !prev);
  };

  const effectiveCloserEmail = useMemo(() => {
    if (!session) return undefined;
    if (!canViewAll) return session.email;
    if (soloMisDatos) return session.email;
    return undefined;
  }, [session, canViewAll, soloMisDatos]);

  const value = useMemo<UserFilterContextValue>(() => ({
    session,
    sessionLoading,
    soloMisDatos,
    toggleSoloMisDatos,
    canViewAll,
    canEdit,
    effectiveCloserEmail,
  }), [session, sessionLoading, soloMisDatos, canViewAll, canEdit, effectiveCloserEmail]);

  return (
    <UserFilterContext.Provider value={value}>
      {children}
    </UserFilterContext.Provider>
  );
}

export function useUserFilter() {
  const ctx = useContext(UserFilterContext);
  if (!ctx) throw new Error("useUserFilter must be used within UserFilterProvider");
  return ctx;
}
