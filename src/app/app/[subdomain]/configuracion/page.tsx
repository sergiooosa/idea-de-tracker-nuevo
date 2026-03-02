"use client";

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import { UserPlus, Shield, Crown, Users, X, Key, Phone, Mail, PlusCircle, Pencil, Loader2 } from 'lucide-react';

interface UserRow {
  id: number;
  nombre: string | null;
  email: string;
  rol: string;
  permisos: Record<string, boolean> | null;
  fathom: string | null;
}

export default function ConfiguracionPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', fathom: '', rol: 'usuario' });
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data/usuarios');
      if (res.ok) setUsers(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', phone: '', password: '', fathom: '', rol: 'usuario' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditingUser(u);
    setForm({ name: u.nombre ?? '', email: u.email, phone: '', password: '', fathom: u.fathom ?? '', rol: u.rol });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingUser) {
        const body: Record<string, unknown> = { id: editingUser.id, nombre: form.name, rol: form.rol, fathom: form.fathom };
        if (form.password) body.password = form.password;
        await fetch('/api/data/usuarios', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        if (!form.email || !form.password) { setError('Email y contraseña son obligatorios'); setSaving(false); return; }
        const res = await fetch('/api/data/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: form.name, email: form.email, password: form.password, rol: form.rol, fathom: form.fathom }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? 'Error al crear usuario');
          setSaving(false);
          return;
        }
      }
      setModalOpen(false);
      loadUsers();
    } catch { setError('Error de red'); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    await fetch(`/api/data/usuarios?id=${id}`, { method: 'DELETE' });
    loadUsers();
  };

  const updateRole = async (userId: number, newRole: string) => {
    await fetch('/api/data/usuarios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, rol: newRole }),
    });
    loadUsers();
  };

  return (
    <>
      <PageHeader title="Configuración" subtitle="Usuarios · Roles · Permisos" />
      <div className="p-3 md:p-4 max-w-4xl mx-auto space-y-4 text-sm min-w-0 max-w-full overflow-x-hidden">
        <section className="rounded-xl border border-surface-500 bg-surface-800/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-cyan" />
              <h2 className="text-sm font-semibold text-white">Usuarios</h2>
              <span className="px-2 py-0.5 rounded-full bg-accent-cyan/20 text-accent-cyan text-xs font-medium">{users.length}</span>
            </div>
            <button type="button" onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:bg-accent-cyan/90 transition-colors">
              <UserPlus className="w-4 h-4" /> Añadir usuario
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
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
                      {u.rol === 'superadmin' && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>
                    <span className="text-gray-500 text-xs block">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select value={u.rol} onChange={(e) => updateRole(u.id, e.target.value)}
                      className="rounded bg-surface-600 border border-surface-500 px-2 py-1 text-xs text-white">
                      <option value="superadmin">Admin</option>
                      <option value="usuario">Usuario</option>
                    </select>
                    <button type="button" onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-accent-cyan">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-xl bg-surface-800 border border-surface-500 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                {editingUser ? <><Pencil className="w-4 h-4 text-accent-cyan" /> Editar usuario</> : <><UserPlus className="w-4 h-4 text-accent-cyan" /> Añadir usuario</>}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form className="p-4 space-y-4" onSubmit={handleSubmit}>
              {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nombre completo"
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="email" required={!editingUser} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="usuario@empresa.com" disabled={!!editingUser}
                    className="w-full rounded-lg bg-surface-700 border border-surface-500 pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40 disabled:opacity-50" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{editingUser ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" required={!editingUser}
                    className="w-full rounded-lg bg-surface-700 border border-surface-500 pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">API de Fathom (opcional)</label>
                <input type="text" value={form.fathom} onChange={(e) => setForm((f) => ({ ...f, fathom: e.target.value }))} placeholder="Clave API Fathom"
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Rol</label>
                <select value={form.rol} onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40">
                  <option value="superadmin">Administrador</option>
                  <option value="usuario">Usuario</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-3 py-2 rounded-lg bg-surface-600 text-gray-300 text-sm font-medium hover:bg-surface-500">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:bg-accent-cyan/90 disabled:opacity-50">
                  {saving ? 'Guardando...' : editingUser ? 'Guardar' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
