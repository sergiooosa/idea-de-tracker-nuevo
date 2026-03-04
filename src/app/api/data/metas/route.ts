import { NextResponse } from "next/server";
import { withAuthAndAnyPermission, withAuthAndPermission } from "@/lib/api-auth";
import { getMetas, upsertMetas } from "@/lib/queries/metas";

export async function GET(req: Request) {
  return withAuthAndAnyPermission(req, ["configurar_sistema", "ver_asesor", "ver_system"], async (idCuenta) => {
    const data = await getMetas(idCuenta);
    return NextResponse.json(data);
  });
}

export async function PUT(req: Request) {
  return withAuthAndPermission(req, "configurar_sistema", async (idCuenta) => {
    const body = await req.json();
    const data = await upsertMetas(idCuenta, body);
    return NextResponse.json(data);
  });
}
