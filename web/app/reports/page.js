"use client";

import { useState, useEffect, useCallback } from "react";
import { getReportDashboard, getReportOccupancy, getReportRevenue, getReportGuestStats } from "@/lib/api";

const TENANT = "eden-hotel";
const PERIODS = [
  { days: 7, label: "7 días" },
  { days: 30, label: "30 días" },
  { days: 90, label: "90 días" },
];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatDate(iso) {
  if (!iso) return "-";
  const parts = iso.split("-");
  const m = MONTHS[Number(parts[1]) - 1] || "";
  return `${parts[2]} ${m}`;
}

function money(cents) {
  return `$${((cents || 0) / 100).toLocaleString("en-US")}`;
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-3xl font-bold mt-2" style={{ fontFamily: "var(--font-display)" }}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <svg className="w-5 h-5" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [days, setDays] = useState(7);
  const [dashboard, setDashboard] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [guestStats, setGuestStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCharts = useCallback(async (d) => {
    const [occ, rev] = await Promise.all([
      getReportOccupancy(TENANT, d),
      getReportRevenue(TENANT, d),
    ]);
    setOccupancy(occ);
    setRevenue(rev);
  }, []);

  useEffect(() => {
    async function load() {
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
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  async function handlePeriod(d) {
    setDays(d);
    setError(null);
    try {
      await loadCharts(d);
    } catch (err) { setError(err.message); }
  }

  const occData = occupancy?.data || [];
  const revData = revenue?.data || [];
  const maxRevenue = Math.max(...revData.map(r => r.revenue_cents || 0), 1);
  const maxCountry = Math.max(...(guestStats?.top_countries || []).map(c => c.count), 1);
  const labelEvery = Math.max(1, Math.ceil(revData.length / 10));
  const returningPct = guestStats && guestStats.total_guests > 0
    ? Math.round((guestStats.returning_guests / guestStats.total_guests) * 100)
    : 0;

  return (
    <div>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>Reportes y Analíticas</h1>
          <p className="text-slate-500 mt-1">Rendimiento del hotel en tiempo real</p>
        </div>
        <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1">
          {PERIODS.map(p => (
            <button
              key={p.days}
              onClick={() => handlePeriod(p.days)}
              disabled={loading}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${days === p.days ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                <div className="h-3 w-24 bg-slate-100 rounded mb-4" />
                <div className="h-7 w-20 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-slate-200 p-6 h-72 animate-pulse" />
            <div className="bg-white rounded-xl border border-slate-200 p-6 h-72 animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              label="Tasa de Ocupación"
              value={`${Number(dashboard?.occupancy_rate || 0).toFixed(1)}%`}
              sub={`${dashboard?.occupied_rooms ?? 0} de ${dashboard?.total_rooms ?? 0} habitaciones`}
              color="#1a6bf5"
              icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
            <StatCard
              label="ADR (Tarifa Media)"
              value={money(dashboard?.adr)}
              sub="Ingreso promedio por noche vendida"
              color="#8b5cf6"
              icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <StatCard
              label="RevPAR"
              value={money(dashboard?.revpar)}
              sub={`Ingreso por habitación disponible (${dashboard?.available_rooms ?? 0} libres)`}
              color="#f59e0b"
              icon="M13 10V3L4 14h7v7l9-11h-7z"
            />
            <StatCard
              label="Ingresos Totales"
              value={money(dashboard?.total_revenue)}
              sub="Histórico acumulado"
              color="#10b981"
              icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
                  Ocupación ({days} días)
                </h2>
                <div className="text-right">
                  <p className="text-sm font-bold text-brand-600">{Number(occupancy?.average || 0).toFixed(1)}%</p>
                  <p className="text-xs text-slate-400">promedio</p>
                </div>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {occData.map(item => (
                  <div key={item.date} className="flex items-center gap-3">
                    <span className="w-14 text-xs text-slate-400 shrink-0">{formatDate(item.date)}</span>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(item.occupancy_rate || 0, 100)}%`,
                          backgroundColor: item.occupancy_rate >= 80 ? "#10b981" : item.occupancy_rate >= 50 ? "#1a6bf5" : "#f59e0b",
                        }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs font-medium text-slate-600 shrink-0">{Number(item.occupancy_rate || 0).toFixed(0)}%</span>
                  </div>
                ))}
                {occData.length === 0 && <p className="text-sm text-slate-400 py-8 text-center">Sin datos de ocupación</p>}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
                  Ingresos por Día ({days} días)
                </h2>
                <span className="text-xs text-slate-400">pasa el cursor sobre las barras</span>
              </div>
              <div className="flex items-end gap-1 h-44">
                {revData.map((item, i) => (
                  <div
                    key={item.date}
                    className="flex-1 h-full flex flex-col justify-end min-w-[4px]"
                    title={`${formatDate(item.date)}: ${money(item.revenue_cents)} · ${item.reservations} reserva${item.reservations !== 1 ? "s" : ""}`}
                  >
                    <div
                      className="w-full bg-brand-500 hover:bg-brand-600 rounded-t transition-colors duration-150"
                      style={{ height: `${Math.max((item.revenue_cents / maxRevenue) * 100, 2)}%`, opacity: i % labelEvery === 0 ? 1 : 0.75 }}
                    />
                  </div>
                ))}
                {revData.length === 0 && <p className="text-sm text-slate-400 w-full text-center py-16">Sin datos de ingresos</p>}
              </div>
              <div className="flex justify-between mt-2 pl-1 pr-1">
                {revData.filter((_, i) => i % labelEvery === 0).map(item => (
                  <span key={item.date} className="text-[10px] text-slate-400">{formatDate(item.date)}</span>
                ))}
              </div>
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-400">Total del período</p>
                  <p className="text-xl font-bold text-slate-900">{money(revenue?.total_cents)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Promedio diario</p>
                  <p className="text-xl font-bold text-brand-600">{money(revenue?.average_cents)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6" style={{ fontFamily: "var(--font-display)" }}>Estadísticas de Huéspedes</h2>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              <div className="p-5 rounded-lg bg-slate-50">
                <p className="text-xs font-medium text-slate-500">Total Huéspedes</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{guestStats?.total_guests ?? 0}</p>
                <p className="text-xs text-slate-400 mt-1">registrados históricamente</p>
              </div>
              <div className="p-5 rounded-lg bg-slate-50">
                <p className="text-xs font-medium text-slate-500">Huéspedes Recurrentes</p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">{returningPct}%</p>
                <p className="text-xs text-slate-400 mt-1">{guestStats?.returning_guests ?? 0} volvieron al hotel</p>
              </div>
              <div className="p-5 rounded-lg bg-slate-50">
                <p className="text-xs font-medium text-slate-500">Estancia Promedio</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{Number(guestStats?.avg_stay_nights || 0).toFixed(1)}</p>
                <p className="text-xs text-slate-400 mt-1">noches por huésped</p>
              </div>
              <div className="p-5 rounded-lg bg-brand-600 text-white">
                <p className="text-xs font-medium text-blue-100">Top Países</p>
                <div className="mt-2 space-y-2">
                  {(guestStats?.top_countries || []).slice(0, 4).map(c => (
                    <div key={c.country}>
                      <div className="flex justify-between text-xs">
                        <span>{c.country}</span>
                        <span className="font-semibold">{c.count}</span>
                      </div>
                      <div className="mt-1 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full" style={{ width: `${(c.count / maxCountry) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  {(guestStats?.top_countries || []).length === 0 && <p className="text-xs text-blue-100 py-2">Sin datos</p>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
