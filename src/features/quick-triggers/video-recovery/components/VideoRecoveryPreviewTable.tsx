"use client";

import type { ChangeEvent } from "react";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SuggestedAction, VideoRecoveryPreviewItem } from "../types/videoRecovery.types";
import { getLocalAction } from "../utils/videoRecovery.mappers";

interface VideoRecoveryPreviewTableProps {
  items: VideoRecoveryPreviewItem[];
  selectedRecordingIds: Set<number>;
  actionOverrides: Map<number, SuggestedAction>;
  estadoFilter: string;
  actionFilter: "all" | SuggestedAction;
  onToggleSelection: (recordingId: number) => void;
  onSelectRecoverable: () => void;
  onClearSelection: () => void;
  onSetBulkAction: (action: SuggestedAction) => void;
  onSetActionForRow: (recordingId: number, action: SuggestedAction) => void;
  onChangeEstadoFilter: (next: string) => void;
  onChangeActionFilter: (next: "all" | SuggestedAction) => void;
}

function actionVariant(action: SuggestedAction): "default" | "secondary" | "outline" {
  if (action === "recover_existing") return "default";
  if (action === "create_if_missing") return "secondary";
  return "outline";
}

function estadoVariant(estado: string): "default" | "secondary" | "outline" | "destructive" {
  const normalized = estado.toLowerCase();
  if (normalized.includes("pendiente") || normalized.includes("no_show")) return "default";
  if (normalized.includes("procesad") || normalized.includes("ok")) return "secondary";
  if (normalized.includes("error")) return "destructive";
  return "outline";
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("es-CO");
}

export function VideoRecoveryPreviewTable({
  items,
  selectedRecordingIds,
  actionOverrides,
  estadoFilter,
  actionFilter,
  onToggleSelection,
  onSelectRecoverable,
  onClearSelection,
  onSetBulkAction,
  onSetActionForRow,
  onChangeEstadoFilter,
  onChangeActionFilter,
}: VideoRecoveryPreviewTableProps) {
  const estados = Array.from(new Set(items.map((item) => item.estado_bd_actual))).sort();

  const filteredItems = items.filter((item) => {
    const localAction = getLocalAction(item, actionOverrides);
    const matchesEstado = estadoFilter === "all" || item.estado_bd_actual === estadoFilter;
    const matchesAction = actionFilter === "all" || localAction === actionFilter;
    return matchesEstado && matchesAction;
  });

  return (
    <section className="rounded-xl border border-surface-500 bg-surface-800/80 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <h3 className="text-sm font-semibold text-white">Previsualizacion ({filteredItems.length})</h3>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onSelectRecoverable}>
            Seleccionar todo recuperable
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClearSelection}>
            Limpiar seleccion
          </Button>
          <select
            className="h-8 rounded-md border border-surface-500 bg-surface-700 px-2 text-xs text-white"
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onSetBulkAction(event.target.value as SuggestedAction)
            }
            defaultValue=""
          >
            <option value="" disabled>
              Accion masiva
            </option>
            <option value="recover_existing">recover_existing</option>
            <option value="create_if_missing">create_if_missing</option>
            <option value="skip">skip</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="text-xs text-gray-300 flex items-center gap-2">
          Estado:
          <select
            className="h-8 rounded-md border border-surface-500 bg-surface-700 px-2 text-xs text-white"
            value={estadoFilter}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onChangeEstadoFilter(event.target.value)
            }
          >
            <option value="all">all</option>
            {estados.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-gray-300 flex items-center gap-2">
          Accion:
          <select
            className="h-8 rounded-md border border-surface-500 bg-surface-700 px-2 text-xs text-white"
            value={actionFilter}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onChangeActionFilter(event.target.value as "all" | SuggestedAction)
            }
          >
            <option value="all">all</option>
            <option value="recover_existing">recover_existing</option>
            <option value="create_if_missing">create_if_missing</option>
            <option value="skip">skip</option>
          </select>
        </label>
      </div>

      <div className="overflow-auto border border-surface-500 rounded-lg">
        <table className="min-w-full text-xs text-left">
          <thead className="bg-surface-700 text-gray-300">
            <tr>
              <th className="px-2 py-2">Seleccion</th>
              <th className="px-2 py-2">recording_id</th>
              <th className="px-2 py-2">meeting_title</th>
              <th className="px-2 py-2">scheduled_start_time</th>
              <th className="px-2 py-2">lead_email_detected</th>
              <th className="px-2 py-2">estado_bd_actual</th>
              <th className="px-2 py-2">accion_sugerida</th>
              <th className="px-2 py-2">motivo</th>
              <th className="px-2 py-2">share_url</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const action = getLocalAction(item, actionOverrides);
              const checked = selectedRecordingIds.has(item.recording_id);
              return (
                <tr key={item.recording_id} className="border-t border-surface-600">
                  <td className="px-2 py-2">
                    <input
                      aria-label={`Seleccionar recording ${item.recording_id}`}
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSelection(item.recording_id)}
                    />
                  </td>
                  <td className="px-2 py-2 text-gray-200">{item.recording_id}</td>
                  <td className="px-2 py-2 text-gray-200">{item.meeting_title ?? "-"}</td>
                  <td className="px-2 py-2 text-gray-300">{formatDateTime(item.scheduled_start_time)}</td>
                  <td className="px-2 py-2 text-gray-300">{item.lead_email_detected ?? "-"}</td>
                  <td className="px-2 py-2">
                    <Badge variant={estadoVariant(item.estado_bd_actual)}>{item.estado_bd_actual}</Badge>
                  </td>
                  <td className="px-2 py-2 space-y-1">
                    <Badge variant={actionVariant(action)}>{action}</Badge>
                    <select
                      className="w-full h-8 rounded-md border border-surface-500 bg-surface-700 px-2 text-xs text-white"
                      value={action}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        onSetActionForRow(item.recording_id, event.target.value as SuggestedAction)
                      }
                    >
                      <option value="recover_existing">recover_existing</option>
                      <option value="create_if_missing">create_if_missing</option>
                      <option value="skip">skip</option>
                    </select>
                  </td>
                  <td className="px-2 py-2 text-gray-300 max-w-[280px]">
                    <span title={item.motivo}>{item.motivo}</span>
                  </td>
                  <td className="px-2 py-2">
                    {item.share_url ? (
                      <a
                        href={item.share_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-accent-cyan hover:underline"
                      >
                        Abrir <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

