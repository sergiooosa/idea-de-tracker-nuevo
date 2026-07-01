"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

export default function CambiarPasswordPage() {
  const { update } = useSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isValid = newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/cambiar-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al cambiar la contraseña");
        setLoading(false);
        return;
      }

      setSuccess(true);
      await update();
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch {
      setError("Error de red");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface-800 rounded-2xl border border-surface-600 p-8 shadow-xl">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-full bg-accent-cyan/10 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-accent-cyan" />
            </div>
            <h1 className="text-xl font-semibold text-white">Cambiar contraseña</h1>
            <p className="text-sm text-gray-400 mt-2 text-center">
              Tu cuenta tiene una contraseña provisional. Debes establecer una nueva contraseña para continuar.
            </p>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
              <p className="text-green-400 font-medium">Contraseña actualizada</p>
              <p className="text-sm text-gray-400">Redirigiendo al dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    className="w-full rounded-lg bg-surface-700 border border-surface-500 pl-9 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40 focus:border-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword.length > 0 && newPassword.length < 8 && (
                  <p className="text-xs text-red-400 mt-1">Debe tener al menos 8 caracteres</p>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Confirmar contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    className="w-full rounded-lg bg-surface-700 border border-surface-500 pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40 focus:border-transparent outline-none"
                  />
                </div>
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full py-2.5 rounded-lg bg-accent-cyan text-surface-900 font-semibold text-sm hover:bg-accent-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Establecer nueva contraseña"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
