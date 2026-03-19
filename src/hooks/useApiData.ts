"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUserFilter } from "@/contexts/UserFilterContext";

export function useApiData<T>(
  url: string,
  params?: Record<string, string | undefined>,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  let effectiveCloserEmails: string[] = [];
  try {
    const ctx = useUserFilter();
    effectiveCloserEmails = ctx.effectiveCloserEmails ?? [];
  } catch {
    effectiveCloserEmails = [];
  }

  const serialized = JSON.stringify(params ?? {});

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const sp = new URLSearchParams();
      const p = JSON.parse(serialized) as Record<string, string | undefined>;
      for (const [k, v] of Object.entries(p)) {
        if (v != null) sp.set(k, v);
      }

      if (effectiveCloserEmails.length > 0 && !sp.has("closerEmails")) {
        sp.set("closerEmails", effectiveCloserEmails.join(","));
      }

      const res = await fetch(`${url}?${sp.toString()}`, {
        signal: ctrl.signal,
      });

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const body = await res.json().catch(() => null) as { error?: string; debug?: string } | null;
        const message = body?.debug ?? body?.error ?? `Error ${res.status}`;
        throw new Error(message);
      }

      const json = (await res.json()) as T;
      if (!ctrl.signal.aborted) setData(json);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (!ctrl.signal.aborted) setError((e as Error).message);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [url, serialized, effectiveCloserEmails]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
