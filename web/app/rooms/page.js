"use client";

import { useState, useEffect } from "react";
import { listRooms, createRoom, updateRoomStatus, listRoomTypes } from "@/lib/api";

const statusConfig = {
  available: { label: "Disponible", color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  occupied: { label: "Ocupada", color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  cleaning: { label: "Limpieza", color: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200" },
  maintenance: { label: "Mantenimiento", color: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ room_type_id: "", number: "", floor: "" });
  const [message, setMessage] = useState(null);

  async function load() {
    try {
      const [r, rt] = await Promise.all([listRooms("eden-hotel", filter || undefined), listRoomTypes("eden-hotel")]);
      setRooms(r);
      setRoomTypes(rt);
    } catch (e) { console.error(e); }
  }

  useEffect(() => { load(); }, [filter]);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await createRoom(form, "eden-hotel");
      setMessage({ type: "success", text: "Habitacion creada" });
      setForm({ room_type_id: "", number: "", floor: "" });
      setShowForm(false);
      load();
    } catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  async function handleStatus(id, s) {
    try { await updateRoomStatus(id, s, "eden-hotel"); load(); } catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  const counts = { all: rooms.length, available: rooms.filter(r => r.status === "available").length, occupied: rooms.filter(r => r.status === "occupied").length, cleaning: rooms.filter(r => r.status === "cleaning").length, maintenance: rooms.filter(r => r.status === "maintenance").length };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>Habitaciones</h1>
          <p className="text-slate-500 mt-1">{rooms.length} habitaciones registradas</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          {showForm ? "Cancelar" : "+ Nueva Habitacion"}
        </button>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${message.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Nueva Habitacion</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select name="room_type_id" value={form.room_type_id} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
              <option value="">Tipo...</option>
              {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
            <input name="number" placeholder="Numero (101)" value={form.number} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
            <input name="floor" placeholder="Piso (1)" value={form.floor} onChange={handleChange} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
            <button type="submit" className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">Crear</button>
          </form>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {[{ key: "", label: "Todas", count: counts.all }, { key: "available", label: "Disponible", count: counts.available }, { key: "occupied", label: "Ocupada", count: counts.occupied }, { key: "cleaning", label: "Limpieza", count: counts.cleaning }, { key: "maintenance", label: "Mant.", count: counts.maintenance }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f.key ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {f.label} <span className="ml-1 text-xs opacity-70">{f.count}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms.map(rm => {
          const sc = statusConfig[rm.status] || statusConfig.available;
          return (
            <div key={rm.id} className={`bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow`}>
              <div className={`h-1.5 ${sc.color}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{rm.number}</p>
                    <p className="text-sm text-slate-400">Piso {rm.floor || "-"}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sc.text} ${sc.bg}`}>
                    {sc.label}
                  </span>
                </div>
                <div className="flex gap-1.5 flex-wrap mt-4">
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    rm.status !== key && (
                      <button key={key} onClick={() => handleStatus(rm.id, key)} className={`px-2.5 py-1 rounded text-xs font-medium border ${cfg.border} ${cfg.text} ${cfg.bg} hover:opacity-80 transition-opacity`}>
                        {cfg.label}
                      </button>
                    )
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {rooms.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-slate-500">No hay habitaciones registradas</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-brand-600 text-sm font-medium hover:text-brand-700">Crear primera habitacion</button>
        </div>
      )}
    </div>
  );
}
