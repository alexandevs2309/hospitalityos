"use client";

import { useState, useEffect } from "react";
import { getFrontDeskToday, checkInReservation, checkOutReservation } from "@/lib/api";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  StatusBadge,
  EmptyState,
  LoadingState,
  ErrorState,
  useToast,
} from "@/components/ui";
import { Building2, LogOut, Check, Home, Calendar, Users, Sparkles, Loader2 } from "lucide-react";

const roomStatusConfig = {
  available: { label: "Disponible", tone: "success" },
  occupied: { label: "Ocupada", tone: "warning" },
  cleaning: { label: "Limpieza", tone: "info" },
  maintenance: { label: "Mantenimiento", tone: "danger" },
};

const reservationStatusConfig = {
  confirmed: { label: "Confirmada", tone: "gold" },
  checked_in: { label: "Check-in", tone: "success" },
  checked_out: { label: "Check-out", tone: "neutral" },
  canceled: { label: "Cancelada", tone: "danger" },
  pending: { label: "Pendiente", tone: "warning" },
};

const TH = {
  padding: "12px 20px",
  textAlign: "left",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--stone-400)",
};

function StatCard({ label, value, colorClass }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-400">{label}</p>
        <p className="mt-1 tabular-nums text-2xl font-semibold" style={{ color: colorClass || "var(--stone-900)" }}>{value}</p>
      </CardContent>
    </Card>
  );
}

function RoomCard({ room }) {
  const sc = roomStatusConfig[room.status] || roomStatusConfig.available;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xl font-semibold text-stone-900">{room.number}</p>
            <p className="text-xs text-stone-400">Piso {room.floor || "-"}</p>
          </div>
          <StatusBadge tone={sc.tone}>{sc.label}</StatusBadge>
        </div>
        {room.room_type && (
          <p className="text-xs text-stone-400">{room.room_type}</p>
        )}
        {room.status === "occupied" && room.guest_name && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--stone-100)" }}>
              <UserCheck className="w-4 h-4 text-stone-500" />
            </div>
            <p className="truncate text-sm text-stone-600">{room.guest_name}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MovementTable({ title, rows, emptyText, renderActions }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} />
      {rows.length === 0 ? (
        <EmptyState title={emptyText} />
      ) : (
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--stone-200)", background: "var(--stone-50)" }}>
              <th style={TH}>Huésped</th>
              <th style={TH}>Hab.</th>
              <th style={TH}>Entrada</th>
              <th style={TH}>Salida</th>
              <th style={{ ...TH, textAlign: "right" }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const sc = reservationStatusConfig[r.status] || reservationStatusConfig.pending;
              return (
                <tr
                  key={r.id}
                  style={{ borderBottom: "1px solid var(--stone-100)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--stone-50)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <td style={{ padding: "14px 20px" }}>
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={sc.tone}>{sc.label}</StatusBadge>
                      <span className="text-sm font-medium text-stone-900">{r.guest_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--stone-600)" }}>{r.room_number}</td>
                  <td style={{ padding: "14px 20px", fontSize: "var(--text-sm)", color: "var(--stone-500)" }}>{r.check_in}</td>
                  <td style={{ padding: "14px 20px", fontSize: "var(--text-sm)", color: "var(--stone-500)" }}>{r.check_out}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <div className="flex justify-end">{renderActions(r)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
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
      toast(err.message || "No se pudo completar la operación", "error");
    } finally {
      setActionInProgress(null);
    }
  }

  if (loading) {
    return <LoadingState label="Cargando recepción..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />;
  }

  const summary = data?.summary || {};
  const rooms = data?.rooms || [];

  const stats = [
    { label: "Total Hab.", value: summary.total ?? 0, colorClass: "text-stone-900" },
    { label: "Disponibles", value: summary.available ?? 0, colorClass: "text-emerald-600" },
    { label: "Ocupadas", value: summary.occupied ?? 0, colorClass: "text-amber-600" },
    { label: "Llegadas", value: summary.arrivals ?? 0, colorClass: "text-gold-600" },
    { label: "Salidas", value: summary.departures ?? 0, colorClass: "text-rose-600" },
    { label: "En Casa", value: summary.in_house ?? 0, colorClass: "text-sky-600" },
    { label: "En Limpieza", value: summary.cleaning ?? rooms.filter((r) => r.status === "cleaning").length, colorClass: "text-stone-900" },
  ];

  const roomsByStatus = {
    available: rooms.filter((r) => r.status === "available"),
    occupied: rooms.filter((r) => r.status === "occupied"),
    cleaning: rooms.filter((r) => r.status === "cleaning"),
    maintenance: rooms.filter((r) => r.status === "maintenance"),
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "24px" }}>
        <h1 className="text-2xl font-semibold text-stone-900">Recepción</h1>
        <p className="text-sm text-stone-400 mt-1">Panel de operaciones del día</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} colorClass={s.colorClass} />
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MovementTable
          title="Llegadas Hoy"
          rows={data?.arrivals || []}
          emptyText="No hay llegadas programadas hoy"
          renderActions={(r) =>
            r.status !== "checked_in" && (
              <Button variant="success" size="sm" loading={actionInProgress === r.id} onClick={() => handleAction("checkin", r.id)}>
                <LogOut className="w-3.5 h-3.5 mr-1" /> Check-in
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
                <Check className="w-3.5 h-3.5 mr-1" /> Check-out
              </Button>
            )
          }
        />
      </div>

      {[
        { key: "available", title: "Disponibles", icon: Home },
        { key: "occupied", title: "Ocupadas", icon: Users },
        { key: "cleaning", title: "En Limpieza", icon: Sparkles },
        { key: "maintenance", title: "En Mantenimiento", icon: Wrench },
      ].map((group) => (
        <section key={group.key} style={{ marginBottom: "32px" }}>
          <div className="mb-3 flex items-center gap-2">
            <group.icon className="w-5 h-5 text-stone-500" />
            <h2 className="text-base font-semibold text-stone-900">{group.title}</h2>
            <span
              className="tabular-nums"
              style={{ fontSize: "var(--text-xs)", color: "var(--stone-500)", background: "var(--stone-100)", borderRadius: "var(--radius-full)", padding: "2px 8px" }}
            >
              {roomsByStatus[group.key].length}
            </span>
          </div>
          {roomsByStatus[group.key].length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {roomsByStatus[group.key].map((rm) => (
                <RoomCard key={rm.id} room={rm} />
              ))}
            </div>
          ) : (
            <Card style={{ borderStyle: "dashed", boxShadow: "none" }}>
              <EmptyState title="Sin habitaciones en este estado" />
            </Card>
          )}
        </section>
      ))}
    </div>
  );
}