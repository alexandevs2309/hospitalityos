"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFolio, addFolioEntry, closeFolio, createPayment } from "@/lib/api";

const TENANT_ID = "eden-hotel";

const TYPE_CONFIG = {
  charge: {
    label: "Cargo",
    badge: "bg-rose-100 text-rose-800",
    amount: "text-rose-600",
  },
  payment: {
    label: "Pago",
    badge: "bg-emerald-100 text-emerald-800",
    amount: "text-emerald-600",
  },
  refund: {
    label: "Reembolso",
    badge: "bg-amber-100 text-amber-800",
    amount: "text-emerald-600",
  },
  deposit: {
    label: "Depósito",
    badge: "bg-sky-100 text-sky-800",
    amount: "text-emerald-600",
  },
  adjustment: {
    label: "Ajuste",
    badge: "bg-slate-100 text-slate-800",
    amount: "text-emerald-600",
  },
  transfer: {
    label: "Transferencia",
    badge: "bg-violet-100 text-violet-800",
    amount: "text-emerald-600",
  },
};

const FALLBACK_TYPE = {
  label: "Otro",
  badge: "bg-slate-100 text-slate-800",
  amount: "text-slate-600",
};

const numberFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatMoney(cents, currency = "DOP") {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${numberFormat.format(Math.abs(cents) / 100)} ${currency}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function FolioPage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = params?.id;

  const [folio, setFolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ type: "charge", description: "", amount: "" });
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [actionError, setActionError] = useState(null);

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

  useEffect(() => {
    loadFolio();
  }, [loadFolio]);

  const totals = useMemo(() => {
    const entries = folio?.entries ?? [];
    const charges = entries
      .filter((entry) => entry.type === "charge")
      .reduce((sum, entry) => sum + entry.amount_cents, 0);
    const credits = entries
      .filter((entry) => entry.type !== "charge")
      .reduce((sum, entry) => sum + entry.amount_cents, 0);
    return {
      charges,
      credits,
      balance: folio?.balance ?? 0,
    };
  }, [folio]);

  const isClosed = Boolean(folio?.closed);
  const canClose = !isClosed && totals.balance === 0;
  const entries = folio?.entries ?? [];

  const handleAddEntry = async (event) => {
    event.preventDefault();
    setActionError(null);

    const amountPesos = Number.parseFloat(form.amount);
    if (!form.description.trim() || Number.isNaN(amountPesos) || amountPesos <= 0) {
      setActionError("Completa la descripción y un monto válido.");
      return;
    }

    const payload = {
      type: form.type,
      description: form.description.trim(),
      amount_cents: Math.round(amountPesos * 100),
      currency: "DOP",
      reference: "",
    };

    try {
      setSubmitting(true);
      if (form.type === "payment") {
        await createPayment(reservationId, payload, TENANT_ID);
      } else {
        await addFolioEntry(reservationId, payload, TENANT_ID);
      }
      setForm({ type: form.type, description: "", amount: "" });
      await loadFolio();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "No se pudo registrar el movimiento"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseFolio = async () => {
    setActionError(null);
    try {
      setClosing(true);
      await closeFolio(reservationId, TENANT_ID);
      setConfirmClose(false);
      await loadFolio();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "No se pudo cerrar el folio"
      );
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
          <p className="text-sm text-slate-500">Cargando folio…</p>
        </div>
      </div>
    );
  }

  if (error || !folio) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
          <h1
            className="text-xl font-bold text-slate-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Error al cargar el folio
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {error || "No se encontró el folio de esta reserva."}
          </p>
          <button
            onClick={loadFolio}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button
              onClick={() => router.push("/reservations")}
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-brand-700"
            >
              ← Volver a Reserva
            </button>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1
                className="text-3xl font-bold text-slate-900"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Folio
              </h1>
              {isClosed && (
                <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Folio Cerrado
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-sm text-slate-500">
              Reserva: {reservationId}
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">Total Cargos</p>
            <p className="mt-1 text-2xl font-semibold text-rose-600">
              {formatMoney(totals.charges)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">Total Pagos</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">
              {formatMoney(Math.abs(totals.credits))}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">Balance</p>
            <p
              className={`mt-1 text-2xl font-semibold ${
                totals.balance === 0 ? "text-emerald-600" : "text-blue-600"
              }`}
            >
              {formatMoney(totals.balance)}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2
            className="text-lg font-semibold text-slate-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Movimientos
          </h2>
          {entries.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm text-slate-500">
                No hay movimientos registrados en este folio.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3 font-medium">Fecha</th>
                    <th className="px-3 py-3 font-medium">Tipo</th>
                    <th className="px-3 py-3 font-medium">Descripción</th>
                    <th className="px-3 py-3 text-right font-medium">Monto</th>
                    <th className="px-3 py-3 font-medium">Referencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => {
                    const config = TYPE_CONFIG[entry.type] ?? FALLBACK_TYPE;
                    return (
                      <tr key={entry.id} className="transition-colors hover:bg-slate-50">
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                          {formatDate(entry.created_at)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badge}`}
                          >
                            {config.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-800">
                          {entry.description}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-3 text-right font-semibold ${
                            entry.type === "charge"
                              ? "text-rose-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {formatMoney(entry.amount_cents, entry.currency)}
                        </td>
                        <td className="px-3 py-3 text-slate-500">
                          {entry.reference || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {!isClosed ? (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <h2
                className="text-lg font-semibold text-slate-900"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Agregar Movimiento
              </h2>
              <form onSubmit={handleAddEntry} className="mt-4 grid gap-4 sm:grid-cols-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="entry-type" className="text-sm font-medium text-slate-700">
                    Tipo
                  </label>
                  <select
                    id="entry-type"
                    value={form.type}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, type: e.target.value }))
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  >
                    <option value="charge">Cargo</option>
                    <option value="payment">Pago</option>
                    <option value="adjustment">Ajuste</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="entry-description" className="text-sm font-medium text-slate-700">
                    Descripción
                  </label>
                  <input
                    id="entry-description"
                    type="text"
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Ej. Habitación noche 2"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="entry-amount" className="text-sm font-medium text-slate-700">
                    Monto (DOP)
                  </label>
                  <input
                    id="entry-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="0.00"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  />
                </div>
                <div className="sm:col-span-4">
                  {actionError && (
                    <p className="mb-3 text-sm font-medium text-rose-600">{actionError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Registrando…" : "Agregar al Folio"}
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2
                    className="text-lg font-semibold text-slate-900"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Cerrar Folio
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {canClose
                      ? "El balance está en cero. Puedes cerrar este folio."
                      : `El balance debe estar en cero para cerrar el folio (actual: ${formatMoney(
                          totals.balance
                        )}).`}
                  </p>
                </div>
                {!confirmClose ? (
                  <button
                    onClick={() => setConfirmClose(true)}
                    disabled={!canClose}
                    className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cerrar Folio
                  </button>
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">
                      ¿Confirmar cierre?
                    </span>
                    <button
                      onClick={handleCloseFolio}
                      disabled={closing}
                      className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {closing ? "Cerrando…" : "Sí, cerrar"}
                    </button>
                    <button
                      onClick={() => setConfirmClose(false)}
                      disabled={closing}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-500">
              Este folio está cerrado y no admite nuevos movimientos.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
