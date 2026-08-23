"use client";

import { useState, useEffect } from "react";
import { runNightAudit, getNightAuditHistory } from "@/lib/api";

const statusConfig = {
  completed: { label: "Completada", color: "text-emerald-700 bg-emerald-50" },
  running: { label: "En Proceso", color: "text-amber-700 bg-amber-50" },
  failed: { label: "Fallida", color: "text-rose-700 bg-rose-50" },
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export default function NightAuditPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [runDate, setRunDate] = useState(todayStr());
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      setHistory(await getNightAuditHistory("eden-hotel"));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRun() {
    setRunning(true);
    setMessage(null);
    try {
      const data = await runNightAudit("eden-hotel", runDate);
      setResult(data);
      setMessage({ type: "success", text: `Cierre completado para ${data.run_date}` });
      setConfirming(false);
      load();
    } catch (err) {
      if (err.message && err.message.includes("already run")) {
        setMessage({ type: "error", text: `Ya se ejecuto la auditoria nocturna para ${runDate}. Selecciona otra fecha.` });
      } else {
        setMessage({ type: "error", text: err.message });
      }
    } finally {
      setRunning(false);
    }
  }

  const lastRun = history[0];
  const sc = lastRun ? (statusConfig[lastRun.status] || statusConfig.running) : null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>Auditoria Nocturna</h1>
        <p className="text-slate-500 mt-1">Cierre de dia y publicacion de cargos nocturnos</p>
      </div>

      {loadError && (
        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={load} className="px-3 py-1.5 bg-white border border-rose-200 rounded-md text-xs font-medium hover:bg-rose-100">Reintentar</button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
          </div>
        </div>
      ) : (
        lastRun && (
          <div className="bg-brand-600 rounded-xl p-6 mb-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>Ultimo Cierre</h2>
                <p className="text-brand-100 text-sm mt-0.5">Dia operativo del {formatDate(lastRun.run_date)}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-xs text-brand-100 uppercase tracking-wider">Reservas Procesadas</p>
                <p className="text-2xl font-bold mt-1">{lastRun.reservations_processed}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-xs text-brand-100 uppercase tracking-wider">Cargos Publicados</p>
                <p className="text-2xl font-bold mt-1">{formatMoney(lastRun.charges_posted)}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-xs text-brand-100 uppercase tracking-wider">Ingresos Totales</p>
                <p className="text-2xl font-bold mt-1">{formatMoney(lastRun.total_revenue)}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-xs text-brand-100 uppercase tracking-wider">Completado</p>
                <p className="text-sm font-medium mt-2">{formatDateTime(lastRun.completed_at)}</p>
              </div>
            </div>
          </div>
        )
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>Ejecutar Cierre de Dia</h2>
        {!confirming ? (
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Fecha del cierre</label>
              <input type="date" value={runDate} onChange={e => setRunDate(e.target.value)} max={todayStr()} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
            </div>
            <button onClick={() => { setMessage(null); setConfirming(true); }} disabled={running} className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
              Ejecutar Auditoria Nocturna
            </button>
          </div>
        ) : (
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
            <p className="text-sm text-amber-800 mb-1 font-medium">Confirmar cierre del {formatDate(runDate)}</p>
            <p className="text-sm text-amber-700 mb-4">Se publicara el cargo nocturno en el folio de cada reserva in-house y se cerrara el dia operativo. Esta accion no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={handleRun} disabled={running} className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
                {running ? "Ejecutando..." : "Confirmar Ejecucion"}
              </button>
              <button onClick={() => setConfirming(false)} disabled={running} className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className={`mt-4 px-4 py-3 rounded-lg text-sm font-medium ${message.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
            {message.text}
          </div>
        )}

        {result && (
          <div className="mt-4 border border-emerald-200 bg-emerald-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-3">Resultado del Cierre</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <p className="text-xs text-emerald-700">Run ID</p>
                <p className="text-sm font-mono text-slate-900">{result.run_id.slice(0, 8)}...</p>
              </div>
              <div>
                <p className="text-xs text-emerald-700">Reservas Procesadas</p>
                <p className="text-sm font-semibold text-slate-900">{result.reservations_processed}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-700">Cargos Publicados</p>
                <p className="text-sm font-semibold text-slate-900">{formatMoney(result.charges_posted)}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-700">Ingresos Totales</p>
                <p className="text-sm font-semibold text-slate-900">{formatMoney(result.total_revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-700">Estado</p>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${(statusConfig[result.status] || statusConfig.running).color}`}>
                  {(statusConfig[result.status] || statusConfig.running).label}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>Historial de Cierres</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reservas Procesadas</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargos Publicados</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ingresos Totales</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Completado</th>
            </tr>
          </thead>
          <tbody>
            {history.map(r => {
              const s = statusConfig[r.status] || statusConfig.running;
              return (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-slate-900">{formatDate(r.run_date)}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{r.reservations_processed}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{formatMoney(r.charges_posted)}</td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-900">{formatMoney(r.total_revenue)}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{formatDateTime(r.completed_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {history.length === 0 && !loading && (
          <div className="p-16 text-center text-slate-400">No hay cierres registrados</div>
        )}
      </div>
    </div>
  );
}
