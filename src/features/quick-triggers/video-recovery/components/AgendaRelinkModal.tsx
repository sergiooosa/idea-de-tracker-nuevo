"use client";

import { type ChangeEvent, type FormEvent, useCallback, useState } from "react";
import { Link2, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchAgenda, relinkRecording } from "../api/videoRecovery.api";
import type {
  AgendaSearchItem,
  MeetingSnapshot,
  VideoRecoveryPreviewItem,
} from "../types/videoRecovery.types";

interface AgendaRelinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: VideoRecoveryPreviewItem | null;
  idEvento: string;
  onRelinkSuccess: () => void;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("es-CO");
}

export function AgendaRelinkModal({
  open,
  onOpenChange,
  item,
  idEvento,
  onRelinkSuccess,
}: AgendaRelinkModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AgendaSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedAgenda, setSelectedAgenda] = useState<AgendaSearchItem | null>(null);
  const [relinking, setRelinking] = useState(false);
  const [relinkError, setRelinkError] = useState<string | null>(null);
  const [relinkSuccess, setRelinkSuccess] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setQuery("");
    setResults([]);
    setSearching(false);
    setSearchError(null);
    setSelectedAgenda(null);
    setRelinking(false);
    setRelinkError(null);
    setRelinkSuccess(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetState();
      onOpenChange(next);
    },
    [onOpenChange, resetState],
  );

  const handleSearch = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSelectedAgenda(null);
    setRelinkError(null);
    setRelinkSuccess(null);
    try {
      const response = await searchAgenda({ q: query.trim(), limit: 20 });
      setResults(response.items);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error buscando agendas";
      setSearchError(message);
    } finally {
      setSearching(false);
    }
  };

  const handleRelink = async (): Promise<void> => {
    if (!item || !selectedAgenda) return;
    setRelinking(true);
    setRelinkError(null);
    setRelinkSuccess(null);
    try {
      const snapshot: MeetingSnapshot = item.meeting_snapshot;
      const response = await relinkRecording({
        id_evento: idEvento,
        recording_id: item.recording_id,
        id_registro_agenda: selectedAgenda.id_registro_agenda,
        meeting_snapshot: snapshot,
      });
      setRelinkSuccess(
        `Vinculado: ${response.data.estado_anterior ?? "sin estado"} → ${response.data.estado_final ?? "vinculado"}`,
      );
      onRelinkSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al vincular";
      setRelinkError(message);
    } finally {
      setRelinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl bg-surface-900 border-surface-500 text-white">
        <DialogHeader>
          <DialogTitle>Vincular a cita existente</DialogTitle>
          <DialogDescription className="text-gray-400">
            {item
              ? `Grabación #${item.recording_id} — ${item.meeting_title ?? "Sin título"}`
              : "Selecciona una grabación"}
          </DialogDescription>
        </DialogHeader>

        {relinkSuccess ? (
          <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-green-300 text-sm">
            {relinkSuccess}
          </div>
        ) : (
          <>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Buscar por nombre, email o fecha..."
                value={query}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                className="flex-1 bg-surface-700 border-surface-500 text-white placeholder:text-gray-500"
              />
              <Button type="submit" variant="outline" size="sm" disabled={searching || !query.trim()}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </form>

            {searchError ? (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-300 text-sm">
                {searchError}
              </div>
            ) : null}

            {results.length > 0 ? (
              <div className="max-h-64 overflow-auto border border-surface-500 rounded-lg">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-surface-700 text-gray-300 sticky top-0">
                    <tr>
                      <th className="px-2 py-2">ID</th>
                      <th className="px-2 py-2">Lead</th>
                      <th className="px-2 py-2">Email</th>
                      <th className="px-2 py-2">Fecha</th>
                      <th className="px-2 py-2">Categoría</th>
                      <th className="px-2 py-2">Closer</th>
                      <th className="px-2 py-2">Vinculada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((agenda) => {
                      const isSelected =
                        selectedAgenda?.id_registro_agenda === agenda.id_registro_agenda;
                      const hasRecording = agenda.fathom_recording_id !== null;
                      return (
                        <tr
                          key={agenda.id_registro_agenda}
                          className={`border-t border-surface-600 cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-accent-cyan/20"
                              : "hover:bg-surface-700"
                          }`}
                          onClick={() => setSelectedAgenda(agenda)}
                        >
                          <td className="px-2 py-2 text-gray-200">{agenda.id_registro_agenda}</td>
                          <td className="px-2 py-2 text-gray-200">{agenda.nombre_de_lead ?? "-"}</td>
                          <td className="px-2 py-2 text-gray-300">{agenda.email_lead ?? "-"}</td>
                          <td className="px-2 py-2 text-gray-300">{formatDate(agenda.fecha)}</td>
                          <td className="px-2 py-2">
                            {agenda.categoria ? (
                              <Badge variant="outline">{agenda.categoria}</Badge>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-2 py-2 text-gray-300">{agenda.closer ?? "-"}</td>
                          <td className="px-2 py-2">
                            {hasRecording ? (
                              <Badge variant="secondary">#{agenda.fathom_recording_id}</Badge>
                            ) : (
                              <span className="text-gray-500">No</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {!searching && results.length === 0 && query.trim() && !searchError ? (
              <p className="text-gray-400 text-sm text-center py-2">
                No se encontraron citas. Intenta con otro término.
              </p>
            ) : null}

            {relinkError ? (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-300 text-sm">
                {relinkError}
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleRelink}
                disabled={!selectedAgenda || relinking}
              >
                {relinking ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                Vincular
                {selectedAgenda ? ` a #${selectedAgenda.id_registro_agenda}` : ""}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
