import { useState } from 'react';
import { X, FileText, Sparkles, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { VideoMeeting } from '@/types';
import { outcomeVideollamadaToSpanish } from '@/utils/outcomeLabels';

const fm = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${n.toLocaleString('es-CO')}`);

type Tab = 'transcripcion' | 'ia';

export default function ModalTranscripcionIA({
  meeting,
  onClose,
}: {
  meeting: VideoMeeting;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('transcripcion');

  const transcriptContent =
    meeting.notes ?? 'Transcripción de la videollamada. Se presentó la oferta y se resolvieron dudas.';
  const iaContent =
    meeting.notes ?? `Reunión ${meeting.attended ? 'asistida' : 'no asistida'}. Resultado: ${outcomeVideollamadaToSpanish(meeting.outcome)}.${meeting.amountBought ? ` Monto: $${meeting.amountBought.toLocaleString('es-CO')}` : ''}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] rounded-xl bg-surface-800 border border-accent-cyan/30 shadow-2xl shadow-accent-cyan/10 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0 bg-surface-700/50">
          <h3 className="font-semibold text-white">
            {format(new Date(meeting.datetime), "dd/MM/yyyy 'a las' HH:mm")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Transcripción | Análisis IA */}
        <div className="flex border-b border-surface-500 shrink-0">
          <button
            type="button"
            onClick={() => setTab('transcripcion')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              tab === 'transcripcion'
                ? 'text-accent-cyan border-b-2 border-accent-cyan bg-accent-cyan/10'
                : 'text-gray-400 hover:text-white hover:bg-surface-700/50'
            }`}
          >
            <FileText className="w-4 h-4" /> Transcripción
          </button>
          <button
            type="button"
            onClick={() => setTab('ia')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              tab === 'ia'
                ? 'text-accent-purple border-b-2 border-accent-purple bg-accent-purple/10'
                : 'text-gray-400 hover:text-white hover:bg-surface-700/50'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Análisis IA
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {tab === 'transcripcion' && (
            <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {transcriptContent}
            </div>
          )}
          {tab === 'ia' && (
            <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {iaContent}
            </div>
          )}
        </div>

        {/* Ver grabación */}
        <div className="p-4 border-t border-surface-500 shrink-0 bg-surface-700/30">
          {meeting.recordingUrl ? (
            <a
              href={meeting.recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-green/20 border border-accent-green/50 text-accent-green font-medium text-sm hover:bg-accent-green/30 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Ver grabación de la videollamada
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-600 text-gray-500 text-sm">
              <ExternalLink className="w-4 h-4" /> Sin grabación disponible
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
