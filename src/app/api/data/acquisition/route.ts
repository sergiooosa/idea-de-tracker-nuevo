import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { getAcquisition } from "@/lib/queries/acquisition";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_acquisition", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
    const data = await getAcquisition(idCuenta, from, to);
    return NextResponse.json(data);
  });
}
