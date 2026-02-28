import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

const TOOLTIP_MAX_WIDTH = 288;
const TOOLTIP_MAX_HEIGHT = 200;
const GAP = 8;

export default function KpiTooltip({
  significado,
  calculo,
}: {
  significado: string;
  calculo: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; above: boolean }>({ top: 0, left: 0, above: true });

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const el = ref.current.querySelector('button');
    if (el) {
      const rect = el.getBoundingClientRect();
      const winW = window.innerWidth;
      const left = Math.max(GAP, Math.min(rect.left, winW - TOOLTIP_MAX_WIDTH - GAP));
      const aboveTop = rect.top - GAP;
      const fitsAbove = aboveTop - TOOLTIP_MAX_HEIGHT >= GAP;
      const above = fitsAbove;
      const top = above ? aboveTop : rect.bottom + GAP;
      setPosition({ left, top, above });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  const tooltipContent = open && (
    <div
      className="fixed z-[9999] rounded-md bg-surface-700 border border-surface-500 shadow-xl p-3 text-left text-[11px] leading-relaxed overflow-y-auto"
      style={{
        left: position.left,
        top: position.top,
        transform: position.above ? 'translateY(-100%)' : 'none',
        maxWidth: TOOLTIP_MAX_WIDTH,
        maxHeight: TOOLTIP_MAX_HEIGHT,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="font-medium text-gray-200 mb-0.5">Qué significa</p>
      <p className="text-gray-400 mb-2 break-words">{significado}</p>
      <p className="font-medium text-gray-200 mb-0.5">De dónde sale</p>
      <p className="text-gray-400 break-words">{calculo}</p>
    </div>
  );

  return (
    <>
      <div className="relative inline-flex shrink-0" ref={ref}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          className="text-gray-400 hover:text-accent-cyan/90 focus:outline-none focus:ring-1 focus:ring-accent-cyan/25 p-0.5 rounded touch-manipulation transition-colors"
          aria-label="Qué significa y de dónde sale este dato"
          title="Qué significa y de dónde sale"
        >
          <HelpCircle className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
      {typeof document !== 'undefined' && open && createPortal(tooltipContent, document.body)}
    </>
  );
}
