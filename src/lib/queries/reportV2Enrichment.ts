// AutoKPI — Report v2 · WS1 enrichment provider (AUT-1302 / depende de AUT-1301)
// -----------------------------------------------------------------------------
// Interfaz de los campos que produce el pase IA de Cerebro (WS1). Mientras WS1
// (AUT-1301) aterriza sus columnas nuevas, WS2 consume un MOCK que devuelve
// null/vacío y marca `parcial: true` para que el reporte salga honesto (nunca
// ceros disfrazados de dato). Cuando WS1 exponga las columnas, se reemplaza
// `getEnrichmentMock` por `getEnrichmentFromDb` sin tocar el shape del contrato.
// -----------------------------------------------------------------------------

import type {
  ReportV2Conversaciones,
  ReportV2Demografia,
  ReportV2Distribucion,
} from "@/types/reportV2";

/**
 * Enriquecimiento IA por cuenta+periodo. Todos los campos son opcionales/nulos
 * hasta que WS1 los llene. `parcial` = el pase Gemini aún no cubre el periodo.
 */
export interface ReportV2Enrichment {
  parcial: boolean;
  demografiaIA: {
    motivo: ReportV2Distribucion[];
    perfil: ReportV2Distribucion[];
    edadDominante: string | null;
    presupuestoProm: number | null;
    iaDenominador: number;
  };
  conversaciones: ReportV2Conversaciones;
  /** Narrativas cualitativas IA por sección. */
  narrativas: {
    reactivacion: string | null;
    rankingAlertas: string | null;
  };
  frasesInsights: Record<string, string>; // frase → insight IA
  objecionesFraseTextual: Record<string, string>; // objecion → ejemplo textual
  conclusiones: string[]; // acciones recomendadas IA
}

/** Enrichment vacío/honesto usado mientras WS1 (AUT-1301) no aterriza. */
export function getEnrichmentMock(): ReportV2Enrichment {
  const emptyDemografia: ReportV2Demografia["motivo"] = [];
  return {
    parcial: true,
    demografiaIA: {
      motivo: emptyDemografia,
      perfil: [],
      edadDominante: null,
      presupuestoProm: null,
      iaDenominador: 0,
    },
    conversaciones: {
      llamadas: null,
      chats: null,
      video: null,
    },
    narrativas: {
      reactivacion: null,
      rankingAlertas: null,
    },
    frasesInsights: {},
    objecionesFraseTextual: {},
    conclusiones: [],
  };
}
