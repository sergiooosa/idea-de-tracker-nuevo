"use server";

import { signIn, auth } from "@/lib/auth";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { usuariosDashboard, cuentas } from "@/lib/db/schema";
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
}) {
  const email = formData.email.trim().toLowerCase();

  try {
    await signIn("credentials", {
      email,
      password: formData.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      console.error("[login] AuthError type:", error.type);
      return {
        error: "Credenciales incorrectas. Verifica tu email y contraseña.",
      };
    }
    throw error;
  }

  const session = await auth();
  if (session?.user?.platformAdmin) {
    return { platformAdmin: true };
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
