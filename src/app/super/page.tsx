import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import SuperTenantList from "./SuperTenantList";

export default async function SuperPage() {
  const session = await auth();
  if (!session?.user?.platformAdmin) {
    redirect("/login");
  }

  const rows = await db
    .select({
      id_cuenta: cuentas.id_cuenta,
      nombre_cuenta: cuentas.nombre_cuenta,
      subdominio: cuentas.subdominio,
      estado_cuenta: cuentas.estado_cuenta,
    })
    .from(cuentas)
    .orderBy(cuentas.subdominio);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Administración Plataforma
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Selecciona un tenant para entrar como super admin
            </p>
          </div>
          <p className="text-sm text-slate-500">{session.user.email}</p>
        </div>
        <SuperTenantList tenants={rows} />
      </div>
    </div>
  );
}
