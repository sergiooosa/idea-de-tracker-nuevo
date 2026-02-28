import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { UserPlus, Shield, Settings, FileText, MessageSquare, Crown, BarChart2, Users, X, Key, Phone, Mail, PlusCircle, Pencil } from 'lucide-react';

const SECTIONS = [
  { id: 'executive', name: 'Panel ejecutivo', subs: ['KPIs', 'Ranking', 'Resúmenes'] },
  { id: 'performance', name: 'Rendimiento', subs: ['Llamadas', 'Videollamadas', 'Chats'] },
  { id: 'acquisition', name: 'Resumen adquisición', subs: ['Tabla medios', 'Filtros'] },
  { id: 'asesor', name: 'Panel asesor', subs: ['KPIs', 'Mini CRM', 'Metas', 'Métricas'] },
  { id: 'metricas', name: 'Métricas', subs: ['Panel asesor', 'Sistema'] },
  { id: 'system', name: 'Control del sistema', subs: ['Prompts', 'Etiquetas', 'Métricas'] },
];

/** Solo 2 roles por defecto: admin (todo) y vendedor (solo Panel asesor, solo su data). El resto se crean. */
const DEFAULT_ROLES: { value: string; label: string; isDefault?: boolean }[] = [
  { value: 'admin', label: 'Administrador', isDefault: true },
  { value: 'vendedor', label: 'Vendedor', isDefault: true },
  { value: 'draft', label: 'Borrador', isDefault: true },
];

const PERMISSIONS_SYSTEM = [
  { id: 'system', label: 'Acceso al sistema (Control del sistema)', icon: Settings },
  { id: 'metricas', label: 'Ver métricas (Panel asesor, Sistema)', icon: BarChart2 },
  { id: 'reportes', label: 'Generar reportes', icon: FileText },
  { id: 'chat', label: 'Usar chat (Resumen y análisis)', icon: MessageSquare },
];

/** Permisos por defecto: admin todo, vendedor solo panel asesor y su data (metricas+chat), draft nada. */
const defaultRolePermissions: Record<string, Record<string, boolean>> = {
  admin: { system: true, metricas: true, reportes: true, chat: true },
  vendedor: { system: false, metricas: true, reportes: false, chat: true },
  draft: { system: false, metricas: false, reportes: false, chat: false },
};

/** Secciones por defecto por rol: vendedor solo Panel asesor. */
const defaultSectionsByRole: Record<string, Record<string, boolean>> = {
  admin: { executive: true, performance: true, acquisition: true, asesor: true, metricas: true, system: true },
  vendedor: { executive: false, performance: false, acquisition: false, asesor: true, metricas: false, system: false },
  draft: { executive: false, performance: false, acquisition: false, asesor: false, metricas: false, system: false },
};

const DEFAULT_ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Acceso total al sistema.',
  vendedor: 'Solo Panel asesor y la data asignada a él.',
  draft: 'Sin rol asignado.',
};

type UserPerm = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  sections: Record<string, boolean>;
  fathomApiKey?: string;
};

const defaultUsers: UserPerm[] = [
  { id: 'u1', email: 'admin@empresa.com', name: 'Admin', phone: '+57 300 111 2233', role: 'admin', sections: { executive: true, performance: true, acquisition: true, asesor: true, metricas: true, system: true } },
  { id: 'u2', email: 'sergio@empresa.com', name: 'Sergio', phone: '+57 310 123 4567', role: 'vendedor', sections: { executive: false, performance: false, acquisition: false, asesor: true, metricas: false, system: false } },
];

