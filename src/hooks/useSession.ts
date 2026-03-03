"use client";

import { useState, useEffect, useCallback } from "react";

export interface SessionInfo {
  email: string;
  name: string | null;
  rol: string;
  permisos: Record<string, boolean> | null;
  permisosArray: string[];
  id_cuenta: number;
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
    ? session.permisosArray.includes("ver_todo") || session.rol === "superadmin"
    : false;

  const canEdit = session
    ? session.permisosArray.includes("editar_registros") || session.rol === "superadmin"
    : false;

  return { session, loading, canViewAll, canEdit };
}
