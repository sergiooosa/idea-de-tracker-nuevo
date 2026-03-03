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
      data: {
        fecha: "2025-12-15",
        metricas: {
          facturacion: 15000000,
          cash_collected: 8500000,
          ingresos: 15000000,
        },
      },
    },
    null,
    2,
  );

  const curlExample = `curl -X POST \\
  "${API_BASE_URL}/webhooks/external-data/TU-SUBDOMINIO" \\
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
        <CardContent>
          <div className="flex items-center gap-2 rounded-lg bg-[#0d1117] px-3 py-2 border border-surface-500">
            <Badge variant="default" className="shrink-0">POST</Badge>
            <code className="text-sm text-accent-cyan font-mono break-all">
              {API_BASE_URL}/webhooks/external-data/:locationid
            </code>
          </div>
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
              <TabsTrigger value="api" className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                API de Ingresos
              </TabsTrigger>
              <TabsTrigger value="embudo" className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" />
                Embudo IA
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

            <TabsContent value="api">
              <ApiSection />
            </TabsContent>

            <TabsContent value="embudo">
              <EmbudoSection embudo={embudo} />
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