export default function Configuracion() {
  const [users, setUsers] = useState<UserPerm[]>(defaultUsers);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>(defaultRolePermissions);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState('');
  const [modalAñadirOpen, setModalAñadirOpen] = useState(false);
  const [formNewUser, setFormNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    fathomApiKey: '',
    role: 'draft' as string,
  });

  const usuariosActivos = users.filter((u) => u.role !== 'draft');
  const usuariosDraft = users.filter((u) => u.role === 'draft');

  // Roles: por defecto admin + vendedor + draft; el resto se crean. Editar/crear desde popup (lápiz).
  const [customRoles, setCustomRoles] = useState<{ value: string; label: string }[]>([]);
  const [customRoleSections, setCustomRoleSections] = useState<Record<string, Record<string, boolean>>>({});
  const [roleDescriptions, setRoleDescriptions] = useState<Record<string, string>>({ ...DEFAULT_ROLE_DESCRIPTIONS });
  const [modalRolOpen, setModalRolOpen] = useState(false);
  const [editingRoleValue, setEditingRoleValue] = useState<string | null>(null); // null = crear nuevo
  const [formNewRol, setFormNewRol] = useState({
    name: '',
    description: '',
    system: false,
    metricas: false,
    reportes: false,
    chat: false,
    sections: {} as Record<string, boolean>,
  });

  function openRolModal(roleValue: string | null) {
    setEditingRoleValue(roleValue);
    if (roleValue === null) {
      setFormNewRol({
        name: '',
        description: '',
        system: false,
        metricas: false,
        reportes: false,
        chat: false,
        sections: SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: false }), {} as Record<string, boolean>),
      });
    } else {
      const role = rolesOptions.find((r) => r.value === roleValue);
      const perms = rolePermissions[roleValue] ?? defaultRolePermissions[roleValue];
      const sections = customRoleSections[roleValue] ?? defaultSectionsByRole[roleValue] ?? SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: false }), {} as Record<string, boolean>);
      setFormNewRol({
        name: role?.label ?? roleValue,
        description: roleDescriptions[roleValue] ?? DEFAULT_ROLE_DESCRIPTIONS[roleValue] ?? '',
        system: perms?.system ?? false,
        metricas: perms?.metricas ?? false,
        reportes: perms?.reportes ?? false,
        chat: perms?.chat ?? false,
        sections: { ...sections },
      });
    }
    setModalRolOpen(true);
  }

  const rolesOptions = [...DEFAULT_ROLES, ...customRoles];

  function getSectionsForRole(role: string): Record<string, boolean> {
    if (customRoleSections[role]) return { ...customRoleSections[role] };
    if (defaultSectionsByRole[role]) return { ...defaultSectionsByRole[role] };
    return { executive: false, performance: false, acquisition: false, asesor: false, metricas: false, system: false };
  }

  return (
    <>
      <PageHeader
        title="Configuración"
        subtitle="Perfil · Usuarios y permisos · Roles"
      />
      <div className="p-3 md:p-4 max-w-4xl mx-auto space-y-4 text-sm min-w-0 max-w-full overflow-x-hidden">
        {/* Usuarios activos + Añadir usuarios */}
        <section className="rounded-xl border border-surface-500 bg-surface-800/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-cyan" />
              <h2 className="text-sm font-semibold text-white">Usuarios activos</h2>
              <span className="px-2 py-0.5 rounded-full bg-accent-cyan/20 text-accent-cyan text-xs font-medium">
                {usuariosActivos.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setModalAñadirOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:bg-accent-cyan/90 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Añadir usuarios
            </button>
          </div>
          {usuariosActivos.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center rounded-lg bg-surface-700/50 border border-surface-500 border-dashed">
              No hay usuarios activos. Haz clic en &quot;Añadir usuarios&quot; para crear el primero.
            </p>
          ) : (
            <ul className="space-y-2">
              {usuariosActivos.map((u) => (
                <li key={u.id} className="flex items-center justify-between rounded-lg bg-surface-700/80 border border-surface-500 px-3 py-2">
                  <div>
                    <span className="text-white font-medium">{u.name}</span>
                    <span className="text-gray-500 text-xs block">{u.email}</span>
                  </div>
                  <span className="text-xs font-medium text-accent-cyan">{rolesOptions.find((r) => r.value === u.role)?.label ?? u.role}</span>
                </li>
              ))}
            </ul>
          )}
          {usuariosDraft.length > 0 && (
            <div className="mt-4 pt-4 border-t border-surface-500">
              <p className="text-xs text-gray-500 mb-2">Borradores ({usuariosDraft.length})</p>
              <ul className="space-y-1.5">
                {usuariosDraft.map((u) => (
                  <li key={u.id} className="flex items-center justify-between rounded-lg bg-surface-700/50 px-3 py-1.5 text-sm text-gray-400">
                    <span>{u.name || u.email}</span>
                    <span className="text-xs">Borrador</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Roles: nombre, descripción y lápiz para modificar o crear. Sin tabla de permisos visible. */}
        <section className="rounded-lg p-3 section-futuristic">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Shield className="w-5 h-5 text-accent-cyan" />
              Roles
            </h2>
            <button
              type="button"
              onClick={() => openRolModal(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan/20 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/30 border border-accent-cyan/40"
            >
              <PlusCircle className="w-4 h-4" />
              Crear rol
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Modificar o crear rol desde aquí. Cada rol tiene nombre y descripción; para editar permisos y secciones usa el lápiz.
          </p>

          <ul className="space-y-2 mb-6">
            {rolesOptions.map((role) => (
              <li key={role.value} className="rounded-lg border border-surface-500 bg-surface-700/60 px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-medium">{role.label}</span>
                    {role.value === 'admin' && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                    {roleDescriptions[role.value] ?? DEFAULT_ROLE_DESCRIPTIONS[role.value] ?? '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openRolModal(role.value)}
                  className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
                  title="Modificar rol"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>

          {/* Asignar rol a usuario */}
          <div className="rounded-lg border border-surface-500 p-4">
            <h3 className="text-sm font-medium text-white mb-2">Asignar rol a usuario</h3>
            <p className="text-xs text-gray-500 mb-3">
              Elige el usuario y el rol. Administrador tiene todo. Vendedor solo ve Panel asesor y la data asignada a él.
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Usuario</label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="rounded bg-surface-700 border border-surface-500 px-2 py-1.5 text-sm text-white min-w-[160px]"
                >
                  <option value="">— Seleccionar usuario —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rol</label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  className="rounded bg-surface-700 border border-surface-500 px-2 py-1.5 text-sm text-white min-w-[160px]"
                >
                  <option value="">— Seleccionar rol —</option>
                  {rolesOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={!assignUserId || !assignRole}
                onClick={() => {
                  if (!assignUserId || !assignRole) return;
                  const sections = getSectionsForRole(assignRole);
                  setUsers((prev) => prev.map((u) => (u.id === assignUserId ? { ...u, role: assignRole, sections } : u)));
                  setAssignUserId('');
                  setAssignRole('');
                }}
                className="px-3 py-1.5 rounded-lg bg-accent-cyan text-black text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Asignar rol
              </button>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {rolesOptions.map((role) => (
              <li key={role.value} className="rounded-lg bg-surface-700 p-3 flex items-center justify-between">
                <span className="text-white font-medium">{role.label}</span>
                <span className="text-xs text-gray-500">
                  {users.filter((u) => u.role === role.value).length} usuario(s)
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Modal: Añadir usuario */}
      {modalAñadirOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalAñadirOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-xl bg-surface-800 border border-surface-500 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-accent-cyan" />
                Añadir usuario
              </h3>
              <button type="button" onClick={() => setModalAñadirOpen(false)} className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              className="p-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!formNewUser.email.trim()) return;
                setUsers((prev) => [
                  ...prev,
                  {
                    id: 'u' + Date.now(),
                    name: formNewUser.name.trim() || formNewUser.email.split('@')[0],
                    email: formNewUser.email.trim(),
                    phone: formNewUser.phone.trim() || undefined,
                    role: formNewUser.role,
                    fathomApiKey: formNewUser.fathomApiKey.trim() || undefined,
                    sections: getSectionsForRole(formNewUser.role),
                  },
                ]);
                setFormNewUser({ name: '', email: '', phone: '', password: '', fathomApiKey: '', role: 'draft' });
                setModalAñadirOpen(false);
              }}
            >
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formNewUser.name}
                  onChange={(e) => setFormNewUser((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre completo"
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Correo electrónico (igual que en GHL)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={formNewUser.email}
                    onChange={(e) => setFormNewUser((f) => ({ ...f, email: e.target.value }))}
                    placeholder="usuario@empresa.com"
                    className="w-full rounded-lg bg-surface-700 border border-surface-500 pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Número de teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="tel"
                    value={formNewUser.phone}
                    onChange={(e) => setFormNewUser((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+57 300 123 4567"
                    className="w-full rounded-lg bg-surface-700 border border-surface-500 pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Contraseña (clave para el sistema)</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    value={formNewUser.password}
                    onChange={(e) => setFormNewUser((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full rounded-lg bg-surface-700 border border-surface-500 pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">API de Fathom</label>
                <input
                  type="text"
                  value={formNewUser.fathomApiKey}
                  onChange={(e) => setFormNewUser((f) => ({ ...f, fathomApiKey: e.target.value }))}
                  placeholder="Clave API Fathom (opcional)"
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Rol</label>
                <p className="text-[11px] text-gray-500 mb-2">Administrador tiene todo. Si no es admin, elige un rol o deja Borrador.</p>
                <select
                  value={formNewUser.role}
                  onChange={(e) => setFormNewUser((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                >
                  <option value="admin">Administrador (acceso total)</option>
                  <option value="vendedor">Vendedor (solo Panel asesor y su data)</option>
                  {customRoles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                  <option value="draft">Borrador</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAñadirOpen(false)}
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-600 text-gray-300 text-sm font-medium hover:bg-surface-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:bg-accent-cyan/90"
                >
                  Crear usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear o modificar rol (todo en el popup) */}
      {modalRolOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalRolOpen(false)} aria-hidden />
          <div className="relative w-full max-w-lg rounded-xl bg-surface-800 border border-surface-500 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500 shrink-0">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                {editingRoleValue === null ? (
                  <><PlusCircle className="w-4 h-4 text-accent-cyan" />Crear rol</>
                ) : (
                  <><Pencil className="w-4 h-4 text-accent-cyan" />Modificar rol</>
                )}
              </h3>
              <button type="button" onClick={() => setModalRolOpen(false)} className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              className="p-4 space-y-4 overflow-y-auto"
              onSubmit={(e) => {
                e.preventDefault();
                const name = formNewRol.name.trim();
                const description = formNewRol.description.trim();
                const isDefaultRole = editingRoleValue !== null && ['admin', 'vendedor', 'draft'].includes(editingRoleValue);

                if (editingRoleValue === null) {
                  if (!name) return;
                  const value = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                  const safeValue = value || 'rol_' + Date.now();
                  setCustomRoles((prev) => [...prev, { value: safeValue, label: name }]);
                  setRolePermissions((prev) => ({ ...prev, [safeValue]: { system: formNewRol.system, metricas: formNewRol.metricas, reportes: formNewRol.reportes, chat: formNewRol.chat } }));
                  setCustomRoleSections((prev) => ({ ...prev, [safeValue]: { ...formNewRol.sections } }));
                  setRoleDescriptions((prev) => ({ ...prev, [safeValue]: description || 'Rol personalizado.' }));
                } else {
                  setRoleDescriptions((prev) => ({ ...prev, [editingRoleValue]: description || prev[editingRoleValue] }));
                  setRolePermissions((prev) => ({ ...prev, [editingRoleValue]: { system: formNewRol.system, metricas: formNewRol.metricas, reportes: formNewRol.reportes, chat: formNewRol.chat } }));
                  setCustomRoleSections((prev) => ({ ...prev, [editingRoleValue]: { ...formNewRol.sections } }));
                  if (!isDefaultRole) {
                    setCustomRoles((prev) => prev.map((r) => (r.value === editingRoleValue ? { ...r, label: name || r.label } : r)));
                  }
                }
                setModalRolOpen(false);
              }}
            >
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre del rol</label>
                <input
                  type="text"
                  value={formNewRol.name}
                  onChange={(e) => setFormNewRol((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Coordinador, Supervisor"
                  disabled={editingRoleValue !== null && ['admin', 'vendedor', 'draft'].includes(editingRoleValue)}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Descripción</label>
                <textarea
                  value={formNewRol.description}
                  onChange={(e) => setFormNewRol((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Qué puede hacer este rol..."
                  rows={2}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40 resize-none"
                />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Permisos del sistema</p>
                <div className="space-y-2 rounded-lg bg-surface-700/60 p-3">
                  {PERMISSIONS_SYSTEM.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formNewRol[p.id as keyof typeof formNewRol] as boolean}
                        disabled={editingRoleValue === 'admin'}
                        onChange={(e) => setFormNewRol((f) => ({ ...f, [p.id]: e.target.checked }))}
                        className="rounded border-surface-500 disabled:opacity-60"
                      />
                      <span className="text-sm text-white">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Secciones a las que puede acceder</p>
                <div className="space-y-2 rounded-lg bg-surface-700/60 p-3">
                  {SECTIONS.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formNewRol.sections[s.id] ?? false}
                        disabled={editingRoleValue === 'admin'}
                        onChange={(e) => setFormNewRol((f) => ({ ...f, sections: { ...f.sections, [s.id]: e.target.checked } }))}
                        className="rounded border-surface-500 disabled:opacity-60"
                      />
                      <span className="text-sm text-white">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalRolOpen(false)} className="flex-1 px-3 py-2 rounded-lg bg-surface-600 text-gray-300 text-sm font-medium hover:bg-surface-500">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editingRoleValue === null && !formNewRol.name.trim()}
                  className="flex-1 px-3 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:bg-accent-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingRoleValue === null ? 'Crear rol' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
