"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFolio, addFolioEntry, closeFolio } from "@/lib/api";
import { Button, Card, CardContent, Input, Select, LoadingState, ErrorState, useToast } from "@/components/ui";
import {
  ArrowLeft, Plus, DollarSign, CreditCard, AlertTriangle,
} from "lucide-react";

const ENTRY_TYPES = [
  { value: "charge", label: "Cargo" },
  { value: "payment", label: "Pago" },
  { value: "adjustment", label: "Ajuste" },
  { value: "refund", label: "Reembolso" },
  { value: "deposit", label: "Deposito" },
  { value: "transfer", label: "Transferencia" },
];

const TYPE_STYLES = {
  charge: { color: "var(--rose-600)", bg: "var(--rose-50)" },
  payment: { color: "var(--emerald-600)", bg: "var(--emerald-50)" },
  adjustment: { color: "var(--amber-600)", bg: "var(--amber-50)" },
  refund: { color: "var(--sky-600)", bg: "var(--sky-50)" },
  deposit: { color: "var(--violet-600)", bg: "var(--violet-50)" },
  transfer: { color: "var(--stone-600)", bg: "var(--stone-100)" },
};

const TYPE_LABELS = {
  charge: "Cargo", payment: "Pago", adjustment: "Ajuste",
  refund: "Reembolso", deposit: "Deposito", transfer: "Transferencia",
};

function formatMoney(cents, currency = "DOP") {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency }).format(cents / 100);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-DO", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function FolioPage() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [folio, setFolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "charge", description: "", amount_cents: "", currency: "DOP" });
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getFolio(id, "eden-hotel");
      setFolio(data);
    } catch (err) {
      setError(err.message || "Error al cargar el folio");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

  async function handleAddEntry(e) {
    e.preventDefault();
    const cents = parseInt(form.amount_cents, 10);
    if (!form.description.trim() || isNaN(cents) || cents === 0) {
      toast("Descripcion y monto requeridos", "error");
      return;
    }
    setSubmitting(true);
    try {
      await addFolioEntry(id, { ...form, amount_cents: Math.abs(cents) }, "eden-hotel");
      setForm({ type: "charge", description: "", amount_cents: "", currency: "DOP" });
      setShowForm(false);
      toast("Entrada agregada", "success");
      load();
    } catch (err) {
      toast(err.message || "Error al agregar entrada", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose() {
    if (!confirm("Cerrar este folio? El balance debe ser cero.")) return;
    setClosing(true);
    try {
      await closeFolio(id, {}, "eden-hotel");
      toast("Folio cerrado", "success");
      load();
    } catch (err) {
      toast(err.message || "Error al cerrar folio", "error");
    } finally {
      setClosing(false);
    }
  }

  if (loading) return <LoadingState label="Cargando folio..." />;
  if (error && !folio) return <Card><ErrorState message={error} onRetry={load} /></Card>;
  if (!folio) return null;

  const { entries = [], balance = 0, total_charges = 0, total_payments = 0, closed = false } = folio;

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1"
        style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--stone-500)", background: "none", border: "none", cursor: "pointer" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--stone-900)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--stone-500)"; }}
      >
        <ArrowLeft size={14} /> Volver
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--stone-900)" }}>
            Folio
          </h1>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--stone-400)" }}>
            Reservacion {id?.slice(0, 8)}...
            {closed && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "var(--stone-200)", color: "var(--stone-700)" }}>Cerrado</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {!closed && (
            <>
              <Button onClick={() => setShowForm(!showForm)} icon={Plus} variant="primary">
                Agregar Entrada
              </Button>
              <Button onClick={handleClose} icon={AlertTriangle} variant="danger" disabled={balance !== 0 || closing}>
                {closing ? "Cerrando..." : "Cerrar Folio"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: "var(--rose-50)" }}>
                <DollarSign size={18} style={{ color: "var(--rose-600)" }} />
              </div>
              <div>
                <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--stone-500)", textTransform: "uppercase" }}>Total Cargos</p>
                <p style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--rose-600)" }}>{formatMoney(total_charges)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: "var(--emerald-50)" }}>
                <CreditCard size={18} style={{ color: "var(--emerald-600)" }} />
              </div>
              <div>
                <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--stone-500)", textTransform: "uppercase" }}>Total Pagos</p>
                <p style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--emerald-600)" }}>{formatMoney(total_payments)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: balance > 0 ? "var(--amber-50)" : balance < 0 ? "var(--sky-50)" : "var(--stone-100)" }}>
                <DollarSign size={18} style={{ color: balance > 0 ? "var(--amber-600)" : balance < 0 ? "var(--sky-600)" : "var(--stone-500)" }} />
              </div>
              <div>
                <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--stone-500)", textTransform: "uppercase" }}>Balance</p>
                <p style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: balance > 0 ? "var(--amber-600)" : balance < 0 ? "var(--sky-600)" : "var(--stone-900)" }}>
                  {formatMoney(balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showForm && !closed && (
        <Card className="mb-6" style={{ borderColor: "var(--gold-200)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--stone-100)" }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--stone-900)" }}>Nueva Entrada</h2>
          </div>
          <CardContent>
            <form onSubmit={handleAddEntry} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--stone-500)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Tipo</label>
                <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {ENTRY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--stone-500)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Descripcion</label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ej. Room service, Minibar..." required />
              </div>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--stone-500)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Monto (centavos)</label>
                <Input type="number" value={form.amount_cents} onChange={e => setForm({ ...form, amount_cents: e.target.value })} placeholder="15000" required />
              </div>
              <div className="sm:col-span-4 flex gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Agregando..." : "Agregar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--stone-100)" }}>
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--stone-900)" }}>
            Movimientos ({entries.length})
          </h2>
        </div>
        {entries.length === 0 ? (
          <CardContent>
            <p style={{ textAlign: "center", color: "var(--stone-400)", fontSize: "var(--text-sm)", padding: "32px 0" }}>
              Sin movimientos en este folio
            </p>
          </CardContent>
        ) : (
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--stone-100)" }}>
                  {["Tipo", "Descripcion", "Monto", "Fecha"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--stone-500)", textTransform: "uppercase", fontSize: "var(--text-xs)", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const style = TYPE_STYLES[entry.type] || TYPE_STYLES.charge;
                  const isDebit = ["charge", "transfer", "adjustment"].includes(entry.type);
                  return (
                    <tr key={entry.id} style={{ borderBottom: "1px solid var(--stone-50)" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: style.bg, color: style.color }}
                        >
                          {TYPE_LABELS[entry.type] || entry.type}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--stone-700)" }}>{entry.description || "-"}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: isDebit ? "var(--rose-600)" : "var(--emerald-600)" }}>
                        {isDebit ? "+" : "-"}{formatMoney(entry.amount_cents, entry.currency || "DOP")}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--stone-500)" }}>{formatDate(entry.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
