"use client";

import { useState, useMemo } from "react";
import {
  X,
  Phone,
  Video,
  MessageSquare,
  User,
  Clock,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Filter,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useApiData } from "@/hooks/useApiData";
import HelpTooltip from "@/components/dashboard/HelpTooltip";
import type {
  AsesorResponse,
  AsesorLeadCRM,
  AsesorVideollamada,
  AsesorChat,
  AsesorChatMessage,
} from "@/types";

type Tab = "contestaron" | "interesados" | "agendaron" | "todos";

interface Props {
  advisorName: string;
  advisorEmail: string | null;
  dateFrom: string;
  dateTo: string;
  onClose: () => void;
}

function KpiMini({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-surface-700 px-3 py-2 text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yy HH:mm");
  } catch {
    return d;
  }
}

function estadoLabel(estado: AsesorLeadCRM["estadoNormalizado"]): string {
  const map: Record<string, string> = {
    pendiente: "Pendiente",
    no_contesto: "No contestó",
    buzon: "Buzón",
    seguimiento: "Seguimiento",
    interesado: "Interesado",
    programado: "Programado",
    calificada: "Calificada",
    no_calificada: "No calificada",
    cerrada: "Cerrada",
    no_interesado: "No interesado",
    otro: "Otro",
  };
  return map[estado] ?? estado;
}

function estadoColor(estado: AsesorLeadCRM["estadoNormalizado"]): string {
  const map: Record<string, string> = {
    pendiente: "bg-gray-500/20 text-gray-400",
    no_contesto: "bg-accent-red/20 text-accent-red",
    buzon: "bg-accent-amber/20 text-accent-amber",
    seguimiento: "bg-accent-cyan/20 text-accent-cyan",
    interesado: "bg-accent-purple/20 text-accent-purple",
    programado: "bg-accent-amber/20 text-accent-amber",
    calificada: "bg-accent-green/20 text-accent-green",
    no_calificada: "bg-accent-red/20 text-accent-red",
    cerrada: "bg-accent-green/20 text-accent-green",
    no_interesado: "bg-gray-500/20 text-gray-400",
    otro: "bg-gray-500/20 text-gray-400",
  };
  return map[estado] ?? "bg-gray-500/20 text-gray-400";
}

interface LeadUnificado {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  estado: string | null;
  estadoNormalizado: AsesorLeadCRM["estadoNormalizado"];
  intentosContacto: number;
  speedToLead: string;
  notasLlamadas: { date: string; text: string }[];
  videollamadas: AsesorVideollamada[];
  chats: AsesorChat[];
  contestado: boolean;
  interesado: boolean;
  agendado: boolean;
}

function unificarLeads(
  leads: AsesorLeadCRM[],
  videollamadas: AsesorVideollamada[],
  chats: AsesorChat[],
): LeadUnificado[] {
  const map = new Map<string, LeadUnificado>();

  for (const lead of leads) {
    const key = (lead.email ?? lead.phone ?? lead.name).toLowerCase();
    const contestado =
      lead.estadoNormalizado !== "pendiente" &&
      lead.estadoNormalizado !== "no_contesto" &&
      lead.estadoNormalizado !== "buzon";
    const interesado =
      lead.estadoNormalizado === "interesado" ||
      lead.estadoNormalizado === "programado" ||
      lead.estadoNormalizado === "calificada" ||
      lead.estadoNormalizado === "cerrada";

    map.set(key, {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      estado: lead.estado,
      estadoNormalizado: lead.estadoNormalizado,
      intentosContacto: lead.intentosContacto,
      speedToLead: lead.speedToLead,
      notasLlamadas: lead.notasLlamadas,
      videollamadas: [],
      chats: [],
      contestado,
      interesado,
      agendado: false,
    });
  }

  for (const vl of videollamadas) {
    const key = (
      vl.leadEmail ??
      vl.leadName ??
      ""
    ).toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.videollamadas.push(vl);
      existing.agendado = true;
    } else {
      map.set(key, {
        id: `vl-${vl.id}`,
        name: vl.leadName ?? "—",
        email: vl.leadEmail,
        phone: null,
        estado: vl.categoria,
        estadoNormalizado: "programado",
        intentosContacto: 0,
        speedToLead: "—",
        notasLlamadas: [],
        videollamadas: [vl],
        chats: [],
        contestado: true,
        interesado: true,
        agendado: true,
      });
    }
  }

  for (const chat of chats) {
    const key = (
      chat.leadEmail ??
      chat.leadName ??
      ""
    ).toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.chats.push(chat);
    } else {
      map.set(key, {
        id: `chat-${chat.chatId}`,
        name: chat.leadName ?? "—",
        email: chat.leadEmail,
        phone: null,
        estado: chat.estado,
        estadoNormalizado: "pendiente",
        intentosContacto: 0,
        speedToLead: "—",
        notasLlamadas: [],
        videollamadas: [],
        chats: [chat],
        contestado: chat.respondido,
        interesado: false,
        agendado: false,
      });
    }
  }

  return Array.from(map.values());
}

