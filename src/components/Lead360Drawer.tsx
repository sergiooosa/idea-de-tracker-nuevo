import { X } from 'lucide-react';
import { format } from 'date-fns';
import type { Lead, CallPhone, VideoMeeting, ChatEvent } from '@/types';
import {
  getCallsByLead,
  getMeetingsByLead,
  getChatEventsByLead,
  getAdvisorById,
} from '@/data/mockData';

const emojiLabel: Record<string, string> = {
  '👍': 'Calificado',
  '👎': 'No calificado',
  '💡': 'Interesado',
  '💰': 'Compró',
  '⏳': 'Pendiente',
  '💬': 'Chat',
};

export default function Lead360Drawer({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) {
  const calls = getCallsByLead(lead.id);
  const meetings = getMeetingsByLead(lead.id);
  const chats = getChatEventsByLead(lead.id);

  type TimelineItem = {
    type: 'call' | 'meeting' | 'chat';
    datetime: string;
    label: string;
    detail: string;
    outcome?: string;
    notes?: string;
    tags: string[];
  };

  const items: TimelineItem[] = [
    ...calls.map((c: CallPhone) => ({
      type: 'call' as const,
      datetime: c.datetime,
      label: 'Llamada',
      detail: `${c.duration}s · ${c.outcome}`,
      outcome: c.outcome,
      notes: c.notes,
      tags: c.tags,
    })),
    ...meetings.map((m: VideoMeeting) => ({
      type: 'meeting' as const,
      datetime: m.datetime,
      label: 'Videollamada',
      detail: m.attended ? (m.amountBought ? `Asistió · $${(m.amountBought / 1e6).toFixed(2)}M` : 'Asistió') : 'No asistió',
      outcome: m.outcome,
      notes: m.notes,
      tags: m.tags,
    })),
    ...chats.map((e: ChatEvent) => ({
      type: 'chat' as const,
      datetime: e.datetime,
      label: 'Chat',
      detail: e.emojiStatus ? emojiLabel[e.emojiStatus] || e.emojiStatus : 'Contactado',
      outcome: undefined,
      notes: e.notes,
      tags: e.tags,
    })),
  ].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

  const advisor = getAdvisorById(lead.assignedAdvisorId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative w-full md:max-w-2xl ml-auto h-full bg-surface-800 border-l border-surface-500 shadow-2xl flex flex-col animate-fade-in overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0">
          <div>
            <h2 className="font-display font-semibold text-lg text-white">
              Lead 360 · {lead.name}
            </h2>
            <p className="text-sm text-gray-400">ID: {lead.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Resumen de estado */}
          <section>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              Resumen de estado
            </h3>
            <div className="rounded-lg bg-surface-700 p-3 text-sm space-y-1">
              <p>
                <span className="text-gray-400">Asesor:</span>{' '}
                {advisor?.name ?? lead.assignedAdvisorId}
              </p>
              <p>
                <span className="text-gray-400">Estado:</span>{' '}
                <span className="capitalize">{lead.status.replace('_', ' ')}</span>
              </p>
              {(lead.utm_source || lead.ad_name) && (
                <p>
                  <span className="text-gray-400">Origen:</span>{' '}
                  {[lead.utm_source, lead.utm_campaign, lead.ad_name]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
              {lead.lastContactAt && (
                <p>
                  <span className="text-gray-400">Último contacto:</span>{' '}
                  {format(new Date(lead.lastContactAt), 'dd/MM/yy HH:mm')}
                </p>
              )}
            </div>
          </section>

          {/* Notas internas */}
          <section>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              Notas internas
            </h3>
            <textarea
              className="w-full rounded-lg bg-surface-700 border border-surface-500 p-3 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan min-h-[80px]"
              placeholder="Añadir nota..."
              defaultValue={lead.notes}
            />
          </section>

          {/* Timeline unificado */}
          <section>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              Timeline unificado
            </h3>
            <ul className="space-y-3">
              {items.map((item, i) => (
                <li
                  key={`${item.type}-${item.datetime}-${i}`}
                  className="flex gap-3 rounded-lg bg-surface-700 p-3 border-l-4 border-surface-500"
                >
                  <div className="text-xs text-gray-400 shrink-0">
                    {format(new Date(item.datetime), 'dd/MM/yy HH:mm')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{item.label}</p>
                    <p className="text-sm text-gray-400">{item.detail}</p>
                    {item.outcome && (
                      <p className="text-xs text-accent-cyan mt-1">Outcome: {item.outcome}</p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                    )}
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded text-xs bg-surface-600 text-gray-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
