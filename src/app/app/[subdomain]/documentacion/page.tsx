"use client";

import { useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { useApiData } from "@/hooks/useApiData";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Zap,
  Globe,
  Brain,
  Key,
  Copy,
  Check,
  MessageSquare,
  ArrowRight,
  Shield,
  Cpu,
  BarChart3,
  Tag,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";

interface SystemConfig {
  chat_triggers: { trigger: string; accion: string; valor: string }[];
  embudo_personalizado: { id: string; nombre: string; color?: string; orden: number }[];
  has_openai_key: boolean;
}

function CodeBlock({ code, language = "json" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden border border-surface-500 bg-[#0d1117]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-700/80 border-b border-surface-500">
        <span className="text-[10px] font-mono text-gray-400 uppercase">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-accent-green" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[12px] leading-relaxed font-mono text-gray-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function TriggerSection({ triggers }: { triggers: SystemConfig["chat_triggers"] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5 text-accent-purple" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Triggers de Chat por Emoji</h3>
          <p className="text-sm text-gray-400 mt-1">
            Los asesores pueden cambiar el estado de un lead directamente desde el chat enviando un emoji configurado.
            Sin necesidad de IA, sin latencia, sin costo adicional.
          </p>
        </div>
      </div>

      <Card className="bg-surface-700/50 border-surface-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent-amber" />
            ¿Cómo funciona?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-accent-cyan/20 text-accent-cyan flex items-center justify-center text-xs font-bold">1</span>
            <span>El asesor envía un emoji como mensaje en el chat de WhatsApp.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-accent-cyan/20 text-accent-cyan flex items-center justify-center text-xs font-bold">2</span>
            <span>AutoKPI detecta automáticamente el trigger en los mensajes del agente.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-accent-cyan/20 text-accent-cyan flex items-center justify-center text-xs font-bold">3</span>
            <span>El estado del lead se actualiza dinámicamente sin intervención de IA.</span>
          </div>
        </CardContent>
      </Card>

      {triggers.length > 0 ? (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Tus triggers configurados
          </h4>
          <div className="rounded-lg border border-surface-500 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-700 text-left text-gray-400">
                  <th className="px-3 py-2 font-medium">Trigger</th>
                  <th className="px-3 py-2 font-medium">Acción</th>
                  <th className="px-3 py-2 font-medium">Nuevo estado</th>
                </tr>
              </thead>
              <tbody>
                {triggers.map((t, i) => (
                  <tr key={i} className="border-t border-surface-500">
                    <td className="px-3 py-2">
                      <span className="text-2xl">{t.trigger}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-400">{t.accion}</td>
                    <td className="px-3 py-2">
                      <Badge>{t.valor}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <Card className="bg-surface-700/30 border-surface-500 border-dashed">
          <CardContent className="py-6 text-center text-gray-500 text-sm">
            No tienes triggers configurados aún. Ve a <strong className="text-accent-cyan">Control del sistema</strong> → paso 8 para crearlos.
          </CardContent>
        </Card>
      )}

      <Card className="bg-accent-purple/5 border-accent-purple/20">
        <CardContent className="py-3 text-sm text-gray-300 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-accent-purple shrink-0 mt-0.5" />
          <span>
            <strong>Ejemplo:</strong> Si el asesor envía <span className="text-xl mx-1">💰</span> en el chat,
            el estado del lead cambia automáticamente a <Badge className="mx-1">Cerrada</Badge> en tu panel.
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

function ApiSection() {
  const examplePayload = JSON.stringify(
    {
      data: [
        {
          fecha: "2025-12-15",
          metricas: {
            facturacion: 15000000,
            cash_collected: 8500000,
            ingresos: 15000000,
          },
        },
      ],
    },
    null,
    2,
  );

  const curlExample = `curl -X POST \\
  "${API_BASE_URL}/webhooks/external-data/tu-subdominio" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: TU_API_KEY_AQUÍ" \\
  -d '${examplePayload}'`;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-green/20 flex items-center justify-center shrink-0">
          <Globe className="w-5 h-5 text-accent-green" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">API Externa de Ingresos</h3>
          <p className="text-sm text-gray-400 mt-1">
            Conecta tu sistema de facturación, CRM o ERP para inyectar datos financieros reales a tu panel AutoKPI.
          </p>
        </div>
      </div>

      <Card className="bg-surface-700/50 border-surface-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-300">Endpoint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg bg-[#0d1117] px-3 py-2 border border-surface-500">
            <Badge variant="default" className="shrink-0">POST</Badge>
            <code className="text-sm text-accent-cyan font-mono break-all">
              {API_BASE_URL}/webhooks/external-data/:subdominio
            </code>
          </div>
          <p className="text-xs text-gray-500">
            Reemplaza <code className="bg-surface-700 px-1 py-0.5 rounded text-accent-amber">:subdominio</code> con el subdominio de tu cuenta (el mismo que aparece en la URL de tu panel).
            El body debe ser <code className="bg-surface-700 px-1 py-0.5 rounded text-gray-300">{"{ data: [{ fecha, metricas }] }"}</code> — un array de objetos con fecha y métricas numéricas.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-surface-700/50 border-surface-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent-amber" />
            Autenticación
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-400">
          <p>Incluye el header <code className="bg-surface-700 px-1.5 py-0.5 rounded text-accent-cyan">x-api-key</code> con
            tu token de API. Puedes gestionar tus API Keys desde el panel de configuración.</p>
        </CardContent>
      </Card>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payload de ejemplo</h4>
        <CodeBlock code={examplePayload} language="json" />
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ejemplo cURL</h4>
        <CodeBlock code={curlExample} language="bash" />
      </div>
    </div>
  );
}

function EmbudoSection({ embudo }: { embudo: SystemConfig["embudo_personalizado"] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-cyan/20 flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5 text-accent-cyan" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Embudo IA Personalizado</h3>
          <p className="text-sm text-gray-400 mt-1">
            La IA de AutoKPI analiza las llamadas y videollamadas clasificando leads según los estados
            que tú definas. Tu embudo, tus reglas.
          </p>
        </div>
      </div>

      <Card className="bg-surface-700/50 border-surface-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent-cyan" />
            ¿Cómo funciona?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-400">
          <p>
            Cuando el Cerebro (backend) procesa una llamada o videollamada, utiliza tu embudo personalizado
            para clasificar el resultado. Los prompts de IA reciben la lista de estados válidos, sus
            definiciones y la transcripción completa.
          </p>
          <p>
            Esto significa que puedes tener estados como <em>&quot;Demo Agendada&quot;</em>, <em>&quot;Propuesta Enviada&quot;</em>,
            o <em>&quot;Cerrada MRR&quot;</em> — lo que tu negocio necesite.
          </p>
        </CardContent>
      </Card>

      {embudo.length > 0 ? (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Tu embudo actual
          </h4>
          <div className="flex flex-wrap gap-2">
            {embudo
              .sort((a, b) => a.orden - b.orden)
              .map((e, i) => (
                <div key={e.id} className="flex items-center gap-1.5">
                  <div
                    className="flex items-center gap-2 rounded-lg border border-surface-500 bg-surface-700 px-3 py-2"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: e.color ?? "#06b6d4" }}
                    />
                    <span className="text-sm text-white font-medium">{e.nombre}</span>
                    <Badge variant="outline" className="text-[10px]">#{e.orden}</Badge>
                  </div>
                  {i < embudo.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />
                  )}
                </div>
              ))}
          </div>
        </div>
      ) : (
        <Card className="bg-surface-700/30 border-surface-500 border-dashed">
          <CardContent className="py-6 text-center text-gray-500 text-sm">
            Estás usando el embudo estándar (Cerrada, Ofertada, No_Ofertada, CANCELADA, PDTE).
            Ve a <strong className="text-accent-cyan">Control del sistema</strong> → paso 7 para crear tu embudo personalizado.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EtiquetasSection() {
  const configEndpoint = `${API_BASE_URL}/webhooks/config/:subdominio`;
  const curlConfigExample = `curl -X GET \\
  "${API_BASE_URL}/webhooks/config/tu-subdominio" \\
  -H "x-api-key: TU_API_KEY_AQUÍ"`;

  const responseExample = JSON.stringify(
    {
      ok: true,
      id_cuenta: 1,
      subdominio: "tu-subdominio",
      reglas_etiquetas: [
        { id: "r1", source: "call", condition: "interes_alto", tag: "lead_caliente", funnelStage: "Ofertada" },
        { id: "r2", source: "call", condition: "objecion_precio", tag: "objecion_precio" },
        { id: "r3", source: "meeting", condition: "mencion_precio", tag: "mencion_precio" },
      ],
      embudo_personalizado: [
        { id: "e1", nombre: "Agendada", orden: 1 },
        { id: "e2", nombre: "Ofertada", orden: 2 },
        { id: "e3", nombre: "Cerrada", orden: 3 },
      ],
      prompts: { llamadas: "...", videollamadas: "...", ventas: "..." },
    },
    null,
    2,
  );

  const CONDITIONS_DESCRIPTION = [
    { key: "interes_alto", label: "Interés alto", desc: "La IA detecta alto interés en comprar" },
    { key: "mencion_precio", label: "Mención de precio", desc: "El lead preguntó por el precio" },
    { key: "objecion_precio", label: "Objeción de precio", desc: "El lead objetó el precio" },
    { key: "objecion_tiempo", label: "Objeción de tiempo", desc: "\"Ahora no es buen momento\"" },
    { key: "enojo", label: "Enojo / frustración", desc: "Tono negativo detectado" },
    { key: "solicitud_propuesta", label: "Solicita propuesta", desc: "Pide presupuesto o propuesta" },
    { key: "duracion_mayor", label: "Duración extendida", desc: "Llamada más larga de lo habitual" },
    { key: "intentos_mayor", label: "Varios intentos", desc: "Múltiples intentos de contacto" },
    { key: "speed_mayor", label: "Speed to lead alto", desc: "Tardanza en el primer contacto" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-amber/20 flex items-center justify-center shrink-0">
          <Tag className="w-5 h-5 text-accent-amber" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Reglas de Etiquetas — Integración Cerebro</h3>
          <p className="text-sm text-gray-400 mt-1">
            Cómo el Cerebro debe obtener y aplicar las reglas de etiquetas configuradas en este panel.
          </p>
        </div>
      </div>

      <Card className="bg-accent-amber/5 border-accent-amber/30">
        <CardContent className="py-3 text-sm text-gray-300 flex items-start gap-2">
          <Shield className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
          <span>
            <strong className="text-accent-amber">Importante:</strong> Las etiquetas que el Cerebro asigna a{" "}
            <code className="bg-surface-700 px-1 py-0.5 rounded text-xs">tags_internos</code> deben
            provenir de las <strong>reglas configuradas en el paso 4 del Sistema</strong>, NO de
            contenido libre generado por la IA. Este endpoint te permite obtener las reglas actuales.
          </span>
        </CardContent>
      </Card>

      <Card className="bg-surface-700/50 border-surface-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-accent-cyan" />
            Endpoint: Obtener configuración del tenant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg bg-[#0d1117] px-3 py-2 border border-surface-500">
            <Badge variant="default" className="shrink-0 bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30">GET</Badge>
            <code className="text-sm text-accent-cyan font-mono break-all">{configEndpoint}</code>
          </div>
          <p className="text-xs text-gray-500">
            Devuelve <code className="bg-surface-700 px-1 py-0.5 rounded text-accent-amber">reglas_etiquetas</code>,{" "}
            <code className="bg-surface-700 px-1 py-0.5 rounded text-accent-amber">embudo_personalizado</code>,{" "}
            <code className="bg-surface-700 px-1 py-0.5 rounded text-accent-amber">chat_triggers</code> y los prompts configurados.
            Requiere header <code className="bg-surface-700 px-1 py-0.5 rounded text-accent-cyan">x-api-key</code>.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-surface-700/50 border-surface-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent-cyan" />
            Flujo correcto para aplicar etiquetas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-400">
          {[
            { n: 1, text: "Cerebro recibe webhook de llamada o videollamada." },
            { n: 2, text: <>Llama a <code className="bg-surface-700 px-1 py-0.5 rounded text-accent-cyan">GET /webhooks/config/:subdominio</code> para obtener las reglas actuales.</> },
            { n: 3, text: "La IA evalúa la transcripción y detecta condiciones (ver tabla abajo)." },
            { n: 4, text: "Para cada regla cuya condición match, añade el tag de esa regla a tags_internos." },
            { n: 5, text: "Si la regla tiene funnelStage, mover el lead a esa etapa del pipeline." },
            { n: 6, text: "Si aplica, llamar al endpoint de GHL para sincronizar las etiquetas en el CRM." },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-accent-cyan/20 text-accent-cyan flex items-center justify-center text-xs font-bold shrink-0">{n}</span>
              <span>{text}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Condiciones disponibles</h4>
        <div className="rounded-lg border border-surface-500 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-700 text-left text-gray-400">
                <th className="px-3 py-2 font-medium">Clave</th>
                <th className="px-3 py-2 font-medium">Label</th>
                <th className="px-3 py-2 font-medium hidden sm:table-cell">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {CONDITIONS_DESCRIPTION.map((c, i) => (
                <tr key={c.key} className={i > 0 ? "border-t border-surface-500" : ""}>
                  <td className="px-3 py-2">
                    <code className="bg-surface-700 px-1 py-0.5 rounded text-accent-amber">{c.key}</code>
                  </td>
                  <td className="px-3 py-2 text-gray-300">{c.label}</td>
                  <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{c.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-600 mt-1">Condiciones personalizadas: el usuario puede escribir cualquier texto libre — el Cerebro decide cómo evaluarlas.</p>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ejemplo cURL</h4>
        <CodeBlock code={curlConfigExample} language="bash" />
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Respuesta de ejemplo</h4>
        <CodeBlock code={responseExample} language="json" />
      </div>
    </div>
  );
}

function MetricasSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-green/20 flex items-center justify-center shrink-0">
          <BarChart3 className="w-5 h-5 text-accent-green" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Métricas Personalizadas</h3>
          <p className="text-sm text-gray-400 mt-1">
            Crea métricas manuales (con campos), automáticas (fórmulas con KPIs) o fijas (valor constante).
            Sin IA, solo configuración.
          </p>
        </div>
      </div>

      <Card className="bg-surface-700/50 border-surface-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent-green" />
            Tipos de métricas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-400">
          <div>
            <strong className="text-white">Manual:</strong> Define campos (texto, número, fecha, sí/no). Añade datos manualmente.
            Si tienes un campo fecha, se filtra por el rango del panel. Si hay número, se suma; si hay boolean, se cuentan los true.
          </div>
          <div>
            <strong className="text-white">Automática:</strong> Fórmula con KPIs u otras métricas. Operaciones: directo, suma, promedio,
            división, multiplicación, resta, condición (si X &gt; Y entonces Z sino W). Busca por nombre al elegir fuentes.
          </div>
          <div>
            <strong className="text-white">Fija:</strong> Valor constante siempre visible (ej. meta mensual = 100).
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface-700/50 border-surface-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-300">Ubicación</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-400">
          Cada métrica puede mostrarse en <strong className="text-white">Panel Ejecutivo</strong>, <strong className="text-white">Rendimiento</strong> (videollamadas) o <strong className="text-white">Ambos</strong>.
        </CardContent>
      </Card>

      <Card className="bg-surface-700/50 border-surface-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-300">Orden y edición</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-400">
          Arrastra las métricas para ordenarlas. Haz clic en el icono de lápiz en cada tarjeta en el Dashboard o Rendimiento para editar.
          Al eliminar una métrica que alimenta a otras, verás un aviso: &quot;Esta métrica alimenta a X otras, si la eliminas esas fallarán&quot;.
        </CardContent>
      </Card>

      <Card className="bg-accent-green/5 border-accent-green/20">
        <CardContent className="py-3 text-sm text-gray-300">
          Para configurar métricas: <strong className="text-accent-cyan">Control del sistema</strong> → paso 5 (Métricas custom).
        </CardContent>
      </Card>
    </div>
  );
}

function BYOKSection({ hasKey }: { hasKey: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-amber/20 flex items-center justify-center shrink-0">
          <Key className="w-5 h-5 text-accent-amber" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Bring Your Own Key (OpenAI)</h3>
          <p className="text-sm text-gray-400 mt-1">
            Conecta tu propia API Key de OpenAI para procesar análisis de llamadas y videollamadas sin límites
            ni colas compartidas.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-surface-500 bg-surface-700/50 px-4 py-3">
        <div className={`w-3 h-3 rounded-full ${hasKey ? "bg-accent-green animate-pulse" : "bg-gray-600"}`} />
        <span className="text-sm text-white font-medium">
          {hasKey ? "API Key conectada" : "Sin API Key propia"}
        </span>
        <Badge variant={hasKey ? "default" : "outline"}>
          {hasKey ? "Activa" : "No configurada"}
        </Badge>
      </div>

      <Card className="bg-surface-700/50 border-surface-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-300">Ventajas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
              <span><strong className="text-white">Sin límites de procesamiento</strong> — Tus llamadas se procesan inmediatamente sin esperar cola.</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
              <span><strong className="text-white">Control total de costos</strong> — Pagas directamente a OpenAI según tu consumo real.</span>
            </li>
            <li className="flex items-start gap-2">
              <Cpu className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
              <span><strong className="text-white">Modelo preferido</strong> — Acceso al modelo GPT más reciente disponible en tu cuenta de OpenAI.</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {!hasKey && (
        <Card className="bg-accent-amber/5 border-accent-amber/20">
          <CardContent className="py-3 text-sm text-gray-300">
            Para conectar tu API Key, ve a <strong className="text-accent-cyan">Control del sistema</strong> → paso 9 (OpenAI Key).
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function DocumentacionPage() {
  const { data, loading } = useApiData<SystemConfig>("/api/data/system-config");

  const triggers = data?.chat_triggers ?? [];
  const embudo = data?.embudo_personalizado ?? [];
  const hasOpenAIKey = data?.has_openai_key ?? false;

  return (
    <>
      <PageHeader
        title="Documentación"
        subtitle="Guía de superpoderes de tu panel"
        action={<span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-amber/20 text-accent-amber border border-accent-amber/40 font-medium uppercase shrink-0">Beta</span>}
      />
      <div className="p-3 md:p-6 space-y-6 min-w-0 max-w-full overflow-x-hidden">
        <div className="rounded-2xl bg-gradient-to-br from-accent-purple/10 via-accent-cyan/5 to-transparent border border-surface-500 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center shadow-glow-cyan">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">
                Superpoderes de tu Panel
              </h1>
              <p className="text-sm text-gray-400">
                AutoKPI v2.0 — Marca blanca, embudos dinámicos y triggers inteligentes
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-400 max-w-2xl">
            Tu panel no es solo un dashboard de métricas. Es un ecosistema completo que se adapta
            a tu negocio: embudos personalizados, triggers de chat por emoji, integración de datos
            financieros externos y procesamiento IA con tu propia clave.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-gray-400 text-sm animate-pulse">Cargando configuración...</div>
          </div>
        ) : (
          <Tabs defaultValue="triggers" className="w-full">
            <TabsList className="flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="triggers" className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Triggers de Chat
              </TabsTrigger>
              <TabsTrigger value="etiquetas" className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Etiquetas
              </TabsTrigger>
              <TabsTrigger value="api" className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                API de Ingresos
              </TabsTrigger>
              <TabsTrigger value="embudo" className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" />
                Embudo IA
              </TabsTrigger>
              <TabsTrigger value="metricas" className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Métricas
              </TabsTrigger>
              <TabsTrigger value="byok" className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                OpenAI Key
              </TabsTrigger>
            </TabsList>

            <Separator className="my-4" />

            <TabsContent value="triggers">
              <TriggerSection triggers={triggers} />
            </TabsContent>

            <TabsContent value="etiquetas">
              <EtiquetasSection />
            </TabsContent>

            <TabsContent value="api">
              <ApiSection />
            </TabsContent>

            <TabsContent value="embudo">
              <EmbudoSection embudo={embudo} />
            </TabsContent>

            <TabsContent value="metricas">
              <MetricasSection />
            </TabsContent>

            <TabsContent value="byok">
              <BYOKSection hasKey={hasOpenAIKey} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}
