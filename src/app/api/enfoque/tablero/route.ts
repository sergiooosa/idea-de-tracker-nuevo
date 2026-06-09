import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getTableroEnfoque } from "@/lib/queries/enfoque";

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const data = await getTableroEnfoque(idCuenta);
    return NextResponse.json(data);
  });
}
