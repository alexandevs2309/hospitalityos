"use client";

import { useState, useEffect } from "react";
import { listRooms, listReservations, listGuests } from "@/lib/api";
import { Card, CardContent, CardHeader, Button, Skeleton, SkeletonCard, LoadingState, ErrorState, PageHeader } from "@/components/ui";

function StatCard({ label, value, sub, color, icon }) {
  return (
    <Card hover>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-3xl font-bold mt-2" style={{ color }}>{value}</p>
            {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
            <svg className="w-5 h-5" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
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
          floor: f,
          total: d.total,
          occupied: d.occupied,
          pct: d.total > 0 ? Math.round((d.occupied / d.total) * 100) : 0,
        })));
      } catch (e) {
        setError(e.message || "No se pudo cargar el dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const occRate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Dashboard" description="Vista general del hotel" />

      {error && !loading && (
        <Card className="mb-8">
          <ErrorState message={error} />
        </Card>
      )}

      {!error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <StatCard label="Total Habitaciones" value={stats.total} color="#1a6bf5" icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                <StatCard label="Disponibles" value={stats.available} sub={`${occRate}% ocupacion`} color="#10b981" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                <StatCard label="Ocupadas" value={stats.occupied} color="#f59e0b" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                <StatCard label="Reservas Activas" value={stats.reservations} color="#8b5cf6" icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
            <Card className="lg:col-span-2 dark:bg-slate-900 dark:border-slate-800">
              <CardHeader title="Ocupacion por Piso" />
              <CardContent className="pt-0">
                {loading ? (
                  <div className="space-y-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-10" />
                        </div>
                        <Skeleton className="h-2 w-full rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : floorData.length > 0 ? (
                  <div className="space-y-4">
                    {floorData.map((f) => (
                      <div key={f.floor}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600 dark:text-slate-300">Piso {f.floor}</span>
                          <span className="text-slate-400 dark:text-slate-500">{f.pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${f.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500">Sin datos de pisos</p>
                )}
              </CardContent>
            </Card>

            <Card hover className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4" style={{ fontFamily: "var(--font-display)" }}>Acciones Rapidas</h2>
                <div className="space-y-3">
                  <Button href="/rooms" variant="primary" className="w-full">Gestionar Habitaciones</Button>
                  <Button href="/reservations" variant="success" className="w-full">Nueva Reserva</Button>
                  <Button href="/availability" variant="info" className="w-full">Ver Disponibilidad</Button>
                  <Button href="/guests" variant="warning" className="w-full">Registrar Huesped</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader title="Resumen" />
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.guests}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Huespedes registrados</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.cleaning}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">En limpieza</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.maintenance}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">En mantenimiento</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">100%</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Sistema operativo</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader title="Estado del Sistema" />
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {[
                    { name: "API Backend", status: "online", port: ":8081" },
                    { name: "Frontend", status: "online", port: ":3001" },
                    { name: "PostgreSQL", status: "online", port: ":5432" },
                    { name: "Event Store", status: "online", port: "PG" },
                  ].map((s) => (
                    <div key={s.name} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{s.port}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
