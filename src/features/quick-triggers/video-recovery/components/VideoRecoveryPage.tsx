"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { fetchVideoRecoveryUsers } from "../api/videoRecovery.api";
import { useVideoRecoveryExecute } from "../hooks/useVideoRecoveryExecute";
import { useVideoRecoveryPreview } from "../hooks/useVideoRecoveryPreview";
import type {
  SuggestedAction,
  VideoRecoveryExecuteAggregate,
  VideoRecoveryPreviewItem,
  VideoRecoveryUiState,
  VideoRecoveryUserOption,
} from "../types/videoRecovery.types";
import {
  getLocalAction,
  toDefaultSelection,
  toSelectedRecordingsPayload,
  toUniqueTrimmedList,
} from "../utils/videoRecovery.mappers";
import { VideoRecoveryExecutionResult } from "./VideoRecoveryExecutionResult";
import { VideoRecoveryFilters, type VideoRecoveryFiltersValues } from "./VideoRecoveryFilters";
import { VideoRecoveryPreviewTable } from "./VideoRecoveryPreviewTable";

function toInitialDateTimeLocal(hoursToSubtract: number): string {
  const now = new Date();
  now.setHours(now.getHours() - hoursToSubtract);
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;
  const localDateTime = new Date(now.getTime() - timezoneOffsetMs);
  return localDateTime.toISOString().slice(0, 16);
}

function withSeconds(dateTimeLocal: string): string {
  if (!dateTimeLocal) return "";
  return `${dateTimeLocal}:00`;
}

