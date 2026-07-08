"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import HelpTooltip from "@/components/dashboard/HelpTooltip";
import { UserPlus, Shield, Crown, Users, X, Key, Mail, Pencil, Loader2, Plus, Trash2, Upload, Download, CheckCircle2, Sparkles, Copy, FileDown, MessageSquare, Phone, Video } from "lucide-react";
import { useUserFilter } from "@/contexts/UserFilterContext";
import { canManageUsers, canManageRoles, canManageSystem } from "@/lib/permisos";
import { PERMISOS_DISPONIBLES, type PermisoId } from "@/lib/permisos";
import type { RolConfig } from "@/lib/db/schema";
import { toast } from "sonner";

type Canal = "chats" | "llamadas" | "videollamadas";
type CriteriosTab = "global" | Canal;

interface CanalesState {
  chats: string[] | null;
  llamadas: string[] | null;
  videollamadas: string[] | null;
}

interface CriteriosCalificacionData {
  categorias: string[] | null;
  canales: CanalesState;
  categoriasDisponibles: string[];
}

const TABS_CONFIG: { id: CriteriosTab; label: string; icon: typeof Sparkles; helpTitulo: string; helpContenido: string; helpProbar: string }[] = [
  {
    id: "global",
    label: "Global",
    icon: Sparkles,
    helpTitulo: "Criterios Globales",
    helpContenido: "Las categorías seleccionadas aquí aplican a todos los canales que no tengan un criterio específico. Si un canal tiene criterios propios, se usarán esos en lugar de los globales.",
    helpProbar: "Selecciona categorías globales, guarda, y verifica en Performance que se aplican a los canales sin criterios propios.",
  },
  {
    id: "chats",
    label: "Chats",
    icon: MessageSquare,
    helpTitulo: "Criterios de Chats (WhatsApp)",
    helpContenido: "Las categorías seleccionadas aquí aplican solo a las conversaciones de WhatsApp/chat. Si dejas vacío, se usarán los criterios globales para este canal.",
    helpProbar: "Selecciona categorías específicas para chats, guarda, y verifica que solo se aplican a los chats en Performance.",
  },
  {
    id: "llamadas",
    label: "Llamadas",
    icon: Phone,
    helpTitulo: "Criterios de Llamadas (Twilio)",
    helpContenido: "Las categorías seleccionadas aquí aplican solo a las llamadas telefónicas. Si dejas vacío, se usarán los criterios globales para este canal.",
    helpProbar: "Selecciona categorías específicas para llamadas, guarda, y verifica que solo se aplican a las llamadas en Performance.",
  },
  {
    id: "videollamadas",
    label: "Videollamadas",
    icon: Video,
    helpTitulo: "Criterios de Videollamadas (Fathom)",
    helpContenido: "Las categorías seleccionadas aquí aplican solo a las videollamadas/reuniones. Si dejas vacío, se usarán los criterios globales para este canal.",
    helpProbar: "Selecciona categorías específicas para videollamadas, guarda, y verifica que solo se aplican a las videollamadas en Performance.",
  },
];

type TipoUsuario = "analista" | "enfoque";

interface UserRow {
  id: number;
  nombre: string | null;
  email: string;
  rol: string;
  permisos: Record<string, boolean> | null;
  fathom: string | null;
  id_webhook_fathom?: string | null;
  tipo_usuario: TipoUsuario;
}

const ROLES_BUILTIN = [
  { id: "superadmin", nombre: "Administrador General" },
  { id: "usuario", nombre: "Usuario" },
];

