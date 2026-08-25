"use client";

import { useState, useEffect, useCallback } from "react";
import { getReportDashboard, getReportOccupancy, getReportRevenue, getReportGuestStats } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  ErrorState,
  LoadingState,
} from "@/components/ui";
import { TrendingUp, DollarSign, Users, Home } from "lucide-react";

const TENANT = "eden-hotel";

function money(cents) {
  return `$${((cents || 0) / 100).toLocaleString("en-US")}`;
}

function StatCard({ label, value, sub, icon: Icon, colorClass }) {
  return (
    <Card className="hover:shadow-md">
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-500">{label}</p>
            <p className="mt-2 truncate text-3xl font-bold text-stone-900" style={{ lineHeight: "var(--leading-tight)" }}>{value}</p>
            {sub && <p className="mt-1 text-xs text-stone-400">{sub}</p>}
          </div>
          <div
            className="flex shrink-0 items-center justify-center"
            style={{ width: "40px", height: "40px", borderRadius: "var(--radius-lg)", background: "var(--gold-50)", border: "1px solid var(--gold-100)" }}
          >
            {Icon && <Icon className="w-5 h-5" style={{ color: colorClass || "var(--gold-600)" }} strokeWidth={2} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [guestStats, setGuestStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [db, occ, rev, gs] = await Promise.all([
        getReportDashboard(TENANT),
        getReportOccupancy(TENANT, 7),
        getReportRevenue(TENANT, 7),
        getReportGuestStats(TENANT),
      ]);
      setDashboard(db);
      setOccupancy(occ);
      setRevenue(rev);
      setGuestStats(gs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const countries = guestStats?.top_countries || [];
  const maxCountry = Math.max(...countries.map((c) => c.count), 1);
  const returningPct =
    guestStats && guestStats.total_guests > 0
      ? Math.round((guestStats.returning_guests / guestStats.total_guests) * 100)
      : 0;

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Reportes</h1>
          <p className="mt-1 text-sm text-stone-400">Rendimiento del hotel en tiempo real</p>
        </div>
      </div>

      {error && !loading ? (
        <ErrorState message={error} onRetry={loadAll} />
      ) : loading ? (
        <LoadingState label="Cargando reportes..." />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Tasa de Ocupacion"
              value={`${Number(dashboard?.occupancy_rate || 0).toFixed(1)}%`}
              sub={`${occupancy?.occupied ?? 0} de ${occupancy?.total_rooms ?? 0} habitaciones`}
              icon={Home}
              colorClass="text-emerald-600"
            />
            <StatCard
              label="Tarifa Diaria Promedio"
              value={money(dashboard?.today_revenue_cents)}
              sub="Ingresos de hoy"
              icon={DollarSign}
              colorClass="text-amber-600"
            />
            <StatCard
              label="Reservas Activas"
              value={dashboard?.total_reservations ?? 0}
              sub={`${dashboard?.active_guests ?? 0} huespedes activos`}
              icon={Users}
              colorClass="text-gold-600"
            />
            <StatCard
              label="Tareas Pendientes"
              value={(dashboard?.pending_tasks ?? 0) + (dashboard?.open_maintenance ?? 0)}
              sub={`${dashboard?.pending_tasks ?? 0} limpieza · ${dashboard?.open_maintenance ?? 0} mantenimiento`}
              icon={TrendingUp}
              colorClass="text-sky-600"
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Resumen de Ocupacion" />
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: "var(--stone-50)" }}>
                    <span className="text-sm text-stone-600">Total habitaciones</span>
                    <span className="text-lg font-bold text-stone-900">{occupancy?.total_rooms ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: "var(--stone-50)" }}>
                    <span className="text-sm text-stone-600">Ocupadas</span>
                    <span className="text-lg font-bold text-stone-900">{occupancy?.occupied ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: "var(--stone-50)" }}>
                    <span className="text-sm text-stone-600">Disponibles</span>
                    <span className="text-lg font-bold text-stone-900">{occupancy?.available ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: "var(--stone-50)" }}>
                    <span className="text-sm text-stone-600">Llegadas hoy</span>
                    <span className="text-lg font-bold text-stone-900">{occupancy?.arrivals ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: "var(--stone-50)" }}>
                    <span className="text-sm text-stone-600">Salidas hoy</span>
                    <span className="text-lg font-bold text-stone-900">{occupancy?.departures ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: "var(--stone-50)" }}>
                    <span className="text-sm text-stone-600">En casa</span>
                    <span className="text-lg font-bold text-stone-900">{occupancy?.in_house ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Resumen Financiero" />
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: "var(--stone-50)" }}>
                    <span className="text-sm text-stone-600">Ingresos hoy</span>
                    <span className="text-lg font-bold text-stone-900">{money(dashboard?.today_revenue_cents)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: "var(--stone-50)" }}>
                    <span className="text-sm text-stone-600">Ingresos del mes</span>
                    <span className="text-lg font-bold text-stone-900">{money(dashboard?.month_revenue_cents)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: "var(--stone-50)" }}>
                    <span className="text-sm text-stone-600">Ingresos totales (periodo)</span>
                    <span className="text-lg font-bold text-stone-900">{money(revenue?.total_revenue_cents)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: "var(--stone-50)" }}>
                    <span className="text-sm text-stone-600">Tarifa diaria promedio</span>
                    <span className="text-lg font-bold text-stone-900">{money(revenue?.average_daily_rate_cents)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: "var(--stone-50)" }}>
                    <span className="text-sm text-stone-600">RevPAR</span>
                    <span className="text-lg font-bold text-stone-900">{money(revenue?.revpar_cents)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: "var(--stone-50)" }}>
                    <span className="text-sm text-stone-600">Balance pendiente</span>
                    <span className="text-lg font-bold text-stone-900">{money(revenue?.outstanding_balance_cents)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader title="Estadisticas de Huespedes" />
            <CardContent>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
                <div className="p-5 rounded-xl border border-stone-100" style={{ background: "var(--stone-50)" }}>
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Huespedes</p>
                  <p className="mt-2 text-3xl font-bold text-stone-900">{guestStats?.total_guests ?? 0}</p>
                  <p className="mt-1 text-xs text-stone-400">registrados historicamente</p>
                </div>
                <div className="p-5 rounded-xl border border-stone-100" style={{ background: "var(--stone-50)" }}>
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Huespedes Recurrentes</p>
                  <p className="mt-2 text-3xl font-bold text-stone-900">{returningPct}%</p>
                  <p className="mt-1 text-xs text-stone-400">{guestStats?.returning_guests ?? 0} volvieron al hotel</p>
                </div>
                <div className="p-5 rounded-xl border border-stone-100" style={{ background: "var(--stone-50)" }}>
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Estancia Promedio</p>
                  <p className="mt-2 text-3xl font-bold text-stone-900">{Number(guestStats?.average_stay_nights || 0).toFixed(1)}</p>
                  <p className="mt-1 text-xs text-stone-400">noches por huesped</p>
                </div>
                <div className="p-5 rounded-xl" style={{ background: "var(--gold-500)" }}>
                  <p className="text-xs font-semibold text-stone-50 uppercase tracking-wider" style={{ opacity: 0.75 }}>Top Paises</p>
                  <div className="mt-3 space-y-2.5">
                    {countries.slice(0, 4).map((c) => (
                      <div key={c.country}>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: "var(--stone-50)" }}>{c.country}</span>
                          <span className="font-semibold" style={{ color: "var(--stone-50)" }}>{c.count}</span>
                        </div>
                        <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--gold-300)" }}>
                          <div className="h-full rounded-full" style={{ width: `${(c.count / maxCountry) * 100}%`, background: "var(--stone-50)" }} />
                        </div>
                      </div>
                    ))}
                    {countries.length === 0 && (
                      <p className="py-2 text-xs" style={{ color: "var(--stone-50)", opacity: 0.75 }}>Sin datos</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}