function LeadContactCard({
  lead,
  onBack,
}: {
  lead: LeadUnificado;
  onBack: () => void;
}) {
  const [chatExpanded, setChatExpanded] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white mb-3 self-start"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Volver al listado
      </button>

      {/* Header */}
      <div className="rounded-lg bg-surface-700 p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-accent-cyan" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-sm truncate">
              {lead.name}
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-400">
              {lead.email && <span>{lead.email}</span>}
              {lead.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {lead.phone}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${estadoColor(lead.estadoNormalizado)}`}
              >
                {estadoLabel(lead.estadoNormalizado)}
              </span>
              {lead.intentosContacto > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-surface-600 text-gray-300">
                  <PhoneCall className="w-3 h-3" /> {lead.intentosContacto}{" "}
                  intentos
                </span>
              )}
              {lead.speedToLead !== "—" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-surface-600 text-gray-300">
                  <Clock className="w-3 h-3" /> {lead.speedToLead}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Llamadas */}
      {lead.notasLlamadas.length > 0 && (
        <section className="mb-4">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            <Phone className="w-3.5 h-3.5" /> Llamadas (
            {lead.notasLlamadas.length})
          </h4>
          <div className="space-y-1.5">
            {lead.notasLlamadas.map((nota, i) => (
              <div
                key={`${nota.date}-${i}`}
                className="rounded-lg bg-surface-700 px-3 py-2 text-xs"
              >
                <span className="text-gray-500">{formatDate(nota.date)}</span>
                <p className="text-gray-300 mt-0.5">{nota.text || "—"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Videollamadas */}
      {lead.videollamadas.length > 0 && (
        <section className="mb-4">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            <Video className="w-3.5 h-3.5" /> Videollamadas (
            {lead.videollamadas.length})
          </h4>
          <div className="space-y-1.5">
            {lead.videollamadas.map((vl) => (
              <div
                key={vl.id}
                className="rounded-lg bg-surface-700 px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">
                    {formatDate(vl.fechaReunion)}
                  </span>
                  <span className="text-accent-purple text-[10px] uppercase">
                    {vl.categoria}
                  </span>
                </div>
                {vl.resumenIa && (
                  <p className="text-gray-300 mt-1 whitespace-pre-wrap line-clamp-4">
                    {vl.resumenIa}
                  </p>
                )}
                {vl.fathomUrl && (
                  <a
                    href={vl.fathomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-cyan hover:underline text-[10px] mt-1 inline-block"
                  >
                    Ver grabación
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chats */}
      {lead.chats.length > 0 && (
        <section className="mb-4">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            <MessageSquare className="w-3.5 h-3.5" /> Chats ({lead.chats.length}
            )
          </h4>
          <div className="space-y-1.5">
            {lead.chats.map((chat) => {
              const isOpen = chatExpanded === chat.chatId;
              return (
                <div
                  key={chat.chatId}
                  className="rounded-lg bg-surface-700 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setChatExpanded(isOpen ? null : chat.chatId)
                    }
                    className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-surface-600"
                  >
                    <span className="text-gray-300">
                      {formatDate(chat.fechaUltimoMensaje)} ·{" "}
                      {chat.messages.length} msgs
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-1.5 max-h-60 overflow-y-auto border-t border-surface-600">
                      {chat.messages.map((msg, mi) => (
                        <ChatBubble key={mi} msg={msg} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {lead.notasLlamadas.length === 0 &&
        lead.videollamadas.length === 0 &&
        lead.chats.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-6">
            Sin interacciones registradas para este lead.
          </p>
        )}
    </div>
  );
}

function ChatBubble({ msg }: { msg: AsesorChatMessage }) {
  const isLead = msg.role === "lead";
  return (
    <div className={`flex ${isLead ? "justify-start" : "justify-end"} mt-1.5`}>
      <div
        className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs ${
          isLead
            ? "bg-surface-600 text-gray-300"
            : "bg-accent-cyan/20 text-accent-cyan"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
        <p
          className={`text-[10px] mt-0.5 ${isLead ? "text-gray-500" : "text-accent-cyan/60"}`}
        >
          {formatDate(msg.timestamp)}
        </p>
      </div>
    </div>
  );
}

function LeadRow({
  lead,
  onClick,
}: {
  lead: LeadUnificado;
  onClick: () => void;
}) {
  const channels: string[] = [];
  if (lead.notasLlamadas.length > 0) channels.push("llamadas");
  if (lead.videollamadas.length > 0) channels.push("video");
  if (lead.chats.length > 0) channels.push("chat");

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg bg-surface-700 hover:bg-surface-600 px-3 py-2.5 transition-colors group"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-surface-600 flex items-center justify-center shrink-0 group-hover:bg-surface-500">
            <User className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {lead.name}
            </p>
            <p className="text-[10px] text-gray-500 truncate">
              {lead.email ?? lead.phone ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${estadoColor(lead.estadoNormalizado)}`}
          >
            {estadoLabel(lead.estadoNormalizado)}
          </span>
          <div className="flex gap-1">
            {channels.includes("llamadas") && (
              <Phone className="w-3 h-3 text-accent-cyan" />
            )}
            {channels.includes("video") && (
              <Video className="w-3 h-3 text-accent-purple" />
            )}
            {channels.includes("chat") && (
              <MessageSquare className="w-3 h-3 text-accent-amber" />
            )}
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400" />
        </div>
      </div>
    </button>
  );
}

