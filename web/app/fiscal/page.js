"use client";

import { useState, useEffect } from "react";
import { listFiscalReceipts, createFiscalReceipt, validateRNC, getFiscalSummary } from "@/lib/api";
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardHeader,
  CardContent,
  Input,
  Select,
  LoadingState,
  EmptyState,
  ErrorState,
  useToast,
} from "@/components/ui";

const ncfConfig = {
  B01: { label: "Consumo Final", variant: "success" },
  B02: { label: "Credito Fiscal", variant: "info" },
  B03: { label: "Gobierno", variant: "violet" },
  B04: { label: "Exento", variant: "neutral" },
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
  const toast = useToast();
  const [receipts, setReceipts] = useState([]);
  const [summary, setSummary] = useState({ total_receipts: 0, total_itbis_cents: 0, total_propina_cents: 0, total_revenue_cents: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ reservation_id: "", customer_rnc: "", ncf_type: "B01", subtotal_cents: "" });
  const [rncInput, setRncInput] = useState("");
  const [rncResult, setRncResult] = useState(null);
  const [validating, setValidating] = useState(false);
  const [creating, setCreating] = useState(false);

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
    setCreating(true);
    try {
      await createFiscalReceipt({
        reservation_id: form.reservation_id,
        customer_rnc: form.customer_rnc,
        ncf_type: form.ncf_type,
        subtotal_cents: Number(form.subtotal_cents),
      }, "eden-hotel");
      toast("Comprobante fiscal creado", "success");
      setForm({ reservation_id: "", customer_rnc: "", ncf_type: "B01", subtotal_cents: "" });
      setShowForm(false);
      load();
    } catch (err) {
      toast(err.message || "Error al crear el comprobante", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleValidateRNC(e) {
    e.preventDefault();
    if (!rncInput.trim()) return;
    setValidating(true);
    setRncResult(null);
    try {
      const res = await validateRNC(rncInput.replace(/\D/g, ""), "eden-hotel");
      setRncResult(res);
      toast(res.valid ? "RNC valido ante DGII" : "RNC invalido", res.valid ? "success" : "error");
    } catch (err) {
      setRncResult({ valid: false, rnc: rncInput, name: err.message });
      toast(err.message || "No se pudo validar el RNC", "error");
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
    <div className="animate-fade-in">
      <PageHeader
        title="Fiscal (e-CF)"
        subtitle="Cumplimiento fiscal DGII - Comprobantes Electronicos"
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancelar" : "+ Nuevo Comprobante"}
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <LoadingState label="Cargando datos fiscales..." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {cards.map(c => (
              <Card key={c.label} hover>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{c.label}</p>
                      <p className={`mt-2 font-bold text-slate-900 dark:text-slate-100 ${typeof c.value === "number" ? "text-3xl" : "text-2xl"}`}>{c.value}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${c.color}15` }}>
                      <svg className="w-5 h-5" fill="none" stroke={c.color} strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            <Card>
              <CardHeader title="Validador de RNC" />
              <CardContent>
                <form onSubmit={handleValidateRNC} className="flex gap-3">
                  <Input
                    value={rncInput}
                    onChange={(e) => { setRncInput(e.target.value); setRncResult(null); }}
                    placeholder="RNC (ej. 131123456)"
                    className="flex-1"
                  />
                  <Button type="submit" loading={validating}>
                    {validating ? "Validando..." : "Validar"}
                  </Button>
                </form>
                {rncResult && (
                  <div className={`mt-4 px-4 py-3 rounded-lg text-sm ${
                    rncResult.valid
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                      : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20"
                  }`}>
                    <p className="font-semibold">{rncResult.valid ? "RNC Valido" : "RNC Invalido"}</p>
                    <p className="mt-0.5 font-mono">{formatRNC(rncResult.rnc)}</p>
                    {rncResult.name && <p className="mt-0.5">{rncResult.name}</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Tipos de NCF" />
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(ncfConfig).map(([code, cfg]) => (
                    <div key={code} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <Badge variant={cfg.variant}>{code}</Badge>
                      <span className="text-sm text-slate-600 dark:text-slate-300">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {showForm && (
            <Card className="mb-6 animate-scale-in">
              <CardHeader title="Nuevo Comprobante Fiscal" />
              <CardContent>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Input name="reservation_id" placeholder="ID Reserva" value={form.reservation_id} onChange={handleChange} required />
                  <Input name="customer_rnc" placeholder="RNC Cliente" value={form.customer_rnc} onChange={handleChange} />
                  <Select name="ncf_type" value={form.ncf_type} onChange={handleChange} required>
                    <option value="B01">B01 - Consumo Final</option>
                    <option value="B02">B02 - Credito Fiscal</option>
                    <option value="B03">B03 - Gobierno</option>
                    <option value="B04">B04 - Exento</option>
                  </Select>
                  <Input name="subtotal_cents" type="number" min="0" placeholder="Subtotal (centavos)" value={form.subtotal_cents} onChange={handleChange} required />
                  <Button type="submit" loading={creating}>Crear</Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="overflow-hidden">
            {receipts.length === 0 ? (
              <EmptyState
                icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                title="No hay comprobantes fiscales emitidos"
                description="Los e-CF emitidos apareceran aqui con su desglose de ITBIS y propina legal."
                action={<Button onClick={() => setShowForm(true)}>+ Nuevo Comprobante</Button>}
              />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">NCF</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">RNC Cliente</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subtotal</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ITBIS</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Propina</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map(r => {
                    const nc = ncfConfig[r.ncf_type] || ncfConfig.B01;
                    return (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors dark:border-slate-800 dark:hover:bg-slate-800">
                        <td className="px-5 py-4 text-sm font-mono font-medium text-slate-900 dark:text-slate-100">{r.ncf_number}</td>
                        <td className="px-5 py-4 text-sm font-mono text-slate-600 dark:text-slate-300">{formatRNC(r.customer_rnc)}</td>
                        <td className="px-5 py-4">
                          <Badge variant={nc.variant}>{r.ncf_type} - {nc.label}</Badge>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{formatDOP(r.subtotal_cents)}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{formatDOP(r.itbis_cents)}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{formatDOP(r.propina_cents)}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatDOP(r.total_cents)}</td>
                        <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(r.issued_at).toLocaleDateString("es-DO")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
