import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { UserPlus, Shield, Settings, FileText, MessageSquare, Crown, BarChart2 } from 'lucide-react';

const SECTIONS = [
  { id: 'executive', name: 'Panel ejecutivo', subs: ['KPIs', 'Ranking', 'Resúmenes'] },
  { id: 'performance', name: 'Rendimiento', subs: ['Llamadas', 'Videollamadas', 'Chats'] },
  { id: 'acquisition', name: 'Resumen adquisición', subs: ['Tabla medios', 'Filtros'] },
  { id: 'asesor', name: 'Panel asesor', subs: ['KPIs', 'Mini CRM', 'Metas', 'Métricas'] },
  { id: 'metricas', name: 'Métricas', subs: ['Panel asesor', 'Sistema'] },
  { id: 'system', name: 'Control del sistema', subs: ['Prompts', 'Etiquetas', 'Métricas'] },
];

const ROLES_OPTIONS: { value: string; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'ejecutivo', label: 'Ejecutivo' },
  { value: 'asesor', label: 'Asesor' },
  { value: 'setter', label: 'Agendador' },
  { value: 'visor', label: 'Visor' },
  { value: 'soporte', label: 'Soporte' },
];

const PERMISSIONS_SYSTEM = [
  { id: 'system', label: 'Acceso al sistema (Control del sistema)', icon: Settings },
  { id: 'metricas', label: 'Ver métricas (Panel asesor, Sistema)', icon: BarChart2 },
  { id: 'reportes', label: 'Generar reportes', icon: FileText },
  { id: 'chat', label: 'Usar chat (Resumen y análisis)', icon: MessageSquare },
];

const defaultRolePermissions: Record<string, Record<string, boolean>> = {
  admin: { system: true, metricas: true, reportes: true, chat: true },
  ejecutivo: { system: true, metricas: true, reportes: true, chat: true },
  asesor: { system: false, metricas: true, reportes: true, chat: true },
  setter: { system: false, metricas: false, reportes: true, chat: true },
  visor: { system: false, metricas: true, reportes: false, chat: true },
  soporte: { system: true, metricas: true, reportes: false, chat: true },
};

type UserPerm = {
  id: string;
  email: string;
  name: string;
  role: string;
  sections: Record<string, boolean>;
};

const defaultUsers: UserPerm[] = [
  { id: 'u1', email: 'admin@empresa.com', name: 'Admin', role: 'admin', sections: { executive: true, performance: true, acquisition: true, asesor: true, metricas: true, system: true } },
  { id: 'u2', email: 'sergio@empresa.com', name: 'Sergio', role: 'asesor', sections: { executive: true, performance: true, acquisition: false, asesor: true, metricas: true, system: false } },
];

