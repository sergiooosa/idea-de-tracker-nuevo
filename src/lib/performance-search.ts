/** Normaliza texto para búsqueda (minúsculas, sin acentos básicos) */
export function normalizeSearch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Solo dígitos para matchear teléfonos aunque el usuario escriba sin + */
export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * ¿La aguja matchea el heno? Soporta búsqueda por dígitos en teléfonos.
 */
export function matchesLeadSearch(needleRaw: string, fields: (string | null | undefined)[]): boolean {
  const n = needleRaw.trim();
  if (!n) return true;
  const needle = normalizeSearch(n);
  const needleDigits = digitsOnly(n);
  const hay = fields
    .filter(Boolean)
    .map((f) => String(f))
    .join(" ")
    .toLowerCase();
  const hayNorm = normalizeSearch(hay);
  if (hayNorm.includes(needle)) return true;
  if (needleDigits.length >= 3) {
    const hayDigits = digitsOnly(hay);
    if (hayDigits.includes(needleDigits)) return true;
  }
  return false;
}
