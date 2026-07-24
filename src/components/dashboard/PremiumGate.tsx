"use client";

import { Sparkles, AlertTriangle } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

export type GeminiPremiumStatus =
  | "active"
  | "paused_invalid_key"
  | "paused_quota_exceeded"
  | null;

interface Props {
  hasGeminiKey: boolean;
  premiumStatus: GeminiPremiumStatus;
  children: React.ReactNode;
}

export default function PremiumGate({
  hasGeminiKey,
  premiumStatus,
  children,
}: Props) {
  const router = useRouter();
  const params = useParams();
  const subdomain = params.subdomain as string;

  if (!hasGeminiKey) {
    return (
      <div className="rounded-xl border border-accent-purple/30 bg-accent-purple/5 p-6 flex flex-col items-center gap-3 text-center">
        <div className="rounded-full p-3 bg-accent-purple/20 border border-accent-purple/40">
          <Sparkles className="w-6 h-6 text-accent-purple" />
        </div>
        <h4 className="text-sm font-semibold text-white">
          Función premium
        </h4>
        <p className="text-xs text-gray-400 max-w-md">
          Activá tu llave de Gemini para desbloquear el análisis cualitativo
          con inteligencia artificial.
        </p>
        <button
          type="button"
          onClick={() =>
            router.push(`/app/${subdomain}/system?step=13`)
          }
          className="mt-1 px-4 py-2 rounded-lg text-xs font-semibold bg-accent-purple text-white hover:bg-accent-purple/80 transition-colors"
        >
          Configurar llave de Gemini
        </button>
      </div>
    );
  }

  if (
    premiumStatus === "paused_invalid_key" ||
    premiumStatus === "paused_quota_exceeded"
  ) {
    const isPausedQuota = premiumStatus === "paused_quota_exceeded";
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-4 flex items-start gap-3">
          <div className="rounded-full p-2 bg-accent-amber/20 border border-accent-amber/40 shrink-0">
            <AlertTriangle className="w-4 h-4 text-accent-amber" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">
              Análisis pausado
            </h4>
            <p className="text-xs text-gray-400">
              {isPausedQuota
                ? "Tu llave de Gemini se quedó sin saldo. Recargá tu cuenta de Google AI para reactivar el análisis."
                : "Tu llave de Gemini es inválida o fue revocada. Ingresá una nueva llave para reactivar el análisis."}
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(`/app/${subdomain}/system?step=13`)
              }
              className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-amber/20 text-accent-amber hover:bg-accent-amber/30 transition-colors border border-accent-amber/40"
            >
              {isPausedQuota ? "Recargar llave" : "Actualizar llave"}
            </button>
          </div>
        </div>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
