"use client";

import React, { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Users, MessageSquare, Phone, Calendar, HelpCircle } from "lucide-react";
import { useApiData } from "@/hooks/useApiData";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import PageHeader from "@/components/dashboard/PageHeader";
import KpiTooltip from "@/components/dashboard/KpiTooltip";
import LeadJourneyDetail from "@/components/dashboard/LeadJourneyDetail";
import type { UnifiedLeadsResponse, UnifiedLead, JourneyStage } from "@/types";

const STAGE_CONFIG: Record<JourneyStage, { label: string; color: string; icon: React.ElementType }> = {
  solo_chat: { label: "Solo chat", color: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: MessageSquare },
  chat_llamada: { label: "Chat + Llamada", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: Phone },
  cita: { label: "Cita", color: "bg-green-500/20 text-green-300 border-green-500/30", icon: Calendar },
};

type StageFilter = "todos" | JourneyStage;

function StageBadge({ stage }: { stage: JourneyStage }) {
  const cfg = STAGE_CONFIG[stage];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function formatDt(iso: string): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd MMM HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

const kpiTooltips = {
  total: {
    significado: "Total de leads únicos que interactuaron por cualquier canal en el período.",
    calculo: "Unión de leads de chats_logs, log_llamadas y resumenes_diarios_agendas, deduplicados por email, teléfono o GHL ID.",
  },
  soloChat: {
    significado: "Leads que solo tienen conversaciones de chat, sin llamadas ni citas.",
    calculo: "Leads con al menos un chat pero sin registros en log_llamadas ni resumenes_diarios_agendas.",
  },
  chatLlamada: {
    significado: "Leads que avanzaron del chat a una llamada telefónica.",
    calculo: "Leads con al menos un registro en log_llamadas (con o sin chat), pero sin citas.",
  },
  cita: {
    significado: "Leads que llegaron hasta una cita (videollamada agendada).",
    calculo: "Leads con al menos un registro en resumenes_diarios_agendas.",
  },
};

export default function LeadsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
  const [dateFrom, setDateFrom] = useState(weekAgo);
  const [dateTo, setDateTo] = useState(today);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("todos");
  const [selectedLead, setSelectedLead] = useState<UnifiedLead | null>(null);

  const { data, loading, error } = useApiData<UnifiedLeadsResponse>(
    "/api/data/leads-unified",
    { from: dateFrom, to: dateTo },
  );

  const filtered = useMemo(() => {
    if (!data?.leads) return [];
    let list = data.leads;
    if (stageFilter !== "todos") {
      list = list.filter((l) => l.journeyStage === stageFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q)) ||
          (l.advisor && l.advisor.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [data, stageFilter, search]);

  const agg = data?.agg ?? { total: 0, soloChat: 0, chatLlamada: 0, cita: 0 };

  return (
    <>
      <PageHeader
        title="Recorrido de leads"
        subtitle="Vista unificada del journey de cada lead — chat, llamada y cita en un solo lugar"
      />

      <div className="px-4 md:px-6 py-4 space-y-4">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total leads" value={agg.total} tooltip={kpiTooltips.total} icon={Users} color="text-white" />
          <KpiCard label="Solo chat" value={agg.soloChat} tooltip={kpiTooltips.soloChat} icon={MessageSquare} color="text-blue-400" />
          <KpiCard label="Chat + Llamada" value={agg.chatLlamada} tooltip={kpiTooltips.chatLlamada} icon={Phone} color="text-amber-400" />
          <KpiCard label="Cita" value={agg.cita} tooltip={kpiTooltips.cita} icon={Calendar} color="text-green-400" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onRange={(f, t) => { setDateFrom(f); setDateTo(t); }}
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-lg bg-surface-700 border border-surface-500 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan w-52"
            />
          </div>
          <div className="flex gap-1">
            {(["todos", "solo_chat", "chat_llamada", "cita"] as StageFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStageFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  stageFilter === s
                    ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
                    : "bg-surface-700 text-gray-400 border border-surface-500 hover:text-white"
                }`}
              >
                {s === "todos" ? "Todos" : STAGE_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading && !data && (
          <div className="text-center py-12 text-gray-400">Cargando leads...</div>
        )}
        {error && (
          <div className="text-center py-12 text-red-400">Error: {error}</div>
        )}
        {data && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No se encontraron leads en este período.
          </div>
        )}
        {data && filtered.length > 0 && (
          <div className="rounded-xl border border-surface-500 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-700/60 border-b border-surface-500">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Lead</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Etapa</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Asesor</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">
                      <MessageSquare className="w-4 h-4 inline" />
                    </th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">
                      <Phone className="w-4 h-4 inline" />
                    </th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">
                      <Calendar className="w-4 h-4 inline" />
                    </th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Última actividad</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="border-b border-surface-500/40 hover:bg-surface-700/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{lead.name}</div>
                        <div className="text-xs text-gray-500">
                          {lead.email ?? lead.phone ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StageBadge stage={lead.journeyStage} />
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {lead.advisor ?? <span className="text-gray-500">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">
                        {lead.chats.length > 0 ? lead.chats.length : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">
                        {lead.calls.length > 0 ? lead.calls.length : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">
                        {lead.appointments.length > 0 ? lead.appointments.length : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {formatDt(lead.lastActivity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedLead && (
        <LeadJourneyDetail lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </>
  );
}

function KpiCard({
  label,
  value,
  tooltip,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  tooltip: { significado: string; calculo: string };
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-surface-700/60 border border-surface-500/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Icon className={`w-4 h-4 ${color}`} />
          {label}
        </div>
        <KpiTooltip significado={tooltip.significado} calculo={tooltip.calculo} />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}
