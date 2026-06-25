import { NextResponse } from "next/server";
import { withAuthAndPermission, withAuthAndAnyPermission } from "@/lib/api-auth";
import { getSystemConfig, updateSystemConfig } from "@/lib/queries/system-config";
import { logAudit } from "@/lib/audit";
import { validarRefsMetricasConfig, parseMetricasConfig } from "@/lib/metricas-engine";

export async function GET(req: Request) {
  return withAuthAndAnyPermission(req, ["configurar_sistema", "ver_documentacion", "ver_rendimiento", "ver_dashboard"], async (idCuenta) => {
    const data = await getSystemConfig(idCuenta);
    return NextResponse.json(data);
  });
}

export async function PUT(req: Request) {
  return withAuthAndPermission(req, "configurar_sistema", async (idCuenta, email) => {
    const body = await req.json();

    if (body.metricas_config) {
      const configs = parseMetricasConfig(body.metricas_config);
      const refsColgantes = validarRefsMetricasConfig(configs);
      if (refsColgantes.length > 0) {
        return NextResponse.json(
          { error: "Fórmulas con referencias inexistentes", refsColgantes },
          { status: 400 },
        );
      }
    }

    const data = await updateSystemConfig(idCuenta, body);
    // Registrar qué secciones se modificaron (sin guardar valores sensibles como tokens)
    const seccionesEditadas = Object.keys(body).filter(k =>
      !["token_ghl", "openai_api_key", "twilio_sid", "auth_twilio"].includes(k)
    );
    void logAudit(idCuenta, email, "EDIT_SISTEMA", { secciones: seccionesEditadas });
    return NextResponse.json(data);
  });
}
