import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { liberarLead } from "@/lib/queries/enfoque";

export async function POST(req: Request) {
  return withAuth(req, async (_idCuenta, email) => {
    const body = await req.json();
    const { id_sesion, id_registro } = body as {
      id_sesion: string;
      id_registro?: number;
    };

    if (!id_sesion) {
      return NextResponse.json({ error: "Falta id_sesion" }, { status: 400 });
    }

    const result = await liberarLead(id_sesion, email, id_registro);
    return NextResponse.json(result);
  });
}
