'use client';

// AUT-1395 — Panel de leads con teléfono/correo para reactivación
// Se abre al hacer clic en métricas del reporte (en limbo, sin acción)

import { useState, useEffect, useCallback } from 'react';
import { X, Phone, Mail, Copy, Check, ExternalLink, Loader2, Users } from 'lucide-react';
import type { LeadContacto } from '@/app/api/data/report/leads-segmento/route';

type Segmento = 'enLimbo' | 'sinAccion';

interface Props {
  open: boolean;
  onClose: () => void;
  segmento: Segmento;
  titulo: string;
  from: string;
  to: string;
}

const SEGMENTO_LABEL: Record<Segmento, string> = {
  enLimbo: 'en limbo (sin actividad reciente)',
  sinAccion: 'sin ninguna acción',
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1 rounded text-gray-500 hover:text-gray-300 transition-colors"
      aria-label="Copiar"
    >
      {copied ? (
        <Check className="w-3 h-3 text-accent-green" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  );
}

function LeadRow({ lead }: { lead: LeadContacto }) {
  return (
    <div className="rounded-lg border border-surface-500/40 bg-surface-700/40 px-3 py-2.5 space-y-1.5">
      {/* Nombre + asesor */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{lead.nombre}</p>
          {lead.asesor && (
            <p className="text-[10px] text-gray-500 truncate">{lead.asesor}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {lead.diasSinActividad !== undefined && (
            <span className="text-[10px] font-semibold text-accent-amber">
              {lead.diasSinActividad}d
            </span>
          )}
          {lead.ghlContactId && (
            <a
              href={`https://app.gohighlevel.com/contacts/${lead.ghlContactId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded text-gray-500 hover:text-accent-cyan transition-colors"
              title="Ver en GHL"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Teléfono + correo */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {lead.telefono ? (
          <div className="flex items-center gap-1">
            <Phone className="w-3 h-3 text-gray-500 shrink-0" />
            <span className="text-xs text-gray-300">{lead.telefono}</span>
            <CopyButton value={lead.telefono} />
          </div>
        ) : (
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <Phone className="w-3 h-3" /> Sin teléfono
          </span>
        )}
        {lead.email ? (
          <div className="flex items-center gap-1">
            <Mail className="w-3 h-3 text-gray-500 shrink-0" />
            <span className="text-xs text-gray-300 truncate max-w-[180px]">{lead.email}</span>
            <CopyButton value={lead.email} />
          </div>
        ) : (
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <Mail className="w-3 h-3" /> Sin correo
          </span>
        )}
      </div>
    </div>
  );
}

export default function LeadsContactoPanel({ open, onClose, segmento, titulo, from, to }: Props) {
  const [leads, setLeads] = useState<LeadContacto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setLeads([]);

    const url = `/api/data/report/leads-segmento?from=${from}&to=${to}&segmento=${segmento}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setLeads(data.leads ?? []);
          setTotal(data.total ?? 0);
        }
      })
      .catch(() => setError('Error al cargar los leads'))
      .finally(() => setLoading(false));
  }, [open, from, to, segmento]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-surface-800 border border-surface-500/60 shadow-2xl mx-0 sm:mx-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-surface-500/40 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 text-accent-cyan shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{titulo}</p>
              <p className="text-[10px] text-gray-500">
                Leads {SEGMENTO_LABEL[segmento]}
                {total > 0 && ` · ${total}${total === 100 ? '+' : ''} leads`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-600/60 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-accent-cyan animate-spin" />
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-900/20 border border-red-800/40 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
          {!loading && !error && leads.length === 0 && (
            <div className="text-center py-12 text-xs text-gray-500">
              No se encontraron leads en este segmento
            </div>
          )}
          {leads.map((lead, i) => (
            <LeadRow key={i} lead={lead} />
          ))}
        </div>

        {total === 100 && !loading && (
          <div className="px-4 py-2 border-t border-surface-500/40 shrink-0">
            <p className="text-[10px] text-gray-500 text-center">
              Mostrando los primeros 100 leads. Exporta el reporte para ver todos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
