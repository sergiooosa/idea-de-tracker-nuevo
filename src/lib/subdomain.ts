const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "autokpi.net";

/**
 * Normaliza un valor de subdominio que puede venir como slug ("imexico-real-state")
 * o como URL completa ("https://imexico-real-state.autokpi.net") y devuelve
 * siempre solo el slug para comparaciones y construcción de URLs.
 */
export function normalizeSubdominio(
  raw: string | null | undefined,
  rootDomain: string = ROOT_DOMAIN
): string | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  try {
    if (s.includes("://")) {
      const url = new URL(s.startsWith("http") ? s : "https://" + s);
      const host = url.hostname;
      if (host.endsWith("." + rootDomain)) {
        return host.slice(0, -(rootDomain.length + 1));
      }
      if (host === rootDomain) return null;
      return host;
    }
    if (s.endsWith("." + rootDomain)) {
      return s.slice(0, -(rootDomain.length + 1));
    }
    return s;
  } catch {
    return s;
  }
}
