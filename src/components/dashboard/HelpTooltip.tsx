"use client";

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

const TOOLTIP_MAX_WIDTH = 320;
const TOOLTIP_MAX_HEIGHT = 280;
const GAP = 8;

export default function HelpTooltip({
  titulo,
  contenido,
  comoProbar,
}: {
  titulo: string;
  contenido: string;
  comoProbar?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; above: boolean }>({
    top: 0,
    left: 0,
    above: true,
  });

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
      className="fixed z-[9999] rounded-lg bg-surface-700 border border-surface-500 shadow-xl p-4 text-left text-[12px] leading-relaxed overflow-y-auto"
      style={{
        left: position.left,
        top: position.top,
        transform: position.above ? 'translateY(-100%)' : 'none',
        maxWidth: TOOLTIP_MAX_WIDTH,
        maxHeight: TOOLTIP_MAX_HEIGHT,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="font-semibold text-white text-[13px] mb-1.5">{titulo}</p>
      <p className="text-gray-300 whitespace-pre-line">{contenido}</p>
      {comoProbar && (
        <>
          <p className="font-semibold text-accent-cyan text-[12px] mt-3 mb-1">Cómo probarlo</p>
          <p className="text-gray-400 whitespace-pre-line">{comoProbar}</p>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="relative inline-flex shrink-0" ref={ref}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          className="text-gray-400 hover:text-accent-cyan/90 focus:outline-none focus:ring-1 focus:ring-accent-cyan/25 p-0.5 rounded touch-manipulation transition-colors"
          aria-label={`Ayuda: ${titulo}`}
          title={titulo}
        >
          <HelpCircle className="w-4 h-4" aria-hidden />
        </button>
      </div>
      {typeof document !== 'undefined' && open && createPortal(tooltipContent, document.body)}
    </>
  );
}