export function VideoRecoveryPage() {
  const [users, setUsers] = useState<VideoRecoveryUserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [uiState, setUiState] = useState<VideoRecoveryUiState>("idle");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<VideoRecoveryPreviewItem[]>([]);
  const [selectedRecordingIds, setSelectedRecordingIds] = useState<Set<number>>(new Set<number>());
  const [actionOverrides, setActionOverrides] = useState<Map<number, SuggestedAction>>(
    new Map<number, SuggestedAction>(),
  );
  const [executionResult, setExecutionResult] = useState<VideoRecoveryExecuteAggregate | null>(null);
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<"all" | SuggestedAction>("all");
  const [values, setValues] = useState<VideoRecoveryFiltersValues>({
    id_evento: "",
    from: toInitialDateTimeLocal(24),
    to: toInitialDateTimeLocal(0),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    teams: "",
    recorded_by: "",
    calendar_invitees_domains: "",
    calendar_invitees_domains_type: "all",
    limit: 50,
  });

  const { fetchPreview, loading: previewLoading, error: previewError } = useVideoRecoveryPreview();
  const {
    executeInChunks,
    executing,
    progress,
    error: executeError,
    clearExecuteError,
  } = useVideoRecoveryExecute();

  useEffect(() => {
    let mounted = true;
    async function loadUsers(): Promise<void> {
      setUsersLoading(true);
      try {
        const options = await fetchVideoRecoveryUsers();
        if (!mounted) return;
        setUsers(options);
        if (options.length > 0 && !values.id_evento) {
          setValues((prev) => ({ ...prev, id_evento: options[0]?.id_evento ?? "" }));
        }
      } catch (err: unknown) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "No se pudo cargar el selector de usuarios";
        setUsersError(message);
      } finally {
        if (mounted) setUsersLoading(false);
      }
    }
    loadUsers();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedItems = useMemo(
    () =>
      previewItems.filter((item) => {
        if (!selectedRecordingIds.has(item.recording_id)) return false;
        return getLocalAction(item, actionOverrides) !== "skip";
      }),
    [previewItems, selectedRecordingIds, actionOverrides],
  );

  const handleSearchPreview = async (): Promise<void> => {
    setGlobalError(null);
    clearExecuteError();
    setExecutionResult(null);
    setUiState("loadingPreview");
    try {
      const items = await fetchPreview({
        id_evento: values.id_evento,
        from: withSeconds(values.from),
        to: withSeconds(values.to),
        timezone: values.timezone,
        teams: toUniqueTrimmedList(values.teams),
        recorded_by: toUniqueTrimmedList(values.recorded_by),
        calendar_invitees_domains: toUniqueTrimmedList(values.calendar_invitees_domains),
        calendar_invitees_domains_type: values.calendar_invitees_domains_type,
        limit: values.limit,
      });
      setPreviewItems(items);
      setActionOverrides(new Map<number, SuggestedAction>());
      setSelectedRecordingIds(toDefaultSelection(items));
      setUiState("previewLoaded");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error cargando previsualizacion";
      setGlobalError(message);
      setUiState("errorGlobal");
    }
  };

  const handleToggleSelection = (recordingId: number): void => {
    setSelectedRecordingIds((prev) => {
      const next = new Set(prev);
      if (next.has(recordingId)) next.delete(recordingId);
      else next.add(recordingId);
      return next;
    });
  };

  const handleSetActionForRow = (recordingId: number, action: SuggestedAction): void => {
    setActionOverrides((prev) => {
      const next = new Map(prev);
      next.set(recordingId, action);
      return next;
    });
  };

  const handleBulkAction = (action: SuggestedAction): void => {
    if (selectedRecordingIds.size === 0) return;
    setActionOverrides((prev) => {
      const next = new Map(prev);
      selectedRecordingIds.forEach((recordingId) => {
        next.set(recordingId, action);
      });
      return next;
    });
  };

  const handleSelectRecoverable = (): void => {
    setSelectedRecordingIds(toDefaultSelection(previewItems));
  };

  const handleClearSelection = (): void => {
    setSelectedRecordingIds(new Set<number>());
  };

  const runExecute = async (
    items: VideoRecoveryPreviewItem[],
    selectedIdsOverride?: Set<number>,
  ): Promise<void> => {
    if (items.length === 0) {
      setGlobalError("Debes seleccionar al menos una fila con accion distinta de skip");
      setUiState("errorGlobal");
      return;
    }
    setUiState("executing");
    setGlobalError(null);
    try {
      const selectedIds = selectedIdsOverride ?? selectedRecordingIds;
      const payload = toSelectedRecordingsPayload(items, selectedIds, actionOverrides);
      const result = await executeInChunks(values.id_evento, payload);
      setExecutionResult(result);
      setUiState("executionDone");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error ejecutando recuperacion";
      setGlobalError(message);
      setUiState("errorGlobal");
    }
  };

  const handleExecuteSelected = async (): Promise<void> => {
    await runExecute(previewItems);
  };

  const handleRetryErrors = async (): Promise<void> => {
    if (!executionResult) return;
    const failedIds = new Set(
      executionResult.items.filter((item) => item.status === "error").map((item) => item.recording_id),
    );
    const failedItems = previewItems.filter((item) => failedIds.has(item.recording_id));
    await runExecute(failedItems, failedIds);
  };

  return (
    <>
      <PageHeader
        title="Activadores rápidos"
        subtitle="Recuperador de videollamadas"
        action={
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-amber/20 text-accent-amber border border-accent-amber/40 font-medium uppercase shrink-0">
            Beta
          </span>
        }
      />

      <div className="p-3 md:p-4 space-y-3 min-w-0 max-w-full overflow-x-hidden text-sm">
        {usersError ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-300 text-sm">
            {usersError}
          </div>
        ) : null}

        <VideoRecoveryFilters
          values={values}
          users={users}
          loading={previewLoading || usersLoading}
          onChange={(next) => setValues((prev) => ({ ...prev, ...next }))}
          onSubmit={handleSearchPreview}
        />

        {globalError || previewError || executeError ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-300 text-sm">
            {globalError ?? previewError ?? executeError}
          </div>
        ) : null}

        {uiState === "loadingPreview" ? (
          <div className="rounded-xl border border-surface-500 bg-surface-800/80 p-4 text-gray-300">
            Buscando reuniones...
          </div>
        ) : null}

        {uiState !== "idle" && uiState !== "loadingPreview" && previewItems.length === 0 ? (
          <div className="rounded-xl border border-surface-500 bg-surface-800/80 p-4 text-gray-300">
            No se encontraron reuniones para ese rango.
          </div>
        ) : null}

        {previewItems.length > 0 ? (
          <>
            <VideoRecoveryPreviewTable
              items={previewItems}
              selectedRecordingIds={selectedRecordingIds}
              actionOverrides={actionOverrides}
              estadoFilter={estadoFilter}
              actionFilter={actionFilter}
              onToggleSelection={handleToggleSelection}
              onSelectRecoverable={handleSelectRecoverable}
              onClearSelection={handleClearSelection}
              onSetBulkAction={handleBulkAction}
              onSetActionForRow={handleSetActionForRow}
              onChangeEstadoFilter={setEstadoFilter}
              onChangeActionFilter={setActionFilter}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-500 bg-surface-800/80 p-3">
              <p className="text-xs text-gray-300">
                Seleccionadas para ejecutar: <span className="text-white font-semibold">{selectedItems.length}</span>
              </p>
              <div className="flex items-center gap-2">
                {executing && progress ? (
                  <p className="text-xs text-gray-300">
                    Lote {progress.current} de {progress.total}
                  </p>
                ) : null}
                <Button type="button" onClick={handleExecuteSelected} disabled={executing || selectedItems.length === 0}>
                  Recuperar seleccionadas
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {executionResult ? (
          <VideoRecoveryExecutionResult
            result={executionResult}
            onRetryErrors={handleRetryErrors}
            retryDisabled={executing}
          />
        ) : null}
      </div>
    </>
  );
}

