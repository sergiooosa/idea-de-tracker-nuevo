import type { ReportV2Data } from '@/types/report-v2';

export function getMockReportV2(canales: ('llamadas' | 'chats' | 'video')[]): ReportV2Data {
  const hasLlamadas = canales.includes('llamadas');
  const hasChats = canales.includes('chats');
  const hasVideo = canales.includes('video');

  return {
    cuenta: {
      nombre: 'Demo Empresa',
      subdominio: 'demo',
      canalesActivos: canales,
    },
    periodo: { from: '2026-06-01', to: '2026-06-30', dias: 30 },
    kpis: {
      leadsAnalizados: 342,
      nuevos: 289,
      reactivados: 53,
      citasAgendadas: 87,
      citasRealizadas: 64,
      showRate: 0.736,
    },
    narrativa:
      'Durante junio se analizaron 342 leads, de los cuales 289 fueron nuevos y 53 reactivados. La tasa de contacto general fue del 68%, con el canal de llamadas mostrando el mejor rendimiento en velocidad de respuesta (promedio 12 min). Se detectaron 23 leads sin actividad en más de 5 días, concentrados principalmente en el asesor Carlos Ruiz. El show rate de videollamadas se mantiene en 73.6%, por encima del benchmark del sector (65%).',
    funnel: {
      analizados: 342,
      steps: [
        { label: 'Con intento de contacto', count: 310, pct: 0.906 },
        { label: 'Conversación efectiva', count: 233, pct: 0.681 },
        { label: 'Calificaron', count: 156, pct: 0.456 },
        { label: 'Cita agendada', count: 87, pct: 0.254 },
        { label: 'Cita realizada', count: 64, pct: 0.187 },
        { label: 'Visita / propuesta', count: 41, pct: 0.12 },
      ],
    },
    estadoFinal: [
      { estado: 'En conversación', count: 77, pct: 0.225, canal: 'general' },
      { estado: 'Calificados', count: 156, pct: 0.456, canal: 'general' },
      { estado: 'No calificados', count: 52, pct: 0.152, canal: 'general' },
      { estado: 'Contactados sin respuesta', count: 25, pct: 0.073, canal: 'general' },
      { estado: 'Un solo intento', count: 18, pct: 0.053, canal: 'general' },
      { estado: 'Sin actividad', count: 14, pct: 0.041, canal: 'general' },
    ],
    origen: {
      nuevos: 289,
      reactivados: 53,
      narrativaReactivacion:
        '53 leads que habían dejado de responder fueron recontactados exitosamente. El 62% de ellos provino del canal de llamadas.',
      porCanal: hasLlamadas && hasChats
        ? [
            { canal: 'Llamadas', nuevos: 178, reactivados: 33 },
            { canal: 'Chats', nuevos: 89, reactivados: 15 },
            { canal: 'Video', nuevos: 22, reactivados: 5 },
          ]
        : hasLlamadas
          ? [{ canal: 'Llamadas', nuevos: 289, reactivados: 53 }]
          : [{ canal: 'Chats', nuevos: 289, reactivados: 53 }],
    },
    higieneCRM: {
      leadsSinActividad: 23,
      porAsesor: [
        { nombre: 'Carlos Ruiz', count: 9 },
        { nombre: 'María López', count: 7 },
        { nombre: 'Ana Torres', count: 4 },
        { nombre: 'Pedro Sánchez', count: 3 },
      ],
      detalle: [
        { nombre: 'Juan García', asesor: 'Carlos Ruiz', diasSinActividad: 12 },
        { nombre: 'Laura Méndez', asesor: 'Carlos Ruiz', diasSinActividad: 9 },
        { nombre: 'Roberto Silva', asesor: 'María López', diasSinActividad: 8 },
        { nombre: 'Andrea Vega', asesor: 'María López', diasSinActividad: 7 },
        { nombre: 'Miguel Ángel', asesor: 'Ana Torres', diasSinActividad: 6 },
      ],
    },
    porCanal: {
      llamadas: hasLlamadas
        ? {
            realizadas: 726,
            leadsLlamados: 245,
            contestaronPorLead: 168,
            calificados: 120,
            noCalificados: 48,
            intentosProm: 2.8,
            speedToLeadProm: 12,
            duracionPromContestadas: 4.5,
            mejorFranja: '10:00 - 12:00',
          }
        : null,
      chats: hasChats
        ? {
            conversaciones: 432,
            mensajes: 2150,
            respondieron: 310,
            tPrimeraRespuesta: 3.2,
            conBot: 180,
            escaladas: 95,
          }
        : null,
      video: hasVideo
        ? {
            agendadas: 87,
            realizadas: 64,
            showRate: 0.736,
            calificados: 45,
            noCalificados: 19,
            reagendadas: 12,
            noShow: 11,
            duracionProm: 28,
            avanzaron: 41,
          }
        : null,
    },
    demografia: {
      ubicacion: [
        { zona: 'CDMX / Área Metropolitana', count: 98, canal: 'llamadas' },
        { zona: 'Guadalajara', count: 45, canal: 'llamadas' },
        { zona: 'Monterrey', count: 38, canal: 'llamadas' },
        { zona: 'Puebla', count: 22, canal: 'chats' },
        { zona: 'Cancún', count: 18, canal: 'llamadas' },
        { zona: 'USA / Canadá', count: 12, canal: 'llamadas' },
      ],
      motivo: [
        { motivo: 'Inversión', count: 89 },
        { motivo: 'Vivienda propia', count: 67 },
        { motivo: 'Renta vacacional', count: 34 },
        { motivo: 'Reubicación', count: 21 },
      ],
      perfil: ['Profesionales 35-50 años', 'Parejas con hijos', 'Inversionistas recurrentes'],
      edadDominante: '35-45 años',
      presupuestoProm: 3500000,
      denominador: 211,
    },
    comparativo: {
      periodoActual: '01 jun – 30 jun 2026',
      periodoAnterior: '01 may – 31 may 2026',
      rows: [
        { metric: 'Leads analizados', actual: 342, anterior: 298, delta: 14.8, subirEsBueno: true },
        { metric: 'Tasa de conversación', actual: 68, anterior: 61, delta: 11.5, subirEsBueno: true },
        { metric: 'Tasa de calificación', actual: 45.6, anterior: 42.1, delta: 8.3, subirEsBueno: true },
        { metric: 'Citas agendadas', actual: 87, anterior: 72, delta: 20.8, subirEsBueno: true },
        { metric: 'Show rate', actual: 73.6, anterior: 68.2, delta: 7.9, subirEsBueno: true },
        { metric: 'Sin actividad', actual: 23, anterior: 31, delta: -25.8, subirEsBueno: false },
      ],
    },
    cobertura: {
      canalesPorLead: [
        { label: 'Llamada + Chat', count: 89, pct: 0.26 },
        { label: 'Solo llamada', count: 156, pct: 0.456 },
        { label: 'Solo chat', count: 78, pct: 0.228 },
        { label: 'Solo video', count: 19, pct: 0.056 },
      ],
      aQueIntentoContesta: [
        { intento: '1er intento', count: 98, pct: 0.399 },
        { intento: '2do intento', count: 67, pct: 0.273 },
        { intento: '3er intento', count: 45, pct: 0.183 },
        { intento: '4+ intentos', count: 35, pct: 0.143 },
      ],
      franjasHorarias: [
        { franja: '08:00–10:00', tasaRespuesta: 0.52, total: 45 },
        { franja: '10:00–12:00', tasaRespuesta: 0.78, total: 89 },
        { franja: '12:00–14:00', tasaRespuesta: 0.61, total: 67 },
        { franja: '14:00–16:00', tasaRespuesta: 0.69, total: 72 },
        { franja: '16:00–18:00', tasaRespuesta: 0.55, total: 38 },
        { franja: '18:00–20:00', tasaRespuesta: 0.42, total: 25 },
      ],
    },
    conversaciones: {
      llamadas: hasLlamadas
        ? {
            canal: 'llamadas',
            recepcionTono: [
              { label: 'Positivo', count: 120, pct: 0.52 },
              { label: 'Neutral', count: 85, pct: 0.37 },
              { label: 'Negativo', count: 28, pct: 0.12 },
            ],
            entendiaContexto: [
              { label: 'Sí', count: 178, pct: 0.76 },
              { label: 'Parcial', count: 38, pct: 0.16 },
              { label: 'No', count: 17, pct: 0.07 },
            ],
            aceptacion: [
              { label: 'Alta', count: 95, pct: 0.41 },
              { label: 'Media', count: 98, pct: 0.42 },
              { label: 'Baja', count: 40, pct: 0.17 },
            ],
            engagement: [
              { label: 'Alto', count: 88, pct: 0.38 },
              { label: 'Medio', count: 110, pct: 0.47 },
              { label: 'Bajo', count: 35, pct: 0.15 },
            ],
            calidadCierre: [
              { label: 'Bueno', count: 102, pct: 0.44 },
              { label: 'Regular', count: 89, pct: 0.38 },
              { label: 'Malo', count: 42, pct: 0.18 },
            ],
            narrativa:
              'En las llamadas, los asesores muestran un buen tono inicial (52% positivo) y conocimiento del contexto (76%). Sin embargo, la calidad de cierre tiene margen de mejora: solo el 44% logra un cierre efectivo.',
            totalAnalizadas: 233,
          }
        : null,
      chats: hasChats
        ? {
            canal: 'chats',
            recepcionTono: [
              { label: 'Positivo', count: 145, pct: 0.47 },
              { label: 'Neutral', count: 130, pct: 0.42 },
              { label: 'Negativo', count: 35, pct: 0.11 },
            ],
            entendiaContexto: [
              { label: 'Sí', count: 210, pct: 0.68 },
              { label: 'Parcial', count: 72, pct: 0.23 },
              { label: 'No', count: 28, pct: 0.09 },
            ],
            aceptacion: [
              { label: 'Alta', count: 120, pct: 0.39 },
              { label: 'Media', count: 135, pct: 0.44 },
              { label: 'Baja', count: 55, pct: 0.18 },
            ],
            engagement: [
              { label: 'Alto', count: 95, pct: 0.31 },
              { label: 'Medio', count: 155, pct: 0.50 },
              { label: 'Bajo', count: 60, pct: 0.19 },
            ],
            calidadCierre: [
              { label: 'Bueno', count: 88, pct: 0.28 },
              { label: 'Regular', count: 142, pct: 0.46 },
              { label: 'Malo', count: 80, pct: 0.26 },
            ],
            narrativa:
              'En chats, la recepción es generalmente positiva pero el engagement tiende a ser medio. La calidad de cierre es menor que en llamadas, sugiriendo que los asesores necesitan técnicas de cierre adaptadas al formato escrito.',
            totalAnalizadas: 310,
          }
        : null,
      video: hasVideo
        ? {
            canal: 'video',
            recepcionTono: [
              { label: 'Positivo', count: 42, pct: 0.66 },
              { label: 'Neutral', count: 18, pct: 0.28 },
              { label: 'Negativo', count: 4, pct: 0.06 },
            ],
            entendiaContexto: [
              { label: 'Sí', count: 52, pct: 0.81 },
              { label: 'Parcial', count: 10, pct: 0.16 },
              { label: 'No', count: 2, pct: 0.03 },
            ],
            aceptacion: [
              { label: 'Alta', count: 38, pct: 0.59 },
              { label: 'Media', count: 20, pct: 0.31 },
              { label: 'Baja', count: 6, pct: 0.09 },
            ],
            engagement: [
              { label: 'Alto', count: 44, pct: 0.69 },
              { label: 'Medio', count: 16, pct: 0.25 },
              { label: 'Bajo', count: 4, pct: 0.06 },
            ],
            calidadCierre: [
              { label: 'Bueno', count: 41, pct: 0.64 },
              { label: 'Regular', count: 18, pct: 0.28 },
              { label: 'Malo', count: 5, pct: 0.08 },
            ],
            narrativa:
              'Las videollamadas muestran los mejores indicadores: 66% de recepción positiva, 81% entiende el contexto, y 64% logra un buen cierre. El formato visual favorece el engagement (69% alto).',
            totalAnalizadas: 64,
          }
        : null,
    },
    rankingAsesores: {
      destacados: [
        { nombre: 'Ana Torres', razon: 'Mejor tasa de contacto', valor: '82%' },
        { nombre: 'María López', razon: 'Más rápida en responder', valor: '4 min' },
        { nombre: 'Pedro Sánchez', razon: 'Mayor seguimiento', valor: '3.2 intentos/lead' },
        { nombre: 'Ana Torres', razon: 'Más llamadas realizadas', valor: '198' },
      ],
      tabla: [
        { nombre: 'Ana Torres', leads: 95, seguimiento: 82, llamadas: 198, contactoPct: 0.82, spdLead: 8, intProm: 3.1, dosIntPct: 0.78, citas: 28, asistieron: 22, score: 91 },
        { nombre: 'María López', leads: 78, seguimiento: 65, llamadas: 156, contactoPct: 0.75, spdLead: 4, intProm: 2.8, dosIntPct: 0.72, citas: 22, asistieron: 17, score: 85 },
        { nombre: 'Pedro Sánchez', leads: 88, seguimiento: 76, llamadas: 178, contactoPct: 0.71, spdLead: 11, intProm: 3.2, dosIntPct: 0.81, citas: 21, asistieron: 14, score: 79 },
        { nombre: 'Carlos Ruiz', leads: 81, seguimiento: 45, llamadas: 142, contactoPct: 0.58, spdLead: 22, intProm: 1.9, dosIntPct: 0.45, citas: 16, asistieron: 11, score: 52 },
      ],
      alertas: [
        { nombre: 'Carlos Ruiz', alerta: 'Speed-to-lead de 22 min, muy por encima del umbral de 15 min', nivel: 'danger' },
        { nombre: 'Carlos Ruiz', alerta: '9 leads sin actividad en 5+ días', nivel: 'danger' },
        { nombre: 'Pedro Sánchez', alerta: 'Show rate bajo: 67% (14/21 citas)', nivel: 'warning' },
      ],
    },
    objeciones: [
      { objecion: 'Precio muy alto', frecuencia: 45, fraseTextual: '"Me parece caro para lo que ofrece"' },
      { objecion: 'Necesita pensarlo', frecuencia: 38, fraseTextual: '"Déjame consultarlo con mi pareja"' },
      { objecion: 'Ya tiene otro proveedor', frecuencia: 22, fraseTextual: '"Ya estoy viendo opciones con otra empresa"' },
      { objecion: 'No es el momento', frecuencia: 18, fraseTextual: '"Ahora no, tal vez el próximo año"' },
      { objecion: 'Ubicación no conveniente', frecuencia: 12, fraseTextual: '"Me queda lejos, busco algo más cerca"' },
    ],
    frasesRepetitivas: [
      { frase: '"¿Cuál es el precio?"', numLeads: 89, insight: 'Los leads preguntan por precio antes de conocer el producto — oportunidad de reordenar el pitch' },
      { frase: '"¿Tienen financiamiento?"', numLeads: 67, insight: 'Alta demanda de opciones de financiamiento — considerar alianzas con bancos' },
      { frase: '"¿Me pueden enviar información?"', numLeads: 45, insight: 'Leads prefieren material escrito — preparar brochure digital actualizado' },
      { frase: '"Lo voy a pensar"', numLeads: 38, insight: 'Señal de indecisión — implementar técnica de urgencia/escasez' },
    ],
    conclusiones: [
      'Incrementar velocidad de respuesta en llamadas: 12 min promedio es alto. Meta: < 5 min.',
      'Asesor Carlos Ruiz necesita coaching urgente: 9 leads abandonados y speed-to-lead de 22 min.',
      'El canal de videollamadas muestra los mejores indicadores de engagement (69% alto) — priorizar agendamiento.',
      'Implementar técnicas de cierre para chats: solo 28% logra buen cierre vs 44% en llamadas.',
      'La objeción #1 es precio (45 menciones) — revisar si el pitch está anclando valor antes de mencionar costo.',
    ],
  };
}
