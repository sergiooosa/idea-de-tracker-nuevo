import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "super_verified";
const TTL_MS = 15 * 60 * 1000; // 15 minutos

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET required for super verify");
  return s;
}

export function getSuperCookieName(): string {
  return COOKIE_NAME;
}

/** Crea el valor de la cookie (payload firmado con expiración). */
export function createSuperCookieValue(): string {
  const payload = JSON.stringify({
    exp: Date.now() + TTL_MS,
  });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

/** Verifica la cookie y devuelve true si es válida y no expirada. */
export function verifySuperCookie(value: string | undefined | null): boolean {
  if (!value || typeof value !== "string") return false;
  const parts = value.split(".");
  if (parts.length !== 2) return false;
  const [encoded, sig] = parts;
  try {
    const expectedSig = createHmac("sha256", getSecret()).update(encoded).digest("base64url");
    if (expectedSig.length !== sig.length || !timingSafeEqual(Buffer.from(expectedSig, "utf8"), Buffer.from(sig, "utf8"))) {
      return false;
    }
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}
