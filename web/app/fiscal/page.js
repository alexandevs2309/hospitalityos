"use client";

import { useState, useEffect } from "react";
import { listFiscalReceipts, createFiscalReceipt, validateRNC, getFiscalSummary } from "@/lib/api";

const ncfConfig = {
  B01: { label: "Consumo Final", color: "text-emerald-700 bg-emerald-50 border border-emerald-200" },
  B02: { label: "Credito Fiscal", color: "text-brand-700 bg-brand-50 border border-brand-200" },
  B03: { label: "Gobierno", color: "text-violet-700 bg-violet-50 border border-violet-200" },
  B04: { label: "Exento", color: "text-slate-600 bg-slate-100 border border-slate-200" },
};

function formatDOP(cents) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format((cents || 0) / 100);
}

function formatRNC(rnc) {
  const d = (rnc || "").replace(/\D/g, "");
  if (d.length === 9) return `${d.slice(0, 1)}-${d.slice(1, 3)}-${d.slice(3, 8)}-${d.slice(8)}`;
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 9)}-${d.slice(9)}`;
  return rnc || "-";
}

export default function FiscalPage() {
  const [receipts, setReceipts] = useState([]);
  const [summary, setSummary] = useState({ total_receipts: 0, total_itbis_cents: 0, total_propina_cents: 0, total_revenue_cents: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ reservation_id: "", customer_rnc: "", ncf_type: "B01", subtotal_cents: "" });
  const [rncInput, setRncInput] = useState("");
  const [rncResult, setRncResult] = useState(null);
  const [validating, setValidating] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [r, s] = await Promise.all([listFiscalReceipts("eden-hotel"), getFiscalSummary("eden-hotel")]);
      setReceipts(r);
      setSummary(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await createFiscalReceipt({
        reservation_id: form.reservation_id,
        customer_rnc: form.customer_rnc,
        ncf_type: form.ncf_type,
        subtotal_cents: Number(form.subtotal_cents),
      }, "eden-hotel");
      setMessage({ type: "success", text: "Comprobante fiscal creado" });
      setForm({ reservation_id: "", customer_rnc: "", ncf_type: "B01", subtotal_cents: "" });
      setShowForm(false);
      load();
    } catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  async function handleValidateRNC(e) {
    e.preventDefault();
    if (!rncInput.trim()) return;
    setMessage(null);
    setValidating(true);
    setRncResult(null);
    try {
      const res = await validateRNC(rncInput.replace(/\D/g, ""), "eden-hotel");
      setRncResult(res);
    } catch (err) {
      setRncResult({ valid: false, rnc: rncInput, name: err.message });
    } finally {
      setValidating(false);
    }
  }

  const cards = [
    { label: "Comprobantes", value: summary.total_receipts, color: "#1a6bf5", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { label: "Total ITBIS", value: formatDOP(summary.total_itbis_cents), color: "#10b981", icon: "M9 7h6m-5 4h6m-7 8l8-8M9 12l6 6m-3-9a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Total Propina", value: formatDOP(summary.total_propina_cents), color: "#f59e0b", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Ingresos Totales", value: formatDOP(summary.total_revenue_cents), color: "#8b5cf6", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>Fiscal (e-CF)</h1>
          <p className="text-slate-500 mt-1">Cumplimiento fiscal DGII - Comprobantes Electronicos</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          {showForm ? "Cancelar" : "+ Nuevo Comprobante"}
        </button>
      </div>

      {(error || message) && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${error || message.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          {error || message.text}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Cargando datos fiscales...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {cards.map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{c.label}</p>
                    <p className={`mt-2 font-bold ${typeof c.value === "number" ? "text-3xl" : "text-2xl"} text-slate-900`}>{c.value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${c.color}15` }}>
                    <svg className="w-5 h-5" fill="none" stroke={c.color} strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>Validador de RNC</h2>
              <form onSubmit={handleValidateRNC} className="flex gap-3">
                <input value={rncInput} onChange={(e) => { setRncInput(e.target.value); setRncResult(null); }} placeholder="RNC (ej. 131123456)" className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
                <button type="submit" disabled={validating} className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
                  {validating ? "Validando..." : "Validar"}
                </button>
              </form>
              {rncResult && (
                <div className={`mt-4 px-4 py-3 rounded-lg text-sm ${rncResult.valid ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                  <p className="font-semibold">{rncResult.valid ? "RNC Valido" : "RNC Invalido"}</p>
                  <p className="mt-0.5 font-mono">{formatRNC(rncResult.rnc)}</p>
                  {rncResult.name && <p className="mt-0.5">{rncResult.name}</p>}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>Tipos de NCF</h2>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(ncfConfig).map(([code, cfg]) => (
                  <div key={code} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${cfg.color}`}>{code}</span>
                    <span className="text-sm text-slate-600">{cfg.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Nuevo Comprobante Fiscal</h2>
              <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <input name="reservation_id" placeholder="ID Reserva" value={form.reservation_id} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
                <input name="customer_rnc" placeholder="RNC Cliente" value={form.customer_rnc} onChange={handleChange} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
                <select name="ncf_type" value={form.ncf_type} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
                  <option value="B01">B01 - Consumo Final</option>
                  <option value="B02">B02 - Credito Fiscal</option>
                  <option value="B03">B03 - Gobierno</option>
                  <option value="B04">B04 - Exento</option>
                </select>
                <input name="subtotal_cents" type="number" min="0" placeholder="Subtotal (centavos)" value={form.subtotal_cents} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
                <button type="submit" className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">Crear</button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">NCF</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">RNC Cliente</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subtotal</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ITBIS</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Propina</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => {
                  const nc = ncfConfig[r.ncf_type] || ncfConfig.B01;
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-mono font-medium text-slate-900">{r.ncf_number}</td>
                      <td className="px-5 py-4 text-sm font-mono text-slate-600">{formatRNC(r.customer_rnc)}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${nc.color}`}>{r.ncf_type} - {nc.label}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{formatDOP(r.subtotal_cents)}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{formatDOP(r.itbis_cents)}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{formatDOP(r.propina_cents)}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatDOP(r.total_cents)}</td>
                      <td className="px-5 py-4 text-sm text-slate-500">{new Date(r.issued_at).toLocaleDateString("es-DO")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {receipts.length === 0 && (
              <div className="p-16 text-center text-slate-400">No hay comprobantes fiscales emitidos</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
