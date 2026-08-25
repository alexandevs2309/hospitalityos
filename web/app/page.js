"use client";

import { useState, useEffect } from "react";
import { listRooms, listReservations, listGuests } from "@/lib/api";
import { Card, CardContent, Button, Skeleton, SkeletonCard, LoadingState, ErrorState } from "@/components/ui";
import { Users, Home, Calendar, TrendingUp, DollarSign, CheckCircle, AlertTriangle, Activity, Wrench } from "lucide-react";

function MetricCard({ label, value, delta, colorClass, loading }) {
  if (loading) return <SkeletonCard />;
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-400">{label}</p>
        <p className="mt-2 tabular-nums text-2xl font-semibold" style={{ color: colorClass || "var(--stone-900)" }}>{value}</p>
        {delta != null && (
          <div className="mt-2 flex items-center gap-1">
            <span className="text-xs" style={{ color: delta >= 0 ? "var(--emerald-600)" : "var(--rose-600)" }}>
              {delta >= 0 ? "\u2191" : "\u2193"} {Math.abs(delta)}%
            </span>
            <span className="text-xs text-stone-400">vs ayer</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FloorBar({ floor, total, occupied }) {
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-stone-600">Piso {floor}</span>
        <span className="tabular-nums text-xs text-stone-400">{occupied}/{total} ({pct}%)</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--stone-100)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "var(--gold-500)" }} />
      </div>
    </div>
  );
}

function StatItem({ label, value, colorClass, icon: Icon }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: "var(--stone-50)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-500">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-stone-300" />}
      </div>
      <p className="mt-1 tabular-nums text-xl font-semibold" style={{ color: colorClass || "var(--stone-900)" }}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, available: 0, occupied: 0, cleaning: 0, maintenance: 0, reservations: 0, guests: 0 });
  const [floorData, setFloorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [rooms, res, guests] = await Promise.all([
          listRooms("eden-hotel"),
          listReservations("eden-hotel"),
          listGuests("eden-hotel"),
        ]);
        setStats({
          total: rooms.length,
          available: rooms.filter((r) => r.status === "available").length,
          occupied: rooms.filter((r) => r.status === "occupied").length,
          cleaning: rooms.filter((r) => r.status === "cleaning").length,
          maintenance: rooms.filter((r) => r.status === "maintenance").length,
          reservations: res.filter((r) => r.status === "confirmed" || r.status === "checked_in").length,
          guests: guests.length,
        });
        const floors = {};
        rooms.forEach((r) => {
          const f = r.floor || "1";
          if (!floors[f]) floors[f] = { total: 0, occupied: 0 };
          floors[f].total++;
          if (r.status === "occupied") floors[f].occupied++;
        });
        setFloorData(Object.entries(floors).sort((a, b) => a[0].localeCompare(b[0])).map(([f, d]) => ({
          floor: f, total: d.total, occupied: d.occupied,
        })));
      } catch (e) {
        setError(e.message || "No se pudo cargar el dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (error && !loading) return <Card><ErrorState message={error} /></Card>;
  if (loading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"><MetricCard loading /><MetricCard loading /><MetricCard loading /><MetricCard loading /></div>;

  const occRate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;

  return (
    <div>
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Habitaciones" value={stats.total} />
        <MetricCard label="Disponibles" value={stats.available} delta={12} colorClass="text-emerald-600" />
        <MetricCard label="Ocupación" value={`${occRate}%`} delta={-3} colorClass="text-amber-600" />
        <MetricCard label="Reservas Activas" value={stats.reservations} delta={5} colorClass="text-gold-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Floor occupancy */}
        <Card className="lg:col-span-2">
          <CardContent>
            <h3 className="text-base font-semibold text-stone-900 mb-4">Ocupación por Piso</h3>
            <div className="space-y-4">
              {floorData.length > 0 ? floorData.map((f) => (
                <FloorBar key={f.floor} floor={f.floor} total={f.total} occupied={f.occupied} />
              )) : (
                <p className="text-sm text-stone-400">Sin datos de pisos</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardContent>
            <h3 className="text-base font-semibold text-stone-900 mb-4">Acciones Rápidas</h3>
            <div className="space-y-2">
              {[
                { href: "/rooms", label: "Gestionar Habitaciones", variant: "primary" },
                { href: "/reservations", label: "Nueva Reserva", variant: "gold" },
                { href: "/availability", label: "Ver Disponibilidad", variant: "secondary" },
                { href: "/guests", label: "Registrar Huésped", variant: "secondary" },
              ].map((a) => (
                <Button key={a.href} href={a.href} variant={a.variant} className="w-full" size="sm">{a.label}</Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Summary stats */}
        <Card>
          <CardContent>
            <h3 className="text-base font-semibold text-stone-900 mb-4">Resumen</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatItem label="Huéspedes" value={stats.guests} icon={Users} />
              <StatItem label="En limpieza" value={stats.cleaning} colorClass="text-sky-600" icon={Activity} />
              <StatItem label="Mantenimiento" value={stats.maintenance} colorClass="text-rose-600" icon={Wrench} />
              <StatItem label="Sistema" value="100%" colorClass="text-emerald-600" icon={CheckCircle} />
            </div>
          </CardContent>
        </Card>

        {/* System status */}
        <Card>
          <CardContent>
            <h3 className="text-base font-semibold text-stone-900 mb-4">Estado del Sistema</h3>
            <div className="space-y-0">
              {[
                { name: "API Backend", port: ":8081" },
                { name: "Frontend", port: ":3001" },
                { name: "PostgreSQL", port: ":5432" },
                { name: "Event Store", port: "PG" },
              ].map((s, i) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between"
                  style={{
                    padding: "10px 0",
                    borderBottom: i < 3 ? "1px solid var(--stone-100)" : "none",
                  }}
                >
                  <span className="text-sm text-stone-600">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-xs text-stone-400">{s.port}</span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--emerald-500)" }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}