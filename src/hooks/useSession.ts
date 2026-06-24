"use client";

import { useState, useEffect, useCallback } from "react";
import { canViewAll as canViewAllPerm, canEditRecords } from "@/lib/permisos";

export type TipoUsuario = "analista" | "enfoque";

export interface SessionInfo {
  email: string;
  name: string | null;
  rol: string;
  permisos: Record<string, boolean> | null;
  permisosArray: string[];
  id_cuenta: number | null;
  platformAdmin?: boolean;
  tipoUsuario: TipoUsuario;
}

export function useSession() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session-info");
      if (res.ok) {
        setSession(await res.json());
      }
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const canViewAll = session
    ? session.rol === "superadmin" || canViewAllPerm(session.permisosArray)
    : false;

  const canEdit = session
    ? session.rol === "superadmin" || canEditRecords(session.permisosArray)
    : false;

  const refresh = useCallback(async () => {
    await fetch("/api/auth/refresh-session", { method: "POST" });
    await fetchSession();
  }, [fetchSession]);

  return { session, loading, canViewAll, canEdit, refresh };
}
