/**
 * GET /api/data/asesores/merge-suggestions
 * Returns pending closer merge suggestions for the current account.
 * ?status=pending (default) | all
 */
import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { closerMergeSuggestions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_todo", async (idCuenta) => {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "pending";

    const conditions = status === "all"
      ? [eq(closerMergeSuggestions.id_cuenta, idCuenta)]
      : [eq(closerMergeSuggestions.id_cuenta, idCuenta), eq(closerMergeSuggestions.status, status)];

    const rows = await db
      .select()
      .from(closerMergeSuggestions)
      .where(and(...conditions))
      .orderBy(closerMergeSuggestions.created_at);

    return NextResponse.json(rows);
  });
}
