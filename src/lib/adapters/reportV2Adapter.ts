import type { ReportV2 } from "@/types/reportV2";
import type {
  ReportV2Data,
  ReportV2ConversacionesCanal,
  ReportV2AsesorDestacado,
  ReportV2AsesorAlerta,
} from "@/types/report-v2";

function adaptConversacionCanal(
  canal: string,
  src: NonNullable<ReportV2["conversaciones"]["llamadas"]>,
): ReportV2ConversacionesCanal {
  return {
    canal,
    recepcionTono: src.recepcion,
    entendiaContexto: src.entendiaContexto,
    aceptacion: src.aceptacion,
    engagement: src.engagement,
    calidadCierre: src.calidadCierre,
    narrativa: src.narrativaAsesor ?? null,
    totalAnalizadas: src.totalAnalizadas,
  };
}

function adaptDestacados(
  src: ReportV2["rankingAsesores"]["destacados"],
): ReportV2AsesorDestacado[] {
  const items: ReportV2AsesorDestacado[] = [];
  if (src.mejor)
    items.push({ nombre: src.mejor, razon: "Mejor score", valor: "" });
  if (src.masRapido)
    items.push({
      nombre: src.masRapido,
      razon: "Más rápido en responder",
      valor: "",
    });
  if (src.masSeguimiento)
    items.push({
      nombre: src.masSeguimiento,
      razon: "Mayor seguimiento",
      valor: "",
    });
  if (src.masLlamadas)
    items.push({
      nombre: src.masLlamadas,
      razon: "Más llamadas realizadas",
      valor: "",
    });
  return items;
}

function adaptAlertas(
  alertas: string | null,
): ReportV2AsesorAlerta[] {
  if (!alertas) return [];
  return alertas
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      nombre: "",
      alerta: line,
      nivel: line.toLowerCase().includes("urgente") ||
        line.toLowerCase().includes("crítico")
        ? ("danger" as const)
        : ("warning" as const),
    }));
}

