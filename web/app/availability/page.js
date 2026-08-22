"use client";

import { useState } from "react";
import { checkAvailability } from "@/lib/api";

export default function AvailabilityPage() {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRooms(null);
    try {
      const result = await checkAvailability(checkIn, checkOut, "eden-hotel");
      setRooms(result);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const nights = checkIn && checkOut ? Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000)) : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>Disponibilidad</h1>
        <p className="text-slate-500 mt-1">Consulta habitaciones libres por fecha</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <form onSubmit={handleSearch} className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Check-in</label>
            <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Check-out</label>
            <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
          </div>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
            {loading ? "Buscando..." : "Buscar Disponibilidad"}
          </button>
          {nights > 0 && <span className="text-sm text-slate-400 pb-0.5">{nights} noche{nights > 1 ? "s" : ""}</span>}
        </form>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>}

      {rooms !== null && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-900 text-lg">{rooms.length}</span> habitacion{rooms.length !== 1 ? "es" : ""} disponible{rooms.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rooms.map(rm => (
              <div key={rm.room_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-1.5 bg-emerald-500" />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">#{rm.room_number}</p>
                      <p className="text-sm text-slate-400">{rm.room_type}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium text-emerald-700 bg-emerald-50">
                      Disponible
                    </span>
                  </div>
                  <div className="flex items-end justify-between mt-6 pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400">Piso {rm.floor || "-"}</p>
                    <div className="text-right">
                      <p className="text-xl font-bold text-brand-600">${Math.round(rm.price_cents / 100).toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{rm.currency} / noche</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {rooms.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-slate-500">No hay habitaciones disponibles para esas fechas</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
