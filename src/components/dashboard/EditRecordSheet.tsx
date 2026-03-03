"use client";

import { useState } from "react";
import { X, Save, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

type RecordType = "llamada" | "videollamada" | "chat";

interface EditableFields {
  id: number;
  nombre_lead?: string | null;
  closer?: string | null;
  estado?: string | null;
}

interface EditRecordSheetProps {
  type: RecordType;
  record: EditableFields;
  embudoEtapas?: { nombre: string }[];
  advisors?: { name: string; email?: string }[];
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_LABELS: Record<RecordType, string> = {
  llamada: "Llamada",
  videollamada: "Videollamada",
  chat: "Chat",
};

const API_ENDPOINTS: Record<RecordType, string> = {
  llamada: "/api/data/llamadas",
  videollamada: "/api/data/videollamadas",
  chat: "/api/data/chats",
};

export default function EditRecordSheet({
  type,
  record,
  embudoEtapas,
  advisors,
  onClose,
  onSaved,
}: EditRecordSheetProps) {
  const [nombre, setNombre] = useState(record.nombre_lead ?? "");
  const [closer, setCloser] = useState(record.closer ?? "");
  const [estado, setEstado] = useState(record.estado ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(API_ENDPOINTS[type], {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          nombre_lead: nombre || undefined,
          closer: closer || undefined,
          estado: estado || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Registro actualizado");
        onSaved();
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Error al guardar");
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md h-full bg-surface-800 border-l border-surface-500 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-accent-cyan" />
            <h3 className="font-semibold text-white text-sm">Editar {TYPE_LABELS[type]}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-lg bg-surface-700/50 border border-surface-500/60 px-3 py-2 text-[10px] text-gray-500">
            ID: {record.id}
          </div>

          <div>
            <label className="block text-xs font-medium text-accent-cyan mb-1.5">Nombre del lead</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40 focus:border-accent-cyan/40"
              placeholder="Nombre del lead"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-accent-purple mb-1.5">Closer / Asesor asignado</label>
            {advisors && advisors.length > 0 ? (
              <select
                value={closer}
                onChange={(e) => setCloser(e.target.value)}
                className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-accent-purple/40"
              >
                <option value="">Sin asignar</option>
                {advisors.map((a) => (
                  <option key={a.email ?? a.name} value={a.email ?? a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={closer}
                onChange={(e) => setCloser(e.target.value)}
                className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-purple/40"
                placeholder="email@asesor.com"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-accent-green mb-1.5">Estado del embudo</label>
            {embudoEtapas && embudoEtapas.length > 0 ? (
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-accent-green/40"
              >
                <option value="">Sin estado</option>
                {embudoEtapas.map((e) => (
                  <option key={e.nombre} value={e.nombre}>{e.nombre}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-green/40"
                placeholder="Estado"
              />
            )}
          </div>
        </div>

        <div className="p-4 border-t border-surface-500 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent-green text-black text-sm font-semibold hover:shadow-[0_0_20px_-6px_rgba(0,230,118,0.5)] transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
