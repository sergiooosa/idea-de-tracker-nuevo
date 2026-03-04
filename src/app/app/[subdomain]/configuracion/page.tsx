"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { UserPlus, Shield, Crown, Users, X, Key, Mail, Pencil, Loader2, Plus, Trash2 } from "lucide-react";
import { useUserFilter } from "@/contexts/UserFilterContext";
import { canManageUsers, canManageRoles } from "@/lib/permisos";
import { PERMISOS_DISPONIBLES, type PermisoId } from "@/lib/permisos";
import type { RolConfig } from "@/lib/db/schema";

interface UserRow {
  id: number;
  nombre: string | null;
  email: string;
  rol: string;
  permisos: Record<string, boolean> | null;
  fathom: string | null;
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

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RolConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalUser, setModalUser] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [formUser, setFormUser] = useState({ name: "", email: "", password: "", fathom: "", rol: "usuario" });
  const [error, setError] = useState("");

  const [modalRol, setModalRol] = useState<"create" | "edit" | null>(null);
  const [editingRol, setEditingRol] = useState<RolConfig | null>(null);
  const [formRol, setFormRol] = useState<RolConfig>({ id: "", nombre: "", permisos: [] });

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
    Promise.all([loadUsers(), loadRoles()]).finally(() => setLoading(false));
  }, [loadUsers, loadRoles]);

  const rolesParaSelect = [...ROLES_BUILTIN, ...roles.filter((r) => !["superadmin", "usuario"].includes(r.id))];

  const openCreateUser = () => {
    setEditingUser(null);
    setFormUser({ name: "", email: "", password: "", fathom: "", rol: "usuario" });
    setError("");
    setModalUser("create");
  };

  const openEditUser = (u: UserRow) => {
    setEditingUser(u);
    setFormUser({ name: u.nombre ?? "", email: u.email, password: "", fathom: u.fathom ?? "", rol: u.rol });
    setError("");
    setModalUser("edit");
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingUser) {
        const body: Record<string, unknown> = { id: editingUser.id, nombre: formUser.name, rol: formUser.rol, fathom: formUser.fathom };
        if (formUser.password) body.password = formUser.password;
        await fetch("/api/data/usuarios", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        if (!formUser.email || !formUser.password) {
          setError("Email y contraseña son obligatorios");
          setSaving(false);
          return;
        }
        const res = await fetch("/api/data/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: formUser.name,
            email: formUser.email,
            password: formUser.password,
            rol: formUser.rol,
            fathom: formUser.fathom,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Error al crear usuario");
          setSaving(false);
          return;
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
    if (!confirm("¿Eliminar este usuario?")) return;
    await fetch(`/api/data/usuarios?id=${id}`, { method: "DELETE" });
    loadUsers();
  };

  const updateRoleUser = async (userId: number, newRole: string) => {
    await fetch("/api/data/usuarios", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, rol: newRole }),
    });
    loadUsers();
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
      await fetch("/api/data/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles_config: newRoles }),
      });
      setModalRol(null);
      loadRoles();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDeleteRol = async (id: string) => {
    if (["superadmin", "usuario"].includes(id)) return;
    if (!confirm("¿Eliminar este rol?")) return;
    const newRoles = roles.filter((r) => r.id !== id);
    await fetch("/api/data/roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roles_config: newRoles }),
    });
    loadRoles();
  };

  if (!puedeUsuarios && !puedeRoles) {
    return (
      <>
        <PageHeader title="Configuración" subtitle="Sin permisos" />
        <div className="p-4 text-center text-gray-500">No tienes permiso para acceder a esta sección.</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Configuración" subtitle="Usuarios · Roles · Permisos" />
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
              <button
                type="button"
                onClick={openCreateUser}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:bg-accent-cyan/90 transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Añadir usuario
              </button>
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
                      </div>
                      <span className="text-gray-500 text-xs block">{u.email}</span>
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
                  {editingUser ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    value={formUser.password}
                    onChange={(e) => setFormUser((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    required={!editingUser}
                    className="w-full rounded-lg bg-surface-700 border border-surface-500 pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
                  />
                </div>
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
    </>
  );
}
