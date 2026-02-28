import { X, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { CallPhone } from '@/types';
import { outcomeLlamadaToSpanish } from '@/utils/outcomeLabels';

export default function ModalRegistrosLlamadas({
  registros,
  leadName,
  onClose,
  onVerTranscripcionIA,
}: {
  registros: CallPhone[];
  leadName: string;
  onClose: () => void;
  onVerTranscripcionIA?: (call: CallPhone) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-xl bg-surface-800 border border-surface-500 shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0">
          <h3 className="font-semibold text-white">Registros de llamadas · {leadName}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {registros.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay llamadas en el rango de fechas seleccionado.</p>
          ) : (
            <ul className="space-y-3">
              {registros.map((c) => {
                const contesto = c.outcome === 'answered' || c.outcome === 'completed';
                return (
                  <li key={c.id} className="rounded-lg bg-surface-700 p-3 text-sm border-l-4 border-accent-cyan">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-medium text-white">
                        {format(new Date(c.datetime), 'dd/MM/yyyy HH:mm')}
                      </span>
                      <span className={contesto ? 'text-accent-green' : 'text-accent-red'}>
                        {outcomeLlamadaToSpanish(c.outcome)}
                      </span>
                      {c.duration > 0 && (
                        <span className="text-gray-400">Duración: {c.duration}s</span>
                      )}
                    </div>
                    {c.notes && <p className="mt-2 text-gray-300">Qué se habló: {c.notes}</p>}
                    {c.objections && c.objections.length > 0 && (
                      <p className="mt-1 text-xs text-accent-amber">Objeciones: {c.objections.join(', ')}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {onVerTranscripcionIA && (
                        <button
                          type="button"
                          onClick={() => onVerTranscripcionIA(c)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent-cyan/20 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/30"
                        >
                          <FileText className="w-3.5 h-3.5" /> Transcripción y análisis IA
                        </button>
                      )}
                      {c.recordingUrl ? (
                        <a
                          href={c.recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent-green/20 text-accent-green text-xs font-medium hover:bg-accent-green/30"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Ver grabación
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-600 text-gray-500 text-xs">
                          <ExternalLink className="w-3.5 h-3.5" /> Sin grabación
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
