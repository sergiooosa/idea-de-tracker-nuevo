// AUT-389 — Bloque 5b: Funnel de Leads (árbol visual)
// Árbol CONTACTADOS vs SIN CONTACTO con sub-estados y análisis narrativo

import type { ElementType, ReactNode } from 'react';
import { Users, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { formatPct } from '@/lib/format';
import type { ReportLeadFunnelTreeData } from '@/types/report';

interface Props {
  data: ReportLeadFunnelTreeData | null;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function TotalNode({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-xl bg-surface-700/60 border border-surface-500/60 px-6 py-3 flex items-center gap-3">
        <Users className="w-5 h-5 text-accent-blue shrink-0" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 leading-none mb-0.5">Total de leads</p>
          <p className="text-3xl font-bold text-white leading-none">{count.toLocaleString('es')}</p>
        </div>
      </div>
    </div>
  );
}

interface BranchNodeProps {
  icon: ElementType;
  label: string;
  count: number;
  pct: number;
  variant: 'green' | 'red';
  children: ReactNode;
}

function BranchNode({ icon: Icon, label, count, pct, variant, children }: BranchNodeProps) {
  const isGreen = variant === 'green';
  const colorCls = isGreen
    ? { border: 'border-accent-green/40', bg: 'bg-accent-green/10', text: 'text-accent-green', bar: 'bg-accent-green' }
    : { border: 'border-accent-red/40', bg: 'bg-accent-red/10', text: 'text-accent-red', bar: 'bg-accent-red' };

  return (
    <div className="flex-1 min-w-0">
      {/* Branch header */}
      <div className={`rounded-xl border ${colorCls.border} ${colorCls.bg} px-4 py-3`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={`w-4 h-4 shrink-0 ${colorCls.text}`} />
            <span className="text-sm font-semibold text-gray-200 truncate">{label}</span>
          </div>
          <div className="flex items-baseline gap-1.5 shrink-0">
            <span className={`text-2xl font-bold ${colorCls.text}`}>{count.toLocaleString('es')}</span>
            <span className="text-xs text-gray-400 font-medium">{formatPct(pct)}</span>
          </div>
        </div>
        {/* Percentage bar */}
        <div className="mt-2 h-1.5 rounded-full bg-surface-600/60 overflow-hidden">
          <div
            className={`h-full rounded-full ${colorCls.bar} transition-all`}
            style={{ width: `${Math.round(pct * 100)}%` }}
          />
        </div>
      </div>

      {/* Sub-states */}
      <div className="mt-2 pl-4 border-l-2 border-surface-600/60 space-y-1.5">
        {children}
      </div>
    </div>
  );
}

interface LeafNodeProps {
  label: string;
  count: number;
  total: number;
  accent?: string; // tailwind text color class
}

function LeafNode({ label, count, total, accent = 'text-gray-300' }: LeafNodeProps) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-surface-700/30 transition-colors">
      {/* Tree connector */}
      <span className="text-gray-600 text-xs font-mono shrink-0">+──</span>
      <span className="flex-1 text-xs text-gray-400 truncate">{label}</span>
      <div className="flex items-baseline gap-1 shrink-0">
        <span className={`text-sm font-bold ${accent}`}>{count.toLocaleString('es')}</span>
        <span className="text-[10px] text-gray-600">({Math.round(pct)}%)</span>
      </div>
    </div>
  );
}

// ─── Analysis paragraph ─────────────────────────────────────────────────────

function AnalysisParagraph({
  totalLeads,
  sinContactoCount,
  presupuestoAdsDesperdiciadoPct,
  asesorMayorAbandono,
}: {
  totalLeads: number;
  sinContactoCount: number;
  presupuestoAdsDesperdiciadoPct: number | null;
  asesorMayorAbandono: { nombre: string; pct: number } | null;
}) {
  const sinContactoPct = totalLeads > 0 ? sinContactoCount / totalLeads : 0;

  const hasContent = presupuestoAdsDesperdiciadoPct !== null || asesorMayorAbandono !== null;
  if (!hasContent && sinContactoCount === 0) return null;

  return (
    <div className="rounded-lg bg-surface-700/40 border border-surface-500/30 px-4 py-3 space-y-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-accent-amber shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 leading-relaxed">
          <span className="text-accent-red font-semibold">{formatPct(sinContactoPct)}</span>
          {' '}de los leads entrantes no recibieron ningún contacto efectivo ({sinContactoCount.toLocaleString('es')} leads).
          {presupuestoAdsDesperdiciadoPct !== null && (
            <>
              {' '}Esto equivale a aproximadamente{' '}
              <span className="text-accent-amber font-semibold">{formatPct(presupuestoAdsDesperdiciadoPct)}</span>
              {' '}del presupuesto de anuncios invertido que no generó retorno.
            </>
          )}
          {asesorMayorAbandono !== null && (
            <>
              {' '}El asesor con mayor tasa de leads abandonados es{' '}
              <span className="text-white font-semibold">{asesorMayorAbandono.nombre}</span>
              {' '}({formatPct(asesorMayorAbandono.pct)} de sus leads sin seguimiento).
            </>
          )}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function LeadFunnelTree({ data }: Props) {
  if (data === null) return null;

  const { totalLeads, contactados, sinContacto, presupuestoAdsDesperdiciadoPct, asesorMayorAbandono } = data;

  return (
    <section className="rounded-xl p-4 section-futuristic border border-surface-500/60 space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-accent-blue shrink-0" />
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Árbol de Leads
        </h3>
      </div>

      {/* Total node */}
      <TotalNode count={totalLeads} />

      {/* Vertical connector from total to branches */}
      <div className="flex justify-center">
        <div className="w-px h-4 bg-surface-600/60" />
      </div>

      {/* Two main branches */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* ── CONTACTADOS (green) ── */}
        <BranchNode
          icon={CheckCircle2}
          label="Contactados"
          count={contactados.count}
          pct={contactados.pct}
          variant="green"
        >
          <LeafNode
            label="Seguimiento activo"
            count={contactados.seguimientoActivo}
            total={contactados.count}
            accent="text-accent-green"
          />
          <LeafNode
            label="Agendaron cita"
            count={contactados.agendasCita}
            total={contactados.count}
            accent="text-accent-cyan"
          />
          <LeafNode
            label="No interesados"
            count={contactados.noInteresados}
            total={contactados.count}
            accent="text-accent-amber"
          />
          <LeafNode
            label="No calificados"
            count={contactados.noCalificados}
            total={contactados.count}
            accent="text-gray-400"
          />
        </BranchNode>

        {/* Vertical divider on desktop */}
        <div className="hidden sm:block w-px bg-surface-600/40 self-stretch mx-1" />

        {/* ── SIN CONTACTO (red) ── */}
        <BranchNode
          icon={XCircle}
          label="Sin contacto"
          count={sinContacto.count}
          pct={sinContacto.pct}
          variant="red"
        >
          <LeafNode
            label="Sin intento"
            count={sinContacto.sinIntento}
            total={sinContacto.count}
            accent="text-accent-red"
          />
          <LeafNode
            label="Intentaron sin respuesta"
            count={sinContacto.intentaronSinRespuesta}
            total={sinContacto.count}
            accent="text-accent-amber"
          />
          <LeafNode
            label="Sin seguimiento post-contacto"
            count={sinContacto.sinSeguimientoPostContacto}
            total={sinContacto.count}
            accent="text-gray-400"
          />
        </BranchNode>
      </div>

      {/* Analysis paragraph */}
      <AnalysisParagraph
        totalLeads={totalLeads}
        sinContactoCount={sinContacto.count}
        presupuestoAdsDesperdiciadoPct={presupuestoAdsDesperdiciadoPct}
        asesorMayorAbandono={asesorMayorAbandono}
      />
    </section>
  );
}
