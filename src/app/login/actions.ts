"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { usuariosDashboard, cuentas, accesosDashboard } from "@/lib/db/schema";
import { normalizeSubdominio } from "@/lib/subdomain";
import { eq } from "drizzle-orm";

export interface AccountOption {
  id_cuenta: number;
  nombre_cuenta: string | null;
  subdominio: string;
}

export async function loginAction(formData: {
  email: string;
  password: string;
  subdominio_override?: string;
}) {
  const email = formData.email.trim().toLowerCase();

  try {
    await signIn("credentials", {
      email,
      password: formData.password,
      subdominio_override: formData.subdominio_override ?? "",
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      console.error("[login] AuthError type:", error.type, "cause:", (error.cause as { err?: { message?: string } })?.err?.message ?? "none");
      if (error.type === "CredentialsSignin") {
        return {
          error: "Credenciales incorrectas. Verifica tu email y contraseña.",
        };
      }
      return {
        error: "Error de autenticación. Intenta de nuevo.",
      };
    }
    throw error;
  }

  // AUT-1875: registrar acceso buscando el usuario directamente en BD,
  // no vía auth() que no tiene la cookie aún en este request.
  const userRows = await db
    .select({
      id_cuenta: usuariosDashboard.id_cuenta,
      nombre: usuariosDashboard.nombre,
    })
    .from(usuariosDashboard)
    .where(eq(usuariosDashboard.email, email))
    .limit(1);

  try {
    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? hdrs.get("x-real-ip")
      ?? null;
    const userAgent = hdrs.get("user-agent") ?? null;
    await db.insert(accesosDashboard).values({
      id_cuenta: userRows[0]?.id_cuenta ?? null,
      email,
      nombre: userRows[0]?.nombre ?? null,
      ip,
      user_agent: userAgent,
    });
  } catch (e) {
    console.error("[login] error registrando acceso:", e);
  }

  const platformEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  if (platformEmail && email === platformEmail) {
    return { platformAdmin: true };
  }

  // Si ya viene con subdominio_override, el JWT ya tiene el correcto
  if (formData.subdominio_override) {
    const slug = normalizeSubdominio(formData.subdominio_override) ?? formData.subdominio_override;
    return { subdominio: slug };
  }

  const results = await db
    .select({
      id_cuenta: cuentas.id_cuenta,
      nombre_cuenta: cuentas.nombre_cuenta,
      subdominio: cuentas.subdominio,
    })
    .from(usuariosDashboard)
    .innerJoin(cuentas, eq(usuariosDashboard.id_cuenta, cuentas.id_cuenta))
    .where(eq(usuariosDashboard.email, email));

  if (results.length === 0) {
    return { error: "No se encontró la cuenta asociada." };
  }

  if (results.length === 1) {
    const subdominioSlug =
      normalizeSubdominio(results[0].subdominio) ?? results[0].subdominio;
    return { subdominio: subdominioSlug };
  }

  // Multiple accounts — let user choose
  const accounts: AccountOption[] = results.map((r) => ({
    id_cuenta: r.id_cuenta,
    nombre_cuenta: r.nombre_cuenta ?? null,
    subdominio: normalizeSubdominio(r.subdominio) ?? r.subdominio,
  }));

  return { accounts };
}
