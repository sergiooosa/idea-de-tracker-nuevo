"use client";

import { useState } from "react";
import { loginAction } from "@/app/login/actions";
import Image from "next/image";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "autokpi.net";

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

      if (result.subdominio) {
        const isLocalDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        const protocol = window.location.protocol;
        const port = window.location.port ? `:${window.location.port}` : "";

        const targetUrl = isLocalDev
          ? `${protocol}//${result.subdominio}.localhost${port}/dashboard`
          : `${protocol}//${result.subdominio}.${rootDomain}/dashboard`;

        window.location.href = targetUrl;
      }
    } catch {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
      setLoading(false);
    }
  };

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
