import clsx from 'clsx';
import KpiTooltip from './KpiTooltip';

type Color = 'cyan' | 'purple' | 'green' | 'amber' | 'red' | 'blue';

const colorClasses: Record<Color, string> = {
  cyan: 'border-l-accent-cyan text-accent-cyan shadow-[0_0_24px_-8px_rgba(0,240,255,0.25)]',
  purple: 'border-l-accent-purple text-accent-purple shadow-[0_0_24px_-8px_rgba(178,75,243,0.25)]',
  green: 'border-l-accent-green text-accent-green shadow-[0_0_24px_-8px_rgba(0,230,118,0.25)]',
  amber: 'border-l-accent-amber text-accent-amber shadow-[0_0_24px_-8px_rgba(255,176,32,0.25)]',
  red: 'border-l-accent-red text-accent-red shadow-[0_0_24px_-8px_rgba(255,107,122,0.25)]',
  blue: 'border-l-accent-blue text-accent-blue shadow-[0_0_24px_-8px_rgba(77,171,247,0.25)]',
};

export default function KPICard({
  label,
  value,
  subValue,
  color = 'cyan',
  className,
  tooltip,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  color?: Color;
  className?: string;
  tooltip?: { significado: string; calculo: string };
}) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-surface-500/80 bg-surface-800/90 pl-4 border-l-4 overflow-hidden transition-shadow hover:shadow-lg',
        colorClasses[color],
        className
      )}
    >
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
        {label}
        {tooltip && <KpiTooltip significado={tooltip.significado} calculo={tooltip.calculo} />}
      </p>
      <p className="text-2xl md:text-3xl font-bold mt-0.5">{value}</p>
      {subValue && (
        <p className="text-sm text-gray-400 mt-1 mb-3">{subValue}</p>
      )}
      {!subValue && <div className="mb-3" />}
    </div>
  );
}
