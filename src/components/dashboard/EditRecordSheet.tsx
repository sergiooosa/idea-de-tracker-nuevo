"use client";

import { useState } from "react";
import { X, Save, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type RecordType = "llamada" | "videollamada" | "chat";

interface EditableFields {
  id?: number;
  id_registro?: number;
  nombre_lead?: string | null;
  mail_lead?: string | null;
  phone?: string | null;
  closer?: string | null;
  estado?: string | null;
  id_user_ghl?: string | null;
  facturacion?: number | null;
  cash_collected?: number | null;
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
  const isRegistro = record.id_registro != null;
  const [nombre, setNombre] = useState(record.nombre_lead ?? "");
  const [mail, setMail] = useState(record.mail_lead ?? "");
  const [phone, setPhone] = useState(record.phone ?? "");
  const [closer, setCloser] = useState(record.closer ?? "");
  const [estado, setEstado] = useState(record.estado ?? "");
  const [idUserGhl, setIdUserGhl] = useState(record.id_user_ghl ?? "");
  const [facturacion, setFacturacion] = useState(record.facturacion != null ? String(record.facturacion) : "");
  const [cashCollected, setCashCollected] = useState(record.cash_collected != null ? String(record.cash_collected) : "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = isRegistro
        ? {
            id_registro: record.id_registro,
            nombre_lead: nombre || undefined,
            mail_lead: mail || undefined,
            phone_raw_format: phone || undefined,
            closer: closer || undefined,
            estado: estado || undefined,
            id_user_ghl: idUserGhl || undefined,
          }
        : {
            id: record.id,
            nombre_lead: nombre || undefined,
            closer: closer || undefined,
            estado: estado || undefined,
            ...(type === "videollamada" && {
              facturacion: facturacion !== "" ? parseFloat(facturacion) || 0 : undefined,
              cash_collected: cashCollected !== "" ? parseFloat(cashCollected) || 0 : undefined,
            }),
          };
      const res = await fetch(API_ENDPOINTS[type], {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const handleDelete = async () => {
    if (!isRegistro || type !== "llamada") return;
    if (!confirm("¿Eliminar este registro de llamada? Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_ENDPOINTS[type]}?id_registro=${record.id_registro}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Registro eliminado");
        onSaved();
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Error al eliminar");
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setDeleting(false);
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
            {isRegistro ? `ID registro: ${record.id_registro}` : `ID: ${record.id}`}
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

          {isRegistro && (
            <>
              <div>
                <label className="block text-xs font-medium text-accent-cyan mb-1.5">Email del lead</label>
                <input
                  type="text"
                  value={mail}
                  onChange={(e) => setMail(e.target.value)}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40 focus:border-accent-cyan/40"
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-accent-cyan mb-1.5">Teléfono</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40 focus:border-accent-cyan/40"
                  placeholder="+57 300 123 4567"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-accent-cyan mb-1.5">ID usuario GHL</label>
                <input
                  type="text"
                  value={idUserGhl}
                  onChange={(e) => setIdUserGhl(e.target.value)}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40 focus:border-accent-cyan/40"
                  placeholder="abc123xyz"
                />
              </div>
            </>
          )}

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

          {type === "videollamada" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-accent-green mb-1.5">Facturación ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={facturacion}
                  onChange={(e) => setFacturacion(e.target.value)}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-green/40"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-accent-green mb-1.5">Cash cobrado ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashCollected}
                  onChange={(e) => setCashCollected(e.target.value)}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-green/40"
                  placeholder="0"
                />
              </div>
            </div>
          )}

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

        <div className="p-4 border-t border-surface-500 shrink-0 space-y-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent-green text-black text-sm font-semibold hover:shadow-[0_0_20px_-6px_rgba(0,230,118,0.5)] transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
          {isRegistro && type === "llamada" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-medium disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Eliminar registro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
