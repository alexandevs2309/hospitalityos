"use client";

import { useState, useEffect } from "react";
import { listHousekeepingTasks, createHousekeepingTask, updateHousekeepingTaskStatus } from "@/lib/api";
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
  FilterPills,
  useToast,
} from "@/components/ui";
import { Plus, Sparkles, Building2, Loader2, Play, CheckCircle, AlertTriangle } from "lucide-react";

const statusConfig = {
  pending: { label: "Pendiente", tone: "warning" },
  in_progress: { label: "En Progreso", tone: "info" },
  completed: { label: "Completada", tone: "success" },
};

const priorityConfig = {
  low: { label: "Baja", tone: "neutral" },
  medium: { label: "Media", tone: "warning" },
  high: { label: "Alta", tone: "danger" },
  urgent: { label: "Urgente", tone: "danger" },
};

const taskTypeConfig = {
  cleaning: "Limpieza",
  maintenance: "Mantenimiento",
  inspection: "Inspección",
  turnover: "Cambio de Huésped",
};

const EMPTY_FORM = { room_id: "", task_type: "", priority: "medium", notes: "" };

function StatCard({ label, value, colorClass }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-400">{label}</p>
        <p className="mt-2 tabular-nums text-2xl font-semibold" style={{ color: colorClass || "var(--stone-900)" }}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const toast = useToast();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setTasks(await listHousekeepingTasks("eden-hotel"));
    } catch (e) {
      setError(e.message || "Error al cargar las tareas");
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
      await createHousekeepingTask(form, "eden-hotel");
      toast("Tarea creada", "success");
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      toast(err.message || "No se pudo crear la tarea", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleStatus(id, status) {
    setBusyId(id);
    try {
      await updateHousekeepingTaskStatus(id, { status }, "eden-hotel");
      toast("Estado actualizado", "success");
      await load();
    } catch (err) {
      toast(err.message || "No se pudo actualizar el estado", "error");
    } finally {
      setBusyId(null);
    }
  }

  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const filterOptions = [
    { key: "all", label: "Todas", count: counts.all },
    { key: "pending", label: "Pendientes", count: counts.pending },
    { key: "in_progress", label: "En Progreso", count: counts.in_progress },
    { key: "completed", label: "Completadas", count: counts.completed },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Housekeeping</h1>
          <p className="text-sm text-stone-400 mt-1">{tasks.length} tareas registradas</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nueva Tarea
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Tareas" value={counts.all} />
        <StatCard label="Pendientes" value={counts.pending} colorClass="text-amber-600" />
        <StatCard label="En Progreso" value={counts.in_progress} colorClass="text-sky-600" />
        <StatCard label="Completadas" value={counts.completed} colorClass="text-emerald-600" />
      </div>

      <FilterPills options={filterOptions} value={filter} onChange={setFilter} className="mb-6" />

      {error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : loading ? (
        <LoadingState label="Cargando tareas..." />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sparkles className="w-12 h-12 text-stone-300" />}
            title="No hay tareas en esta vista"
            description={filter !== "all" ? "Prueba con otro filtro o crea una nueva tarea" : undefined}
            action={<Button onClick={() => setShowForm(true)}>Crear tarea</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const sc = statusConfig[t.status] || statusConfig.pending;
            const pc = priorityConfig[t.priority] || priorityConfig.medium;
            return (
              <Card key={t.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xl font-semibold text-stone-900">Hab. {t.room_number || (t.room_id || "").slice(0, 8)}</p>
                      <p className="text-sm text-stone-500 mt-1">{taskTypeConfig[t.task_type] || t.task_type}</p>
                    </div>
                    <StatusBadge tone={pc.tone}>{pc.label}</StatusBadge>
                  </div>

                  {t.notes && (
                    <p className="line-clamp-2 text-sm text-stone-600 mb-3">{t.notes}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <StatusBadge tone={sc.tone}>{sc.label}</StatusBadge>
                    <span className="text-xs text-stone-400">Asignado a: {t.assigned_to || "Sin asignar"}</span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                    <span className="text-xs text-stone-400">Creada: {new Date(t.created_at).toLocaleString()}</span>
                    {t.status === "pending" && (
                      <Button size="sm" loading={busyId === t.id} onClick={() => handleStatus(t.id, "in_progress")}>
                        <Play className="w-3.5 h-3.5 mr-1" /> Iniciar
                      </Button>
                    )}
                    {t.status === "in_progress" && (
                      <Button variant="success" size="sm" loading={busyId === t.id} onClick={() => handleStatus(t.id, "completed")}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Completar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nueva Tarea">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input name="room_id" placeholder="ID Habitación" value={form.room_id} onChange={handleChange} required />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select name="task_type" value={form.task_type} onChange={handleChange} required>
              <option value="">Tipo...</option>
              {Object.entries(taskTypeConfig).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
            <Select name="priority" value={form.priority} onChange={handleChange} required>
              <option value="">Prioridad...</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </Select>
          </div>
          <Textarea name="notes" placeholder="Notas" rows={3} value={form.notes} onChange={handleChange} />
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