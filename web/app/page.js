"use client";

import { useState, useEffect } from "react";
import { listRooms, listReservations, listGuests } from "@/lib/api";
import {
  Card, CardContent, Button, Skeleton, SkeletonCard, LoadingState, ErrorState,
} from "@/components/ui";
import {
  Users, Home, Calendar, TrendingUp, DollarSign, CheckCircle, AlertTriangle,
  Activity, Wrench, ArrowUpRight, ArrowDownRight, BedDouble, UserCheck,
  Clock, Sparkles, CalendarCheck, Building, ChevronRight,
} from "lucide-react";

/* ── KPI Card ───────────────────────────────────────────────── */
function KPICard({ label, value, delta, icon: Icon, gradient, loading }) {
  if (loading) return <SkeletonCard />;
  return (
    <div
      className="relative overflow-hidden rounded-xl p-5 text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
      style={{ background: gradient }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 opacity-10 -translate-y-4 translate-x-4">
        <Icon className="w-full h-full" strokeWidth={1} />
      </div>
      <div className="relative z-10">
        <p className="text-xs font-medium uppercase tracking-wider text-white/70">{label}</p>
        <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{value}</p>
        {delta != null && (
          <div className="mt-2 flex items-center gap-1">
            {delta >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" />
            )}
            <span className="text-xs font-medium">{Math.abs(delta)}% vs ayer</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Floor Bar ──────────────────────────────────────────────── */
function FloorBar({ floor, total, occupied }) {
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const getColor = () => {
    if (pct >= 90) return "var(--rose-500)";
    if (pct >= 70) return "var(--amber-500)";
    return "var(--emerald-500)";
  };
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium" style={{ color: "var(--stone-700)" }}>Piso {floor}</span>
        <span className="tabular-nums text-xs font-medium" style={{ color: "var(--stone-500)" }}>
          {occupied}/{total} <span style={{ color: getColor() }}>({pct}%)</span>
        </span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--stone-100)" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: getColor() }}
        />
      </div>
    </div>
  );
}

/* ── Room Status Dot ────────────────────────────────────────── */
function RoomDot({ status }) {
  const colors = {
    available: "var(--emerald-500)",
    occupied: "var(--amber-500)",
    cleaning: "var(--sky-500)",
    maintenance: "var(--rose-500)",
  };
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform hover:scale-110"
      style={{ background: `${colors[status] || colors.available}20` }}
      title={status}
    >
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[status] || colors.available }} />
    </div>
  );
}

/* ── Quick Action ───────────────────────────────────────────── */
function QuickAction({ href, label, description, icon: Icon, gradient }) {
  return (
    <a
      href={href}
      className="group flex items-center gap-4 p-3 rounded-xl transition-all duration-200 hover:shadow-md"
      style={{ background: "var(--stone-50)", border: "1px solid var(--stone-100)" }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
        style={{ background: gradient }}
      >
        <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--stone-900)" }}>{label}</p>
        <p className="text-xs truncate" style={{ color: "var(--stone-400)" }}>{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--stone-300)" }} />
    </a>
  );
}

