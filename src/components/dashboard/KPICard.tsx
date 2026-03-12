"use client";

import clsx from 'clsx';
import KpiTooltip from './KpiTooltip';

type Color = 'cyan' | 'purple' | 'green' | 'amber' | 'red' | 'blue';

const cardFuturisticClass: Record<Color, string> = {
  cyan: 'card-futuristic-cyan',
  purple: 'card-futuristic-purple',
  green: 'card-futuristic-green',
  amber: 'card-futuristic-amber',
  red: 'card-futuristic-red',
  blue: 'card-futuristic-blue',
};

const valueColorClass: Record<Color, string> = {
  cyan: 'text-accent-cyan',
  purple: 'text-accent-purple',
  green: 'text-accent-green',
  amber: 'text-accent-amber',
  red: 'text-accent-red',
  blue: 'text-accent-blue',
};

export default function KPICard({
  label,
  value,
  subValue,
  color = 'cyan',
  className,
  tooltip,
  onClick,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  color?: Color;
  className?: string;
  tooltip?: { significado: string; calculo: string };
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={clsx(
        'rounded-xl pl-3 overflow-hidden transition-shadow hover:shadow-lg min-w-0 kpi-card-fixed',
        onClick && 'cursor-pointer hover:ring-2 hover:ring-white/20',
        cardFuturisticClass[color],
        className
      )}
    >
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-tight mt-2 flex items-center gap-0.5 flex-wrap break-words leading-tight">
        <span className="break-words">{label}</span>
        {tooltip && <KpiTooltip significado={tooltip.significado} calculo={tooltip.calculo} />}
      </p>
      <p className={clsx('text-xl md:text-2xl font-bold mt-0.5', valueColorClass[color])}>{value}</p>
      {subValue && (
        <p className="text-[11px] text-gray-400 mt-0.5">{subValue}</p>
      )}
      <div className="kpi-card-spacer" />
    </div>
  );
}
