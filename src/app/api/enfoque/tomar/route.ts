import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { tomarLead } from "@/lib/queries/enfoque";

export async function POST(req: Request) {
  return withAuth(req, async (idCuenta, email) => {
    const body = await req.json();
    const { id_sesion } = body as { id_sesion: string };

    if (!id_sesion) {
      return NextResponse.json({ error: "Falta id_sesion" }, { status: 400 });
    }

    const result = await tomarLead(idCuenta, email, id_sesion);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, lead: null, lockId: null },
        { status: result.error === "no_leads" ? 404 : 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      lockId: result.lockId,
      lead: result.lead,
    });
  });
}
