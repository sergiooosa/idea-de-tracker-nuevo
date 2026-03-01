"use client";

import PageHeader from "@/components/dashboard/PageHeader";

export default function AparienciaPage() {
  return (
    <>
      <PageHeader title="Apariencia" subtitle="Personalización visual · Solo superadmin" />
      <div className="p-4 md:p-6">
        <div className="rounded-xl border border-surface-500 bg-surface-800/80 p-8 text-center">
          <p className="text-slate-400 text-sm">
            Sección de personalización de apariencia. Próximamente.
          </p>
        </div>
      </div>
    </>
  );
}
