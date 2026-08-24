"use client";

import { useState, useEffect } from "react";
import { listMaintenanceRequests, createMaintenanceRequest, updateMaintenanceRequestStatus } from "@/lib/api";
import {
  Button,
  Card,
  CardContent,
  StatusBadge,
  Modal,
  Input,
  Select,
  Textarea,
  LoadingState,
  ErrorState,
  EmptyState,
  useToast,
} from "@/components/ui";
import { Plus, Wrench, Building2, AlertTriangle, Play, CheckCircle, X } from "lucide-react";

const CATEGORIES = ["general", "plumbing", "electrical", "hvac", "furniture", "appliance", "structural", "safety"];

const categoryConfig = {
  general: { label: "General", tone: "neutral" },
  plumbing: { label: "Plomería", tone: "info" },
  electrical: { label: "Electricidad", tone: "warning" },
  hvac: { label: "A/C", tone: "info" },
  furniture: { label: "Mobiliario", tone: "neutral" },
  appliance: { label: "Electrodoméstico", tone: "neutral" },
  structural: { label: "Estructural", tone: "neutral" },
  safety: { label: "Seguridad", tone: "danger" },
};

const statusConfig = {
  open: { label: "Abierta", tone: "warning" },
  in_progress: { label: "En Progreso", tone: "info" },
  completed: { label: "Completada", tone: "success" },
};

const priorityConfig = {
  low: { label: "Baja", tone: "neutral" },
  medium: { label: "Media", tone: "warning" },
  high: { label: "Alta", tone: "danger" },
  urgent: { label: "Urgente", tone: "danger" },
};

const NEXT_STATUS = { open: "in_progress", in_progress: "completed" };

const EMPTY_FORM = { room_id: "", category: "", priority: "medium", description: "" };

function StatCard({ label, value, dot, active, onClick }) {
  return (
    <div onClick={onClick} style={{ cursor: "pointer" }}>
      <Card style={{ borderColor: active ? "var(--stone-900)" : "var(--stone-200)" }}>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
            <p className="text-xs font-medium uppercase tracking-wider text-stone-400">{label}</p>
          </div>
          <p className="tabular-nums text-2xl font-semibold text-stone-900">{value}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const toast = useToast();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRequests(await listMaintenanceRequests("eden-hotel"));
    } catch (err) {
      setError(err.message || "Error al cargar solicitudes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await createMaintenanceRequest(form, "eden-hotel");
      toast("Solicitud creada", "success");
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      toast(err.message || "No se pudo crear la solicitud", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleStatus(id, status) {
    setBusyId(id);
    try {
      await updateMaintenanceRequestStatus(id, { status }, "eden-hotel");
      toast("Estado actualizado", "success");
      await load();
    } catch (err) {
      toast(err.message || "No se pudo actualizar el estado", "error");
    } finally {
      setBusyId(null);
    }
  }

  const counts = {
    all: requests.length,
    open: requests.filter((r) => r.status === "open").length,
    in_progress: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
  };

  const filtered = filter ? requests.filter((r) => r.status === filter) : requests;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Mantenimiento</h1>
          <p className="text-sm text-stone-400 mt-1">{requests.length} solicitudes registradas</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nueva Solicitud
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total"
          value={counts.all}
          dot="var(--stone-900)"
          active={filter === ""}
          onClick={() => setFilter("")}
        />
        <StatCard
          label="Abiertas"
          value={counts.open}
          dot="var(--amber-500)"
          active={filter === "open"}
          onClick={() => setFilter(filter === "open" ? "" : "open")}
        />
        <StatCard
          label="En Progreso"
          value={counts.in_progress}
          dot="var(--sky-500)"
          active={filter === "in_progress"}
          onClick={() => setFilter(filter === "in_progress" ? "" : "in_progress")}
        />
        <StatCard
          label="Completadas"
          value={counts.completed}
          dot="var(--emerald-500)"
          active={filter === "completed"}
          onClick={() => setFilter(filter === "completed" ? "" : "completed")}
        />
      </div>

      {error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : loading ? (
        <LoadingState label="Cargando solicitudes..." />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wrench className="w-12 h-12 text-stone-300" />}
            title={filter ? "No hay solicitudes en este estado" : "No hay solicitudes registradas"}
            description={!filter && "Crea la primera solicitud de mantenimiento"}
            action={
              !filter && <Button onClick={() => setShowForm(true)}>Crear primera solicitud</Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((req) => {
            const cc = categoryConfig[req.category] || categoryConfig.general;
            const sc = statusConfig[req.status] || statusConfig.open;
            const pc = priorityConfig[req.priority] || priorityConfig.medium;
            const next = NEXT_STATUS[req.status];
            return (
              <Card key={req.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xl font-semibold text-stone-900">Hab. {req.room_number || "-"}</p>
                      <div className="mt-2">
                        <StatusBadge tone={cc.tone}>{cc.label}</StatusBadge>
                      </div>
                    </div>
                    <StatusBadge tone={sc.tone}>{sc.label}</StatusBadge>
                  </div>

                  <p className="text-sm text-stone-600 min-h-[40px]">{req.description}</p>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <StatusBadge tone={pc.tone}>{pc.label}</StatusBadge>
                    {req.assigned_to && (
                      <span className="text-xs text-stone-400">
                        Asignado a: <span className="text-stone-600 font-medium">{req.assigned_to}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
                    <span className="text-xs text-stone-400">
                      {new Date(req.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {next && (
                      <Button
                        size="sm"
                        variant={next === "completed" ? "success" : "primary"}
                        loading={busyId === req.id}
                        onClick={() => handleStatus(req.id, next)}
                      >
                        {next === "in_progress" ? (
                          <>
                            <Play className="w-3.5 h-3.5 mr-1" /> Iniciar
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Completar
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nueva Solicitud">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input name="room_id" placeholder="ID de habitación" value={form.room_id} onChange={handleChange} required />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select name="category" value={form.category} onChange={handleChange} required>
              <option value="">Categoría...</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryConfig[c].label}</option>
              ))}
            </Select>
            <Select name="priority" value={form.priority} onChange={handleChange}>
              {Object.entries(priorityConfig).map(([key, p]) => (
                <option key={key} value={key}>{p.label}</option>
              ))}
            </Select>
          </div>
          <Textarea name="description" placeholder="Descripción del problema" rows={3} value={form.description} onChange={handleChange} required />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={creating}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}