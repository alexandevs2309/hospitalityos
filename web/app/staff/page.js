"use client";

import { useState, useEffect } from "react";
import { listStaff, createStaff, updateStaffRole } from "@/lib/api";

const ROLES = ["admin", "manager", "front_desk", "housekeeping", "maintenance", "read_only"];

const roleConfig = {
  admin: { label: "Admin", text: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", color: "#8b5cf6" },
  manager: { label: "Gerente", text: "text-brand-700", bg: "bg-brand-50", border: "border-brand-200", color: "#1a6bf5" },
  front_desk: { label: "Recepcion", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", color: "#10b981" },
  housekeeping: { label: "Housekeeping", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", color: "#f59e0b" },
  maintenance: { label: "Mantenimiento", text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", color: "#f43f5e" },
  read_only: { label: "Solo Lectura", text: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", color: "#64748b" },
};

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "front_desk" });
  const [message, setMessage] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setStaff(await listStaff("eden-hotel"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await createStaff(form, "eden-hotel");
      setMessage({ type: "success", text: "Miembro del personal creado" });
      setForm({ full_name: "", email: "", password: "", role: "front_desk" });
      setShowForm(false);
      load();
    } catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  async function handleRoleChange(id, role) {
    setMessage(null);
    try {
      await updateStaffRole(id, role, "eden-hotel");
      setMessage({ type: "success", text: "Rol actualizado" });
      load();
    } catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  const counts = {
    total: staff.length,
    admin: staff.filter(s => s.role === "admin").length,
    manager: staff.filter(s => s.role === "manager").length,
    front_desk: staff.filter(s => s.role === "front_desk").length,
    housekeeping: staff.filter(s => s.role === "housekeeping").length,
    maintenance: staff.filter(s => s.role === "maintenance").length,
    read_only: staff.filter(s => s.role === "read_only").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>Personal</h1>
          <p className="text-slate-500 mt-1">{staff.length} miembros del equipo</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          {showForm ? "Cancelar" : "+ Nuevo Personal"}
        </button>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${message.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
          {[...Array(7)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse"><div className="h-3 bg-slate-100 rounded w-20 mb-3" /><div className="h-8 bg-slate-100 rounded w-12" /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
          {[
            { key: "total", label: "Total Staff" },
            { key: "admin", label: "Admins" },
            { key: "manager", label: "Managers" },
            { key: "front_desk", label: "Front Desk" },
            { key: "housekeeping", label: "Housekeeping" },
            { key: "maintenance", label: "Maintenance" },
            { key: "read_only", label: "Read Only" },
          ].map(c => {
            const cfg = c.key === "total" ? null : roleConfig[c.key];
            return (
              <div key={c.key} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{c.label}</p>
                    <p className="text-3xl font-bold mt-2" style={{ color: cfg ? cfg.color : "#0f172a" }}>{counts[c.key]}</p>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full mt-1.5" style={{ backgroundColor: cfg ? cfg.color : "#94a3b8" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Nuevo Personal</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input name="full_name" placeholder="Nombre completo" value={form.full_name} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <input name="password" type="password" placeholder="Contraseña" value={form.password} onChange={handleChange} required minLength={6} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <select name="role" value={form.role} onChange={handleChange} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
              {ROLES.map(r => <option key={r} value={r}>{roleConfig[r].label}</option>)}
            </select>
            <button type="submit" className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">Crear</button>
          </form>
        </div>
      )}

      {error && !loading && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-16 text-center">
          <p className="text-rose-700 font-medium">Error al cargar el personal</p>
          <p className="text-rose-400 text-sm mt-1">{error}</p>
          <button onClick={load} className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors">Reintentar</button>
        </div>
      )}

      {!error && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => {
                const cfg = roleConfig[s.role] || roleConfig.read_only;
                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>
                          {s.full_name?.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-900">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{s.email}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.active ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {s.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={s.role}
                        onChange={(e) => handleRoleChange(s.id, e.target.value)}
                        disabled={!s.active}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none disabled:opacity-40"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{roleConfig[r].label}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {staff.length === 0 && (
            <div className="p-16 text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <p className="text-slate-500">No hay miembros del personal registrados</p>
              <button onClick={() => setShowForm(true)} className="mt-4 text-brand-600 text-sm font-medium hover:text-brand-700">Crear primer miembro</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
