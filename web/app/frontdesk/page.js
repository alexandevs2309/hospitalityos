"use client";

import { useState, useEffect } from "react";
import { getFrontDeskToday, checkInReservation, checkOutReservation } from "@/lib/api";

const roomStatusConfig = {
  available: { label: "Disponible", color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  occupied: { label: "Ocupada", color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  cleaning: { label: "Limpieza", color: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50" },
  maintenance: { label: "Mantenimiento", color: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" },
};

const reservationStatusConfig = {
  confirmed: { label: "Confirmada", color: "text-brand-700 bg-brand-50" },
  checked_in: { label: "Check-in", color: "text-emerald-700 bg-emerald-50" },
  checked_out: { label: "Check-out", color: "text-slate-500 bg-slate-100" },
  canceled: { label: "Cancelada", color: "text-rose-700 bg-rose-50" },
  pending: { label: "Pendiente", color: "text-amber-700 bg-amber-50" },
};

function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function RoomCard({ room }) {
  const sc = roomStatusConfig[room.status] || roomStatusConfig.available;
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className={`h-1.5 ${sc.color}`} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xl font-bold text-slate-900">{room.number}</p>
            <p className="text-xs text-slate-400">Piso {room.floor || "-"}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sc.text} ${sc.bg}`}>
            {sc.label}
          </span>
        </div>
        {room.status === "occupied" && room.guest_name && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="#1a6bf5" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-sm text-slate-600 truncate">{room.guest_name}</p>
            </div>
          </div>
        )}
        {room.room_type && (
          <p className="text-xs text-slate-400 mt-2">{room.room_type}</p>
        )}
      </div>
    </div>
  );
}

function MovementTable({ title, rows, emptyText, renderActions }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>{title}</h2>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Huesped</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hab.</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entrada</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Salida</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Accion</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const sc = reservationStatusConfig[r.status] || reservationStatusConfig.pending;
            return (
              <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                    <span className="text-sm font-medium text-slate-900">{r.guest_name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">{r.room_number}</td>
                <td className="px-5 py-4 text-sm text-slate-500">{r.check_in}</td>
                <td className="px-5 py-4 text-sm text-slate-500">{r.check_out}</td>
                <td className="px-5 py-4">
                  <div className="flex justify-end">{renderActions(r)}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="p-10 text-center text-sm text-slate-400">{emptyText}</div>
      )}
    </div>
  );
}

export default function FrontDeskPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);

  async function load() {
    try {
      setError(null);
      setData(await getFrontDeskToday("eden-hotel"));
    } catch (e) {
      setError(e.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAction(action, id) {
    setMessage(null);
    setActionInProgress(id);
    try {
      if (action === "checkin") await checkInReservation(id, "eden-hotel");
      if (action === "checkout") await checkOutReservation(id, "eden-hotel");
      setMessage({ type: "success", text: action === "checkin" ? "Check-in completado" : "Check-out completado" });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setActionInProgress(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Cargando recepcion...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white rounded-xl border border-rose-200 p-8 text-center max-w-md">
          <svg className="w-12 h-12 text-rose-300 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-slate-900 font-medium mb-1">Error al cargar</p>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button onClick={() => { setLoading(true); load(); }} className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const roomsByStatus = {
    available: (data?.rooms || []).filter((r) => r.status === "available"),
    occupied: (data?.rooms || []).filter((r) => r.status === "occupied"),
    cleaning: (data?.rooms || []).filter((r) => r.status === "cleaning"),
    maintenance: (data?.rooms || []).filter((r) => r.status === "maintenance"),
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>Recepcion</h1>
        <p className="text-slate-500 mt-1">Panel de operaciones del dia</p>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${message.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 mb-8">
        <SummaryCard label="Total Hab." value={summary.total ?? 0} color="#1a6bf5" />
        <SummaryCard label="Disponibles" value={summary.available ?? 0} color="#10b981" />
        <SummaryCard label="Ocupadas" value={summary.occupied ?? 0} color="#f59e0b" />
        <SummaryCard label="Llegadas" value={summary.arrivals ?? 0} color="#8b5cf6" />
        <SummaryCard label="Salidas" value={summary.departures ?? 0} color="#ec4899" />
        <SummaryCard label="En Casa" value={summary.in_house ?? 0} color="#0ea5e9" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <MovementTable
          title="Llegadas Hoy"
          rows={data?.arrivals || []}
          emptyText="No hay llegadas programadas hoy"
          renderActions={(r) =>
            r.status !== "checked_in" && (
              <button
                onClick={() => handleAction("checkin", r.id)}
                disabled={actionInProgress === r.id}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {actionInProgress === r.id ? "Procesando..." : "Check-in"}
              </button>
            )
          }
        />
        <MovementTable
          title="Salidas Hoy"
          rows={data?.departures || []}
          emptyText="No hay salidas programadas hoy"
          renderActions={(r) =>
            r.status === "checked_in" && (
              <button
                onClick={() => handleAction("checkout", r.id)}
                disabled={actionInProgress === r.id}
                className="px-3 py-1.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-md text-xs font-medium hover:bg-brand-100 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {actionInProgress === r.id ? "Procesando..." : "Check-out"}
              </button>
            )
          }
        />
      </div>

      {[
        { key: "available", title: "Disponibles" },
        { key: "occupied", title: "Ocupadas" },
        { key: "cleaning", title: "En Limpieza" },
        { key: "maintenance", title: "En Mantenimiento" },
      ].map((group) => (
        <section key={group.key} className="mb-8 last:mb-0">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>{group.title}</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
              {roomsByStatus[group.key].length}
            </span>
          </div>
          {roomsByStatus[group.key].length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {roomsByStatus[group.key].map((rm) => (
                <RoomCard key={rm.id} room={rm} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              Sin habitaciones en este estado
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
