import { X, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { VideoMeeting } from '@/types';
import { outcomeVideollamadaToSpanish } from '@/utils/outcomeLabels';

const fm = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${n.toLocaleString('es-CO')}`);

export default function ModalRegistrosVideollamadas({
  registros,
  leadName,
  onClose,
  onVerTranscripcionIA,
}: {
  registros: VideoMeeting[];
  leadName: string;
  onClose: () => void;
  onVerTranscripcionIA?: (meeting: VideoMeeting) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-xl bg-surface-800 border border-surface-500 shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0">
          <h3 className="font-semibold text-white">Videollamadas · {leadName}</h3>
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
            <p className="text-gray-400 text-sm">No hay videollamadas en el rango de fechas seleccionado.</p>
          ) : (
            <ul className="space-y-3">
              {registros.map((m) => (
                <li key={m.id} className="rounded-lg bg-surface-700 p-3 text-sm border-l-4 border-accent-purple">
                  <div className="grid gap-1.5">
                    <div className="font-medium text-white">
                      Fecha: {format(new Date(m.datetime), "dd/MM/yyyy 'a las' HH:mm")}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-300">
                      <span>Asistió: <strong className={m.attended ? 'text-accent-green' : 'text-accent-red'}>{m.attended ? 'Sí' : 'No'}</strong></span>
                      <span>Compró: <strong className={(m.amountBought ?? 0) > 0 ? 'text-accent-green' : 'text-gray-400'}>{(m.amountBought ?? 0) > 0 ? 'Sí' : 'No'}</strong></span>
                      {m.canceled && <span className="text-accent-red">Cancelada</span>}
                    </div>
                    <div className="text-gray-400">
                      Qué pasó: {outcomeVideollamadaToSpanish(m.outcome)}
                      {(m.amountBought != null && m.amountBought > 0) && ` · Monto: ${fm(m.amountBought)}`}
                    </div>
                    {m.notes && <p className="text-gray-500 text-xs mt-1">Notas: {m.notes}</p>}
                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-surface-500">
                      {onVerTranscripcionIA && (
                        <button
                          type="button"
                          onClick={() => onVerTranscripcionIA(m)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent-cyan/20 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/30"
                        >
                          <FileText className="w-3.5 h-3.5" /> Transcripción y análisis IA
                        </button>
                      )}
                      {m.recordingUrl ? (
                        <a
                          href={m.recordingUrl}
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
