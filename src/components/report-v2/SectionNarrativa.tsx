"use client";

import { Sparkles } from 'lucide-react';
import Markdown from 'react-markdown';
import type { ReportV2Narrativa } from '@/types/report-v2';
import ReportSection from './ReportSection';

interface Props {
  data: ReportV2Narrativa | null;
}

export default function SectionNarrativa({ data }: Props) {
  if (!data) return null;

  return (
    <ReportSection
      icon={Sparkles}
      title="Resumen Ejecutivo"
      helpTitulo="Resumen Ejecutivo"
      helpContenido="Narrativa generada por IA que resume los hallazgos principales del periodo: rendimiento general, puntos de atención y oportunidades detectadas."
    >
      <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 px-5 py-4 prose prose-invert prose-sm max-w-none prose-headings:text-[#E7EFF8] prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:text-[#E7EFF8] prose-p:leading-relaxed prose-li:text-[#E7EFF8] prose-strong:text-white">
        <Markdown>{data}</Markdown>
      </div>
    </ReportSection>
  );
}
