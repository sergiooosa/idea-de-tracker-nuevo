"use client";

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { useApiData } from '@/hooks/useApiData';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import Link from 'next/link';
import { Pencil, ArrowLeft } from 'lucide-react';
import type { DashboardResponse } from '@/types';
import KPICard from '@/components/dashboard/KPICard';
import PageHeader from '@/components/dashboard/PageHeader';

const fm = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${n.toLocaleString('es-CO')}`;

const pctFmt = (n: number) => `${(n * 100).toFixed(1)}%`;

const minFmt = (m: number) => (m < 1 ? `${Math.round(m * 60)}s` : `${m.toFixed(1)} min`);

const defaultDateTo = new Date();
const defaultDateFrom = subDays(defaultDateTo, 7);

export default function DashboardNodePage() {
  const params = useParams();
  const dashboardId = typeof params?.dashboardId === 'string' ? params.dashboardId : '';

  const [dateFrom, setDateFrom] = useState(format(defaultDateFrom, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(defaultDateTo, 'yyyy-MM-dd'));

  const { data, loading } = useApiData<DashboardResponse>('/api/data/dashboard', {
    from: dateFrom,
    to: dateTo,
  });

  // Encontrar el nodo
  const nodo = data?.dashboardsPersonalizados?.find((d) => d.id === dashboardId);

  // Filtrar métricas que tengan este dashboard en sus paneles
  const metricasDelPanel = useMemo(() => {
    return (data?.metricasComputadas ?? []).filter((m) => {
      const paneles: string[] = m.paneles ?? [];
      if (paneles.length > 0) return paneles.includes(dashboardId);
      return false;
    });
  }, [data?.metricasComputadas, dashboardId]);

  if (!nodo) {
    return (
      <main className="min-h-screen bg-[var(--bg)]" style={{ background: 'var(--bg)', backgroundImage: 'var(--bg-gradient)' }}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-accent-cyan hover:text-accent-cyan/80 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Volver al panel ejecutivo
          </Link>
          <div className="rounded-lg p-6 bg-surface-800 border border-surface-500 text-center">
            <p className="text-gray-400">Dashboard no encontrado</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg)]" style={{ background: 'var(--bg)', backgroundImage: 'var(--bg-gradient)' }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-400">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {nodo.icono && <span className="text-3xl">{nodo.icono}</span>}
              {nodo.nombre}
            </h1>
          </div>
          <Link
            href="/configuracion"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors text-sm"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </Link>
        </div>

        <div className="mb-6">
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onRange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-400">Cargando...</div>
          </div>
        )}

        {!loading && metricasDelPanel.length === 0 && (
          <div className="rounded-lg p-6 bg-surface-800 border border-surface-500 text-center">
            <p className="text-gray-400">No hay métricas configuradas para este panel</p>
          </div>
        )}

        {!loading && metricasDelPanel.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {metricasDelPanel.map((metrica) => {
              const color = metrica.color === 'cyan' || metrica.color === 'purple' || metrica.color === 'green' || metrica.color === 'amber' || metrica.color === 'red' || metrica.color === 'blue' 
                ? metrica.color 
                : 'cyan';
              return (
                <KPICard
                  key={metrica.id}
                  label={metrica.nombre}
                  value={metrica.valor}
                  subValue={metrica.descripcion}
                  color={color}
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