export default function ConfiguracionPage() {
  const { session } = useUserFilter();
  const permisos = session?.permisosArray ?? [];
  const puedeUsuarios = canManageUsers(permisos) || session?.rol === "superadmin";
  const puedeRoles = canManageRoles(permisos) || session?.rol === "superadmin";
  const puedeCriterios = canManageSystem(permisos) || session?.rol === "superadmin";

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RolConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalUser, setModalUser] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [formUser, setFormUser] = useState({ name: "", email: "", password: "", fathom: "", rol: "usuario", tipo_usuario: "analista" as TipoUsuario });
  const [error, setError] = useState("");

  const [provisionalPassword, setProvisionalPassword] = useState<{ email: string; password: string } | null>(null);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ creados: number; errores: Array<{ email: string; error: string }> } | null>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);

  const [modalRol, setModalRol] = useState<"create" | "edit" | null>(null);
  const [editingRol, setEditingRol] = useState<RolConfig | null>(null);
  const [formRol, setFormRol] = useState<RolConfig>({ id: "", nombre: "", permisos: [] });

  // Criterios de calificación
  const [criteriosData, setCriteriosData] = useState<CriteriosCalificacionData | null>(null);
  const [criteriosSeleccionados, setCriteriosSeleccionados] = useState<string[]>([]);
  const [criteriosCanales, setCriteriosCanales] = useState<CanalesState>({ chats: null, llamadas: null, videollamadas: null });
  const [criteriosSaving, setCriteriosSaving] = useState(false);
  const [criteriosLoaded, setCriteriosLoaded] = useState(false);
  const [criteriosTab, setCriteriosTab] = useState<CriteriosTab>("global");

  const loadCriterios = useCallback(async () => {
    if (!puedeCriterios) return;
    try {
      const res = await fetch("/api/data/criterios-calificacion");
      if (res.ok) {
        const data = (await res.json()) as CriteriosCalificacionData;
        setCriteriosData(data);
        setCriteriosSeleccionados(data.categorias ?? []);
        setCriteriosCanales(data.canales ?? { chats: null, llamadas: null, videollamadas: null });
        setCriteriosLoaded(true);
      }
    } catch { /* ignore */ }
  }, [puedeCriterios]);

  const loadUsers = useCallback(async () => {
    if (!puedeUsuarios) return;
    try {
      const res = await fetch("/api/data/usuarios");
      if (res.ok) setUsers(await res.json());
    } catch { /* ignore */ }
  }, [puedeUsuarios]);

  const loadRoles = useCallback(async () => {
    if (!puedeRoles) return;
    try {
      const res = await fetch("/api/data/roles");
      if (res.ok) setRoles(await res.json());
    } catch { /* ignore */ }
  }, [puedeRoles]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadUsers(), loadRoles(), loadCriterios()]).finally(() => setLoading(false));
  }, [loadUsers, loadRoles, loadCriterios]);

  const rolesParaSelect = [...ROLES_BUILTIN, ...roles.filter((r) => !["superadmin", "usuario"].includes(r.id))];

  const openCreateUser = () => {
    setEditingUser(null);
    setFormUser({ name: "", email: "", password: "", fathom: "", rol: "usuario", tipo_usuario: "analista" });
    setError("");
    setModalUser("create");
  };

  const openEditUser = (u: UserRow) => {
    setEditingUser(u);
    setFormUser({ name: u.nombre ?? "", email: u.email, password: "", fathom: u.fathom ?? "", rol: u.rol, tipo_usuario: u.tipo_usuario ?? "analista" });
    setError("");
    setModalUser("edit");
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingUser) {
        const body: Record<string, unknown> = { id: editingUser.id, nombre: formUser.name, rol: formUser.rol, fathom: formUser.fathom, tipo_usuario: formUser.tipo_usuario };
        if (formUser.password) body.password = formUser.password;
        const putRes = await fetch("/api/data/usuarios", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!putRes.ok) throw new Error("Error al actualizar");
        const putData = await putRes.json().catch(() => ({}));
        if (putData.fathomWarning) {
          toast.warning("Usuario actualizado, pero Fathom no registró el webhook", { description: putData.fathomWarning });
        } else {
          toast.success("Usuario actualizado");
        }
      } else {
        if (!formUser.email) {
          setError("Email es obligatorio");
          setSaving(false);
          return;
        }
        const payload: Record<string, unknown> = {
          nombre: formUser.name,
          email: formUser.email,
          rol: formUser.rol,
          fathom: formUser.fathom,
          tipo_usuario: formUser.tipo_usuario,
        };
        if (formUser.password) payload.password = formUser.password;
        const res = await fetch("/api/data/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Error al crear usuario");
          setSaving(false);
          return;
        }
        const created = await res.json().catch(() => ({}));
        if (created.provisionalPassword) {
          setProvisionalPassword({ email: created.email, password: created.provisionalPassword });
        }
        if (created.fathomWarning) {
          toast.warning("Usuario creado, pero Fathom no registró el webhook", { description: created.fathomWarning });
        } else {
          toast.success(created.provisionalPassword ? "Usuario creado con contraseña provisional" : "Usuario creado");
        }
      }
      setModalUser(null);
      loadUsers();
    } catch {
      setError("Error de red");
    }
    setSaving(false);
  };

  const handleDeleteUser = async (id: number) => {
    const target = users.find((u) => u.id === id);
    if (target && session?.email && target.email === session.email) {
      toast.error("No puedes eliminar tu propia cuenta");
      return;
    }
    if (!confirm("¿Eliminar este usuario?")) return;
    try {
      const res = await fetch(`/api/data/usuarios?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      toast.success("Usuario eliminado");
      loadUsers();
    } catch {
      toast.error("Error al eliminar el usuario");
    }
  };

  const updateRoleUser = async (userId: number, newRole: string) => {
    try {
      const res = await fetch("/api/data/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, rol: newRole }),
      });
      if (!res.ok) throw new Error("Error al actualizar rol");
      toast.success("Rol actualizado");
      loadUsers();
    } catch {
      toast.error("Error al actualizar el rol");
    }
  };

  const openCreateRol = () => {
    setEditingRol(null);
    setFormRol({ id: `rol_${Date.now()}`, nombre: "", permisos: [] });
    setModalRol("create");
  };

  const openEditRol = (r: RolConfig) => {
    setEditingRol(r);
    setFormRol({ ...r });
    setModalRol("edit");
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const fd = new FormData();
      fd.append("file", bulkFile);
      const res = await fetch("/api/data/usuarios/bulk", { method: "POST", body: fd });
      const data = await res.json();
      setBulkResult(data);
      if (data.creados > 0) loadUsers();
    } catch {
      toast.error("Error al procesar el archivo");
    }
    setBulkLoading(false);
  };

  const togglePermisoRol = (permisoId: PermisoId) => {
    setFormRol((prev) => ({
      ...prev,
      permisos: prev.permisos.includes(permisoId)
        ? prev.permisos.filter((p) => p !== permisoId)
        : [...prev.permisos, permisoId],
    }));
  };

  const handleSubmitRol = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const newRoles = editingRol
        ? roles.map((r) => (r.id === editingRol.id ? formRol : r))
        : [...roles, formRol];
      const res = await fetch("/api/data/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles_config: newRoles }),
      });
      if (!res.ok) throw new Error("Error al guardar rol");
      toast.success("Rol guardado");
      setModalRol(null);
      loadRoles();
    } catch {
      toast.error("Error al guardar el rol");
    }
    setSaving(false);
  };

  const handleDeleteRol = async (id: string) => {
    if (["superadmin", "usuario"].includes(id)) return;
    if (!confirm("¿Eliminar este rol?")) return;
    try {
      const newRoles = roles.filter((r) => r.id !== id);
      const res = await fetch("/api/data/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles_config: newRoles }),
      });
      if (!res.ok) throw new Error("Error al eliminar rol");
      toast.success("Rol eliminado");
      loadRoles();
    } catch {
      toast.error("Error al eliminar el rol");
    }
  };

  const handleSaveCriterios = async () => {
    setCriteriosSaving(true);
    try {
      const res = await fetch("/api/data/criterios-calificacion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorias: criteriosSeleccionados.length > 0 ? criteriosSeleccionados : null,
          canales: criteriosCanales,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success("Criterios de calificación guardados");
      await loadCriterios();
    } catch {
      toast.error("Error al guardar los criterios");
    }
    setCriteriosSaving(false);
  };

  const toggleCriterio = (cat: string) => {
    if (criteriosTab === "global") {
      setCriteriosSeleccionados((prev) =>
        prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
      );
    } else {
      setCriteriosCanales((prev) => {
        const canal = criteriosTab as Canal;
        const current = prev[canal] ?? [];
        const next = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
        return { ...prev, [canal]: next.length > 0 ? next : null };
      });
    }
  };

  const getSeleccionados = (): string[] => {
    if (criteriosTab === "global") return criteriosSeleccionados;
    return criteriosCanales[criteriosTab as Canal] ?? [];
  };

  if (!puedeUsuarios && !puedeRoles && !puedeCriterios) {
    return (
      <>
        <PageHeader title="Configuración" subtitle="Sin permisos" action={<span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-amber/20 text-accent-amber border border-accent-amber/40 font-medium uppercase shrink-0">Beta</span>} />
        <div className="p-4 text-center text-gray-500">No tienes permiso para acceder a esta sección.</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Configuración" subtitle="Usuarios · Roles · Permisos" action={<span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-amber/20 text-accent-amber border border-accent-amber/40 font-medium uppercase shrink-0">Beta</span>} />
      <div className="p-3 md:p-4 max-w-4xl mx-auto space-y-6 text-sm min-w-0 max-w-full overflow-x-hidden">
        {puedeRoles && (
          <section className="rounded-xl border border-surface-500 bg-surface-800/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent-cyan" />
                <h2 className="text-sm font-semibold text-white">Roles</h2>
                <span className="px-2 py-0.5 rounded-full bg-accent-cyan/20 text-accent-cyan text-xs font-medium">
                  {roles.length + 2}
                </span>
              </div>
              <button
                type="button"
                onClick={openCreateRol}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:bg-accent-cyan/90 transition-colors"
              >
                <Plus className="w-4 h-4" /> Crear rol
              </button>
            </div>
            <ul className="space-y-2">
              {ROLES_BUILTIN.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg bg-surface-700/80 border border-surface-500 px-3 py-2">
                  <span className="text-white font-medium">{r.nombre}</span>
                  <span className="text-xs text-gray-500">(integrado)</span>
                </li>
              ))}
              {roles.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg bg-surface-700/80 border border-surface-500 px-3 py-2">
                  <span className="text-white font-medium">{r.nombre}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditRol(r)}
                      className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-accent-cyan"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRol(r.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {puedeUsuarios && (
          <section className="rounded-xl border border-surface-500 bg-surface-800/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-accent-cyan" />
                <h2 className="text-sm font-semibold text-white">Usuarios</h2>
                <span className="px-2 py-0.5 rounded-full bg-accent-cyan/20 text-accent-cyan text-xs font-medium">
                  {users.length}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href="/api/data/usuarios/template"
                  download
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-700 border border-surface-500 text-gray-300 text-xs font-medium hover:bg-surface-600 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Plantilla
                </a>
                <button
                  type="button"
                  onClick={() => { setShowBulkModal(true); setBulkResult(null); setBulkFile(null); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-700 border border-surface-500 text-gray-300 text-xs font-medium hover:bg-surface-600 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Carga masiva
                </button>
                <button
                  type="button"
                  onClick={openCreateUser}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:bg-accent-cyan/90 transition-colors"
                >
                  <UserPlus className="w-4 h-4" /> Añadir usuario
                </button>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center rounded-lg bg-surface-700/50 border border-surface-500 border-dashed">
                No hay usuarios. Haz clic en &quot;Añadir usuario&quot; para crear el primero.
              </p>
            ) : (
              <ul className="space-y-2">
                {users.map((u) => (
                  <li key={u.id} className="flex items-center justify-between rounded-lg bg-surface-700/80 border border-surface-500 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-medium">{u.nombre ?? u.email}</span>
                        {u.rol === "superadmin" && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        {u.tipo_usuario === "enfoque" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-purple/20 text-accent-purple border border-accent-purple/30 font-medium uppercase">Enfoque</span>
                        )}
                      </div>
                      <span className="text-gray-500 text-xs block">{u.email}</span>
                      {u.fathom?.trim() && (
                        <span className={`text-[10px] block mt-0.5 ${u.id_webhook_fathom ? "text-accent-green" : "text-amber-400"}`}>
                          Fathom: {u.id_webhook_fathom ? "webhook registrado" : "API key sin webhook (revisa o edita)"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={u.rol}
                        onChange={(e) => updateRoleUser(u.id, e.target.value)}
                        className="rounded bg-surface-600 border border-surface-500 px-2 py-1 text-xs text-white"
                      >
                        {rolesParaSelect.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nombre}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => openEditUser(u)}
                        className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-accent-cyan"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ── Criterios de Calificación (por canal) ── */}
        {criteriosLoaded && puedeCriterios && (
          <section className="rounded-xl border border-surface-500 bg-surface-800/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent-purple" />
                <h2 className="text-sm font-semibold text-white">Criterios de Calificación</h2>
                <HelpTooltip
                  titulo="¿Qué son los Criterios de Calificación?"
                  contenido={`Aquí eliges qué categorías de interés (detectadas automáticamente por la IA al analizar tus conversaciones) cuentan como un lead calificado para tu negocio.\n\nPuedes definir criterios globales que aplican a todos los canales, o criterios específicos por canal (Chats, Llamadas, Videollamadas). Si un canal tiene criterios propios, se usarán esos en lugar de los globales.`}
                  comoProbar="Selecciona categorías en la pestaña Global o en un canal específico, guarda, y verifica en Performance que las conversaciones se marcan correctamente como Calificado."
                />
              </div>
            </div>

            {criteriosData?.categoriasDisponibles.length === 0 ? (
              <div className="rounded-xl border border-accent-purple/20 bg-accent-purple/5 p-4 space-y-2">
                <p className="text-sm font-medium text-accent-purple">
                  Define qué intereses detectados por IA califican como leads para tu negocio
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Cuando la IA analice las conversaciones nocturnas, verás aquí las categorías detectadas y podrás seleccionar cuáles considerarás leads calificados.
                  Por ahora no hay categorías disponibles — el análisis nocturno aún no ha procesado conversaciones.
                </p>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex gap-1 mb-4 overflow-x-auto border-b border-surface-600 pb-px">
                  {TABS_CONFIG.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = criteriosTab === tab.id;
                    const selCount = tab.id === "global"
                      ? criteriosSeleccionados.length
                      : (criteriosCanales[tab.id as Canal] ?? []).length;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCriteriosTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                          isActive
                            ? "bg-surface-700 text-white border-b-2 border-accent-purple"
                            : "text-gray-400 hover:text-gray-300 hover:bg-surface-700/50"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                        {selCount > 0 && (
                          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            isActive ? "bg-accent-purple/20 text-accent-purple" : "bg-surface-600 text-gray-500"
                          }`}>
                            {selCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                {(() => {
                  const activeTab = TABS_CONFIG.find((t) => t.id === criteriosTab);
                  const selected = getSeleccionados();
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-xs text-gray-400 leading-relaxed flex-1">
                          {criteriosTab === "global" ? (
                            <>
                              Selecciona las categorías que consideras un lead calificado.
                              Aplican a todos los canales sin criterios propios.
                              Dejar vacío = sin filtro (todos calificados).
                            </>
                          ) : (
                            <>
                              Criterios específicos para <span className="text-white font-medium">{activeTab?.label}</span>.
                              Dejar vacío = se usarán los criterios globales para este canal.
                            </>
                          )}
                        </p>
                        {activeTab && (
                          <HelpTooltip
                            titulo={activeTab.helpTitulo}
                            contenido={activeTab.helpContenido}
                            comoProbar={activeTab.helpProbar}
                          />
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {criteriosData?.categoriasDisponibles.map((cat) => {
                          const isSelected = selected.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => toggleCriterio(cat)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                isSelected
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                                  : "bg-surface-700 text-gray-400 border-surface-500 hover:border-emerald-500/30 hover:text-gray-300"
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleSaveCriterios}
                          disabled={criteriosSaving}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:bg-accent-cyan/90 disabled:opacity-50 transition-colors"
                        >
                          {criteriosSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Guardar criterios
                        </button>
                        {selected.length > 0 && (
                          <span className="text-xs text-gray-400">
                            {selected.length} categoría{selected.length !== 1 ? "s" : ""} seleccionada{selected.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </section>
        )}
      </div>

      {modalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalUser(null)} aria-hidden />
          <div className="relative w-full max-w-md rounded-xl bg-surface-800 border border-surface-500 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                {editingUser ? (
                  <>
                    <Pencil className="w-4 h-4 text-accent-cyan" /> Editar usuario
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-accent-cyan" /> Añadir usuario
                  </>
                )}
              </h3>
              <button type="button" onClick={() => setModalUser(null)} className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="p-4 space-y-4" onSubmit={handleSubmitUser}>
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>
              )}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formUser.name}
                  onChange={(e) => setFormUser((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre completo"
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    required={!editingUser}
                    value={formUser.email}
                    onChange={(e) => setFormUser((f) => ({ ...f, email: e.target.value }))}
                    placeholder="usuario@empresa.com"
                    disabled={!!editingUser}
                    className="w-full rounded-lg bg-surface-700 border border-surface-500 pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40 disabled:opacity-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  {editingUser ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña (dejar vacío para auto-generar)"}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    value={formUser.password}
                    onChange={(e) => setFormUser((f) => ({ ...f, password: e.target.value }))}
                    placeholder={editingUser ? "••••••••" : "Dejar vacío para generar provisional"}
                    className="w-full rounded-lg bg-surface-700 border border-surface-500 pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
                  />
                </div>
                {!editingUser && !formUser.password && (
                  <p className="text-xs text-gray-500 mt-1">Se generará una contraseña provisional. El usuario deberá cambiarla en su primer login.</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">API de Fathom (opcional)</label>
                <input
                  type="text"
                  value={formUser.fathom}
                  onChange={(e) => setFormUser((f) => ({ ...f, fathom: e.target.value }))}
                  placeholder="Clave API Fathom"
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Rol</label>
                <select
                  value={formUser.rol}
                  onChange={(e) => setFormUser((f) => ({ ...f, rol: e.target.value }))}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                >
                  {rolesParaSelect.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipo de usuario</label>
                <select
                  value={formUser.tipo_usuario}
                  onChange={(e) => setFormUser((f) => ({ ...f, tipo_usuario: e.target.value as TipoUsuario }))}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                >
                  <option value="analista">Analista (ve todo el dashboard)</option>
                  <option value="enfoque">Enfoque (kiosko fullscreen, solo órdenes)</option>
                </select>
                {formUser.tipo_usuario === "enfoque" && (
                  <p className="text-[11px] text-accent-purple mt-1">
                    Este usuario solo verá el modo enfoque en pantalla completa al iniciar sesión.
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalUser(null)}
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-600 text-gray-300 text-sm font-medium hover:bg-surface-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:bg-accent-cyan/90 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : editingUser ? "Guardar" : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalRol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalRol(null)} aria-hidden />
          <div className="relative w-full max-w-lg rounded-xl bg-surface-800 border border-surface-500 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500 shrink-0">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                {editingRol ? (
                  <>
                    <Shield className="w-4 h-4 text-accent-cyan" /> Editar rol
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-accent-cyan" /> Crear rol
                  </>
                )}
              </h3>
              <button type="button" onClick={() => setModalRol(null)} className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="p-4 space-y-4 overflow-y-auto flex-1" onSubmit={handleSubmitRol}>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre del rol</label>
                <input
                  type="text"
                  value={formRol.nombre}
                  onChange={(e) => setFormRol((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Asesor Senior"
                  required
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
                />
              </div>
              {!editingRol && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">ID (único, sin espacios)</label>
                  <input
                    type="text"
                    value={formRol.id}
                    onChange={(e) => setFormRol((f) => ({ ...f, id: e.target.value.replace(/\s/g, "_") }))}
                    placeholder="asesor_senior"
                    required
                    className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Permisos</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {PERMISOS_DISPONIBLES.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formRol.permisos.includes(p.id)}
                        onChange={() => togglePermisoRol(p.id)}
                        className="rounded border-surface-500 bg-surface-700 text-accent-cyan focus:ring-accent-cyan/40"
                      />
                      <span className="text-sm text-gray-300">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalRol(null)}
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-600 text-gray-300 text-sm font-medium hover:bg-surface-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:bg-accent-cyan/90 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : editingRol ? "Guardar" : "Crear rol"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowBulkModal(false); setBulkResult(null); }} aria-hidden />
          <div className="relative w-full max-w-md rounded-xl bg-surface-800 border border-surface-500 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-accent-cyan" /> Carga masiva de usuarios
              </h3>
              <button type="button" onClick={() => { setShowBulkModal(false); setBulkResult(null); }} className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="p-4 space-y-4" onSubmit={handleBulkUpload}>
              <p className="text-xs text-gray-400">
                Sube un CSV con columnas: <code className="bg-surface-700 px-1 rounded">nombre, email, password, rol, fathom_api_key</code>.<br />
                Máximo 100 usuarios por lote.
              </p>
              <a
                href="/api/data/usuarios/template"
                download
                className="flex items-center gap-1.5 text-xs text-accent-cyan hover:underline"
              >
                <Download className="w-3.5 h-3.5" /> Descargar plantilla CSV
              </a>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Archivo CSV</label>
                <input
                  ref={bulkFileRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-accent-cyan/20 file:text-accent-cyan hover:file:bg-accent-cyan/30"
                />
              </div>
              {bulkResult && (
                <div className="rounded-lg border border-surface-500 bg-surface-700/60 p-3 space-y-2 text-xs">
                  <p className="text-accent-green font-medium">✅ {bulkResult.creados} usuario{bulkResult.creados !== 1 ? "s" : ""} creado{bulkResult.creados !== 1 ? "s" : ""}</p>
                  {bulkResult.errores.length > 0 && (
                    <div>
                      <p className="text-red-400 font-medium mb-1">⚠️ {bulkResult.errores.length} error{bulkResult.errores.length !== 1 ? "es" : ""}:</p>
                      <ul className="space-y-1 max-h-32 overflow-y-auto">
                        {bulkResult.errores.map((err, i) => (
                          <li key={i} className="text-gray-400"><span className="text-gray-300">{err.email}</span>: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowBulkModal(false); setBulkResult(null); }}
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-600 text-gray-300 text-sm font-medium hover:bg-surface-500"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={bulkLoading || !bulkFile}
                  className="flex-1 px-3 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:bg-accent-cyan/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {bulkLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : "Subir CSV"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {provisionalPassword && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-surface-800 rounded-2xl border border-surface-600 p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Contraseña provisional generada</h3>
              <button onClick={() => setProvisionalPassword(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Comparte esta contraseña con <strong className="text-white">{provisionalPassword.email}</strong>. Solo se muestra una vez.
              El usuario deberá cambiarla en su primer login.
            </p>
            <div className="bg-surface-700 rounded-lg px-4 py-3 font-mono text-lg text-accent-cyan select-all text-center mb-4 border border-surface-500">
              {provisionalPassword.password}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(provisionalPassword.password);
                  toast.success("Contraseña copiada al portapapeles");
                }}
                className="flex-1 px-3 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:bg-accent-cyan/90 flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" /> Copiar
              </button>
              <button
                type="button"
                onClick={() => {
                  const content = `Usuario: ${provisionalPassword.email}\nContraseña provisional: ${provisionalPassword.password}\n\nEsta contraseña debe ser cambiada en el primer inicio de sesión.`;
                  const blob = new Blob([content], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `credenciales-${provisionalPassword.email}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Archivo descargado");
                }}
                className="flex-1 px-3 py-2 rounded-lg bg-surface-600 text-gray-300 text-sm font-medium hover:bg-surface-500 flex items-center justify-center gap-2"
              >
                <FileDown className="w-4 h-4" /> Descargar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
