"use client";

import React, { useState } from "react";
import { Trophy, ChevronDown, ChevronUp, Users } from "lucide-react";
import clsx from "clsx";
import type { DashboardAdvisorRow } from "@/types";

const fm = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${n.toLocaleString("es-CO")}`;
const pctFmt = (n: number) => `${(n * 100).toFixed(1)}%`;
const minFmt = (m: number) =>
  m < 1 ? `${Math.round(m * 60)}s` : `${m.toFixed(1)} min`;

type SortKey =
  | "score"
  | "leads"
  | "llamadas"
  | "agendadas"
  | "asistidas"
  | "facturacion"
  | "efectivo"
  | "tasa_contacto";

function sortValue(row: DashboardAdvisorRow, key: SortKey): number {
  switch (key) {
    case "score":
      return (
        row.callsMade +
        row.meetingsBooked +
        row.meetingsAttended +
        row.revenue / 1000
      );
    case "leads":
      return row.totalLeads;
    case "llamadas":
      return row.callsMade;
    case "agendadas":
      return row.meetingsBooked;
    case "asistidas":
      return row.meetingsAttended;
    case "facturacion":
      return row.revenue;
    case "efectivo":
      return row.cashCollected;
    case "tasa_contacto":
      return row.contactRate;
  }
}

interface Props {
  advisorRanking: DashboardAdvisorRow[];
}

export default function AdvisorRankingWidget({ advisorRanking }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedAdvisor, setExpandedAdvisor] = useState<string | null>(null);

  if (advisorRanking.length === 0) return null;

  const sorted = [...advisorRanking].sort((a, b) => {
    const diff = sortValue(b, sortKey) - sortValue(a, sortKey);
    return sortAsc ? -diff : diff;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortAsc ? (
        <ChevronUp className="w-3 h-3 inline ml-0.5" />
      ) : (
        <ChevronDown className="w-3 h-3 inline ml-0.5" />
      )
    ) : null;

  const hasLlamadas = advisorRanking.some((a) => a.callsMade > 0);
  const hasAgendas = advisorRanking.some((a) => a.meetingsBooked > 0);
  const hasRevenue = advisorRanking.some((a) => a.revenue > 0);
  const hasCash = advisorRanking.some((a) => a.cashCollected > 0);

  return (
    <section className="mt-6">
      <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        <Users className="w-4 h-4" />
        Ranking por asesor
      </h2>
      <div className="rounded-lg border border-surface-500 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-700 text-left text-gray-400">
                <th className="px-2 py-2 font-medium">Asesor</th>
                <th
                  className="px-2 py-2 font-medium cursor-pointer hover:text-white"
                  onClick={() => toggleSort("leads")}
                >
                  Leads
                  <SortIcon col="leads" />
                </th>
                {hasLlamadas && (
                  <th
                    className="px-2 py-2 font-medium cursor-pointer hover:text-white"
                    onClick={() => toggleSort("llamadas")}
                  >
                    Llamadas
                    <SortIcon col="llamadas" />
                  </th>
                )}
                {hasAgendas && (
                  <>
                    <th
                      className="px-2 py-2 font-medium cursor-pointer hover:text-white"
                      onClick={() => toggleSort("agendadas")}
                    >
                      Agendadas
                      <SortIcon col="agendadas" />
                    </th>
                    <th
                      className="px-2 py-2 font-medium cursor-pointer hover:text-white"
                      onClick={() => toggleSort("asistidas")}
                    >
                      Asistidas
                      <SortIcon col="asistidas" />
                    </th>
                  </>
                )}
                {hasRevenue && (
                  <th
                    className="px-2 py-2 font-medium cursor-pointer hover:text-white"
                    onClick={() => toggleSort("facturacion")}
                  >
                    Facturación
                    <SortIcon col="facturacion" />
                  </th>
                )}
                {hasCash && (
                  <th
                    className="px-2 py-2 font-medium cursor-pointer hover:text-white"
                    onClick={() => toggleSort("efectivo")}
                  >
                    Efectivo
                    <SortIcon col="efectivo" />
                  </th>
                )}
                <th
                  className="px-2 py-2 font-medium cursor-pointer hover:text-white"
                  onClick={() => toggleSort("tasa_contacto")}
                >
                  Tasa contacto
                  <SortIcon col="tasa_contacto" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a, i) => {
                const key = a.advisorEmail ?? a.advisorName;
                const isExpanded = expandedAdvisor === key;
                const colSpan =
                  2 +
                  (hasLlamadas ? 1 : 0) +
                  (hasAgendas ? 2 : 0) +
                  (hasRevenue ? 1 : 0) +
                  (hasCash ? 1 : 0) +
                  1;
                return (
                  <React.Fragment key={key}>
                    <tr
                      onClick={() =>
                        setExpandedAdvisor(isExpanded ? null : key)
                      }
                      className={clsx(
                        "border-t border-surface-500 hover:bg-surface-700/50 cursor-pointer",
                        i === 0 && "bg-accent-green/10"
                      )}
                    >
                      <td className="px-2 py-2">
                        {i === 0 ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-accent-amber">
                            <Trophy className="w-4 h-4" /> {a.advisorName}{" "}
                            <span className="text-[10px] uppercase">Mejor</span>
                          </span>
                        ) : (
                          <>
                            <span className="inline-block w-2 h-2 rounded-full bg-accent-green mr-2" />
                            {a.advisorName}
                          </>
                        )}
                      </td>
                      <td className="px-2 py-2 text-white">{a.totalLeads}</td>
                      {hasLlamadas && (
                        <td className="px-2 py-2 text-accent-cyan">
                          {a.callsMade}
                        </td>
                      )}
                      {hasAgendas && (
                        <>
                          <td className="px-2 py-2 text-accent-purple">
                            {a.meetingsBooked}
                          </td>
                          <td className="px-2 py-2 text-accent-cyan">
                            {a.meetingsAttended}
                          </td>
                        </>
                      )}
                      {hasRevenue && (
                        <td className="px-2 py-2 text-accent-green">
                          {fm(a.revenue)}
                        </td>
                      )}
                      {hasCash && (
                        <td className="px-2 py-2 text-accent-green">
                          {fm(a.cashCollected)}
                        </td>
                      )}
                      <td className="px-2 py-2">{pctFmt(a.contactRate)}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-surface-800/60">
                        <td colSpan={colSpan} className="px-4 py-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-gray-500 block">
                                Leads nuevos
                              </span>
                              <span className="text-accent-amber font-semibold">
                                {a.leadsGenerados}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 block">
                                Con actividad
                              </span>
                              <span className="text-accent-cyan font-semibold">
                                {a.leadsConActividad}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 block">
                                Speed to lead
                              </span>
                              <span className="text-gray-300 font-semibold">
                                {a.speedToLeadAvg != null
                                  ? minFmt(a.speedToLeadAvg)
                                  : "—"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 block">
                                Tasa agendamiento
                              </span>
                              <span className="text-accent-purple font-semibold">
                                {pctFmt(a.bookingRate)}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
