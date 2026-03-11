import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getToken, encode } from "@auth/core/jwt";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { normalizeSubdominio } from "@/lib/subdomain";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "autokpi.net";
const isProduction = process.env.NODE_ENV === "production";
const COOKIE_NAME = isProduction
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";
const cookieDomain = isProduction ? `.${ROOT_DOMAIN}` : undefined;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const subdominio = searchParams.get("subdominio")?.trim().toLowerCase();
  if (!subdominio) {
    return NextResponse.json(
      { error: "Falta subdominio" },
      { status: 400 }
    );
  }

  const session = await auth();
  if (!session?.user?.platformAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Buscar por valor exacto (p. ej. "imexico-real-state" o "https://imexico-real-state.autokpi.net")
  let [cuenta] = await db
    .select({ id_cuenta: cuentas.id_cuenta, subdominio: cuentas.subdominio })
    .from(cuentas)
    .where(eq(cuentas.subdominio, subdominio))
    .limit(1);

  if (!cuenta) {
    const slug = normalizeSubdominio(subdominio);
    if (slug) {
      const todas = await db.select({ id_cuenta: cuentas.id_cuenta, subdominio: cuentas.subdominio }).from(cuentas);
      cuenta = todas.find((c) => normalizeSubdominio(c.subdominio) === slug) ?? null;
    }
  }

  if (!cuenta) {
    return NextResponse.json(
      { error: "Tenant no encontrado" },
      { status: 404 }
    );
  }

  const subdominioSlug = normalizeSubdominio(cuenta.subdominio) ?? cuenta.subdominio;

  const token = await getToken({
    req,
    cookieName: COOKIE_NAME,
    secret: process.env.AUTH_SECRET!,
    salt: COOKIE_NAME,
  });

  if (!token) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 401 });
  }

  const newToken = {
    ...token,
    subdominio: subdominioSlug,
    id_cuenta: cuenta.id_cuenta,
  };

  const encoded = await encode({
    token: newToken,
    secret: process.env.AUTH_SECRET!,
    salt: COOKIE_NAME,
  });

  const currentHost = req.headers.get("host") ?? "";
  const isLocalDev = currentHost.includes("localhost");
  const protocol = req.headers.get("x-forwarded-proto") || (isLocalDev ? "http" : "https");
  const portPart = currentHost.includes(":") ? ":" + currentHost.split(":")[1] : "";
  const host = isLocalDev
    ? `${subdominioSlug}.localhost${portPart}`
    : `${subdominioSlug}.${ROOT_DOMAIN}`;
  const redirectUrl = `${protocol}://${host}/dashboard`;

  const res = NextResponse.redirect(redirectUrl);
  res.cookies.set(COOKIE_NAME, encoded, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    domain: cookieDomain,
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
