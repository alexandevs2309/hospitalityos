"use client";

import { useState, useEffect } from "react";
import { runNightAudit, getNightAuditHistory } from "@/lib/api";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  SkeletonCard,
  SkeletonTable,
  StatusBadge,
  useToast,
} from "@/components/ui";
import { Moon, Calendar, DollarSign, CheckCircle, AlertCircle, Loader2, Play, X, Trash2, RefreshCw } from "lucide-react";

const TENANT = "eden-hotel";

const statusConfig = {
  completed: { label: "Completada", tone: "success" },
  running: { label: "En Proceso", tone: "warning" },
  failed: { label: "Fallida", tone: "danger" },
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(cents) {
  return `$${((cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const thStyle = {
  textAlign: "left",
  padding: "10px 20px",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--stone-500)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdBase = { padding: "14px 20px", fontSize: "var(--text-sm)" };

const rowHover = {
  onMouseEnter: (e) => { e.currentTarget.style.background = "var(--stone-50)"; },
  onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; },
};

function BannerStat({ label, value }) {
  return (
    <div style={{ background: "var(--stone-800)", borderRadius: "var(--radius)", padding: "14px 16px" }}>
      <p className="text-xs text-stone-400 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-xl font-bold text-stone-50">{value}</p>
    </div>
  );
}

export default function NightAuditPage() {
  const toast = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [runDate, setRunDate] = useState(todayStr());
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getNightAuditHistory(TENANT);
      setHistory(Array.isArray(res) ? res : res.runs || []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRun() {
    setRunning(true);
    try {
      const data = await runNightAudit(TENANT, runDate);
      setResult(data);
      setConfirming(false);
      toast(`Cierre completado para ${data.run_date}`, "success");
      await load();
    } catch (err) {
      if (err.message && err.message.includes("already run")) {
        toast(`Ya se ejecutó la auditoría para ${runDate}. Selecciona otra fecha.`, "error");
      } else {
        toast(err.message || "Error al ejecutar la auditoría", "error");
      }
    } finally {
      setRunning(false);
    }
  }

  const lastRun = history[0];
  const lastStatus = lastRun ? (statusConfig[lastRun.status] || statusConfig.running) : null;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Auditoría Nocturna</h1>
        <p className="mt-1 text-sm text-stone-400">Cierre de día y publicación de cargos nocturnos</p>
      </div>

      {loadError && !loading ? (
        <Card className="mb-6">
          <ErrorState message={loadError} onRetry={load} />
        </Card>
      ) : loading ? (
        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2"><SkeletonCard /></div>
          <SkeletonCard />
        </div>
      ) : (
        lastRun && (
          <Card className="mb-6" style={{ background: "var(--stone-900)", borderColor: "var(--stone-900)" }}>
            <CardContent>
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-50">Último Cierre</h2>
                  <p className="mt-0.5 text-sm text-stone-400">Día operativo del {formatDate(lastRun.run_date)}</p>
                </div>
                <StatusBadge tone={lastStatus.tone} dot>{lastStatus.label}</StatusBadge>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <BannerStat label="Reservas Procesadas" value={lastRun.reservations_processed ?? 0} />
                <BannerStat label="Cargos Publicados" value={formatMoney(lastRun.charges_posted)} />
                <BannerStat label="Ingresos Totales" value={formatMoney(lastRun.total_revenue)} />
                <BannerStat label="Completado" value={formatDateTime(lastRun.completed_at)} />
              </div>
            </CardContent>
          </Card>
        )
      )}

      <Card className="mb-6">
        <CardHeader title="Ejecutar Cierre de Día" />
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="run-date" className="mb-1.5 block text-xs font-medium text-stone-600">
                Fecha del cierre
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input id="run-date" type="date" size="md" value={runDate} max={todayStr()} onChange={(e) => setRunDate(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Button onClick={() => setConfirming(true)} disabled={running}>
              <Play className="w-4 h-4 mr-1" /> Ejecutar Auditoría Nocturna
            </Button>
          </div>

          {result && (
            <div className="mt-6 border-t border-stone-100 pt-6">
              <p className="mb-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Resultado del Cierre
              </p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <div>
                  <p className="text-xs text-stone-400">Run ID</p>
                  <p className="mt-0.5 font-mono text-sm text-stone-900">{result.run_id?.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400">Reservas Procesadas</p>
                  <p className="mt-0.5 text-sm font-semibold text-stone-900">{result.reservations_processed ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400">Cargos Publicados</p>
                  <p className="mt-0.5 text-sm font-semibold text-stone-900">{formatMoney(result.charges_posted)}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400">Ingresos Totales</p>
                  <p className="mt-0.5 text-sm font-semibold text-stone-900">{formatMoney(result.total_revenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400">Estado</p>
                  <div className="mt-1">
                    <StatusBadge tone={(statusConfig[result.status] || statusConfig.running).tone}>
                      {(statusConfig[result.status] || statusConfig.running).label}
                    </StatusBadge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="mb-4 text-lg font-semibold text-stone-900">Historial de Cierres</h2>

      {loadError && !loading ? null : loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : history.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Moon className="w-12 h-12 text-stone-300" />}
            title="No hay cierres registrados"
            description="Ejecuta la auditoría nocturna para generar el primer cierre de día."
          />
        </Card>
      ) : (
        <Card style={{ overflow: "hidden" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--stone-50)", borderBottom: "1px solid var(--stone-200)" }}>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Reservas Procesadas</th>
                <th style={thStyle}>Cargos Publicados</th>
                <th style={thStyle}>Ingresos Totales</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Completado</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => {
                const s = statusConfig[r.status] || statusConfig.running;
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--stone-100)" }} {...rowHover}>
                    <td style={{ ...tdBase, fontWeight: 500, color: "var(--stone-900)" }}>{formatDate(r.run_date)}</td>
                    <td style={{ ...tdBase, color: "var(--stone-600)" }}>{r.reservations_processed ?? 0}</td>
                    <td style={{ ...tdBase, color: "var(--stone-600)" }}>{formatMoney(r.charges_posted)}</td>
                    <td style={{ ...tdBase, fontWeight: 600, color: "var(--stone-900)" }}>{formatMoney(r.total_revenue)}</td>
                    <td style={tdBase}><StatusBadge tone={s.tone}>{s.label}</StatusBadge></td>
                    <td style={{ ...tdBase, color: "var(--stone-600)" }}>{formatDateTime(r.completed_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={confirming} onClose={() => !running && setConfirming(false)} title="Confirmar Cierre de Día">
        <p className="text-sm text-stone-600 leading-relaxed">
          Se publicará el cargo nocturno en el folio de cada reserva in-house y se cerrará el día operativo del{" "}
          <span className="font-semibold text-stone-900">{formatDate(runDate)}</span>.
        </p>
        <p className="mt-2 text-xs text-stone-400">Esta acción no se puede deshacer.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirming(false)} disabled={running}>Cancelar</Button>
          <Button onClick={handleRun} loading={running}>
            {running ? "Ejecutando..." : "Confirmar Ejecución"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}