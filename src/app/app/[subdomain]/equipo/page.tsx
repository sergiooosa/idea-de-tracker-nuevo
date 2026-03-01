"use client";

import PageHeader from "@/components/dashboard/PageHeader";

export default function EquipoPage() {
  return (
    <>
      <PageHeader title="Equipo" subtitle="Gestión del equipo · Solo superadmin" />
      <div className="p-4 md:p-6">
        <div className="rounded-xl border border-surface-500 bg-surface-800/80 p-8 text-center">
          <p className="text-slate-400 text-sm">
            Sección de gestión de equipo. Próximamente.
          </p>
        </div>
      </div>
    </>
  );
}
