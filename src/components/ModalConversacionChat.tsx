import { X } from 'lucide-react';
import { format } from 'date-fns';
import type { ChatEvent } from '@/types';

export default function ModalConversacionChat({
  leadName,
  events,
  onClose,
}: {
  leadName: string;
  events: ChatEvent[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-xl bg-surface-800 border border-surface-500 shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0">
          <h3 className="font-semibold text-white">Conversación · {leadName}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {events.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay mensajes en esta conversación.</p>
          ) : (
            <ul className="space-y-3">
              {events.map((evt) => (
                <li
                  key={evt.id}
                  className="rounded-lg bg-surface-700 p-3 text-sm border-l-4 border-accent-cyan"
                >
                  <div className="flex flex-wrap items-center gap-2 text-gray-400 text-xs mb-1">
                    <span>{format(new Date(evt.datetime), "dd/MM/yyyy 'a las' HH:mm")}</span>
                    {evt.emojiStatus && <span className="text-base">{evt.emojiStatus}</span>}
                    {evt.qualified && <span className="text-accent-green">Calificado</span>}
                    {evt.contacted && <span className="text-accent-cyan">Contactado</span>}
                  </div>
                  {evt.notes ? (
                    <p className="text-gray-300 whitespace-pre-wrap">{evt.notes}</p>
                  ) : (
                    <p className="text-gray-500 italic">Sin notas</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
