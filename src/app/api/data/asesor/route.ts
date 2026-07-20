import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { getAsesorData, getAsesoresList, toggleExcluirLead } from "@/lib/queries/asesor";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_asesor", async (idCuenta, email) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
    const allAdvisors = searchParams.get("allAdvisors") === "1";
    const advisorEmail = searchParams.get("advisorEmail") ?? null;
    const closerEmailsParam = searchParams.get("closerEmails") || searchParams.get("closerEmail") || undefined;
    const closerEmails = closerEmailsParam ? closerEmailsParam.split(",").map((e) => e.trim()).filter(Boolean) : undefined;

    // advisorEmail tiene prioridad sobre closerEmails (que el hook añade automáticamente)
    // Así el admin puede ver datos de cualquier asesor sin que su propio email interfiera
    const effectiveEmails = allAdvisors
      ? undefined
      : advisorEmail
        ? [advisorEmail]
        : (closerEmails?.length ? closerEmails : (email ? [email] : undefined));

    const data = await getAsesorData(idCuenta, from, to, effectiveEmails ?? undefined);
    const advisorsList = await getAsesoresList(idCuenta);
    return NextResponse.json({ ...data, advisorsList });
  });
}

export async function PATCH(req: Request) {
  return withAuthAndPermission(req, "editar_registros", async (idCuenta, email) => {
    const body = await req.json();
    const { id, excluido_metricas } = body;
    if (!id || typeof excluido_metricas !== "boolean") {
      return NextResponse.json({ error: "id (number) y excluido_metricas (boolean) requeridos" }, { status: 400 });
    }
    const ok = await toggleExcluirLead(Number(id), idCuenta, excluido_metricas);
    if (!ok) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    void logAudit(idCuenta, email, excluido_metricas ? "EXCLUDE_LEAD" : "RESTORE_LEAD", { id });

    return NextResponse.json({ ok: true });
  });
}
