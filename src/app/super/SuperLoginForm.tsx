"use client";

import { useState } from "react";
import { verifySuperAccess } from "./actions";
import { Lock } from "lucide-react";

export default function SuperLoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await verifySuperAccess(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    // redirect() en la action lleva a /super
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/20">
            <Lock className="h-7 w-7 text-amber-400" />
          </div>
        </div>
        <h1 className="text-center text-xl font-bold text-white">
          Acceso administrador plataforma
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Introduce tus credenciales para ver el listado de tenants
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="super-email"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Email
            </label>
            <input
              id="super-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
              placeholder="admin@ejemplo.com"
            />
          </div>
          <div>
            <label
              htmlFor="super-password"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Contraseña
            </label>
            <input
              id="super-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 focus:ring-2 focus:ring-amber-500/40 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
