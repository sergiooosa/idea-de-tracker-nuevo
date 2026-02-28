/** Metas de llamadas que el dueño/gerente configura. Se guardan en localStorage para que Panel asesor y Control del sistema las usen. */

export interface MetasLlamadas {
  metaLlamadasDiarias: number;
  leadsNuevosDia1: number;
  leadsNuevosDia2: number;
  leadsNuevosDia3: number;
}

const STORAGE_KEY = 'autokpi_metas';

const defaults: MetasLlamadas = {
  metaLlamadasDiarias: 50,
  leadsNuevosDia1: 3,
  leadsNuevosDia2: 4,
  leadsNuevosDia3: 5,
};

export function getMetasFromStorage(): MetasLlamadas {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<MetasLlamadas>;
    return {
      metaLlamadasDiarias: Math.max(1, Number(parsed.metaLlamadasDiarias) || defaults.metaLlamadasDiarias),
      leadsNuevosDia1: Math.max(0, Number(parsed.leadsNuevosDia1) ?? defaults.leadsNuevosDia1),
      leadsNuevosDia2: Math.max(0, Number(parsed.leadsNuevosDia2) ?? defaults.leadsNuevosDia2),
      leadsNuevosDia3: Math.max(0, Number(parsed.leadsNuevosDia3) ?? defaults.leadsNuevosDia3),
    };
  } catch {
    return defaults;
  }
}

export function saveMetasToStorage(metas: MetasLlamadas): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metas));
  } catch {
    // ignore
  }
}
