"use client";

import { X } from 'lucide-react';
import { format } from 'date-fns';
import type { Lead } from '@/types';

export default function Lead360Drawer({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) {
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
          <section>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              Resumen de estado
            </h3>
            <div className="rounded-lg bg-surface-700 p-3 text-sm space-y-1">
              <p>
                <span className="text-gray-400">Asesor:</span>{' '}
                {lead.assignedAdvisorId || '—'}
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

          <section>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              Timeline unificado
            </h3>
            <div className="rounded-lg bg-surface-700 p-4 text-center">
              <p className="text-sm text-gray-400">
                El timeline unificado del lead estará disponible próximamente.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Consolidará datos de llamadas, videollamadas y chats desde la base de datos.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
