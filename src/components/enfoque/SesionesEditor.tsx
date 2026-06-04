"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Pause, Play, Users, ListFilter, ArrowUpDown, Loader2 } from "lucide-react";

interface Sesion {
  id: string;
  nombre: string;
  modo: string;
  filtro_estado: string[] | null;
  filtro_asesores: string[] | null;
  orden: string;
  activa: boolean;
  created_at: string;
  created_by: string;
}

interface EstadoOption {
  estado: string;
  cantidad: number;
}

interface AsesorOption {
  email: string;
  nombre: string | null;
  cantidad: number;
}

interface Preview {
  totalLeads: number;
  totalAsesores: number;
}

const ORDEN_LABELS: Record<string, string> = {
  mas_antiguo: "Más antiguo primero",
  menos_intentos: "Menos intentos primero",
};

function estadoLabel(estado: string): string {
  return estado
    .replace(/^\{(.+)\}$/, "$1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SesionesEditor() {
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Sesion | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [orden, setOrden] = useState<string>("mas_antiguo");
  const [selectedEstados, setSelectedEstados] = useState<string[]>([]);
  const [selectedAsesores, setSelectedAsesores] = useState<string[]>([]);

  const [estados, setEstados] = useState<EstadoOption[]>([]);
  const [asesores, setAsesores] = useState<AsesorOption[]>([]);
  const [filtrosLoading, setFiltrosLoading] = useState(false);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchSesiones = useCallback(async () => {
    try {
      const res = await fetch("/api/enfoque/sesiones");
      if (res.ok) {
        const data = await res.json();
        setSesiones(data.sesiones);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFiltros = useCallback(async () => {
    setFiltrosLoading(true);
    try {
      const res = await fetch("/api/enfoque/sesiones/filtros");
      if (res.ok) {
        const data = await res.json();
        setEstados(data.estados);
        setAsesores(data.asesores);
      }
    } finally {
      setFiltrosLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSesiones();
  }, [fetchSesiones]);

  const fetchPreview = useCallback(async (fEstados: string[], fAsesores: string[]) => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/enfoque/sesiones/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filtro_estado: fEstados.length > 0 ? fEstados : null,
          filtro_asesores: fAsesores.length > 0 ? fAsesores : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
      }
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    const timer = setTimeout(() => {
      void fetchPreview(selectedEstados, selectedAsesores);
    }, 300);
    return () => clearTimeout(timer);
  }, [dialogOpen, selectedEstados, selectedAsesores, fetchPreview]);

  function openNew() {
    setEditing(null);
    setNombre("");
    setOrden("mas_antiguo");
    setSelectedEstados([]);
    setSelectedAsesores([]);
    setPreview(null);
    setDialogOpen(true);
    void fetchFiltros();
  }

  function openEdit(sesion: Sesion) {
    setEditing(sesion);
    setNombre(sesion.nombre);
    setOrden(sesion.orden);
    setSelectedEstados(sesion.filtro_estado ?? []);
    setSelectedAsesores(sesion.filtro_asesores ?? []);
    setPreview(null);
    setDialogOpen(true);
    void fetchFiltros();
  }

  async function handleSave() {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        nombre: nombre.trim(),
        modo: "llamada",
        filtro_estado: selectedEstados.length > 0 ? selectedEstados : null,
        filtro_asesores: selectedAsesores.length > 0 ? selectedAsesores : null,
        orden,
      };

      const res = await fetch("/api/enfoque/sesiones", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDialogOpen(false);
        void fetchSesiones();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(sesion: Sesion) {
    setToggling(sesion.id);
    try {
      const res = await fetch("/api/enfoque/sesiones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sesion.id, activa: !sesion.activa }),
      });
      if (res.ok) {
        void fetchSesiones();
      }
    } finally {
      setToggling(null);
    }
  }

  function toggleEstado(estado: string) {
    setSelectedEstados((prev) =>
      prev.includes(estado) ? prev.filter((e) => e !== estado) : [...prev, estado],
    );
  }

  function toggleAsesor(email: string) {
    setSelectedAsesores((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Sesiones de enfoque</h1>
          <p className="text-sm text-gray-400 mt-1">
            Configura qué leads entran en cada sesión de trabajo
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-medium hover:bg-accent-cyan/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva sesión
        </button>
      </div>

      {sesiones.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-surface-800 rounded-xl border border-surface-600">
          <ListFilter className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No hay sesiones configuradas</p>
          <p className="text-xs mt-1 text-gray-500">
            Crea tu primera sesión para organizar el trabajo de enfoque
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sesiones.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                s.activa
                  ? "bg-surface-800 border-surface-600"
                  : "bg-surface-900/50 border-surface-700 opacity-60"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">{s.nombre}</span>
                  {s.activa && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                      Activa
                    </span>
                  )}
                  {!s.activa && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                      Pausada
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3" />
                    {ORDEN_LABELS[s.orden] ?? s.orden}
                  </span>
                  {s.filtro_estado && s.filtro_estado.length > 0 && (
                    <span className="flex items-center gap-1">
                      <ListFilter className="w-3 h-3" />
                      {s.filtro_estado.length} estado{s.filtro_estado.length !== 1 && "s"}
                    </span>
                  )}
                  {s.filtro_asesores && s.filtro_asesores.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {s.filtro_asesores.length} asesor{s.filtro_asesores.length !== 1 && "es"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(s)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-600 transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => void handleToggle(s)}
                  disabled={toggling === s.id}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-600 transition-colors disabled:opacity-50"
                  title={s.activa ? "Pausar" : "Activar"}
                >
                  {toggling === s.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : s.activa ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface-800 border-surface-600 text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar sesión" : "Nueva sesión de enfoque"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Define qué leads y asesores participan en esta sesión
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Nombre de la sesión
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Seguimiento de esta semana"
                className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-surface-600 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-accent-cyan"
              />
            </div>

            {/* Orden */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Orden de leads
              </label>
              <div className="flex gap-2">
                {(["mas_antiguo", "menos_intentos"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOrden(o)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                      orden === o
                        ? "bg-accent-cyan/10 border-accent-cyan/50 text-accent-cyan"
                        : "bg-surface-900 border-surface-600 text-gray-400 hover:text-white"
                    }`}
                  >
                    {ORDEN_LABELS[o]}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro estados */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Filtrar por estado del lead
                <span className="text-gray-500 font-normal ml-1">(vacío = todos)</span>
              </label>
              {filtrosLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Cargando estados...
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {estados.map((e) => (
                    <button
                      key={e.estado}
                      type="button"
                      onClick={() => toggleEstado(e.estado)}
                      className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                        selectedEstados.includes(e.estado)
                          ? "bg-accent-cyan/10 border-accent-cyan/50 text-accent-cyan"
                          : "bg-surface-900 border-surface-600 text-gray-400 hover:text-white"
                      }`}
                    >
                      {estadoLabel(e.estado)}
                      <span className="ml-1 opacity-60">({e.cantidad})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filtro asesores */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Filtrar por asesor
                <span className="text-gray-500 font-normal ml-1">(vacío = todos)</span>
              </label>
              {filtrosLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Cargando asesores...
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {asesores.map((a) => (
                    <button
                      key={a.email}
                      type="button"
                      onClick={() => toggleAsesor(a.email)}
                      className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                        selectedAsesores.includes(a.email)
                          ? "bg-accent-cyan/10 border-accent-cyan/50 text-accent-cyan"
                          : "bg-surface-900 border-surface-600 text-gray-400 hover:text-white"
                      }`}
                    >
                      {a.nombre ?? a.email}
                      <span className="ml-1 opacity-60">({a.cantidad})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="bg-surface-900 rounded-lg border border-surface-600 p-3">
              <p className="text-xs font-medium text-gray-400 mb-2">Vista previa con estos filtros</p>
              {previewLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="w-3 h-3 animate-spin" /> Calculando...
                </div>
              ) : preview ? (
                <div className="flex gap-6">
                  <div>
                    <p className="text-2xl font-bold text-white">{preview.totalLeads.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">leads entrarían</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{preview.totalAsesores}</p>
                    <p className="text-xs text-gray-400">asesores</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Ajusta los filtros para ver el conteo</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving || !nombre.trim()}
              className="px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-medium hover:bg-accent-cyan/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
                </span>
              ) : editing ? (
                "Guardar cambios"
              ) : (
                "Crear sesión"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
