import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { getAsesoresList } from "@/lib/queries/asesor";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_todo", async (idCuenta) => {
    const data = await getAsesoresList(idCuenta);
    return NextResponse.json(data);
  });
}