/* ── Activity Item ──────────────────────────────────────────── */
function ActivityItem({ icon: Icon, text, time, color }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: "var(--stone-100)" }}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${color}15` }}
      >
        <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: "var(--stone-700)" }}>{text}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--stone-400)" }}>{time}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const [stats, setStats] = useState({
    total: 0, available: 0, occupied: 0, cleaning: 0, maintenance: 0,
    reservations: 0, guests: 0,
  });
  const [floorData, setFloorData] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [roomsData, res, guests] = await Promise.all([
          listRooms("eden-hotel"),
          listReservations("eden-hotel"),
          listGuests("eden-hotel"),
        ]);
        setRooms(roomsData);
        setStats({
          total: roomsData.length,
          available: roomsData.filter((r) => r.status === "available").length,
          occupied: roomsData.filter((r) => r.status === "occupied").length,
          cleaning: roomsData.filter((r) => r.status === "cleaning").length,
          maintenance: roomsData.filter((r) => r.status === "maintenance").length,
          reservations: res.filter((r) => r.status === "confirmed" || r.status === "checked_in").length,
          guests: guests.length,
        });
        const floors = {};
        roomsData.forEach((r) => {
          const f = r.floor || "1";
          if (!floors[f]) floors[f] = { total: 0, occupied: 0 };
          floors[f].total++;
          if (r.status === "occupied") floors[f].occupied++;
        });
        setFloorData(
          Object.entries(floors)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([f, d]) => ({ floor: f, total: d.total, occupied: d.occupied }))
        );
      } catch (e) {
        setError(e.message || "No se pudo cargar el dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (error && !loading) return <Card><ErrorState message={error} /></Card>;
  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map((i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    </div>
  );

  const occRate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Buenos dias" : now.getHours() < 18 ? "Buenas tardes" : "Buenas noches";
  const dateStr = now.toLocaleDateString("es-DO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      {/* ── Hero Welcome ── */}
      <div className="rounded-xl p-6" style={{ background: "linear-gradient(135deg, var(--stone-900) 0%, var(--stone-800) 100%)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{greeting}, Admin</h1>
            <p className="mt-1 text-sm text-white/60 capitalize">{dateStr}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse-soft" style={{ background: "var(--emerald-400)" }} />
            <span className="text-xs font-medium text-white/60">Sistema operativo</span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Habitaciones"
          value={stats.total}
          icon={BedDouble}
          gradient="var(--gradient-stone)"
          loading={loading}
        />
        <KPICard
          label="Disponibles"
          value={stats.available}
          delta={12}
          icon={Home}
          gradient="var(--gradient-emerald)"
          loading={loading}
        />
        <KPICard
          label="Ocupacion"
          value={`${occRate}%`}
          delta={-3}
          icon={TrendingUp}
          gradient="var(--gradient-gold)"
          loading={loading}
        />
        <KPICard
          label="Reservas"
          value={stats.reservations}
          delta={5}
          icon={Calendar}
          gradient="var(--gradient-blue)"
          loading={loading}
        />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Room Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent style={{ padding: "20px" }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold" style={{ color: "var(--stone-900)" }}>Mapa de Habitaciones</h3>
                <a href="/frontdesk" className="flex items-center gap-1 text-xs font-medium transition-colors" style={{ color: "var(--gold-600)" }}>
                  Ver todo <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Room Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-6">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="group relative flex items-center justify-center aspect-square rounded-lg cursor-default transition-all duration-200 hover:scale-105"
                    style={{
                      background: room.status === "available" ? "var(--emerald-50)" :
                                  room.status === "occupied" ? "var(--amber-50)" :
                                  room.status === "cleaning" ? "var(--sky-50)" :
                                  "var(--rose-50)",
                      border: `1px solid ${room.status === "available" ? "var(--emerald-100)" :
                                            room.status === "occupied" ? "var(--amber-100)" :
                                            room.status === "cleaning" ? "var(--sky-100)" :
                                            "var(--rose-100)"}`,
                    }}
                    title={`${room.number || room.name} — ${room.status}`}
                  >
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: room.status === "available" ? "var(--emerald-700)" :
                               room.status === "occupied" ? "var(--amber-700)" :
                               room.status === "cleaning" ? "var(--sky-700)" :
                               "var(--rose-700)",
                      }}
                    >
                      {room.number || room.name?.split(" ").pop() || "?"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs" style={{ color: "var(--stone-500)" }}>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ background: "var(--emerald-500)" }} /> Disponible</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ background: "var(--amber-500)" }} /> Ocupada</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ background: "var(--sky-500)" }} /> Limpieza</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ background: "var(--rose-500)" }} /> Mantenimiento</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Floor Occupancy */}
          <Card>
            <CardContent style={{ padding: "20px" }}>
              <h3 className="text-base font-semibold mb-4" style={{ color: "var(--stone-900)" }}>Ocupacion por Piso</h3>
              <div className="space-y-4">
                {floorData.length > 0 ? (
                  floorData.map((f) => (
                    <FloorBar key={f.floor} floor={f.floor} total={f.total} occupied={f.occupied} />
                  ))
                ) : (
                  <p className="text-sm" style={{ color: "var(--stone-400)" }}>Sin datos</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent style={{ padding: "20px" }}>
              <h3 className="text-base font-semibold mb-4" style={{ color: "var(--stone-900)" }}>Acciones Rapidas</h3>
              <div className="space-y-2">
                <QuickAction href="/rooms" label="Habitaciones" description="Gestionar rooms" icon={BedDouble} gradient="var(--stone-900)" />
                <QuickAction href="/reservations" label="Nueva Reserva" description="Crear booking" icon={CalendarCheck} gradient="var(--gold-500)" />
                <QuickAction href="/availability" label="Disponibilidad" description="Ver calendar" icon={Calendar} gradient="var(--blue-600)" />
                <QuickAction href="/guests" label="Huespedes" description="Directorio" icon={UserCheck} gradient="var(--emerald-600)" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Summary Stats */}
        <Card>
          <CardContent style={{ padding: "20px" }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: "var(--stone-900)" }}>Resumen</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Huespedes", value: stats.guests, icon: Users, color: "var(--blue-600)" },
                { label: "En limpieza", value: stats.cleaning, icon: Sparkles, color: "var(--sky-500)" },
                { label: "Mantenimiento", value: stats.maintenance, icon: Wrench, color: "var(--rose-500)" },
                { label: "Sistema", value: "100%", icon: CheckCircle, color: "var(--emerald-500)" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--stone-50)", border: "1px solid var(--stone-100)" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${s.color}12` }}>
                    <s.icon className="w-4.5 h-4.5" style={{ color: s.color }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--stone-400)" }}>{s.label}</p>
                    <p className="text-lg font-bold tabular-nums" style={{ color: "var(--stone-900)" }}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardContent style={{ padding: "20px" }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: "var(--stone-900)" }}>Actividad Reciente</h3>
            <div>
              <ActivityItem
                icon={UserCheck}
                text="Check-in completado — Habitacion 101"
                time="Hace 15 min"
                color="var(--emerald-500)"
              />
              <ActivityItem
                icon={Sparkles}
                text="Habitacion 205 marcada como limpia"
                time="Hace 32 min"
                color="var(--sky-500)"
              />
              <ActivityItem
                icon={Calendar}
                text="Nueva reserva confirmada — 3 noches"
                time="Hace 1 hora"
                color="var(--blue-500)"
              />
              <ActivityItem
                icon={Wrench}
                text="Mantenimiento programado — Habitacion 302"
                time="Hace 2 horas"
                color="var(--amber-500)"
              />
              <ActivityItem
                icon={TrendingUp}
                text="Revenue del dia: $12,450"
                time="Hoy"
                color="var(--gold-500)"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
