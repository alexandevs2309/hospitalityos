"use client";

import { useState, useEffect } from "react";
import { listHousekeepingTasks, createHousekeepingTask, updateHousekeepingTaskStatus } from "@/lib/api";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  ErrorState,
  FilterPills,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  useToast,
} from "@/components/ui";

const statusConfig = {
  pending: { label: "Pendiente", tone: "warning" },
  in_progress: { label: "En Progreso", tone: "brand" },
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
  inspection: "Inspeccion",
  turnover: "Cambio de Huesped",
};

const EMPTY_FORM = { room_id: "", task_type: "", priority: "medium", notes: "" };

function SummaryStat({ label, value, valueClass = "" }) {
  return (
    <Card className="hover:shadow-md">
      <CardContent className="p-6">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
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
    try {
      await updateHousekeepingTaskStatus(id, { status }, "eden-hotel");
      toast("Estado actualizado", "success");
      await load();
    } catch (err) {
      toast(err.message || "No se pudo actualizar el estado", "error");
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
      <PageHeader
        title="Housekeeping"
        subtitle={`${tasks.length} tareas registradas`}
        actions={<Button onClick={() => setShowForm(true)}>+ Nueva Tarea</Button>}
      />

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Total Tareas" value={counts.all} valueClass="text-slate-900 dark:text-slate-100" />
        <SummaryStat label="Pendientes" value={counts.pending} valueClass="text-amber-600 dark:text-amber-400" />
        <SummaryStat label="En Progreso" value={counts.in_progress} valueClass="text-brand-600 dark:text-brand-400" />
        <SummaryStat label="Completadas" value={counts.completed} valueClass="text-emerald-600 dark:text-emerald-400" />
      </div>

      <FilterPills options={filterOptions} value={filter} onChange={setFilter} className="mb-6" />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <LoadingState label="Cargando tareas..." />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            title="No hay tareas en esta vista"
            action={
              <Button variant="secondary" onClick={() => setShowForm(true)}>
                Crear primera tarea
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const sc = statusConfig[t.status] || statusConfig.pending;
            const pc = priorityConfig[t.priority] || priorityConfig.medium;
            return (
              <Card key={t.id} className="hover:shadow-md">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="text-xl font-bold text-slate-900 dark:text-slate-100">Hab. {t.room_number || (t.room_id || "").slice(0, 8)}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{taskTypeConfig[t.task_type] || t.task_type}</p>
                    </div>
                    <StatusBadge tone={pc.tone}>{pc.label}</StatusBadge>
                  </div>

                  {t.notes && <p className="mb-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{t.notes}</p>}

                  <div className="mb-4 flex items-center gap-2">
                    <StatusBadge tone={sc.tone}>{sc.label}</StatusBadge>
                    <span className="text-xs text-slate-400 dark:text-slate-500">Asignado a: {t.assigned_to || "Sin asignar"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400 dark:text-slate-500">Creada: {new Date(t.created_at).toLocaleString()}</p>
                    <div className="flex gap-1.5">
                      {t.status === "pending" && (
                        <Button size="sm" onClick={() => handleStatus(t.id, "in_progress")}>
                          Iniciar
                        </Button>
                      )}
                      {t.status === "in_progress" && (
                        <Button variant="success" size="sm" onClick={() => handleStatus(t.id, "completed")}>
                          Completar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nueva Tarea">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input name="room_id" placeholder="ID Habitacion" value={form.room_id} onChange={handleChange} required />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select name="task_type" value={form.task_type} onChange={handleChange} required>
              <option value="">Tipo...</option>
              {Object.entries(taskTypeConfig).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
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
