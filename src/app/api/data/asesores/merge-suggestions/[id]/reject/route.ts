/**
 * POST /api/data/asesores/merge-suggestions/[id]/reject
 * Rejects a merge suggestion: marks it as rejected so it won't appear again.
 */
import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { closerMergeSuggestions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuthAndPermission(req, "configurar_sistema", async (idCuenta) => {
    const { id } = await params;

    const [suggestion] = await db
      .select({ id: closerMergeSuggestions.id })
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

    await db
      .update(closerMergeSuggestions)
      .set({ status: "rejected", resuelto_at: new Date() })
      .where(and(eq(closerMergeSuggestions.id, id), eq(closerMergeSuggestions.id_cuenta, idCuenta)));

    return NextResponse.json({ ok: true });
  });
}
