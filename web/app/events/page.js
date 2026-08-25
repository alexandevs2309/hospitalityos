"use client";

import { useState, useEffect } from "react";
import { listEvents, createEvent, updateEventStatus } from "@/lib/api";
import {
  Button, Card, CardContent, Input, Select, Textarea, StatusBadge,
  Modal, LoadingState, ErrorState, EmptyState, useToast,
} from "@/components/ui";
import { Calendar, Plus, Loader2, X, Users, MapPin } from "lucide-react";

const TENANT = "eden-hotel";

const eventTypes = [
  { value: "conference", label: "Conferencia" },
  { value: "wedding", label: "Boda" },
  { value: "corporate", label: "Corporativo" },
  { value: "banquet", label: "Banquete" },
  { value: "meeting", label: "Reunion" },
  { value: "other", label: "Otro" },
];

const statusConfig = {
  pending: { label: "Pendiente", tone: "info" },
  confirmed: { label: "Confirmado", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
  completed: { label: "Completado", tone: "default" },
};

export default function EventsPage() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", event_type: "conference", start_date: "", end_date: "", guest_count: 0, notes: "" });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await listEvents(TENANT);
      setEvents(res.events || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name || !form.start_date || !form.end_date) { toast("Nombre y fechas requeridos", "error"); return; }
    setSaving(true);
    try {
      const res = await createEvent(form, TENANT);
      if (res.error) throw new Error(res.error.message);
      toast("Evento creado", "success");
      setShowCreate(false);
      setForm({ name: "", event_type: "conference", start_date: "", end_date: "", guest_count: 0, notes: "" });
      load();
    } catch (err) { toast(err.message, "error"); } finally { setSaving(false); }
  }

  async function handleStatus(id, status) {
    try {
      const res = await updateEventStatus(id, { status }, TENANT);
      if (res.error) throw new Error(res.error.message);
      toast("Estado actualizado", "success");
      load();
    } catch (err) { toast(err.message, "error"); }
  }

  if (loading) return <LoadingState message="Cargando eventos..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Eventos & Grupos</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />Nuevo Evento</Button>
      </div>

      {events.length === 0 ? (
        <EmptyState message="No hay eventos programados" />
      ) : (
        <div className="grid gap-4">
          {events.map(ev => (
            <Card key={ev.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{ev.name}</h3>
                      <StatusBadge tone={statusConfig[ev.status]?.tone || "default"}>
                        {statusConfig[ev.status]?.label || ev.status}
                      </StatusBadge>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {eventTypes.find(t => t.value === ev.event_type)?.label || ev.event_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{ev.start_date} → {ev.end_date}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{ev.guest_count} invitados</span>
                    </div>
                    {ev.notes && <p className="text-sm text-muted-foreground">{ev.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    {ev.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => handleStatus(ev.id, "confirmed")}>Confirmar</Button>
                        <Button size="sm" variant="outline" onClick={() => handleStatus(ev.id, "cancelled")}>Cancelar</Button>
                      </>
                    )}
                    {ev.status === "confirmed" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatus(ev.id, "completed")}>Completar</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <h3 className="font-medium text-lg">Nuevo Evento</h3>
          <Input placeholder="Nombre del evento" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
            {eventTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fecha inicio</label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fecha fin</label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required />
            </div>
          </div>
          <Input placeholder="Invitados" type="number" value={form.guest_count} onChange={e => setForm(f => ({ ...f, guest_count: parseInt(e.target.value) || 0 }))} />
          <Textarea placeholder="Notas" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Crear Evento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
