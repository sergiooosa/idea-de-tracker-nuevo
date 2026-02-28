import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

export default function KpiTooltip({
  significado,
  calculo,
}: {
  significado: string;
  calculo: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative inline-flex ml-1" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="text-gray-500 hover:text-accent-cyan focus:outline-none focus:ring-0 p-0.5 rounded"
        aria-label="Qué significa y cómo se calcula"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg bg-surface-600 border border-surface-500 shadow-xl p-3 text-left">
          <p className="text-xs font-semibold text-gray-300 mb-1">Qué significa</p>
          <p className="text-xs text-gray-400 mb-2">{significado}</p>
          <p className="text-xs font-semibold text-gray-300 mb-1">Cómo se calcula</p>
          <p className="text-xs text-gray-400">{calculo}</p>
        </div>
      )}
    </div>
  );
}
