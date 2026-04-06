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
    cerrada: 'Cerrado (compró)',
    seguimiento: 'En seguimiento',
    ofertada: 'En seguimiento',
    no_ofertada: 'En seguimiento',
    no_show: 'No asistió',
    noshow: 'No asistió',
    canceled: 'Cancelada',
    cancelada: 'Cancelada',
    pendiente: 'Pendiente',
    pdte: 'Pendiente',
  };
  if (map[outcome.toLowerCase()]) return map[outcome.toLowerCase()];
  // Valor desconocido (viene de GHL tal cual) — limpiar y capitalizar
  return outcome
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
