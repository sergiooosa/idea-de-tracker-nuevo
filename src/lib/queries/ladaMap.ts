// AutoKPI — Report v2 · WS2 — mapeo lada → zona geográfica (AUT-1305)
// -----------------------------------------------------------------------------
// La ubicación del lead es SIEMPRE aproximada: se deriva de la lada del teléfono,
// NO de un dato declarado. El contrato (`ReportV2UbicacionItem.aprox`) exige
// etiquetarla como aproximada. Cubrimos las ladas mexicanas más frecuentes;
// números de +1 se agrupan como EE.UU./Canadá y el resto cae en "México (otra)"
// o "Desconocida". No inventamos precisión que el dato no tiene.
// -----------------------------------------------------------------------------

/** Ladas de 2 dígitos (las 3 grandes zonas metropolitanas). */
const LADA2: Record<string, string> = {
  "55": "CDMX / Edo. de México",
  "33": "Guadalajara (Jalisco)",
  "81": "Monterrey (Nuevo León)",
};

/** Ladas de 3 dígitos → zona/estado (subconjunto frecuente). */
const LADA3: Record<string, string> = {
  "222": "Puebla",
  "228": "Xalapa (Veracruz)",
  "229": "Veracruz",
  "231": "Tehuacán (Puebla)",
  "246": "Tlaxcala",
  "248": "Tlaxcala",
  "271": "Orizaba (Veracruz)",
  "281": "Coatzacoalcos (Veracruz)",
  "296": "Córdoba (Veracruz)",
  "311": "Tepic (Nayarit)",
  "312": "Colima",
  "314": "Manzanillo (Colima)",
  "351": "Zamora (Michoacán)",
  "353": "La Piedad (Michoacán)",
  "376": "Chapala (Jalisco)",
  "381": "Jalisco (interior)",
  "411": "Guanajuato (interior)",
  "415": "San Miguel de Allende (Guanajuato)",
  "442": "Querétaro",
  "443": "Morelia (Michoacán)",
  "444": "San Luis Potosí",
  "449": "Aguascalientes",
  "461": "Celaya (Guanajuato)",
  "462": "Irapuato (Guanajuato)",
  "464": "Salamanca (Guanajuato)",
  "473": "Guanajuato",
  "477": "León (Guanajuato)",
  "492": "Zacatecas",
  "494": "Zacatecas (interior)",
  "551": "CDMX / Edo. de México",
  "552": "CDMX / Edo. de México",
  "553": "CDMX / Edo. de México",
  "554": "CDMX / Edo. de México",
  "556": "CDMX / Edo. de México",
  "557": "CDMX / Edo. de México",
  "558": "CDMX / Edo. de México",
  "612": "La Paz (BCS)",
  "614": "Chihuahua",
  "618": "Durango",
  "624": "Los Cabos (BCS)",
  "656": "Ciudad Juárez (Chihuahua)",
  "662": "Hermosillo (Sonora)",
  "664": "Tijuana (Baja California)",
  "667": "Culiacán (Sinaloa)",
  "668": "Los Mochis (Sinaloa)",
  "669": "Mazatlán (Sinaloa)",
  "686": "Mexicali (Baja California)",
  "687": "Guasave (Sinaloa)",
  "722": "Toluca (Edo. de México)",
  "744": "Acapulco (Guerrero)",
  "747": "Chilpancingo (Guerrero)",
  "753": "Lázaro Cárdenas (Michoacán)",
  "755": "Zihuatanejo (Guerrero)",
  "761": "Tulancingo (Hidalgo)",
  "771": "Pachuca (Hidalgo)",
  "777": "Cuernavaca (Morelos)",
  "779": "Tizayuca (Hidalgo)",
  "833": "Tampico (Tamaulipas)",
  "834": "Ciudad Victoria (Tamaulipas)",
  "844": "Saltillo (Coahuila)",
  "867": "Nuevo Laredo (Tamaulipas)",
  "868": "Matamoros (Tamaulipas)",
  "871": "Torreón (Coahuila)",
  "899": "Reynosa (Tamaulipas)",
  "921": "Coatzacoalcos (Veracruz)",
  "951": "Oaxaca",
  "958": "Puerto Escondido (Oaxaca)",
  "961": "Tuxtla Gutiérrez (Chiapas)",
  "962": "Tapachula (Chiapas)",
  "967": "San Cristóbal (Chiapas)",
  "981": "Campeche",
  "984": "Playa del Carmen (Quintana Roo)",
  "987": "Cozumel (Quintana Roo)",
  "988": "Ciudad del Carmen (Campeche)",
  "993": "Villahermosa (Tabasco)",
  "998": "Cancún (Quintana Roo)",
  "999": "Mérida (Yucatán)",
};

/** Etiqueta usada cuando el número es válido pero la lada no está mapeada. */
export const ZONA_MX_OTRA = "México (otra)";
export const ZONA_EEUU = "EE.UU. / Canadá";
export const ZONA_DESCONOCIDA = "Desconocida";

/**
 * Deriva la zona geográfica APROXIMADA a partir del teléfono crudo del lead.
 * Devuelve `null` sólo si no hay teléfono; cualquier número no reconocido cae en
 * "Desconocida" para que el denominador de ubicación siga siendo honesto.
 */
export function phoneToZona(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return ZONA_DESCONOCIDA;

  // +1 (EE.UU./Canadá): 11 dígitos que arrancan en 1.
  if (digits.length === 11 && digits.startsWith("1")) return ZONA_EEUU;

  // México: normalizar a 10 dígitos nacionales.
  let nat = digits;
  if (nat.startsWith("52")) {
    nat = nat.slice(2);
    // 521 = prefijo móvil histórico → 11 dígitos con 1 inicial redundante.
    if (nat.length === 11 && nat.startsWith("1")) nat = nat.slice(1);
  }
  if (nat.length !== 10) {
    // 10 dígitos "pelados" (sin país) → asumir nacional MX.
    if (digits.length === 10) nat = digits;
    else return ZONA_DESCONOCIDA;
  }

  const lada2 = nat.slice(0, 2);
  if (LADA2[lada2]) return LADA2[lada2];
  const lada3 = nat.slice(0, 3);
  return LADA3[lada3] ?? ZONA_MX_OTRA;
}
