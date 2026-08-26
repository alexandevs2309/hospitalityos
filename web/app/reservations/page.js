"use client";

import { useState, useEffect } from "react";
import { listReservations, createReservation, cancelReservation, checkInReservation, checkOutReservation } from "@/lib/api";
import Link from "next/link";
import { Button, Card, StatusBadge, Modal, Input, Select, FilterPills, useToast, SkeletonTable, EmptyState, ErrorState } from "@/components/ui";
import { Plus, Calendar, CreditCard, User, X, Check, LogOut, ExternalLink, ChevronDown, Search, Loader2 } from "lucide-react";

const statusConfig = {
  confirmed: { label: "Confirmada", tone: "gold" },
  checked_in: { label: "Check-in", tone: "success" },
  checked_out: { label: "Check-out", tone: "neutral" },
  canceled: { label: "Cancelada", tone: "danger" },
  pending: { label: "Pendiente", tone: "warning" },
};

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

export default function ReservationsPage() {
  const toast = useToast();
  const [reservations, setReservations] = useState([]);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ guest_id: "", room_id: "", rate_id: "", check_in: "", check_out: "", adults: 2, children: 0, total_cents: 0, currency: "DOP" });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  async function load() {
    try {
      setReservations(await listReservations("eden-hotel", filter || undefined));
      setLoadError(null);
    } catch (e) {
      setLoadError(e.message || "No se pudieron cargar las reservas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createReservation({ ...form, reservation_id: crypto.randomUUID(), adults: Number(form.adults), children: Number(form.children), total_cents: Number(form.total_cents) }, "eden-hotel");
      toast("Reserva creada", "success");
      setForm({ guest_id: "", room_id: "", rate_id: "", check_in: "", check_out: "", adults: 2, children: 0, total_cents: 0, currency: "DOP" });
      setShowForm(false);
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function handleAction(action, id) {
    try {
      if (action === "cancel") await cancelReservation(id, "eden-hotel");
      if (action === "checkin") await checkInReservation(id, "eden-hotel");
      if (action === "checkout") await checkOutReservation(id, "eden-hotel");
      toast("Acción completada", "success");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  const filterOptions = [
    { key: "", label: "Todas", count: reservations.length },
    { key: "confirmed", label: "Confirmadas" },
    { key: "checked_in", label: "Check-in" },
    { key: "checked_out", label: "Check-out" },
    { key: "canceled", label: "Canceladas" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Reservas</h1>
          <p className="mt-1 text-sm text-stone-400">{reservations.length} reservas</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nueva Reserva
        </Button>
      </div>

      <FilterPills options={filterOptions} value={filter} onChange={setFilter} className="mb-6" />

      {loading ? (
        <SkeletonTable rows={5} cols={7} />
      ) : loadError ? (
        <Card>
          <ErrorState message={loadError} onRetry={load} />
        </Card>
      ) : (
        <Card style={{ overflow: "hidden" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--stone-50)", borderBottom: "1px solid var(--stone-200)" }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Habitación</th>
                <th style={thStyle}>Check-in</th>
                <th style={thStyle}>Check-out</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(r => {
                const sc = statusConfig[r.status] || statusConfig.pending;
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--stone-100)" }} {...rowHover}>
                    <td className="font-mono" style={{ ...tdBase, color: "var(--stone-500)" }}>{r.id.slice(0, 8)}...</td>
                    <td style={{ ...tdBase, color: "var(--stone-600)" }}>{r.room_id.slice(0, 8)}...</td>
                    <td style={{ ...tdBase, color: "var(--stone-600)" }}>{r.check_in}</td>
                    <td style={{ ...tdBase, color: "var(--stone-600)" }}>{r.check_out}</td>
                    <td className="tabular-nums" style={{ ...tdBase, fontWeight: 500, color: "var(--stone-900)" }}>
                      ${(r.total_cents / 100).toLocaleString()} {r.currency}
                    </td>
                    <td style={tdBase}>
                      <StatusBadge tone={sc.tone} dot>{sc.label}</StatusBadge>
                    </td>
                    <td style={tdBase}>
                      <div className="flex gap-1.5">
                        <Link
                          href={`/reservations/${r.id}/folio`}
                          style={{ padding: "4px 10px", fontSize: "var(--text-xs)", fontWeight: 500, borderRadius: "var(--radius)", color: "var(--gold-700)", background: "var(--gold-50)", border: "1px solid var(--gold-200)", textDecoration: "none" }}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" /> Folio
                        </Link>
                        {r.status === "confirmed" && (
                          <>
                            <Button size="xs" variant="success" onClick={() => handleAction("checkin", r.id)}>
                              <LogOut className="w-3 h-3 mr-1" /> Check-in
                            </Button>
                            <Button size="xs" variant="outline" onClick={() => handleAction("cancel", r.id)}>
                              <X className="w-3 h-3 mr-1" /> Cancelar
                            </Button>
                          </>
                        )}
                        {r.status === "checked_in" && (
                          <Button size="xs" variant="primary" onClick={() => handleAction("checkout", r.id)}>
                            <Check className="w-3 h-3 mr-1" /> Check-out
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {reservations.length === 0 && (
            <EmptyState
              icon={<Calendar className="w-12 h-12 text-stone-300" />}
              title="No hay reservas"
              description="Crea la primera reserva para empezar"
              action={<Button onClick={() => setShowForm(true)}>Crear reserva</Button>}
            />
          )}
        </Card>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nueva Reserva">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">ID Huésped *</label>
              <Input name="guest_id" placeholder="ID del huésped" value={form.guest_id} onChange={handleChange} required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">ID Habitación *</label>
              <Input name="room_id" placeholder="ID de la habitación" value={form.room_id} onChange={handleChange} required />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">ID Tarifa *</label>
              <Input name="rate_id" placeholder="ID de la tarifa" value={form.rate_id} onChange={handleChange} required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Check-in *</label>
              <Input name="check_in" type="date" value={form.check_in} onChange={handleChange} required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Check-out *</label>
              <Input name="check_out" type="date" value={form.check_out} onChange={handleChange} required />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Adultos</label>
              <Input name="adults" type="number" placeholder="2" value={form.adults} onChange={handleChange} min="1" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Niños</label>
              <Input name="children" type="number" placeholder="0" value={form.children} onChange={handleChange} min="0" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Total (centavos)</label>
              <Input name="total_cents" type="number" placeholder="0" value={form.total_cents} onChange={handleChange} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit">Crear Reserva</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}