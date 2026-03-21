import { NextResponse } from "next/server";
import { withAuthFull } from "@/lib/api-auth";
import { canManageUsers } from "@/lib/permisos";
import { listVideoRecoveryUsers } from "@/lib/queries/video-recovery";

export async function GET(req: Request) {
  return withAuthFull(req, async (ctx) => {
    const canManage = ctx.rol === "superadmin" || canManageUsers(ctx.permisosArray);
    const users = await listVideoRecoveryUsers(ctx.idCuenta, ctx.email, canManage);
    return NextResponse.json(users);
  });
}

