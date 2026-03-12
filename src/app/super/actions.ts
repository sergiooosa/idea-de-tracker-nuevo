"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  createSuperCookieValue,
  getSuperCookieName,
} from "@/lib/super-verify";

export async function verifySuperAccess(formData: FormData) {
  const session = await auth();
  if (!session?.user?.platformAdmin) {
    return { error: "No tienes permiso para acceder." };
  }

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  const platformEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD;

  if (!platformEmail || !platformPassword) {
    return { error: "Acceso no configurado." };
  }

  if (!email || !password) {
    return { error: "Email y contraseña requeridos." };
  }

  if (email !== platformEmail || password !== platformPassword) {
    return { error: "Credenciales incorrectas." };
  }

  const cookieStore = await cookies();
  cookieStore.set(getSuperCookieName(), createSuperCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 900, // 15 min
  });

  redirect("/super");
}
