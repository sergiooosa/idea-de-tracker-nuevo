import { NextResponse } from "next/server";
import { withAuthFull } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { registrosDeLlamada } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

interface ReasignarBody {
  ids_registro: number[];
  nuevo_closer_mail: string;
  nuevo_nombre_closer: string;
}

export async function POST(req: Request) {
  return withAuthFull(req, async ({ idCuenta, email }) => {
    const body = (await req.json()) as ReasignarBody;
    const { ids_registro, nuevo_closer_mail, nuevo_nombre_closer } = body;

    if (!Array.isArray(ids_registro) || ids_registro.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un id_registro" },
        { status: 400 },
      );
    }

    if (ids_registro.length > 500) {
      return NextResponse.json(
        { error: "Máximo 500 leads por operación" },
        { status: 400 },
      );
    }

    if (!nuevo_closer_mail || typeof nuevo_closer_mail !== "string") {
      return NextResponse.json(
        { error: "Se requiere nuevo_closer_mail" },
        { status: 400 },
      );
    }

    const idCuentaStr = String(idCuenta);

    const result = await db
      .update(registrosDeLlamada)
      .set({
        closer_mail: nuevo_closer_mail.trim(),
        nombre_closer: (nuevo_nombre_closer ?? "").trim() || null,
      })
      .where(
        and(
          eq(registrosDeLlamada.id_cuenta, idCuentaStr),
          inArray(registrosDeLlamada.id_registro, ids_registro),
        ),
      )
      .returning({ id_registro: registrosDeLlamada.id_registro });

    return NextResponse.json({
      ok: true,
      actualizados: result.length,
      operador: email,
    });
  });
}
