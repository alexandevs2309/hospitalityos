"use client";

import { useState, useEffect } from "react";
import { getFrontDeskToday, checkInReservation, checkOutReservation } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
  useToast,
} from "@/components/ui";

const roomStatusConfig = {
  available: { label: "Disponible", tone: "success", bar: "bg-emerald-500" },
  occupied: { label: "Ocupada", tone: "warning", bar: "bg-amber-500" },
  cleaning: { label: "Limpieza", tone: "info", bar: "bg-sky-500" },
  maintenance: { label: "Mantenimiento", tone: "danger", bar: "bg-rose-500" },
};

const reservationStatusConfig = {
  confirmed: { label: "Confirmada", tone: "brand" },
  checked_in: { label: "Check-in", tone: "success" },
  checked_out: { label: "Check-out", tone: "neutral" },
  canceled: { label: "Cancelada", tone: "danger" },
  pending: { label: "Pendiente", tone: "warning" },
};

function SummaryCard({ label, value, color }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between px-5 py-4">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold dark:text-slate-100" style={{ color }}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function RoomCard({ room }) {
  const sc = roomStatusConfig[room.status] || roomStatusConfig.available;
  return (
    <Card className="overflow-hidden hover:shadow-md">
      <div className={`h-1.5 ${sc.bar}`} />
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{room.number}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Piso {room.floor || "-"}</p>
          </div>
          <StatusBadge tone={sc.tone}>{sc.label}</StatusBadge>
        </div>
        {room.status === "occupied" && room.guest_name && (
          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
                <svg className="h-3.5 w-3.5" fill="none" stroke="#1a6bf5" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="truncate text-sm text-slate-600 dark:text-slate-300">{room.guest_name}</p>
            </div>
          </div>
        )}
        {room.room_type && <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{room.room_type}</p>}
      </CardContent>
    </Card>
  );
}

function MovementTable({ title, rows, emptyText, renderActions }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} className="border-b border-slate-200 dark:border-slate-800" />
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Huesped</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hab.</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Entrada</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Salida</th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Accion</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const sc = reservationStatusConfig[r.status] || reservationStatusConfig.pending;
            return (
              <tr key={r.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={sc.tone}>{sc.label}</StatusBadge>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{r.guest_name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">{r.room_number}</td>
                <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{r.check_in}</td>
                <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{r.check_out}</td>
                <td className="px-5 py-4">
                  <div className="flex justify-end">{renderActions(r)}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <EmptyState title={emptyText} className="py-10" />}
    </Card>
  );
}

export default function FrontDeskPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);
  const toast = useToast();

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

  useEffect(() => {
    load();
  }, []);

  async function handleAction(action, id) {
    setActionInProgress(id);
    try {
      if (action === "checkin") await checkInReservation(id, "eden-hotel");
      if (action === "checkout") await checkOutReservation(id, "eden-hotel");
      toast(action === "checkin" ? "Check-in completado" : "Check-out completado", "success");
      await load();
    } catch (err) {
      toast(err.message || "No se pudo completar la operacion", "error");
    } finally {
      setActionInProgress(null);
    }
  }

  if (loading) {
    return <LoadingState label="Cargando recepcion..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />;
  }

  const summary = data?.summary || {};
  const roomsByStatus = {
    available: (data?.rooms || []).filter((r) => r.status === "available"),
    occupied: (data?.rooms || []).filter((r) => r.status === "occupied"),
    cleaning: (data?.rooms || []).filter((r) => r.status === "cleaning"),
    maintenance: (data?.rooms || []).filter((r) => r.status === "maintenance"),
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Recepcion" subtitle="Panel de operaciones del dia" />

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-7">
        <SummaryCard label="Total Hab." value={summary.total ?? 0} color="#1a6bf5" />
        <SummaryCard label="Disponibles" value={summary.available ?? 0} color="#10b981" />
        <SummaryCard label="Ocupadas" value={summary.occupied ?? 0} color="#f59e0b" />
        <SummaryCard label="Llegadas" value={summary.arrivals ?? 0} color="#8b5cf6" />
        <SummaryCard label="Salidas" value={summary.departures ?? 0} color="#ec4899" />
        <SummaryCard label="En Casa" value={summary.in_house ?? 0} color="#0ea5e9" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MovementTable
          title="Llegadas Hoy"
          rows={data?.arrivals || []}
          emptyText="No hay llegadas programadas hoy"
          renderActions={(r) =>
            r.status !== "checked_in" && (
              <Button variant="success" size="sm" loading={actionInProgress === r.id} onClick={() => handleAction("checkin", r.id)}>
                {actionInProgress === r.id ? "Procesando..." : "Check-in"}
              </Button>
            )
          }
        />
        <MovementTable
          title="Salidas Hoy"
          rows={data?.departures || []}
          emptyText="No hay salidas programadas hoy"
          renderActions={(r) =>
            r.status === "checked_in" && (
              <Button variant="primary" size="sm" loading={actionInProgress === r.id} onClick={() => handleAction("checkout", r.id)}>
                {actionInProgress === r.id ? "Procesando..." : "Check-out"}
              </Button>
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
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100" style={{ fontFamily: "var(--font-display)" }}>
              {group.title}
            </h2>
            <Badge>{roomsByStatus[group.key].length}</Badge>
          </div>
          {roomsByStatus[group.key].length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {roomsByStatus[group.key].map((rm) => (
                <RoomCard key={rm.id} room={rm} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed shadow-none">
              <EmptyState title="Sin habitaciones en este estado" className="py-10" />
            </Card>
          )}
        </section>
      ))}
    </div>
  );
}
