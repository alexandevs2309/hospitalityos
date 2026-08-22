"use client";

import { useState, useEffect } from "react";
import { listReservations, createReservation, cancelReservation, checkInReservation, checkOutReservation } from "@/lib/api";

const statusConfig = {
  confirmed: { label: "Confirmada", color: "text-brand-700 bg-brand-50" },
  checked_in: { label: "Check-in", color: "text-emerald-700 bg-emerald-50" },
  checked_out: { label: "Check-out", color: "text-slate-500 bg-slate-100" },
  canceled: { label: "Cancelada", color: "text-rose-700 bg-rose-50" },
  pending: { label: "Pendiente", color: "text-amber-700 bg-amber-50" },
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ guest_id: "", room_id: "", rate_id: "", check_in: "", check_out: "", adults: 2, children: 0, total_cents: 0, currency: "DOP" });
  const [message, setMessage] = useState(null);

  async function load() {
    try { setReservations(await listReservations("eden-hotel", filter || undefined)); } catch (e) { console.error(e); }
  }

  useEffect(() => { load(); }, [filter]);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await createReservation({ ...form, reservation_id: crypto.randomUUID(), adults: Number(form.adults), children: Number(form.children), total_cents: Number(form.total_cents) }, "eden-hotel");
      setMessage({ type: "success", text: "Reserva creada" });
      setForm({ guest_id: "", room_id: "", rate_id: "", check_in: "", check_out: "", adults: 2, children: 0, total_cents: 0, currency: "DOP" });
      setShowForm(false);
      load();
    } catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  async function handleAction(action, id) {
    setMessage(null);
    try {
      if (action === "cancel") await cancelReservation(id, "eden-hotel");
      if (action === "checkin") await checkInReservation(id, "eden-hotel");
      if (action === "checkout") await checkOutReservation(id, "eden-hotel");
      setMessage({ type: "success", text: "Accion completada" });
      load();
    } catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>Reservas</h1>
          <p className="text-slate-500 mt-1">{reservations.length} reservas</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          {showForm ? "Cancelar" : "+ Nueva Reserva"}
        </button>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${message.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Nueva Reserva</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input name="guest_id" placeholder="ID Huesped" value={form.guest_id} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <input name="room_id" placeholder="ID Habitacion" value={form.room_id} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <input name="rate_id" placeholder="ID Tarifa" value={form.rate_id} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <input name="check_in" type="date" value={form.check_in} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <input name="check_out" type="date" value={form.check_out} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <input name="adults" type="number" placeholder="Adultos" value={form.adults} onChange={handleChange} min="1" className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <input name="total_cents" type="number" placeholder="Total centavos" value={form.total_cents} onChange={handleChange} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <button type="submit" className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">Crear</button>
          </form>
        </div>
      )}

      <div className="flex gap-2 mb-6 flex-wrap">
        {[{ key: "", label: "Todas" }, { key: "confirmed", label: "Confirmadas" }, { key: "checked_in", label: "Check-in" }, { key: "checked_out", label: "Check-out" }, { key: "canceled", label: "Canceladas" }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f.key ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Habitacion</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check-in</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check-out</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map(r => {
              const sc = statusConfig[r.status] || statusConfig.pending;
              return (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 text-sm font-mono text-slate-600">{r.id.slice(0, 8)}...</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{r.room_id.slice(0, 8)}...</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{r.check_in}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{r.check_out}</td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-900">${(r.total_cents / 100).toLocaleString()} {r.currency}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1.5">
                      {r.status === "confirmed" && (
                        <>
                          <button onClick={() => handleAction("checkin", r.id)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium hover:bg-emerald-100">Check-in</button>
                          <button onClick={() => handleAction("cancel", r.id)} className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-xs font-medium hover:bg-rose-100">Cancelar</button>
                        </>
                      )}
                      {r.status === "checked_in" && (
                        <button onClick={() => handleAction("checkout", r.id)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium hover:bg-emerald-100">Check-out</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {reservations.length === 0 && (
          <div className="p-16 text-center text-slate-400">No hay reservas</div>
        )}
      </div>
    </div>
  );
}