export function adaptReportV2(api: ReportV2): ReportV2Data {
  const canalesActivos = (
    Object.entries(api.meta.canalesActivos) as [string, boolean][]
  )
    .filter(([, active]) => active)
    .map(([canal]) => canal) as ("llamadas" | "chats" | "video")[];

  const totalEstadoFinal =
    api.estadoFinal.enConversacion +
    api.estadoFinal.calificados +
    api.estadoFinal.noCalificados +
    api.estadoFinal.contactadosSinRespuesta +
    api.estadoFinal.unSoloIntento +
    api.estadoFinal.sinActividad;

  const efEntries: [string, number][] = [
    ["En conversación", api.estadoFinal.enConversacion],
    ["Calificados", api.estadoFinal.calificados],
    ["No calificados", api.estadoFinal.noCalificados],
    ["Contactados sin respuesta", api.estadoFinal.contactadosSinRespuesta],
    ["Un solo intento", api.estadoFinal.unSoloIntento],
    ["Sin actividad", api.estadoFinal.sinActividad],
  ];

  const coberturaTotal =
    api.cobertura.canalesPorLead.llamadaYChat +
    api.cobertura.canalesPorLead.soloLlamada +
    api.cobertura.canalesPorLead.soloChat;

  return {
    cuenta: {
      nombre: api.meta.nombre ?? api.meta.subdominio,
      subdominio: api.meta.subdominio,
      canalesActivos,
    },
    periodo: {
      from: api.meta.periodo.from,
      to: api.meta.periodo.to,
      dias: api.meta.periodo.dias,
    },
    kpis: api.kpis,
    narrativa: api.narrativa.resumenEjecutivo,
    funnel: {
      analizados: api.kpis.leadsAnalizados,
      steps: api.funnel.stages.map((s) => ({
        label: s.label,
        count: s.count,
        pct: s.pct,
      })),
    },
    estadoFinal: efEntries.map(([estado, count]) => ({
      estado,
      count,
      pct: totalEstadoFinal > 0 ? count / totalEstadoFinal : 0,
      canal: "general",
    })),
    origen: {
      nuevos: api.origen.nuevos,
      reactivados: api.origen.reactivados,
      narrativaReactivacion: api.origen.narrativaReactivacion,
      porCanal: [],
    },
    higieneCRM: {
      leadsSinActividad: api.higieneCRM.leadsSinActividadTotal,
      porAsesor: api.higieneCRM.porAsesor.map((a) => ({
        nombre: a.asesor,
        count: a.count,
      })),
      detalle: api.higieneCRM.detalle,
    },
    porCanal: {
      llamadas: api.porCanal.llamadas,
      chats: api.porCanal.chats,
      video: api.porCanal.video,
    },
    demografia: api.demografia
      ? {
          ubicacion: api.demografia.ubicacion.map((u) => ({
            zona: u.zona,
            count: u.count,
            canal: u.canal,
          })),
          motivo: api.demografia.motivo.map((m) => ({
            motivo: m.label,
            count: m.count,
          })),
          perfil: api.demografia.perfil.map((p) => p.label),
          edadDominante: api.demografia.edadDominante,
          presupuestoProm: api.demografia.presupuestoProm,
          denominador: api.demografia.ubicacionDenominador,
        }
      : null,
    comparativo: api.comparativo
      ? {
          periodoActual: `${api.meta.periodo.from} – ${api.meta.periodo.to}`,
          periodoAnterior: api.meta.periodoPrevio
            ? `${api.meta.periodoPrevio.from} – ${api.meta.periodoPrevio.to}`
            : "",
          rows: api.comparativo.filas.map((f) => ({
            metric: f.label,
            actual: f.actual,
            anterior: f.anterior,
            delta: f.variacionPct ?? 0,
            subirEsBueno: f.subirEsBueno,
          })),
        }
      : null,
    cobertura: {
      canalesPorLead: [
        {
          label: "Llamada + Chat",
          count: api.cobertura.canalesPorLead.llamadaYChat,
          pct:
            coberturaTotal > 0
              ? api.cobertura.canalesPorLead.llamadaYChat / coberturaTotal
              : 0,
        },
        {
          label: "Solo llamada",
          count: api.cobertura.canalesPorLead.soloLlamada,
          pct:
            coberturaTotal > 0
              ? api.cobertura.canalesPorLead.soloLlamada / coberturaTotal
              : 0,
        },
        {
          label: "Solo chat",
          count: api.cobertura.canalesPorLead.soloChat,
          pct:
            coberturaTotal > 0
              ? api.cobertura.canalesPorLead.soloChat / coberturaTotal
              : 0,
        },
      ],
      aQueIntentoContesta: api.cobertura.aQueIntentoContesta.map((d) => ({
        intento: d.label,
        count: d.count,
        pct: d.pct,
      })),
      franjasHorarias: api.cobertura.franjasHorarias.map((f) => ({
        franja: f.franja,
        tasaRespuesta: f.tasaRespuesta,
        total: f.total,
        asesores: f.asesores ?? [],
      })),
    },
    conversaciones: {
      llamadas: api.conversaciones.llamadas
        ? adaptConversacionCanal("llamadas", api.conversaciones.llamadas)
        : null,
      chats: api.conversaciones.chats
        ? adaptConversacionCanal("chats", api.conversaciones.chats)
        : null,
      video: api.conversaciones.video
        ? adaptConversacionCanal("video", api.conversaciones.video)
        : null,
    },
    rankingAsesores: {
      destacados: adaptDestacados(api.rankingAsesores.destacados),
      tabla: api.rankingAsesores.tabla.map((a) => ({
        nombre: a.nombre,
        leads: a.leads,
        seguimiento: a.seguimiento,
        llamadas: a.llamadas,
        contactoPct: a.contactoPct,
        spdLead: a.spdLead,
        intProm: a.intProm,
        dosIntPct: a.dosMasIntPct,
        citas: a.citas,
        asistieron: a.asistieron,
        score: a.score,
      })),
      alertas: adaptAlertas(api.rankingAsesores.alertas),
    },
    objeciones: api.objeciones.map((o) => ({
      objecion: o.nombre,
      frecuencia: o.count,
      fraseTextual: o.fraseTextual,
    })),
    frasesRepetitivas: api.frasesRepetitivas.map((f) => ({
      frase: f.frase,
      numLeads: f.leads,
      insight: f.insight,
    })),
    conclusiones: api.conclusiones,
  };
}
