"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VideoRecoveryExecuteAggregate, VideoRecoveryExecuteItemResult } from "../types/videoRecovery.types";

interface VideoRecoveryExecutionResultProps {
  result: VideoRecoveryExecuteAggregate;
  onRetryErrors: () => void;
  retryDisabled: boolean;
}

function statusVariant(status: VideoRecoveryExecuteItemResult["status"]): "default" | "secondary" | "destructive" {
  if (status === "processed") return "default";
  if (status === "skipped") return "secondary";
  return "destructive";
}

export function VideoRecoveryExecutionResult({
  result,
  onRetryErrors,
  retryDisabled,
}: VideoRecoveryExecutionResultProps) {
  const errorCount = result.items.filter((item) => item.status === "error").length;

  return (
    <section className="rounded-xl border border-surface-500 bg-surface-800/80 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Resultado de ejecucion</h3>
        <Button type="button" variant="outline" size="sm" onClick={onRetryErrors} disabled={retryDisabled || errorCount === 0}>
          Reintentar solo errores
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="rounded-lg border border-surface-500 bg-surface-700/80 p-3">
          <p className="text-[11px] uppercase text-gray-400">processed</p>
          <p className="text-xl font-bold text-accent-cyan">{result.processed}</p>
        </div>
        <div className="rounded-lg border border-surface-500 bg-surface-700/80 p-3">
          <p className="text-[11px] uppercase text-gray-400">skipped</p>
          <p className="text-xl font-bold text-gray-200">{result.skipped}</p>
        </div>
        <div className="rounded-lg border border-surface-500 bg-surface-700/80 p-3">
          <p className="text-[11px] uppercase text-gray-400">errors</p>
          <p className="text-xl font-bold text-red-400">{result.errors}</p>
        </div>
      </div>

      <div className="overflow-auto border border-surface-500 rounded-lg">
        <table className="min-w-full text-xs">
          <thead className="bg-surface-700 text-gray-300">
            <tr>
              <th className="px-2 py-2 text-left">recording_id</th>
              <th className="px-2 py-2 text-left">action</th>
              <th className="px-2 py-2 text-left">status</th>
              <th className="px-2 py-2 text-left">estado_anterior</th>
              <th className="px-2 py-2 text-left">estado_final</th>
              <th className="px-2 py-2 text-left">motivo</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => (
              <tr key={`${item.recording_id}-${item.action}-${item.status}`} className="border-t border-surface-600">
                <td className="px-2 py-2 text-gray-200">{item.recording_id}</td>
                <td className="px-2 py-2 text-gray-300">{item.action}</td>
                <td className="px-2 py-2">
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                </td>
                <td className="px-2 py-2 text-gray-300">{item.estado_anterior ?? "-"}</td>
                <td className="px-2 py-2 text-gray-300">{item.estado_final ?? "-"}</td>
                <td className="px-2 py-2 text-gray-300">{item.motivo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

