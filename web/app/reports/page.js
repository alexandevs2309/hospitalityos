"use client";

import { useState, useEffect, useCallback } from "react";
import { getReportDashboard, getReportOccupancy, getReportRevenue, getReportGuestStats } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  ErrorState,
  FilterPills,
  LoadingState,
  useToast,
} from "@/components/ui";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from "recharts";
import { TrendingUp, DollarSign, Users, Home, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";

const TENANT = "eden-hotel";

const PERIODS = [
  { key: "7d", days: 7, label: "7 días" },
  { key: "30d", days: 30, label: "30 días" },
  { key: "90d", days: 90, label: "90 días" },
];

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const rowHover = {
  onMouseEnter: (e) => { e.currentTarget.style.background = "var(--stone-50)"; },
  onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; },
};

function formatDate(iso) {
  if (!iso) return "-";
  const parts = iso.split("-");
  return `${parts[2]} ${MONTHS[Number(parts[1]) - 1] || ""}`;
}

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

function OccupancyChart({ data }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((item) => ({
    date: formatDate(item.date),
    rate: Number(item.occupancy_rate || 0),
    occupied: item.occupied_rooms || 0,
    total: item.total_rooms || 0,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--gold-500)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--gold-500)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--stone-200)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--stone-400)" }}
            axisLine={{ stroke: "var(--stone-200)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--stone-400)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
            domain={[0, "dataMax + 10"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--stone-900)",
              border: "none",
              borderRadius: "var(--radius)",
              color: "var(--stone-50)",
              fontSize: "var(--text-sm)",
              boxShadow: "var(--shadow-lg)",
            }}
            formatter={(value) => [Number(value).toFixed(1) + "%", "Ocupación"]}
            labelFormatter={(label) => label}
          />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="var(--gold-500)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#occupancyGradient)"
            dot={false}
            activeDot={{ r: 6, fill: "var(--gold-500)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function RevenueChart({ data }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((item) => ({
    date: formatDate(item.date),
    revenue: Math.round((item.revenue_cents || 0) / 100),
    reservations: item.reservations || 0,
  }));

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--stone-200)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--stone-400)" }}
            axisLine={{ stroke: "var(--stone-200)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--stone-400)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
            domain={[0, maxRevenue * 1.2]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--stone-900)",
              border: "none",
              borderRadius: "var(--radius)",
              color: "var(--stone-50)",
              fontSize: "var(--text-sm)",
              boxShadow: "var(--shadow-lg)",
            }}
            formatter={(value, name) => [
              name === "revenue" ? `$${Number(value).toLocaleString()}` : Number(value).toLocaleString(),
              name === "revenue" ? "Ingresos" : "Reservas",
            ]}
            labelFormatter={(label) => label}
          />
          <Bar
            dataKey="revenue"
            radius={[4, 4, 0, 0]}
            barSize={24}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="var(--gold-500)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ReportsPage() {
  const toast = useToast();
  const [periodKey, setPeriodKey] = useState("7d");
  const [dashboard, setDashboard] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [guestStats, setGuestStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const days = PERIODS.find((p) => p.key === periodKey)?.days || 7;

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

  const loadCharts = useCallback(async (d) => {
    const [occ, rev] = await Promise.all([
      getReportOccupancy(TENANT, d),
      getReportRevenue(TENANT, d),
    ]);
    setOccupancy(occ);
    setRevenue(rev);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handlePeriod(key) {
    setPeriodKey(key);
    try {
      await loadCharts(PERIODS.find((p) => p.key === key)?.days || 7);
    } catch (err) {
      toast(err.message || "Error al cargar el período", "error");
    }
  }

  const occData = occupancy?.data || [];
  const revData = revenue?.data || [];
  const countries = guestStats?.top_countries || [];
  const maxRevenue = Math.max(...revData.map((r) => r.revenue_cents || 0), 1);
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
        <FilterPills options={PERIODS.map(({ key, label }) => ({ key, label }))} value={periodKey} onChange={handlePeriod} />
      </div>

      {error && !loading ? (
        <ErrorState message={error} onRetry={loadAll} />
      ) : loading ? (
        <LoadingState label="Cargando reportes..." />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Tasa de Ocupación"
              value={`${Number(dashboard?.occupancy_rate || 0).toFixed(1)}%`}
              sub={`${dashboard?.occupied_rooms ?? 0} de ${dashboard?.total_rooms ?? 0} habitaciones`}
              icon={Home}
              colorClass="text-emerald-600"
            />
            <StatCard
              label="ADR (Tarifa Media)"
              value={money(dashboard?.adr)}
              sub="Ingreso promedio por noche vendida"
              icon={DollarSign}
              colorClass="text-amber-600"
            />
            <StatCard
              label="RevPAR"
              value={money(dashboard?.revpar)}
              sub={`Ingreso por habitación disponible (${dashboard?.available_rooms ?? 0} libres)`}
              icon={TrendingUp}
              colorClass="text-gold-600"
            />
            <StatCard
              label="Ingresos Totales"
              value={money(dashboard?.total_revenue)}
              sub="Histórico acumulado"
              icon={TrendingUp}
              colorClass="text-sky-600"
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader
                title={`Ocupación (${days} días)`}
                action={
                  <div className="text-right">
                    <p className="text-base font-bold text-stone-900">{Number(occupancy?.average || 0).toFixed(1)}%</p>
                    <p className="text-xs text-stone-400">promedio</p>
                  </div>
                }
              />
              <CardContent>
                {occData.length === 0 ? (
                  <EmptyState title="Sin datos de ocupación" description="No hay registros para el período seleccionado" />
                ) : (
                  <OccupancyChart data={occData} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                title={`Ingresos por Día (${days} días)`}
                action={<span className="text-xs text-stone-400">{money(revenue?.total_cents)} en el período</span>}
              />
              <CardContent>
                {revData.length === 0 ? (
                  <EmptyState title="Sin datos de ingresos" description="No hay ventas registradas en el período" />
                ) : (
                  <>
                    <RevenueChart data={revData} />
                    <div className="mt-2 flex justify-between px-1">
                      {revData.filter((_, i) => i % Math.max(1, Math.ceil(revData.length / 10)) === 0).map((item) => (
                        <span key={item.date} className="text-xs text-stone-400">{formatDate(item.date)}</span>
                      ))}
                    </div>
                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-stone-100">
                      <div>
                        <p className="text-xs text-stone-400">Total del período</p>
                        <p className="mt-0.5 text-xl font-bold text-stone-900">{money(revenue?.total_cents)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-stone-400">Promedio diario</p>
                        <p className="mt-0.5 text-xl font-bold text-stone-900">{money(revenue?.average_cents)}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader title="Estadísticas de Huéspedes" />
            <CardContent>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
                <div className="p-5 rounded-xl border border-stone-100" style={{ background: "var(--stone-50)" }}>
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Huéspedes</p>
                  <p className="mt-2 text-3xl font-bold text-stone-900">{guestStats?.total_guests ?? 0}</p>
                  <p className="mt-1 text-xs text-stone-400">registrados históricamente</p>
                </div>
                <div className="p-5 rounded-xl border border-stone-100" style={{ background: "var(--stone-50)" }}>
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Huéspedes Recurrentes</p>
                  <p className="mt-2 text-3xl font-bold text-stone-900">{returningPct}%</p>
                  <p className="mt-1 text-xs text-stone-400">{guestStats?.returning_guests ?? 0} volvieron al hotel</p>
                </div>
                <div className="p-5 rounded-xl border border-stone-100" style={{ background: "var(--stone-50)" }}>
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Estancia Promedio</p>
                  <p className="mt-2 text-3xl font-bold text-stone-900">{Number(guestStats?.avg_stay_nights || 0).toFixed(1)}</p>
                  <p className="mt-1 text-xs text-stone-400">noches por huésped</p>
                </div>
                <div className="p-5 rounded-xl" style={{ background: "var(--gold-500)" }}>
                  <p className="text-xs font-semibold text-stone-50 uppercase tracking-wider" style={{ opacity: 0.75 }}>Top Países</p>
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