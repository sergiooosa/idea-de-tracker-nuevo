/**
 * POST /api/data/asesores/merge-suggestions/[id]/accept
 * Accepts a merge suggestion: runs the merge then marks the suggestion as accepted.
 * Body: { canonical_nombre?: string; canonical_email?: string }
 */
import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  closerMergeSuggestions,
  logLlamadas,
  registrosDeLlamada,
  resumenesDiariosAgendas,
  chatsLogs,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuthAndPermission(req, "configurar_sistema", async (idCuenta) => {
    const { id } = await params;
    const body = (await req.json()) as {
      canonical_nombre?: string;
      canonical_email?: string;
    };

    // Load the suggestion
    const [suggestion] = await db
      .select()
      .from(closerMergeSuggestions)
      .where(
        and(
          eq(closerMergeSuggestions.id, id),
          eq(closerMergeSuggestions.id_cuenta, idCuenta),
          eq(closerMergeSuggestions.status, "pending"),
        ),
      );

    if (!suggestion) {
      return NextResponse.json(
        { error: "Sugerencia no encontrada o ya procesada" },
        { status: 404 },
      );
    }

    const toNombre = body.canonical_nombre ?? suggestion.canonical_nombre;
    const toEmail = body.canonical_email ?? suggestion.canonical_email ?? null;

    // For each duplicate candidate (that is NOT the canonical), merge it into canonical
    const duplicates = suggestion.aliases.filter(
      (c) =>
        c.nombre.toLowerCase().trim() !== toNombre.toLowerCase().trim() ||
        (toEmail && c.email && c.email.toLowerCase().trim() !== toEmail.toLowerCase().trim()),
    );

    let totalLogLlamadas = 0;
    let totalRegistros = 0;
    let totalAgendas = 0;
    let totalChats = 0;

    for (const dup of duplicates) {
      const fromNombre = dup.nombre;
      const fromEmail = dup.email;

      const fromCondLog = fromEmail
        ? sql`LOWER(TRIM(COALESCE(${logLlamadas.closer_mail}, ''))) = LOWER(TRIM(${fromEmail}))`
        : sql`LOWER(TRIM(COALESCE(${logLlamadas.nombre_closer}, ''))) = LOWER(TRIM(${fromNombre}))`;

      const fromCondReg = fromEmail
        ? sql`LOWER(TRIM(COALESCE(${registrosDeLlamada.closer_mail}, ''))) = LOWER(TRIM(${fromEmail}))`
        : sql`LOWER(TRIM(COALESCE(${registrosDeLlamada.nombre_closer}, ''))) = LOWER(TRIM(${fromNombre}))`;

      const fromCondAgenda = fromEmail
        ? sql`LOWER(TRIM(COALESCE(${resumenesDiariosAgendas.closer}, ''))) = LOWER(TRIM(${fromEmail}))`
        : sql`LOWER(TRIM(COALESCE(${resumenesDiariosAgendas.closer}, ''))) = LOWER(TRIM(${fromNombre}))`;

      const fromCondChat = sql`LOWER(TRIM(COALESCE(${chatsLogs.asesor_asignado}, ''))) = LOWER(TRIM(${fromNombre}))`;

      const [r1, r2, r3, r4] = await Promise.all([
        db
          .update(logLlamadas)
          .set({
            nombre_closer: toNombre,
            ...(toEmail ? { closer_mail: toEmail } : {}),
          })
          .where(and(eq(logLlamadas.id_cuenta, idCuenta), fromCondLog))
          .returning({ id: logLlamadas.id }),

        db
          .update(registrosDeLlamada)
          .set({
            nombre_closer: toNombre,
            ...(toEmail ? { closer_mail: toEmail } : {}),
          })
          .where(and(eq(registrosDeLlamada.id_cuenta, String(idCuenta)), fromCondReg))
          .returning({ id: registrosDeLlamada.id_registro }),

        db
          .update(resumenesDiariosAgendas)
          .set({ closer: toNombre })
          .where(and(eq(resumenesDiariosAgendas.id_cuenta, idCuenta), fromCondAgenda))
          .returning({ id: resumenesDiariosAgendas.id_registro_agenda }),

        db
          .update(chatsLogs)
          .set({ asesor_asignado: toNombre })
          .where(and(eq(chatsLogs.id_cuenta, idCuenta), fromCondChat))
          .returning({ id: chatsLogs.id_evento }),
      ]);

      totalLogLlamadas += r1.length;
      totalRegistros += r2.length;
      totalAgendas += r3.length;
      totalChats += (r4 as { id: number }[]).length;
    }

    // Mark suggestion as accepted
    await db
      .update(closerMergeSuggestions)
      .set({
        status: "accepted",
        canonical_nombre: toNombre,
        canonical_email: toEmail,
        resuelto_at: new Date(),
      })
      .where(and(eq(closerMergeSuggestions.id, id), eq(closerMergeSuggestions.id_cuenta, idCuenta)));

    return NextResponse.json({
      ok: true,
      merged: {
        log_llamadas: totalLogLlamadas,
        registros_llamada: totalRegistros,
        agendas: totalAgendas,
        chats: totalChats,
        total: totalLogLlamadas + totalRegistros + totalAgendas + totalChats,
      },
    });
  });
}
