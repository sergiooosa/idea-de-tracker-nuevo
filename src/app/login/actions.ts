"use server";

import { signIn, auth } from "@/lib/auth";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { usuariosDashboard, cuentas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

  const result = await db
    .select({ subdominio: cuentas.subdominio })
    .from(usuariosDashboard)
    .innerJoin(cuentas, eq(usuariosDashboard.id_cuenta, cuentas.id_cuenta))
    .where(eq(usuariosDashboard.email, email))
    .limit(1);

  if (result.length === 0) {
    return { error: "No se encontró la cuenta asociada." };
  }

  return { subdominio: result[0].subdominio };
}
