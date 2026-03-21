"use client";

import { useCallback, useState } from "react";
import { executeVideoRecovery } from "../api/videoRecovery.api";
import type {
  ExecuteSelectedRecording,
  VideoRecoveryExecuteAggregate,
  VideoRecoveryExecuteResponse,
} from "../types/videoRecovery.types";
import { aggregateExecuteResults, chunkSelectedRecordings } from "../utils/videoRecovery.mappers";
import { validateChunkSize, validateExecuteSelection } from "../utils/videoRecovery.validation";

interface ExecuteProgress {
  current: number;
  total: number;
}

interface UseVideoRecoveryExecuteResult {
  executing: boolean;
  error: string | null;
  progress: ExecuteProgress | null;
  executeInChunks: (
    idEvento: string,
    selectedRecordings: ExecuteSelectedRecording[],
  ) => Promise<VideoRecoveryExecuteAggregate>;
  clearExecuteError: () => void;
}

function toAggregate(response: VideoRecoveryExecuteResponse): VideoRecoveryExecuteAggregate {
  return {
    processed: response.data?.processed ?? 0,
    skipped: response.data?.skipped ?? 0,
    errors: response.data?.errors ?? 0,
    items: response.data?.items ?? [],
  };
}

export function useVideoRecoveryExecute(): UseVideoRecoveryExecuteResult {
  const [executing, setExecuting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExecuteProgress | null>(null);

  const executeInChunks = useCallback(
    async (idEvento: string, selectedRecordings: ExecuteSelectedRecording[]): Promise<VideoRecoveryExecuteAggregate> => {
      const selectionError = validateExecuteSelection(selectedRecordings);
      if (selectionError) {
        throw new Error(selectionError);
      }

      const chunks = chunkSelectedRecordings(selectedRecordings, 20);
      setExecuting(true);
      setError(null);
      setProgress({ current: 0, total: chunks.length });

      try {
        const aggregates: VideoRecoveryExecuteAggregate[] = [];
        for (let index = 0; index < chunks.length; index += 1) {
          const chunk = chunks[index] ?? [];
          const chunkValidationError = validateChunkSize(chunk);
          if (chunkValidationError) {
            throw new Error(chunkValidationError);
          }

          setProgress({ current: index + 1, total: chunks.length });
          const response = await executeVideoRecovery({
            id_evento: idEvento,
            request_id: crypto.randomUUID(),
            selected_recordings: chunk,
          });
          aggregates.push(toAggregate(response));
        }

        const orderedIds = selectedRecordings.map((item) => item.recording_id);
        return aggregateExecuteResults(aggregates, orderedIds);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "No se pudo ejecutar la recuperacion";
        setError(message);
        throw err;
      } finally {
        setExecuting(false);
      }
    },
    [],
  );

  const clearExecuteError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    executing,
    error,
    progress,
    executeInChunks,
    clearExecuteError,
  };
}

