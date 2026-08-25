"use client";

import { useState, useEffect } from "react";
import { getFrontDeskToday, checkInReservation, checkOutReservation } from "@/lib/api";
import {
  Button, Card, CardContent, StatusBadge, EmptyState, LoadingState, ErrorState, useToast,
} from "@/components/ui";
import {
  Building2, LogOut, Check, Home, Calendar, Users, Sparkles, Wrench,
  BedDouble, UserCheck, ArrowDownToLine, ArrowUpFromLine, Clock,
} from "lucide-react";

const roomStatusConfig = {
  available: { label: "Disponible", tone: "success", color: "var(--emerald-500)" },
  occupied: { label: "Ocupada", tone: "warning", color: "var(--amber-500)" },
  cleaning: { label: "Limpieza", tone: "info", color: "var(--sky-500)" },
  maintenance: { label: "Mantenimiento", tone: "danger", color: "var(--rose-500)" },
};

const reservationStatusConfig = {
  confirmed: { label: "Confirmada", tone: "gold" },
  checked_in: { label: "Check-in", tone: "success" },
  checked_out: { label: "Check-out", tone: "neutral" },
  canceled: { label: "Cancelada", tone: "danger" },
  pending: { label: "Pendiente", tone: "warning" },
};

/* ── Stat Pill ──────────────────────────────────────────────── */
function StatPill({ label, value, icon: Icon, color }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: "white", border: "1px solid var(--stone-100)" }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}12` }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color }} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--stone-400)" }}>{label}</p>
        <p className="text-lg font-bold tabular-nums" style={{ color: "var(--stone-900)" }}>{value}</p>
      </div>
    </div>
  );
}

/* ── Room Card ──────────────────────────────────────────────── */
function RoomCard({ room }) {
  const sc = roomStatusConfig[room.status] || roomStatusConfig.available;
  return (
    <div
      className="group relative overflow-hidden rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
      style={{
        background: "white",
        border: "1px solid var(--stone-100)",
        borderLeft: `3px solid ${sc.color}`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-lg font-bold tabular-nums" style={{ color: "var(--stone-900)" }}>{room.number}</p>
          <p className="text-xs" style={{ color: "var(--stone-400)" }}>Piso {room.floor || "-"}</p>
        </div>
        <StatusBadge tone={sc.tone}>{sc.label}</StatusBadge>
      </div>
      {room.room_type && (
        <p className="text-xs font-medium" style={{ color: "var(--stone-500)" }}>{room.room_type}</p>
      )}
      {room.status === "occupied" && room.guest_name && (
        <div
          className="flex items-center gap-2 mt-3 pt-3"
          style={{ borderTop: "1px solid var(--stone-100)" }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--amber-50)" }}
          >
            <UserCheck className="w-3.5 h-3.5" style={{ color: "var(--amber-600)" }} />
          </div>
          <p className="truncate text-sm font-medium" style={{ color: "var(--stone-700)" }}>{room.guest_name}</p>
        </div>
      )}
    </div>
  );
}

/* ── Movement Table ─────────────────────────────────────────── */
const TH = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--stone-400)",
};

function MovementTable({ title, icon: Icon, rows, emptyText, renderActions }) {
  return (
    <Card>
      <CardContent style={{ padding: "20px" }}>
        <div className="flex items-center gap-2 mb-4">
          <Icon className="w-5 h-5" style={{ color: "var(--stone-400)" }} strokeWidth={1.5} />
          <h3 className="text-base font-semibold" style={{ color: "var(--stone-900)" }}>{title}</h3>
          <span
            className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums"
            style={{ background: "var(--stone-100)", color: "var(--stone-500)" }}
          >
            {rows.length}
          </span>
        </div>
        {rows.length === 0 ? (
          <div className="text-center py-8" style={{ color: "var(--stone-400)" }}>
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--stone-100)" }}>
                  <th style={TH}>Huesped</th>
                  <th style={TH}>Hab.</th>
                  <th style={TH}>Entrada</th>
                  <th style={TH}>Salida</th>
                  <th style={{ ...TH, textAlign: "right" }}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const sc = reservationStatusConfig[r.status] || reservationStatusConfig.pending;
                  return (
                    <tr
                      key={r.id}
                      className="transition-colors"
                      style={{ borderBottom: "1px solid var(--stone-50)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--stone-50)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div className="flex items-center gap-2">
                          <StatusBadge tone={sc.tone}>{sc.label}</StatusBadge>
                          <span className="text-sm font-medium" style={{ color: "var(--stone-900)" }}>{r.guest_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 500, color: "var(--stone-600)" }}>{r.room_number}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--stone-500)" }}>{r.check_in}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--stone-500)" }}>{r.check_out}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div className="flex justify-end">{renderActions(r)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FRONT DESK PAGE
   ═══════════════════════════════════════════════════════════════ */
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

  useEffect(() => { load(); }, []);

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

  if (loading) return <LoadingState label="Cargando recepcion..." />;
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />;

  const summary = data?.summary || {};
  const rooms = data?.rooms || [];

  const stats = [
    { label: "Total", value: summary.total ?? 0, icon: BedDouble, color: "var(--stone-700)" },
    { label: "Disponibles", value: summary.available ?? 0, icon: Home, color: "var(--emerald-500)" },
    { label: "Ocupadas", value: summary.occupied ?? 0, icon: Users, color: "var(--amber-500)" },
    { label: "Llegadas", value: summary.arrivals ?? 0, icon: ArrowDownToLine, color: "var(--blue-600)" },
    { label: "Salidas", value: summary.departures ?? 0, icon: ArrowUpFromLine, color: "var(--rose-500)" },
    { label: "En Casa", value: summary.in_house ?? 0, icon: Building2, color: "var(--sky-600)" },
    { label: "Limpieza", value: summary.cleaning ?? rooms.filter((r) => r.status === "cleaning").length, icon: Sparkles, color: "var(--violet-500)" },
  ];

  const roomsByStatus = {
    available: rooms.filter((r) => r.status === "available"),
    occupied: rooms.filter((r) => r.status === "occupied"),
    cleaning: rooms.filter((r) => r.status === "cleaning"),
    maintenance: rooms.filter((r) => r.status === "maintenance"),
  };

  const statusGroups = [
    { key: "available", title: "Disponibles", icon: Home, color: "var(--emerald-500)" },
    { key: "occupied", title: "Ocupadas", icon: Users, color: "var(--amber-500)" },
    { key: "cleaning", title: "En Limpieza", icon: Sparkles, color: "var(--sky-500)" },
    { key: "maintenance", title: "Mantenimiento", icon: Wrench, color: "var(--rose-500)" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--stone-900)" }}>Recepcion</h1>
        <p className="text-sm mt-1" style={{ color: "var(--stone-400)" }}>Panel de operaciones del dia</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {stats.map((s) => (
          <StatPill key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} />
        ))}
      </div>

      {/* Arrivals / Departures */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MovementTable
          title="Llegadas Hoy"
          icon={ArrowDownToLine}
          rows={data?.arrivals || []}
          emptyText="No hay llegadas programadas hoy"
          renderActions={(r) =>
            r.status !== "checked_in" && (
              <Button variant="success" size="sm" loading={actionInProgress === r.id} onClick={() => handleAction("checkin", r.id)}>
                <Check className="w-3.5 h-3.5 mr-1" /> Check-in
              </Button>
            )
          }
        />
        <MovementTable
          title="Salidas Hoy"
          icon={ArrowUpFromLine}
          rows={data?.departures || []}
          emptyText="No hay salidas programadas hoy"
          renderActions={(r) =>
            r.status === "checked_in" && (
              <Button variant="primary" size="sm" loading={actionInProgress === r.id} onClick={() => handleAction("checkout", r.id)}>
                <LogOut className="w-3.5 h-3.5 mr-1" /> Check-out
              </Button>
            )
          }
        />
      </div>

      {/* Room Sections */}
      {statusGroups.map((group) => (
        <section key={group.key}>
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${group.color}15` }}
            >
              <group.icon className="w-4 h-4" style={{ color: group.color }} strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-semibold" style={{ color: "var(--stone-900)" }}>{group.title}</h2>
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums"
              style={{ background: `${group.color}12`, color: group.color }}
            >
              {roomsByStatus[group.key].length}
            </span>
          </div>
          {roomsByStatus[group.key].length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {roomsByStatus[group.key].map((rm) => (
                <RoomCard key={rm.id} room={rm} />
              ))}
            </div>
          ) : (
            <div
              className="text-center py-8 rounded-xl"
              style={{ background: "var(--stone-50)", border: "1px dashed var(--stone-200)" }}
            >
              <p className="text-sm" style={{ color: "var(--stone-400)" }}>Sin habitaciones en este estado</p>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