export default function Configuracion() {
  const [users, setUsers] = useState<UserPerm[]>(defaultUsers);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('asesor');
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>(defaultRolePermissions);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState('');

  return (
    <>
      <PageHeader
        title="Configuración"
        subtitle="Perfil · Usuarios y permisos · Roles"
      />
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">
        {/* Añadir usuarios y permisos */}
        <section className="rounded-xl border border-surface-500 bg-surface-800 p-4 md:p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
            <UserPlus className="w-5 h-5 text-accent-cyan" />
            Añadir usuarios y permisos
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Añade usuarios y asígnales acceso por sección. En Roles puedes asignar el rol de cada uno en la plataforma.
          </p>
          <div className="rounded-lg bg-surface-700 p-3 space-y-2 mb-4">
            <p className="text-xs text-gray-400 font-medium">Nuevo usuario</p>
            <div className="flex flex-wrap gap-2 items-end">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Nombre"
                className="rounded bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white w-36"
              />
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Email"
                className="rounded bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white w-48"
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="rounded bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white"
              >
                {ROLES_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!newUserEmail.trim()) return;
                  setUsers((u) => [
                    ...u,
                    {
                      id: 'u' + Date.now(),
                      name: newUserName.trim() || newUserEmail.split('@')[0],
                      email: newUserEmail.trim(),
                      role: newUserRole,
                      sections: { executive: true, performance: true, acquisition: false, asesor: true, metricas: true, system: false },
                    },
                  ]);
                  setNewUserName('');
                  setNewUserEmail('');
                }}
                className="px-3 py-1.5 rounded-lg bg-accent-cyan text-black text-sm font-medium"
              >
                Añadir usuario
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-surface-500">
                  <th className="pb-2 pr-2 font-medium">Usuario</th>
                  <th className="pb-2 pr-2 font-medium">Rol</th>
                  {SECTIONS.map((s) => (
                    <th key={s.id} className="pb-2 px-1 font-medium text-xs">{s.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-surface-500">
                    <td className="py-2 pr-2">
                      <span className="text-white font-medium">{u.name}</span>
                      <span className="text-gray-500 text-xs block">{u.email}</span>
                    </td>
                        <td className="py-2 pr-2 text-accent-cyan">{ROLES_OPTIONS.find((r) => r.value === u.role)?.label ?? u.role}</td>
                    {SECTIONS.map((s) => (
                      <td key={s.id} className="py-2 px-1">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={u.sections[s.id] ?? false}
                            onChange={(e) =>
                              setUsers((prev) =>
                                prev.map((x) =>
                                  x.id === u.id
                                    ? { ...x, sections: { ...x.sections, [s.id]: e.target.checked } }
                                    : x
                                )
                              )
                            }
                            className="rounded border-surface-500"
                          />
                          <span className="text-xs text-gray-400">Acceso</span>
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Roles */}
        <section className="rounded-xl border border-surface-500 bg-surface-800 p-4 md:p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-accent-cyan" />
            Roles
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Edita los permisos de cada rol y asigna qué usuario tiene qué rol. El rol define qué puede hacer en la plataforma. El Administrador tiene todos los permisos.
          </p>

          {/* Permisos por rol (editar dar/quitar) */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-white mb-2">Permisos por rol</h3>
            <p className="text-xs text-gray-500 mb-3">Marca o desmarca los permisos que tiene cada rol. El Administrador siempre tiene todos.</p>
            <div className="overflow-x-auto rounded-lg border border-surface-500">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-surface-500 bg-surface-700">
                    <th className="p-2 font-medium">Rol</th>
                    {PERMISSIONS_SYSTEM.map((p) => (
                      <th key={p.id} className="p-2 font-medium text-xs whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          {p.icon && <p.icon className="w-3.5 h-3.5" />}
                          {p.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLES_OPTIONS.map((role) => {
                    const isAdmin = role.value === 'admin';
                    return (
                      <tr key={role.value} className="border-t border-surface-500">
                        <td className="p-2">
                          <span className="text-white font-medium flex items-center gap-1">
                            {isAdmin && <Crown className="w-4 h-4 text-amber-400" />}
                            {role.label}
                          </span>
                          {isAdmin && (
                            <span className="text-xs text-amber-400/90 block">Todos los permisos</span>
                          )}
                        </td>
                        {PERMISSIONS_SYSTEM.map((perm) => (
                          <td key={perm.id} className="p-2">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isAdmin || (rolePermissions[role.value]?.[perm.id] ?? false)}
                                disabled={isAdmin}
                                onChange={(e) => {
                                  if (isAdmin) return;
                                  setRolePermissions((prev) => ({
                                    ...prev,
                                    [role.value]: {
                                      ...prev[role.value],
                                      [perm.id]: e.target.checked,
                                    },
                                  }));
                                }}
                                className="rounded border-surface-500 disabled:opacity-60"
                              />
                              <span className="text-xs text-gray-400">Sí</span>
                            </label>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Asignar rol a usuario: seleccionar usuario y rol */}
          <div className="rounded-lg border border-surface-500 p-4">
            <h3 className="text-sm font-medium text-white mb-2">Asignar rol a usuario</h3>
            <p className="text-xs text-gray-500 mb-3">
              Elige el usuario y el rol que quieres asignarle. Ese rol determina qué puede hacer (permisos de arriba). Si es Administrador, tiene todos los permisos sin depender del resto de roles.
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
                  {ROLES_OPTIONS.map((r) => (
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
                  setUsers((prev) => prev.map((u) => (u.id === assignUserId ? { ...u, role: assignRole } : u)));
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
            {ROLES_OPTIONS.map((role) => (
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
    </>
  );
}
