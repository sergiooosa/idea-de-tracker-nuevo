"use server";

import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { usuariosDashboard, cuentas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function loginAction(formData: { email: string; password: string }) {
  try {
    await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirect: false,
    });

    const result = await db
      .select({ subdominio: cuentas.subdominio })
      .from(usuariosDashboard)
      .innerJoin(cuentas, eq(usuariosDashboard.id_cuenta, cuentas.id_cuenta))
      .where(eq(usuariosDashboard.email, formData.email))
      .limit(1);

    if (result.length === 0) {
      return { error: "No se encontró la cuenta asociada." };
    }

    return { subdominio: result[0].subdominio };
  } catch {
    return { error: "Credenciales incorrectas. Verifica tu email y contraseña." };
  }
}
