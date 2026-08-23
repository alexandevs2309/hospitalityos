"use client";

import { useState, useEffect } from "react";
import { listHousekeepingTasks, createHousekeepingTask, updateHousekeepingTaskStatus } from "@/lib/api";

const statusConfig = {
  pending: { label: "Pendiente", color: "text-amber-700 bg-amber-50" },
  in_progress: { label: "En Progreso", color: "text-brand-700 bg-brand-50" },
  completed: { label: "Completada", color: "text-emerald-700 bg-emerald-50" },
};

const priorityConfig = {
  low: { label: "Baja", color: "text-slate-600 bg-slate-100 border-slate-200" },
  medium: { label: "Media", color: "text-amber-700 bg-amber-50 border-amber-200" },
  high: { label: "Alta", color: "text-rose-700 bg-rose-50 border-rose-200" },
  urgent: { label: "Urgente", color: "bg-rose-500 text-white border-rose-500" },
};

const taskTypeConfig = {
  cleaning: "Limpieza",
  maintenance: "Mantenimiento",
  inspection: "Inspeccion",
  turnover: "Cambio de Huesped",
};

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ room_id: "", task_type: "", priority: "medium", notes: "" });
  const [message, setMessage] = useState(null);

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

  useEffect(() => { load(); }, []);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await createHousekeepingTask(form, "eden-hotel");
      setMessage({ type: "success", text: "Tarea creada" });
      setForm({ room_id: "", task_type: "", priority: "medium", notes: "" });
      setShowForm(false);
      load();
    } catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  async function handleStatus(id, status) {
    setMessage(null);
    try {
      await updateHousekeepingTaskStatus(id, { status }, "eden-hotel");
      setMessage({ type: "success", text: "Estado actualizado" });
      load();
    } catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>Housekeeping</h1>
          <p className="text-slate-500 mt-1">{tasks.length} tareas registradas</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          {showForm ? "Cancelar" : "+ Nueva Tarea"}
        </button>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${message.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          {message.text}
        </div>
      )}

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg text-sm font-medium bg-rose-50 text-rose-700 border border-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <p className="text-sm font-medium text-slate-500">Total Tareas</p>
          <p className="text-3xl font-bold mt-2 text-slate-900">{counts.all}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <p className="text-sm font-medium text-slate-500">Pendientes</p>
          <p className="text-3xl font-bold mt-2 text-amber-600">{counts.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <p className="text-sm font-medium text-slate-500">En Progreso</p>
          <p className="text-3xl font-bold mt-2 text-brand-600">{counts.in_progress}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <p className="text-sm font-medium text-slate-500">Completadas</p>
          <p className="text-3xl font-bold mt-2 text-emerald-600">{counts.completed}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Nueva Tarea</h2>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input name="room_id" placeholder="ID Habitacion" value={form.room_id} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              <select name="task_type" value={form.task_type} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
                <option value="">Tipo...</option>
                {Object.entries(taskTypeConfig).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <select name="priority" value={form.priority} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
                <option value="">Prioridad...</option>
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
              <button type="submit" className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">Crear</button>
            </div>
            <textarea name="notes" placeholder="Notas" value={form.notes} onChange={handleChange} rows={2} className="mt-4 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none" />
          </form>
        </div>
      )}

      <div className="flex gap-2 mb-6 flex-wrap">
        {[{ key: "all", label: "Todas", count: counts.all }, { key: "pending", label: "Pendientes", count: counts.pending }, { key: "in_progress", label: "En Progreso", count: counts.in_progress }, { key: "completed", label: "Completadas", count: counts.completed }].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f.key ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {f.label} <span className="ml-1 text-xs opacity-70">{f.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <p className="text-slate-400">Cargando tareas...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const sc = statusConfig[t.status] || statusConfig.pending;
            const pc = priorityConfig[t.priority] || priorityConfig.medium;
            return (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xl font-bold text-slate-900">Hab. {t.room_number || t.room_id.slice(0, 8)}</p>
                    <p className="text-sm text-slate-500">{taskTypeConfig[t.task_type] || t.task_type}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${pc.color}`}>{pc.label}</span>
                </div>

                {t.notes && <p className="text-sm text-slate-600 mb-3 line-clamp-2">{t.notes}</p>}

                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                  <span className="text-xs text-slate-400">Asignado a: {t.assigned_to || "Sin asignar"}</span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">Creada: {new Date(t.created_at).toLocaleString()}</p>
                  <div className="flex gap-1.5">
                    {t.status === "pending" && (
                      <button onClick={() => handleStatus(t.id, "in_progress")} className="px-3 py-1.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-md text-xs font-medium hover:bg-brand-100 transition-colors">Iniciar</button>
                    )}
                    {t.status === "in_progress" && (
                      <button onClick={() => handleStatus(t.id, "completed")} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium hover:bg-emerald-100 transition-colors">Completar</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-slate-500">No hay tareas en esta vista</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-brand-600 text-sm font-medium hover:text-brand-700">Crear primera tarea</button>
        </div>
      )}
    </div>
  );
}
