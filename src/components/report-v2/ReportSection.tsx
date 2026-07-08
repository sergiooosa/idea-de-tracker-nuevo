"use client";

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import HelpTooltip from '@/components/dashboard/HelpTooltip';

interface Props {
  icon: LucideIcon;
  title: string;
  helpTitulo: string;
  helpContenido: string;
  helpComoProbar?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function ReportSection({
  icon: Icon,
  title,
  helpTitulo,
  helpContenido,
  helpComoProbar,
  rightSlot,
  children,
  className,
}: Props) {
  return (
    <section
      className={`rounded-xl border border-[#1E2B40] bg-[#111A2A] p-5 space-y-4 ${className ?? ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent-cyan shrink-0" />
          <h3 className="text-xs font-semibold text-[#8DA2B8] uppercase tracking-wider">
            {title}
          </h3>
          <HelpTooltip
            titulo={helpTitulo}
            contenido={helpContenido}
            comoProbar={helpComoProbar}
          />
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
      {children}
    </section>
  );
}
