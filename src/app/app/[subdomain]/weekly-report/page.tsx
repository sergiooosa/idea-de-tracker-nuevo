"use client";

import { useState, useRef, useCallback } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import { useApiData } from '@/hooks/useApiData';
import type { DashboardResponse } from '@/types';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, Calendar, TrendingUp, Phone, Users, Video, DollarSign, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

const fm = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Number(n).toLocaleString('es-CO')}`;
const pctFmt = (n: number) => `${(n * 100).toFixed(1)}%`;
const minFmt = (m: number) => (m < 1 ? `${Math.round(m * 60)}s` : `${m.toFixed(1)} min`);

export default function WeeklyReportPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const downloadPdf = useCallback(async () => {
    if (!reportRef.current) return;
    setGeneratingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#0d1219', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.setFillColor(13, 18, 25);
      pdf.rect(0, 0, pdfWidth, 12, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.text('AutoKPI — Reporte Semanal', 8, 8);
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text(new Date().toLocaleDateString('es-CO'), pdfWidth - 30, 8);
      pdf.addImage(imgData, 'PNG', 0, 14, pdfWidth, pdfHeight);
      pdf.save(`reporte-semanal-autokpi-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch { /* ignore */ }
    setGeneratingPdf(false);
  }, []);
  const now = new Date();
  const weekEnd = subDays(now, weekOffset * 7);
  const weekStart = subDays(weekEnd, 6);
  const weekLabel = `${format(weekStart, 'd MMM', { locale: es })} – ${format(weekEnd, 'd MMM yyyy', { locale: es })}`;

  const dateFrom = format(weekStart, 'yyyy-MM-dd');
  const dateTo = format(weekEnd, 'yyyy-MM-dd');

  const { data, loading } = useApiData<DashboardResponse>('/api/data/weekly-report', { from: dateFrom, to: dateTo });

  const generateSummary = useCallback(async () => {
    setLoadingSummary(true);
    setAiSummary(null);
    try {
      const res = await fetch(`/api/data/weekly-report/summary?from=${dateFrom}&to=${dateTo}`, { method: 'POST' });
      const json = await res.json() as { summary?: string; error?: string };
      setAiSummary(json.summary ?? 'No se pudo generar el resumen.');
    } catch {
      setAiSummary('Error al conectar con la IA.');
    } finally {
      setLoadingSummary(false);
    }
  }, [dateFrom, dateTo]);

  const kpis = data?.kpis ?? {
    totalLeads: 0, callsMade: 0, contestadas: 0, answerRate: 0,
    meetingsBooked: 0, meetingsAttended: 0, meetingsCanceled: 0, meetingsClosed: 0,
    effectiveAppointments: 0, tasaCierre: 0, tasaAgendamiento: 0,
    revenue: 0, cashCollected: 0, avgTicket: 0, speedToLeadAvg: 0,
    avgAttempts: 0, attemptsToFirstContactAvg: 0,
  };
  const advisorRanking = data?.advisorRanking ?? [];
  const volumeByDay = data?.volumeByDay ?? [];
  const objeciones = data?.objeciones ?? [];

  const pendientes = Math.max(0, kpis.meetingsBooked - kpis.meetingsAttended - kpis.meetingsCanceled);

  return (
    <>
      <PageHeader
        title="Reporte semanal"
        subtitle="Resumen de la semana · Números y tendencias"
        backTo="/"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-surface-700 border border-surface-500 px-2 py-1.5">
              <Calendar className="w-4 h-4 text-accent-cyan" />
              <select
                value={weekOffset}
                onChange={(e) => { setWeekOffset(Number(e.target.value)); setAiSummary(null); }}
                className="bg-transparent text-sm text-white border-none focus:ring-0 cursor-pointer"
              >
                {[0, 1, 2, 3, 4].map((i) => {
                  const end = subDays(now, i * 7);
                  const start = subDays(end, 6);
                  return (
                    <option key={i} value={i}>{format(start, 'd/MM')} – {format(end, 'd/MM/yy')}</option>
                  );
                })}
              </select>
            </div>
            <button type="button" onClick={downloadPdf} disabled={generatingPdf}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:shadow-glow-cyan disabled:opacity-50">
              {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {generatingPdf ? 'Generando...' : 'Descargar PDF'}
            </button>
          </div>
        }
      />
      <div ref={reportRef} className="p-3 md:p-4 space-y-3 max-w-6xl mx-auto min-w-0 max-w-full overflow-x-hidden text-sm">
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]"><div className="text-gray-400 text-sm animate-pulse">Cargando reporte...</div></div>
        ) : (
          <>
            <section className="rounded-lg border border-surface-500/80 bg-gradient-to-br from-surface-800 to-surface-800/50 p-4 shadow-card">
              <p className="text-accent-cyan font-medium text-xs uppercase tracking-wider mb-0.5">Semana seleccionada</p>
              <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-1">{weekLabel}</h2>
              <p className="text-gray-400 text-xs">Resumen de actividad, llamadas, citas y cierres de la semana.</p>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-accent-cyan" /> Números de la semana
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2">
                {[
                  { label: 'Leads generados', value: kpis.totalLeads, color: 'blue' },
                  { label: 'Llamadas', value: kpis.callsMade, color: 'cyan', sub: `Contestación ${pctFmt(kpis.answerRate)}` },
                  { label: 'Agendadas', value: kpis.meetingsBooked, color: 'purple', sub: `Asistieron ${kpis.meetingsAttended}` },
                  { label: 'Facturación', value: fm(kpis.revenue), color: 'green', sub: `Efectivo ${fm(kpis.cashCollected)}` },
                  { label: 'Tiempo al lead', value: minFmt(kpis.speedToLeadAvg), color: 'cyan' },
                ].map(({ label, value, color, sub }) => (
                  <div key={label} className={`rounded-lg pl-3 overflow-hidden card-futuristic-${color} kpi-card-fixed`}>
                    <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1">{label}</p>
                    <p className={`text-base font-bold text-accent-${color} mt-0.5`}>{value}</p>
                    {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
                    <div className="kpi-card-spacer" />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg p-3 section-futuristic">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-accent-cyan" /> Volumen: llamadas, citas y cierres
              </h3>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#8b9cb5" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#8b9cb5" />
                    <Tooltip contentStyle={{ background: '#0d1219', border: '1px solid #1e2a3a', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="llamadas" name="Llamadas" fill="#4dabf7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="citasPresentaciones" name="Citas" fill="#b24bf3" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cierres" name="Cierres" fill="#00e676" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-lg overflow-hidden section-futuristic border border-surface-500">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 pb-0 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-accent-cyan" /> Ranking por asesor
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface-700/80 text-left text-gray-400">
                      <th className="px-2 py-2 font-medium">Asesor</th>
                      <th className="px-2 py-2 font-medium">Leads</th>
                      <th className="px-2 py-2 font-medium">Llamadas</th>
                      <th className="px-2 py-2 font-medium">Tiempo al lead</th>
                      <th className="px-2 py-2 font-medium">Agendadas</th>
                      <th className="px-2 py-2 font-medium">Asistidas</th>
                      <th className="px-2 py-2 font-medium">Facturación</th>
                      <th className="px-2 py-2 font-medium">Efectivo</th>
                      <th className="px-2 py-2 font-medium">Tasa contacto</th>
                      <th className="px-2 py-2 font-medium">Tasa agend.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advisorRanking.map((a, i) => (
                      <tr key={a.advisorEmail ?? a.advisorName} className="border-t border-surface-500 hover:bg-surface-700/50">
                        <td className="px-2 py-2 text-white font-medium">
                          {i === 0 && '🥇 '}{i === 1 && '🥈 '}{i === 2 && '🥉 '}{a.advisorName}
                        </td>
                        <td className="px-2 py-2 text-accent-cyan">{a.totalLeads}</td>
                        <td className="px-2 py-2 text-accent-cyan">{a.callsMade}</td>
                        <td className="px-2 py-2 text-gray-300">{a.speedToLeadAvg != null ? minFmt(a.speedToLeadAvg) : '—'}</td>
                        <td className="px-2 py-2 text-accent-purple">{a.meetingsBooked}</td>
                        <td className="px-2 py-2 text-accent-cyan">{a.meetingsAttended}</td>
                        <td className="px-2 py-2 text-accent-green">{fm(a.revenue)}</td>
                        <td className="px-2 py-2 text-accent-green">{fm(a.cashCollected)}</td>
                        <td className="px-2 py-2">{pctFmt(a.contactRate)}</td>
                        <td className="px-2 py-2">{pctFmt(a.bookingRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid md:grid-cols-2 gap-3">
              <section className="rounded-lg p-3 section-futuristic">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-accent-purple" /> Estado de agendas
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'Agendadas', value: kpis.meetingsBooked, color: 'accent-purple' },
                    { label: 'Pendientes', value: pendientes, color: 'accent-amber' },
                    { label: 'Canceladas', value: kpis.meetingsCanceled, color: 'accent-red' },
                    { label: 'Asistieron', value: kpis.meetingsAttended, color: 'accent-cyan' },
                    { label: 'Efectivas', value: kpis.effectiveAppointments, color: 'accent-green' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-lg bg-surface-700/80 p-2 text-center">
                      <p className={`text-lg font-bold text-${color}`}>{value}</p>
                      <p className="text-[10px] text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-lg p-3 section-futuristic">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Objeciones más repetidas</h3>
                <ul className="space-y-1">
                  {objeciones.slice(0, 5).map((o) => (
                    <li key={o.name} className="flex items-center justify-between rounded-lg bg-surface-700/80 px-2 py-1.5 text-xs">
                      <span className="font-medium text-white capitalize">{o.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-accent-red/20 text-accent-red text-xs font-medium">{o.count}x</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Chats KPIs */}
            {data?.chatKpis && data.chatKpis.total > 0 && (
              <section className="rounded-lg p-3 section-futuristic">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-accent-cyan" /> Chats de la semana
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Conversaciones', value: data.chatKpis.total, color: 'accent-cyan' },
                    { label: 'Leads únicos', value: data.chatKpis.leadsUnicos, color: 'accent-cyan' },
                    { label: 'Con respuesta', value: data.chatKpis.conRespuesta, color: 'accent-green' },
                    { label: 'Tasa respuesta', value: pctFmt(data.chatKpis.tasaRespuesta), color: 'accent-green' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-lg bg-surface-700/80 p-2 text-center">
                      <p className={`text-lg font-bold text-${color}`}>{value}</p>
                      <p className="text-[10px] text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
                {data.chatKpis.topClosers.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-surface-500/60">
                    <p className="text-[10px] text-gray-500 mb-1">Top asesores en chat:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.chatKpis.topClosers.slice(0, 5).map((c) => (
                        <span key={c.name} className="text-[10px] bg-surface-600 text-gray-300 px-2 py-0.5 rounded-full">
                          {c.name} <span className="text-accent-cyan font-medium">{c.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Resumen IA */}
            <section className="rounded-lg p-3 section-futuristic border border-accent-cyan/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent-cyan" /> Análisis IA de la semana
                </h3>
                <button
                  type="button"
                  onClick={() => void generateSummary()}
                  disabled={loadingSummary || loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-xs font-semibold hover:bg-accent-cyan/20 transition-colors disabled:opacity-50"
                >
                  {loadingSummary ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {loadingSummary ? 'Analizando...' : aiSummary ? 'Regenerar' : 'Generar análisis'}
                </button>
              </div>
              {aiSummary ? (
                <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed bg-surface-700/40 rounded-lg p-3">
                  {aiSummary}
                </div>
              ) : (
                <p className="text-xs text-gray-600 italic">Haz clic en "Generar análisis" para obtener un resumen ejecutivo de la semana con insights de llamadas, chats, objeciones y financiero.</p>
              )}
            </section>

            <section className="rounded-lg p-3 section-futuristic">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-accent-green" /> Resumen
              </h3>
              <ul className="space-y-1.5 text-xs text-gray-300">
                <li className="flex gap-2">
                  <span className="text-accent-cyan">•</span>
                  Tasa de contestación: <strong className="text-white">{pctFmt(kpis.answerRate)}</strong>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent-cyan">•</span>
                  Objeciones más repetidas: <strong className="text-white">{objeciones.slice(0, 3).map((o) => o.name).join(', ') || 'N/A'}</strong>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent-cyan">•</span>
                  Facturación semanal <strong className="text-accent-green">{fm(kpis.revenue)}</strong>, efectivo cobrado {fm(kpis.cashCollected)}.
                </li>
              </ul>
            </section>
          </>
        )}
      </div>
    </>
  );
}
