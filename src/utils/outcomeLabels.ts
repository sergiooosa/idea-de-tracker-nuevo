// Traducción de outcomes a español en todo el dashboard

export function outcomeLlamadaToSpanish(outcome: string): string {
  const map: Record<string, string> = {
    answered: 'Contestó',
    no_answer: 'No contestó',
    completed: 'Completada',
    busy: 'Ocupado',
  };
  return map[outcome] ?? outcome;
}

export function outcomeVideollamadaToSpanish(outcome?: string): string {
  if (!outcome) return '—';
  const map: Record<string, string> = {
    cerrado: 'Cerrado (compró)',
    seguimiento: 'En seguimiento',
    no_show: 'No asistió',
    canceled: 'Cancelada',
  };
  return map[outcome] ?? outcome;
}
