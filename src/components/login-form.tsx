"use client";

import { useState, useEffect } from "react";
import { loginAction } from "@/app/login/actions";
import type { AccountOption } from "@/app/login/actions";
import Image from "next/image";
import { Building2 } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[] | null>(null);

  const [accountLoading, setAccountLoading] = useState<number | null>(null);
  const [pendingSwitchSubdominio, setPendingSwitchSubdominio] = useState<string | null>(null);
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "autokpi.net";

  // Si viene de un account switch, leer el subdominio destino y auto-seleccionarlo tras login
  useEffect(() => {
    const pending = sessionStorage.getItem("autokpi_switch_subdominio");
    if (pending) {
      sessionStorage.removeItem("autokpi_switch_subdominio");
      setPendingSwitchSubdominio(pending);
    }
  }, []);

  const buildUrl = (subdominio: string) => {
    const isLocalDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : "";
    return isLocalDev
      ? `${protocol}//${subdominio}.localhost${port}/dashboard`
      : `${protocol}//${subdominio}.${rootDomain}/dashboard`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await loginAction({ email, password });

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result.platformAdmin) {
        window.location.href = "/super";
        return;
      }

      if ("accounts" in result && result.accounts) {
        // Si venimos de un switch, auto-seleccionar la cuenta destino
        if (pendingSwitchSubdominio) {
          const targetAcc = result.accounts.find((a) => a.subdominio === pendingSwitchSubdominio);
          if (targetAcc) {
            const switchResult = await loginAction({ email, password, subdominio_override: targetAcc.subdominio });
            if (!("error" in switchResult)) {
              window.location.href = buildUrl(targetAcc.subdominio);
              return;
            }
          }
        }
        setAccounts(result.accounts);
        setLoading(false);
        return;
      }

      if (result.subdominio) {
        window.location.href = buildUrl(result.subdominio);
      }
    } catch {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
      setLoading(false);
    }
  };

  // Account selector screen
  if (accounts) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl overflow-hidden">
          <div className="p-8 pb-6 flex flex-col items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-white p-1 flex items-center justify-center">
              <Image
                src="https://i.postimg.cc/pXJdGQmv/Gemini-Generated-Image-4vedz84vedz84ved.png"
                alt="AutoKPI"
                width={56}
                height={56}
                className="scale-110 object-contain"
              />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">Selecciona tu cuenta</h1>
              <p className="text-sm text-slate-400 mt-1">
                Tienes acceso a {accounts.length} cuentas
              </p>
            </div>
          </div>
          <div className="px-8 pb-8 space-y-3">
            {accounts.map((acc) => (
              <button
                key={acc.id_cuenta}
                type="button"
                disabled={accountLoading !== null}
                onClick={async () => {
                  setAccountLoading(acc.id_cuenta);
                  try {
                    // Usar switch-account en lugar de re-autenticar con contraseña.
                    // El usuario ya está autenticado desde el primer signIn; re-verificar
                    // el password contra CADA cuenta falla si los hashes difieren entre cuentas.
                    const switchResp = await fetch("/api/auth/switch-account", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ subdominio: acc.subdominio }),
                    });
                    if (!switchResp.ok) {
                      // Fallback: si el switch falla (ej. sesión expirada), re-autenticar
                      const result = await loginAction({
                        email,
                        password,
                        subdominio_override: acc.subdominio,
                      });
                      if ("error" in result && result.error) {
                        setError(result.error);
                        setAccounts(null);
                        setAccountLoading(null);
                        return;
                      }
                    }
                    window.location.href = buildUrl(acc.subdominio);
                  } catch {
                    setError("Error al seleccionar la cuenta. Intenta de nuevo.");
                    setAccounts(null);
                    setAccountLoading(null);
                  }
                }}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-left hover:border-blue-500/50 hover:bg-slate-700 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                  {accountLoading === acc.id_cuenta
                    ? <span className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    : <Building2 className="w-5 h-5 text-blue-400" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {acc.nombre_cuenta ?? acc.subdominio}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{acc.subdominio}.{rootDomain}</p>
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAccounts(null)}
              className="w-full mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← Volver al login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl overflow-hidden">
        <div className="p-8 pb-6 flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-white p-1 flex items-center justify-center">
            <Image
              src="https://i.postimg.cc/pXJdGQmv/Gemini-Generated-Image-4vedz84vedz84ved.png"
              alt="AutoKPI"
              width={56}
              height={56}
              className="scale-110 object-contain"
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Iniciar Sesión</h1>
            <p className="text-sm text-slate-400 mt-1">
              Ingresa tus credenciales para acceder al dashboard
            </p>
          </div>
        </div>

        <div className="px-8 pb-8">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 focus:ring-2 focus:ring-blue-500/40 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
