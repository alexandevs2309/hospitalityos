"use client";

import { useState, useEffect } from "react";
import { listFiscalReceipts, createFiscalReceipt, validateRNC, getFiscalSummary } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  Select,
  SkeletonTable,
  StatusBadge,
  useToast,
} from "@/components/ui";
import { Plus, FileText, DollarSign, Receipt, CreditCard, Search, CheckCircle, X, Loader2 } from "lucide-react";

const TENANT = "eden-hotel";

const ncfConfig = {
  B01: { label: "Consumo Final", tone: "success" },
  B02: { label: "Crédito Fiscal", tone: "info" },
  B03: { label: "Gobierno", tone: "gold" },
  B04: { label: "Exento", tone: "neutral" },
};

const EMPTY_FORM = { reservation_id: "", rnc: "", ncf_type: "B01", forma_pago: "efectivo" };

function formatDOP(cents) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format((cents || 0) / 100);
}

function formatRNC(rnc) {
  const d = (rnc || "").replace(/\D/g, "");
  if (d.length === 9) return `${d.slice(0, 1)}-${d.slice(1, 3)}-${d.slice(3, 8)}-${d.slice(8)}`;
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 9)}-${d.slice(9)}`;
  return rnc || "-";
}

function StatCard({ label, value, icon: Icon, colorClass }) {
  return (
    <Card className="hover:shadow-md">
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-500">{label}</p>
            <p className="mt-2 truncate text-3xl font-bold text-stone-900" style={{ lineHeight: "var(--leading-tight)" }}>{value}</p>
          </div>
          <div
            className="flex shrink-0 items-center justify-center"
            style={{ width: "40px", height: "40px", borderRadius: "var(--radius-lg)", background: "var(--stone-100)" }}
          >
            {Icon && <Icon className="w-5 h-5" style={{ color: colorClass || "var(--stone-600)" }} strokeWidth={2} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FiscalPage() {
  const toast = useToast();
  const [receipts, setReceipts] = useState([]);
  const [summary, setSummary] = useState({ total_receipts: 0, total_itbis_cents: 0, total_propina_cents: 0, total_revenue_cents: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const [rncInput, setRncInput] = useState("");
  const [rncResult, setRncResult] = useState(null);
  const [validating, setValidating] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [r, s] = await Promise.all([listFiscalReceipts(TENANT), getFiscalSummary(TENANT)]);
      setReceipts(Array.isArray(r) ? r : r.receipts || []);
      setSummary({
        total_receipts: s.total_receipts || 0,
        total_itbis_cents: s.itbis_cents || 0,
        total_propina_cents: s.propina_cents || 0,
        total_revenue_cents: s.total_cents || 0,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await createFiscalReceipt({
        reservation_id: form.reservation_id,
        rnc: form.rnc,
        ncf_type: form.ncf_type,
        forma_pago: form.forma_pago,
      }, TENANT);
      toast("Comprobante fiscal creado", "success");
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
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
      const res = await validateRNC(rncInput.replace(/\D/g, ""), TENANT);
      setRncResult(res);
      toast(res.valid ? "RNC válido ante DGII" : "RNC inválido", res.valid ? "success" : "error");
    } catch (err) {
      setRncResult({ valid: false, rnc: rncInput, name: err.message });
      toast(err.message || "No se pudo validar el RNC", "error");
    } finally {
      setValidating(false);
    }
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

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Fiscal (e-CF)</h1>
          <p className="mt-1 text-sm text-stone-400">Cumplimiento fiscal DGII · Comprobantes Electrónicos</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo Comprobante
        </Button>
      </div>

      {error && !loading ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <>
          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent><div className="animate-shimmer" style={{ height: "48px", borderRadius: "var(--radius)" }} /></CardContent></Card>
            ))}
          </div>
          <SkeletonTable rows={5} cols={8} />
        </>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Comprobantes Emitidos"
              value={summary.total_receipts ?? 0}
              icon={FileText}
              colorClass="text-emerald-600"
            />
            <StatCard label="Total ITBIS" value={formatDOP(summary.total_itbis_cents)} icon={Receipt} colorClass="text-amber-600" />
            <StatCard label="Total Propina" value={formatDOP(summary.total_propina_cents)} icon={CreditCard} colorClass="text-rose-600" />
            <StatCard label="Ingresos Totales" value={formatDOP(summary.total_revenue_cents)} icon={DollarSign} colorClass="text-sky-600" />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
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
                    <Search className="w-4 h-4 mr-1" /> Validar
                  </Button>
                </form>
                {rncResult && (
                  <div
                    className="mt-4 px-4 py-3"
                    style={{
                      borderRadius: "var(--radius)",
                      background: rncResult.valid ? "var(--emerald-50)" : "var(--rose-50)",
                      border: `1px solid ${rncResult.valid ? "var(--emerald-200)" : "var(--rose-200)"}`,
                    }}
                  >
                    <StatusBadge tone={rncResult.valid ? "success" : "danger"} dot>
                      {rncResult.valid ? "RNC Válido" : "RNC Inválido"}
                    </StatusBadge>
                    <p className="mt-2 font-mono text-sm text-stone-900">{formatRNC(rncResult.rnc)}</p>
                    {rncResult.name && (
                      <p className="mt-0.5 text-xs text-stone-600">{rncResult.name}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Tipos de NCF" />
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Object.entries(ncfConfig).map(([code, cfg]) => (
                    <div
                      key={code}
                      className="flex items-center gap-3 px-3 py-2.5"
                      style={{ borderRadius: "var(--radius)", border: "1px solid var(--stone-200)" }}
                    >
                      <Badge tone={cfg.tone}>{code}</Badge>
                      <span className="text-sm text-stone-600">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {receipts.length === 0 ? (
            <Card>
              <EmptyState
                icon={<FileText className="w-12 h-12 text-stone-300" />}
                title="No hay comprobantes fiscales emitidos"
                description="Los e-CF emitidos aparecerán aquí con su desglose de ITBIS y propina legal."
                action={<Button onClick={() => setShowForm(true)}>+ Nuevo Comprobante</Button>}
              />
            </Card>
          ) : (
            <Card style={{ overflow: "hidden" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: "var(--stone-50)", borderBottom: "1px solid var(--stone-200)" }}>
                    <th style={thStyle}>NCF</th>
                    <th style={thStyle}>RNC Cliente</th>
                    <th style={thStyle}>Tipo</th>
                    <th style={thStyle}>Subtotal</th>
                    <th style={thStyle}>ITBIS</th>
                    <th style={thStyle}>Propina</th>
                    <th style={thStyle}>Total</th>
                    <th style={thStyle}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r) => {
                    const nc = ncfConfig[r.ncf_type] || ncfConfig.B01;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid var(--stone-100)" }} {...rowHover}>
                        <td className="font-mono" style={{ ...tdBase, fontWeight: 500, color: "var(--stone-900)" }}>{r.ncf_number}</td>
                        <td className="font-mono" style={{ ...tdBase, color: "var(--stone-600)" }}>{formatRNC(r.customer_rnc)}</td>
                        <td style={tdBase}><Badge tone={nc.tone}>{r.ncf_type} · {nc.label}</Badge></td>
                        <td style={{ ...tdBase, color: "var(--stone-600)" }}>{formatDOP(r.subtotal_cents)}</td>
                        <td style={{ ...tdBase, color: "var(--stone-600)" }}>{formatDOP(r.itbis_cents)}</td>
                        <td style={{ ...tdBase, color: "var(--stone-600)" }}>{formatDOP(r.propina_cents)}</td>
                        <td style={{ ...tdBase, fontWeight: 600, color: "var(--stone-900)" }}>{formatDOP(r.total_cents)}</td>
                        <td style={{ ...tdBase, color: "var(--stone-400)" }}>{new Date(r.issued_at).toLocaleDateString("es-DO")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo Comprobante Fiscal">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="f-res" className="mb-1.5 block text-xs font-medium text-stone-600">ID Reserva *</label>
            <Input id="f-res" name="reservation_id" placeholder="ID de la reserva" value={form.reservation_id} onChange={handleChange} required />
          </div>
          <div>
            <label htmlFor="f-rnc" className="mb-1.5 block text-xs font-medium text-stone-600">RNC Cliente</label>
            <Input id="f-rnc" name="rnc" placeholder="131123456 (opcional para consumo final)" value={form.rnc} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="f-ncf" className="mb-1.5 block text-xs font-medium text-stone-600">Tipo NCF *</label>
              <Select id="f-ncf" name="ncf_type" value={form.ncf_type} onChange={handleChange} required>
                {Object.entries(ncfConfig).map(([code, cfg]) => (
                  <option key={code} value={code}>{code} - {cfg.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="f-pago" className="mb-1.5 block text-xs font-medium text-stone-600">Forma de Pago *</label>
              <Select id="f-pago" name="forma_pago" value={form.forma_pago} onChange={handleChange} required>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" loading={creating}>Emitir Comprobante</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}