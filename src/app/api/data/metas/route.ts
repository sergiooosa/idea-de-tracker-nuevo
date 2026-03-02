import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getMetas, upsertMetas } from "@/lib/queries/metas";

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const data = await getMetas(idCuenta);
    return NextResponse.json(data);
  });
}

export async function PUT(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const body = await req.json();
    const data = await upsertMetas(idCuenta, body);
    return NextResponse.json(data);
  });
}
