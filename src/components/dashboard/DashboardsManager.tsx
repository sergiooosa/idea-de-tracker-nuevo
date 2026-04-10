"use client";
/**
 * DashboardsManager — Gestión de dashboards personalizados (máx. 3)
 * Se usa en System → sección Dashboards
 */
import { useState } from "react";
import { Plus, Pencil, Trash2, LayoutDashboard, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { DashboardPersonalizado } from "@/lib/db/schema";

interface Props {
  dashboards: DashboardPersonalizado[];
  onChange: (updated: DashboardPersonalizado[]) => void;
}

const EMOJIS = ["📊", "🚀", "💰", "📈", "🎯", "⚡", "🔥", "💎", "🏆", "📋"];

export default function DashboardsManager({ dashboards, onChange }: Props) {
  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [icono, setIcono] = useState("📊");
  const [saving, setSaving] = useState(false);

  const MAX = 3;

  async function crear() {
    if (!nombre.trim()) { toast.error("Pon un nombre al dashboard"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/data/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), icono }),
      });
      const data = await res.json() as { ok?: boolean; dashboard?: DashboardPersonalizado; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Error al crear"); return; }
      onChange([...dashboards, data.dashboard!]);
      toast.success(`Dashboard "${nombre}" creado`);
      setCreando(false);
      setNombre("");
      setIcono("📊");
    } finally { setSaving(false); }
  }

  async function editar(id: string) {
    if (!nombre.trim()) { toast.error("El nombre no puede estar vacío"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/data/dashboards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, nombre: nombre.trim(), icono }),
      });
      const data = await res.json() as { ok?: boolean; dashboard?: DashboardPersonalizado; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Error al guardar"); return; }
      onChange(dashboards.map((d) => d.id === id ? data.dashboard! : d));
      toast.success("Dashboard actualizado");
      setEditandoId(null);
      setNombre("");
    } finally { setSaving(false); }
  }

  async function eliminar(d: DashboardPersonalizado) {
    if (!confirm(`¿Eliminar dashboard "${d.nombre}"? Las métricas asignadas solo a este dashboard quedarán en Panel Ejecutivo.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/data/dashboards?id=${d.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Error al eliminar"); return; }
      onChange(dashboards.filter((x) => x.id !== d.id));
      toast.success(`Dashboard "${d.nombre}" eliminado`);
    } finally { setSaving(false); }
  }

  function startEdit(d: DashboardPersonalizado) {
    setEditandoId(d.id);
    setNombre(d.nombre);
    setIcono(d.icono ?? "📊");
    setCreando(false);
  }

  function cancelar() {
    setCreando(false);
    setEditandoId(null);
    setNombre("");
    setIcono("📊");
  }

  return (
    <div className="space-y-3">
      {/* Dashboards existentes */}
      {dashboards.length === 0 && !creando && (
        <p className="text-xs text-gray-500 py-2">
          No hay dashboards personalizados. Crea hasta {MAX} para organizar tus métricas.
        </p>
      )}

      {dashboards.map((d) => (
        <div key={d.id} className="rounded-lg border border-surface-500 bg-surface-700/40 p-3">
          {editandoId === d.id ? (
            <DashboardForm
              nombre={nombre}
              icono={icono}
              onNombre={setNombre}
              onIcono={setIcono}
              onConfirm={() => editar(d.id)}
              onCancel={cancelar}
              saving={saving}
              label="Guardar cambios"
            />
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{d.icono ?? "📊"}</span>
                <div>
                  <p className="text-sm font-medium text-white">{d.nombre}</p>
                  <p className="text-[10px] text-gray-500">{d.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(d)}
                  className="p-1.5 rounded hover:bg-surface-600 text-gray-400 hover:text-white transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(d)}
                  className="p-1.5 rounded hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Formulario de creación */}
      {creando && (
        <div className="rounded-lg border border-accent-cyan/40 bg-surface-700/40 p-3">
          <p className="text-xs text-accent-cyan font-medium mb-2 flex items-center gap-1.5">
            <LayoutDashboard className="w-3.5 h-3.5" /> Nuevo dashboard
          </p>
          <DashboardForm
            nombre={nombre}
            icono={icono}
            onNombre={setNombre}
            onIcono={setIcono}
            onConfirm={crear}
            onCancel={cancelar}
            saving={saving}
            label="Crear dashboard"
          />
        </div>
      )}

      {/* Botón crear */}
      {!creando && dashboards.length < MAX && (
        <button
          type="button"
          onClick={() => { setCreando(true); setEditandoId(null); setNombre(""); setIcono("📊"); }}
          className="flex items-center gap-1.5 text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Crear dashboard ({dashboards.length}/{MAX})
        </button>
      )}
      {!creando && dashboards.length >= MAX && (
        <p className="text-xs text-gray-500">Límite de {MAX} dashboards alcanzado.</p>
      )}
    </div>
  );
}

function DashboardForm({
  nombre, icono, onNombre, onIcono, onConfirm, onCancel, saving, label,
}: {
  nombre: string; icono: string;
  onNombre: (v: string) => void; onIcono: (v: string) => void;
  onConfirm: () => void; onCancel: () => void;
  saving: boolean; label: string;
}) {
  const EMOJIS = ["📊", "🚀", "💰", "📈", "🎯", "⚡", "🔥", "💎", "🏆", "📋", "📌", "🧠"];
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={nombre}
          onChange={(e) => onNombre(e.target.value)}
          placeholder="Nombre del dashboard"
          className="flex-1 px-2 py-1.5 rounded bg-surface-600 border border-surface-400 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-cyan/50"
          maxLength={40}
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") onConfirm(); if (e.key === "Escape") onCancel(); }}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onIcono(e)}
            className={`w-7 h-7 rounded text-lg flex items-center justify-center transition-colors ${
              icono === e ? "bg-accent-cyan/30 ring-1 ring-accent-cyan" : "hover:bg-surface-600"
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving || !nombre.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-accent-cyan text-black text-xs font-semibold disabled:opacity-50 hover:bg-accent-cyan/90 transition-colors"
        >
          <Check className="w-3 h-3" /> {label}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-surface-600 text-gray-300 text-xs hover:bg-surface-500 transition-colors"
        >
          <X className="w-3 h-3" /> Cancelar
        </button>
      </div>
    </div>
  );
}