const TABS: { key: Tab; label: string; icon: typeof CheckCircle2 }[] = [
  { key: "contestaron", label: "Contestaron", icon: CheckCircle2 },
  { key: "interesados", label: "Interesados", icon: AlertCircle },
  { key: "agendaron", label: "Agendaron", icon: Calendar },
  { key: "todos", label: "Todos", icon: Filter },
];

export default function AdvisorDrillDown({
  advisorName,
  advisorEmail,
  dateFrom,
  dateTo,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("todos");
  const [selectedLead, setSelectedLead] = useState<LeadUnificado | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const hasEmail = Boolean(advisorEmail);

  const { data, loading, error } = useApiData<AsesorResponse>(
    "/api/data/asesor",
    {
      from: dateFrom,
      to: dateTo,
      advisorEmail: advisorEmail ?? undefined,
    },
    { enabled: hasEmail },
  );

  const leadsUnificados = useMemo(() => {
    if (!data) return [];
    return unificarLeads(data.leads, data.videollamadas, data.chats);
  }, [data]);

  const filteredLeads = useMemo(() => {
    let result = leadsUnificados;

    switch (activeTab) {
      case "contestaron":
        result = result.filter((l) => l.contestado);
        break;
      case "interesados":
        result = result.filter((l) => l.interesado);
        break;
      case "agendaron":
        result = result.filter((l) => l.agendado);
        break;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q)),
      );
    }

    return result;
  }, [leadsUnificados, activeTab, searchQuery]);

  const tabCounts = useMemo(() => {
    return {
      contestaron: leadsUnificados.filter((l) => l.contestado).length,
      interesados: leadsUnificados.filter((l) => l.interesado).length,
      agendaron: leadsUnificados.filter((l) => l.agendado).length,
      todos: leadsUnificados.length,
    };
  }, [leadsUnificados]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-2xl ml-auto h-full bg-surface-800 border-l border-surface-500 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent-cyan/20 flex items-center justify-center">
              <User className="w-5 h-5 text-accent-cyan" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                {advisorName}
                <HelpTooltip
                  titulo="Detalle del asesor"
                  contenido="Vista unificada de todos los leads de este asesor. Usa las pestañas para filtrar: Contestaron (leads que respondieron), Interesados (mostraron interés o avanzaron en el embudo), Agendaron (tienen cita programada). Haz click en cualquier lead para ver su tarjeta de contacto con toda su historia."
                  comoProbar="Haz click en un lead para ver su tarjeta. Cambia de pestaña para ver los leads por estado. Usa el buscador para encontrar un lead específico."
                />
              </h2>
              <p className="text-xs text-gray-500">
                {advisorEmail ?? "Sin email"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!hasEmail ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-700 flex items-center justify-center mx-auto">
                <User className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-sm text-gray-400">
                Este asesor no tiene email registrado.
              </p>
              <p className="text-xs text-gray-600">
                Sin email no es posible cargar sus leads individuales. Verifica que el asesor tenga un email asignado en el CRM.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* KPIs */}
            {data && (
              <div className="grid grid-cols-4 gap-2 px-4 pt-3 pb-2 shrink-0">
                <KpiMini
                  label="Leads"
                  value={data.kpis.leadsAsignados}
                  color="text-white"
                />
                <KpiMini
                  label="Contacto"
                  value={`${Math.round(data.kpis.tasaContacto * 100)}%`}
                  color="text-accent-cyan"
                />
                <KpiMini
                  label="Citas"
                  value={data.kpis.reunionesAgendadas}
                  color="text-accent-purple"
                />
                <KpiMini
                  label={data.canales.chats ? "Chats" : "Asistidas"}
                  value={
                    data.canales.chats
                      ? data.kpis.totalChats
                      : data.kpis.reunionesAsistidas
                  }
                  color={data.canales.chats ? "text-accent-amber" : "text-accent-green"}
                />
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 px-4 py-2 border-b border-surface-500 shrink-0 overflow-x-auto">
              {TABS.map((tab) => {
                const count = tabCounts[tab.key];
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key);
                      setSelectedLead(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-accent-cyan/20 text-accent-cyan"
                        : "text-gray-400 hover:text-white hover:bg-surface-700"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    <span
                      className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                        isActive
                          ? "bg-accent-cyan/30 text-accent-cyan"
                          : "bg-surface-600 text-gray-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            {!selectedLead && (
              <div className="px-4 py-2 shrink-0">
                <input
                  type="text"
                  placeholder="Buscar lead por nombre, email o teléfono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:ring-1 focus:ring-accent-cyan/50 focus:border-accent-cyan outline-none"
                />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-accent-red/10 border border-accent-red/20 p-4 text-center">
                  <p className="text-sm text-accent-red">
                    Error cargando datos: {error}
                  </p>
                </div>
              )}

              {!loading && !error && selectedLead && (
                <LeadContactCard
                  lead={selectedLead}
                  onBack={() => setSelectedLead(null)}
                />
              )}

              {!loading && !error && !selectedLead && (
                <>
                  {filteredLeads.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">
                      {searchQuery
                        ? "Sin resultados para la búsqueda."
                        : "Sin leads en esta categoría."}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredLeads.map((lead) => (
                        <LeadRow
                          key={lead.id}
                          lead={lead}
                          onClick={() => setSelectedLead(lead)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
