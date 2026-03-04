"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { useSession, type SessionInfo } from "@/hooks/useSession";

export interface AsesorOption {
  id: string;
  name: string;
  email?: string;
}

interface UserFilterContextValue {
  session: SessionInfo | null;
  sessionLoading: boolean;
  soloMisDatos: boolean;
  toggleSoloMisDatos: () => void;
  canViewAll: boolean;
  canEdit: boolean;
  effectiveCloserEmail: string | undefined;
  asesorSeleccionado: string;
  setAsesorSeleccionado: (email: string) => void;
  asesores: AsesorOption[];
}

const UserFilterContext = createContext<UserFilterContextValue | null>(null);

const LS_KEY = "autokpi_solo_mis_datos";
const LS_ASESOR = "autokpi_asesor_seleccionado";

export function UserFilterProvider({ children }: { children: ReactNode }) {
  const { session, loading: sessionLoading, canViewAll, canEdit } = useSession();

  const [soloMisDatos, setSoloMisDatos] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_KEY) === "true";
  });

  const [asesorSeleccionado, setAsesorSeleccionadoState] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(LS_ASESOR) ?? "";
  });

  const [asesores, setAsesores] = useState<AsesorOption[]>([]);

  const setAsesorSeleccionado = useCallback((email: string) => {
    setAsesorSeleccionadoState(email);
    if (typeof window !== "undefined") localStorage.setItem(LS_ASESOR, email);
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, String(soloMisDatos));
  }, [soloMisDatos]);

  useEffect(() => {
    if (!sessionLoading && session && !canViewAll) {
      setSoloMisDatos(true);
    }
  }, [sessionLoading, session, canViewAll]);

  useEffect(() => {
    if (!canViewAll || sessionLoading) return;
    fetch("/api/data/asesores")
      .then((r) => r.ok ? r.json() : [])
      .then(setAsesores)
      .catch(() => setAsesores([]));
  }, [canViewAll, sessionLoading]);

  const toggleSoloMisDatos = () => {
    if (!canViewAll) return;
    setSoloMisDatos((prev) => !prev);
  };

  const effectiveCloserEmail = useMemo(() => {
    if (!session) return undefined;
    if (!canViewAll) return session.email;
    if (soloMisDatos) {
      const email = asesorSeleccionado || session.email;
      return email || undefined;
    }
    return undefined;
  }, [session, canViewAll, soloMisDatos, asesorSeleccionado]);

  const value = useMemo<UserFilterContextValue>(() => ({
    session,
    sessionLoading,
    soloMisDatos,
    toggleSoloMisDatos,
    canViewAll,
    canEdit,
    effectiveCloserEmail,
    asesorSeleccionado,
    setAsesorSeleccionado,
    asesores,
  }), [session, sessionLoading, soloMisDatos, canViewAll, canEdit, effectiveCloserEmail, asesorSeleccionado, setAsesorSeleccionado, asesores]);

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
