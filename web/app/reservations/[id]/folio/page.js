"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFolio, addFolioEntry, closeFolio, createPayment } from "@/lib/api";
import { Button, Card, CardContent, StatusBadge, Input, Select, LoadingState, ErrorState, useToast } from "@/components/ui";

const TENANT_ID = "eden-hotel";

const TYPE_CONFIG = {
  charge: { label: "Cargo", tone: "danger" },
  payment: { label: "Pago", tone: "success" },
  refund: { label: "Reembolso", tone: "warning" },
  deposit: { label: "Deposito", tone: "info" },
  adjustment: { label: "Ajuste", tone: "neutral" },
  transfer: { label: "Transferencia", tone: "gold" },
};

const FALLBACK_TYPE = { label: "Otro", tone: "neutral" };

const numberFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function formatMoney(cents, currency = "DOP") {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${numberFormat.format(Math.abs(cents) / 100)} ${currency}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" });
}

const thStyle = {
  textAlign: "left",
  padding: "10px 16px",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--stone-500)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdBase = { padding: "12px 16px", fontSize: "var(--text-sm)" };

const rowHover = {
  onMouseEnter: (e) => { e.currentTarget.style.background = "var(--stone-50)"; },
  onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; },
};

export default function FolioPage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = params?.id;
  const toast = useToast();

  const [folio, setFolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ type: "charge", description: "", amount: "" });
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const loadFolio = useCallback(async () => {
    if (!reservationId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getFolio(reservationId, TENANT_ID);
      setFolio(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el folio");
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => { loadFolio(); }, [loadFolio]);

  const totals = useMemo(() => {
    const entries = folio?.entries ?? [];
    const charges = entries.filter((e) => e.type === "charge").reduce((sum, e) => sum + e.amount_cents, 0);
    const credits = entries.filter((e) => e.type !== "charge").reduce((sum, e) => sum + e.amount_cents, 0);
    return { charges, credits, balance: folio?.balance ?? 0 };
  }, [folio]);

  const isClosed = Boolean(folio?.closed);
  const canClose = !isClosed && totals.balance === 0;
  const entries = folio?.entries ?? [];

  const handleAddEntry = async (e) => {
    e.preventDefault();
    const amountPesos = Number.parseFloat(form.amount);
    if (!form.description.trim() || Number.isNaN(amountPesos) || amountPesos <= 0) {
      toast("Completa la descripcion y un monto valido.", "error");
      return;
    }
    const payload = { type: form.type, description: form.description.trim(), amount_cents: Math.round(amountPesos * 100), currency: "DOP", reference: "" };
    try {
      setSubmitting(true);
      if (form.type === "payment") {
        await createPayment(reservationId, payload, TENANT_ID);
      } else {
        await addFolioEntry(reservationId, payload, TENANT_ID);
      }
      setForm({ type: form.type, description: "", amount: "" });
      toast("Movimiento registrado", "success");
      await loadFolio();
    } catch (err) {
      toast(err instanceof Error ? err.message : "No se pudo registrar el movimiento", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseFolio = async () => {
    try {
      setClosing(true);
      await closeFolio(reservationId, TENANT_ID);
      setConfirmClose(false);
      toast("Folio cerrado", "success");
      await loadFolio();
    } catch (err) {
      toast(err instanceof Error ? err.message : "No se pudo cerrar el folio", "error");
    } finally {
      setClosing(false);
    }
  };

  if (loading) return <LoadingState label="Cargando folio..." />;
  if (error || !folio) {
    return (
      <Card>
        <ErrorState title="Error al cargar el folio" message={error || "No se encontro el folio de esta reserva."} onRetry={loadFolio} />
      </Card>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/reservations")}
            className="mb-2 inline-flex items-center gap-1"
            style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--stone-500)", background: "none", border: "none", cursor: "pointer" }}
          >
            &larr; Volver a Reserva
          </button>
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 600, color: "var(--stone-900)" }}>Folio</h1>
            {isClosed && <StatusBadge tone="neutral">Folio Cerrado</StatusBadge>}
          </div>
          <p className="mt-1 font-mono" style={{ fontSize: "var(--text-sm)", color: "var(--stone-400)" }}>Reserva: {reservationId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent>
            <p style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--stone-500)" }}>Total Cargos</p>
            <p className="mt-1 tabular-nums" style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--rose-600)" }}>{formatMoney(totals.charges)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--stone-500)" }}>Total Pagos</p>
            <p className="mt-1 tabular-nums" style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--emerald-600)" }}>{formatMoney(Math.abs(totals.credits))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--stone-500)" }}>Balance</p>
            <p className="mt-1 tabular-nums" style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: totals.balance === 0 ? "var(--emerald-600)" : "var(--stone-900)" }}>{formatMoney(totals.balance)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6" style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--stone-100)" }}>
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--stone-900)" }}>Movimientos</h2>
        </div>
        {entries.length === 0 ? (
          <div className="flex items-center justify-center" style={{ padding: "48px 0" }}>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--stone-400)" }}>No hay movimientos registrados en este folio.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--stone-50)", borderBottom: "1px solid var(--stone-200)" }}>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Descripcion</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Monto</th>
                <th style={thStyle}>Referencia</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const config = TYPE_CONFIG[entry.type] ?? FALLBACK_TYPE;
                return (
                  <tr key={entry.id} style={{ borderBottom: "1px solid var(--stone-100)" }} {...rowHover}>
                    <td style={{ ...tdBase, color: "var(--stone-600)" }}>{formatDate(entry.created_at)}</td>
                    <td style={tdBase}><StatusBadge tone={config.tone}>{config.label}</StatusBadge></td>
                    <td style={{ ...tdBase, fontWeight: 500, color: "var(--stone-900)" }}>{entry.description}</td>
                    <td className="tabular-nums" style={{ ...tdBase, textAlign: "right", fontWeight: 600, color: entry.type === "charge" ? "var(--rose-600)" : "var(--emerald-600)" }}>
                      {formatMoney(entry.amount_cents, entry.currency)}
                    </td>
                    <td style={{ ...tdBase, color: "var(--stone-500)" }}>{entry.reference || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {!isClosed ? (
        <>
          <Card className="mb-6">
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--stone-100)" }}>
              <h2 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--stone-900)" }}>Agregar Movimiento</h2>
            </div>
            <CardContent>
              <form onSubmit={handleAddEntry} className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1.5 block" style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--stone-600)" }}>Tipo</label>
                  <Select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
                    <option value="charge">Cargo</option>
                    <option value="payment">Pago</option>
                    <option value="adjustment">Ajuste</option>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block" style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--stone-600)" }}>Descripcion</label>
                  <Input type="text" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Ej. Habitacion noche 2" />
                </div>
                <div>
                  <label className="mb-1.5 block" style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--stone-600)" }}>Monto (DOP)</label>
                  <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="sm:col-span-4">
                  <Button type="submit" loading={submitting}>{submitting ? "Registrando..." : "Agregar al Folio"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--stone-900)" }}>Cerrar Folio</h2>
                  <p className="mt-1" style={{ fontSize: "var(--text-sm)", color: "var(--stone-500)" }}>
                    {canClose
                      ? "El balance esta en cero. Puedes cerrar este folio."
                      : `El balance debe estar en cero para cerrar el folio (actual: ${formatMoney(totals.balance)}).`}
                  </p>
                </div>
                {!confirmClose ? (
                  <Button onClick={() => setConfirmClose(true)} disabled={!canClose}>Cerrar Folio</Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--stone-600)" }}>Confirmar cierre?</span>
                    <Button variant="danger" onClick={handleCloseFolio} loading={closing}>Si, cerrar</Button>
                    <Button variant="outline" onClick={() => setConfirmClose(false)} disabled={closing}>Cancelar</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--stone-500)", textAlign: "center" }}>
              Este folio esta cerrado y no admite nuevos movimientos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
