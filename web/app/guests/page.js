"use client";

import { useState, useEffect } from "react";
import { listGuests, createGuest } from "@/lib/api";

export default function GuestsPage() {
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [message, setMessage] = useState(null);

  async function load(q) {
    try { setGuests(await listGuests("eden-hotel", q || undefined)); } catch (e) { console.error(e); }
  }

  useEffect(() => { const t = setTimeout(() => load(search), 300); return () => clearTimeout(t); }, [search]);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await createGuest(form, "eden-hotel");
      setMessage({ type: "success", text: "Huesped creado" });
      setForm({ first_name: "", last_name: "", email: "", phone: "" });
      setShowForm(false);
      load(search);
    } catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>Huespedes</h1>
          <p className="text-slate-500 mt-1">{guests.length} huespedes registrados</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          {showForm ? "Cancelar" : "+ Nuevo Huesped"}
        </button>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${message.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Nuevo Huesped</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input name="first_name" placeholder="Nombre" value={form.first_name} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <input name="last_name" placeholder="Apellido" value={form.last_name} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <input name="phone" placeholder="Telefono" value={form.phone} onChange={handleChange} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <button type="submit" className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">Crear</button>
          </form>
        </div>
      )}

      <div className="mb-6">
        <input type="search" placeholder="Buscar por nombre, email o telefono..." value={search} onChange={e => setSearch(e.target.value)} className="w-full max-w-md px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Telefono</th>
            </tr>
          </thead>
          <tbody>
            {guests.map(g => (
              <tr key={g.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                      {g.first_name?.[0]}{g.last_name?.[0]}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{g.first_name} {g.last_name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">{g.email}</td>
                <td className="px-5 py-4 text-sm text-slate-600">{g.phone || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {guests.length === 0 && (
          <div className="p-16 text-center text-slate-400">No hay huespedes registrados</div>
        )}
      </div>
    </div>
  );
}
