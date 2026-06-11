"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
  UserX,
} from "lucide-react";

interface AsesorCarga {
  closer_mail: string | null;
  nombre_closer: string | null;
  total_leads: number;
  por_estado: Record<string, number>;
}

interface SinAsignar {
  total: number;
  por_estado: Record<string, number>;
}

interface Lead {
  id_registro: number;
  nombre_lead: string | null;
  mail_lead: string | null;
  phone_raw_format: string | null;
  estado: string | null;
  closer_mail: string | null;
  nombre_closer: string | null;
  intentos_contacto: number | null;
  fecha_evento: string | null;
  creativo_origen: string | null;
}

function estadoLabel(estado: string): string {
  if (estado === "sin_estado") return "Sin estado";
  return estado
    .replace(/^\{(.+)\}$/, "$1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function BarCarga({ total, maxTotal }: { total: number; maxTotal: number }) {
  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
  return (
    <div className="w-full h-2 rounded-full bg-surface-700 overflow-hidden">
      <div
        className="h-full rounded-full bg-accent-cyan transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function AsignacionAsesores() {
  const [asesores, setAsesores] = useState<AsesorCarga[]>([]);
  const [sinAsignar, setSinAsignar] = useState<SinAsignar>({ total: 0, por_estado: {} });
  const [loading, setLoading] = useState(true);
  const [expandedAsesor, setExpandedAsesor] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [sourceCloser, setSourceCloser] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceEstado, setSourceEstado] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [targetCloser, setTargetCloser] = useState("");
  const [targetNombre, setTargetNombre] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; actualizados: number } | null>(null);

  const fetchAsignacion = useCallback(async () => {
    try {
      const res = await fetch("/api/enfoque/asignacion");
      if (res.ok) {
        const data = await res.json();
        setAsesores(data.asesores);
        setSinAsignar(data.sin_asignar);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAsignacion();
  }, [fetchAsignacion]);

  const maxTotal = Math.max(
    ...asesores.map((a) => a.total_leads),
    sinAsignar.total,
    1,
  );

  function toggleExpand(mail: string) {
    setExpandedAsesor((prev) => (prev === mail ? null : mail));
  }

  async function openReasignar(closerMail: string | null, label: string, estado?: string) {
    setSourceCloser(closerMail);
    setSourceLabel(label);
    setSourceEstado(estado ?? null);
    setSelectedIds(new Set());
    setSelectAll(false);
    setTargetCloser("");
    setTargetNombre("");
    setResult(null);
    setDialogOpen(true);

    setLeadsLoading(true);
    try {
      const params = new URLSearchParams();
      if (closerMail === null) {
        params.set("sin_asignar", "1");
      } else {
        params.set("closer_mail", closerMail);
      }
      if (estado) params.set("estado", estado);

      const res = await fetch(`/api/enfoque/asignacion/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setLeadsTotal(data.total);
      }
    } finally {
      setLeadsLoading(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectAll(false);
  }

  function handleSelectAll() {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id_registro)));
      setSelectAll(true);
    }
  }

  async function handleReasignar() {
    if (selectedIds.size === 0 || !targetCloser.trim()) return;
    setReassigning(true);
    setResult(null);
    try {
      const res = await fetch("/api/enfoque/asignacion/reasignar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids_registro: Array.from(selectedIds),
          nuevo_closer_mail: targetCloser.trim(),
          nuevo_nombre_closer: targetNombre.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        void fetchAsignacion();
      }
    } finally {
      setReassigning(false);
    }
  }

  const otherAsesores = asesores.filter(
    (a) => a.closer_mail !== sourceCloser,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const totalGlobal = asesores.reduce((s, a) => s + a.total_leads, 0) + sinAsignar.total;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">Asignación de leads <span className="text-[10px] uppercase tracking-wide font-semibold rounded px-1.5 py-0.5 bg-accent-purple/20 text-accent-purple border border-accent-purple/30">Beta</span></h1>
          <p className="text-sm text-gray-400 mt-1">
            {totalGlobal.toLocaleString()} leads totales · {asesores.length} asesores
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {asesores.map((asesor) => {
          const mail = asesor.closer_mail ?? "";
          const isExpanded = expandedAsesor === mail;
          const estados = Object.entries(asesor.por_estado).sort(
            ([, a], [, b]) => b - a,
          );

          return (
            <div
              key={mail}
              className="rounded-xl border border-surface-600 bg-surface-800 overflow-hidden"
            >
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-surface-700/50 transition-colors"
                onClick={() => toggleExpand(mail)}
              >
                <div className="w-9 h-9 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-accent-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">
                      {asesor.nombre_closer ?? mail}
                    </span>
                    <span className="text-xs text-gray-500 truncate">{mail}</span>
                  </div>
                  <div className="mt-1.5">
                    <BarCarga total={asesor.total_leads} maxTotal={maxTotal} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-white">
                    {asesor.total_leads.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase">leads</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void openReasignar(mail, asesor.nombre_closer ?? mail);
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors shrink-0"
                  title="Reasignar leads"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                )}
              </div>

              {isExpanded && estados.length > 0 && (
                <div className="px-4 pb-4 pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {estados.map(([estado, cantidad]) => (
                      <button
                        key={estado}
                        type="button"
                        onClick={() =>
                          void openReasignar(
                            mail,
                            asesor.nombre_closer ?? mail,
                            estado,
                          )
                        }
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-900 border border-surface-600 text-xs hover:border-accent-cyan/30 transition-colors"
                      >
                        <span className="text-gray-300 truncate">
                          {estadoLabel(estado)}
                        </span>
                        <span className="text-white font-semibold ml-2">
                          {cantidad}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sinAsignar.total > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-surface-800 overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <UserX className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-amber-300">Sin asesor asignado</span>
                </div>
                <div className="mt-1.5">
                  <div className="w-full h-2 rounded-full bg-surface-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-300"
                      style={{
                        width: `${maxTotal > 0 ? Math.round((sinAsignar.total / maxTotal) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-amber-300">
                  {sinAsignar.total.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500 uppercase">leads</p>
              </div>
              <button
                type="button"
                onClick={() => void openReasignar(null, "Sin asignar")}
                className="p-2 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors shrink-0"
                title="Asignar leads"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {asesores.length === 0 && sinAsignar.total === 0 && (
          <div className="text-center py-16 text-gray-400 bg-surface-800 rounded-xl border border-surface-600">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No hay leads registrados</p>
          </div>
        )}
      </div>

      {/* Dialog de reasignación */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface-800 border-surface-600 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Reasignar leads
              {sourceEstado && (
                <span className="text-xs font-normal text-gray-400 bg-surface-700 px-2 py-0.5 rounded">
                  {estadoLabel(sourceEstado)}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              De: <span className="text-white font-medium">{sourceLabel}</span>
              {leadsTotal > 0 && (
                <> · {leadsTotal.toLocaleString()} leads{leadsTotal > 200 && " (mostrando primeros 200)"}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-white font-medium">
                {result.actualizados} lead{result.actualizados !== 1 && "s"} reasignado{result.actualizados !== 1 && "s"}
              </p>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="mt-4 px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-medium hover:bg-accent-cyan/90 transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              {/* Target selector */}
              <div className="space-y-3 py-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Asignar a
                  </label>
                  {otherAsesores.length > 0 ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {otherAsesores.map((a) => (
                        <button
                          key={a.closer_mail}
                          type="button"
                          onClick={() => {
                            setTargetCloser(a.closer_mail ?? "");
                            setTargetNombre(a.nombre_closer ?? "");
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left border transition-colors ${
                            targetCloser === a.closer_mail
                              ? "bg-accent-cyan/10 border-accent-cyan/50 text-accent-cyan"
                              : "bg-surface-900 border-surface-600 text-gray-300 hover:text-white hover:border-surface-500"
                          }`}
                        >
                          <Users className="w-4 h-4 shrink-0 opacity-60" />
                          <span className="flex-1 truncate">
                            {a.nombre_closer ?? a.closer_mail}
                          </span>
                          <span className="text-xs text-gray-500">
                            {a.total_leads} leads
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-2 flex gap-2">
                    <input
                      type="email"
                      value={targetCloser}
                      onChange={(e) => setTargetCloser(e.target.value)}
                      placeholder="email@closer.com"
                      className="flex-1 px-3 py-2 rounded-lg bg-surface-900 border border-surface-600 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-accent-cyan"
                    />
                    <input
                      type="text"
                      value={targetNombre}
                      onChange={(e) => setTargetNombre(e.target.value)}
                      placeholder="Nombre"
                      className="w-36 px-3 py-2 rounded-lg bg-surface-900 border border-surface-600 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                </div>

                {/* Leads list */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-300">
                      Seleccionar leads
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs text-accent-cyan hover:underline"
                    >
                      {selectAll ? "Deseleccionar todos" : "Seleccionar todos"}
                    </button>
                  </div>

                  {leadsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500 py-4 justify-center">
                      <Loader2 className="w-3 h-3 animate-spin" /> Cargando leads...
                    </div>
                  ) : leads.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No hay leads para mostrar
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto rounded-lg border border-surface-600">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-surface-900">
                          <tr className="text-gray-500 text-left">
                            <th className="px-3 py-2 w-8">
                              <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={handleSelectAll}
                                className="rounded border-surface-500"
                              />
                            </th>
                            <th className="px-2 py-2">Lead</th>
                            <th className="px-2 py-2">Estado</th>
                            <th className="px-2 py-2 text-right">Intentos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-700">
                          {leads.map((lead) => (
                            <tr
                              key={lead.id_registro}
                              className={`cursor-pointer transition-colors ${
                                selectedIds.has(lead.id_registro)
                                  ? "bg-accent-cyan/5"
                                  : "hover:bg-surface-700/50"
                              }`}
                              onClick={() => toggleSelect(lead.id_registro)}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(lead.id_registro)}
                                  onChange={() => toggleSelect(lead.id_registro)}
                                  className="rounded border-surface-500"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <p className="text-gray-200 truncate max-w-[180px]">
                                  {lead.nombre_lead ?? lead.mail_lead ?? lead.phone_raw_format ?? "—"}
                                </p>
                              </td>
                              <td className="px-2 py-2">
                                <span className="text-gray-400">
                                  {lead.estado ? estadoLabel(lead.estado) : "—"}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-right text-gray-400">
                                {lead.intentos_contacto ?? 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {selectedIds.size > 0 && targetCloser.trim() && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-cyan/5 border border-accent-cyan/20 text-xs text-gray-300">
                    <AlertCircle className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                    <span>
                      Se reasignarán <strong className="text-white">{selectedIds.size}</strong> leads a{" "}
                      <strong className="text-white">{targetNombre.trim() || targetCloser.trim()}</strong>
                    </span>
                  </div>
                )}
              </div>

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void handleReasignar()}
                  disabled={
                    reassigning ||
                    selectedIds.size === 0 ||
                    !targetCloser.trim()
                  }
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-medium hover:bg-accent-cyan/90 transition-colors disabled:opacity-50"
                >
                  {reassigning ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> Reasignando...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" /> Reasignar {selectedIds.size > 0 && `(${selectedIds.size})`}
                    </>
                  )}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
