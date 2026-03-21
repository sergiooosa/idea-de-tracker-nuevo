"use client";

import { useCallback, useState } from "react";
import { previewVideoRecovery } from "../api/videoRecovery.api";
import type { VideoRecoveryPreviewItem, VideoRecoveryPreviewRequest } from "../types/videoRecovery.types";
import { validatePreviewRequest } from "../utils/videoRecovery.validation";

interface UseVideoRecoveryPreviewResult {
  items: VideoRecoveryPreviewItem[];
  loading: boolean;
  error: string | null;
  fetchPreview: (payload: VideoRecoveryPreviewRequest) => Promise<VideoRecoveryPreviewItem[]>;
  clearPreview: () => void;
}

export function useVideoRecoveryPreview(): UseVideoRecoveryPreviewResult {
  const [items, setItems] = useState<VideoRecoveryPreviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = useCallback(
    async (payload: VideoRecoveryPreviewRequest): Promise<VideoRecoveryPreviewItem[]> => {
      const validationError = validatePreviewRequest(payload);
      if (validationError) {
        throw new Error(validationError);
      }

      setLoading(true);
      setError(null);
      try {
        const response = await previewVideoRecovery(payload);
        const nextItems = response.data?.items ?? [];
        setItems(nextItems);
        return nextItems;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "No se pudo cargar el preview";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const clearPreview = useCallback((): void => {
    setItems([]);
    setError(null);
  }, []);

  return {
    items,
    loading,
    error,
    fetchPreview,
    clearPreview,
  };
}

