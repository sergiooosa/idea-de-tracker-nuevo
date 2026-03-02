import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cuentas, kpisExternos, apiKeysCuenta } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const WEBHOOK_ORIGIN = "api_externa";

type MetricasPayload = Record<string, number>;

interface DataItem {
  fecha: string;
  metricas: MetricasPayload;
}

interface WebhookBody {
  data: DataItem[];
}

function isValidFecha(fecha: string): boolean {
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(fecha);
  if (!match) return false;
  const d = new Date(fecha);
  return !isNaN(d.getTime());
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ locationId: string }> },
) {
  try {
    const { locationId } = await params;
    const apiKey = req.headers.get("x-api-key");

    if (!apiKey?.trim()) {
      return NextResponse.json(
        { error: "Header x-api-key requerido" },
        { status: 401 },
      );
    }

    const [keyRow] = await db
      .select({ id_cuenta: apiKeysCuenta.id_cuenta })
      .from(apiKeysCuenta)
      .where(
        and(
          eq(apiKeysCuenta.token, apiKey.trim()),
          eq(apiKeysCuenta.activa, true),
        ),
      )
      .limit(1);

    if (!keyRow) {
      return NextResponse.json(
        { error: "API Key inválida o inactiva" },
        { status: 401 },
      );
    }

    const [cuentaRow] = await db
      .select({ id_cuenta: cuentas.id_cuenta })
      .from(cuentas)
      .where(eq(cuentas.subdominio, locationId))
      .limit(1);

    if (!cuentaRow || cuentaRow.id_cuenta !== keyRow.id_cuenta) {
      return NextResponse.json(
        { error: "Cuenta no encontrada o API Key no corresponde a este tenant" },
        { status: 404 },
      );
    }

    const body = (await req.json()) as WebhookBody;
    if (!body?.data || !Array.isArray(body.data)) {
      return NextResponse.json(
        { error: "Cuerpo debe incluir { data: [{ fecha, metricas }] }" },
        { status: 400 },
      );
    }

    const idCuenta = cuentaRow.id_cuenta;
    let inserted = 0;

    for (const item of body.data) {
      if (!item.fecha || typeof item.metricas !== "object") continue;
      if (!isValidFecha(item.fecha)) continue;

      const metricas: MetricasPayload = {};
      for (const [k, v] of Object.entries(item.metricas)) {
        const num = Number(v);
        if (!isNaN(num) && typeof v !== "object") {
          metricas[k] = num;
        }
      }

      if (Object.keys(metricas).length === 0) continue;

      await db.insert(kpisExternos).values({
        id_cuenta: idCuenta,
        fecha: item.fecha,
        origen: WEBHOOK_ORIGIN,
        metricas,
      });
      inserted++;
    }

    return NextResponse.json({
      ok: true,
      message: `Se guardaron ${inserted} registro(s) de KPIs externos`,
      inserted,
    });
  } catch (err) {
    console.error("[webhooks/external-data]", err);
    return NextResponse.json(
      { error: "Error interno al procesar la solicitud" },
      { status: 500 },
    );
  }
}
