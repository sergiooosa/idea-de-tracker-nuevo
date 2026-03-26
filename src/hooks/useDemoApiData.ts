/**
 * useDemoApiData — versión demo de useApiData.
 * No hace ningún fetch real. Genera datos falsos con Faker
 * desde DEMO_GENERATORS y los devuelve directamente.
 * Cada llamada produce datos nuevos (sin seed fijo).
 */

"use client";

import { useState, useCallback } from "react";
import { DEMO_GENERATORS } from "@/lib/demo-data";

export function useDemoApiData<T>(url: string) {
  const generate = useCallback((): T => {
    // Busca el generador por ruta exacta (ignora query params)
    const path = url.split("?")[0];
    const gen = DEMO_GENERATORS[path];
    if (gen) return gen() as T;
    console.warn(`[demo] No hay generador para ${path}, devolviendo {}`);
    return {} as T;
  }, [url]);

  const [data] = useState<T | null>(() => generate());
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  // Refetch simula recarga con nuevos datos falsos
  const refetch = useCallback(() => {
    // Forzar re-render recargando la página (comportamiento esperado en demo)
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  return { data, loading, error, refetch };
}
