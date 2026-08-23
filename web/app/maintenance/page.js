"use client";

import { useState, useEffect } from "react";
import { listMaintenanceRequests, createMaintenanceRequest, updateMaintenanceRequestStatus } from "@/lib/api";

const CATEGORIES = ["general", "plumbing", "electrical", "hvac", "furniture", "appliance", "structural", "safety"];

const categoryConfig = {
  general: { label: "General", color: "bg-slate-500" },
  plumbing: { label: "Plomeria", color: "bg-sky-500" },
  electrical: { label: "Electricidad", color: "bg-amber-500" },
  hvac: { label: "A/C", color: "bg-cyan-500" },
  furniture: { label: "Mobiliario", color: "bg-violet-500" },
  appliance: { label: "Electrodomestico", color: "bg-indigo-500" },
  structural: { label: "Estructural", color: "bg-orange-500" },
  safety: { label: "Seguridad", color: "bg-rose-500" },
};

const statusConfig = {
  open: { label: "Abierta", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
  in_progress: { label: "En Progreso", text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200", dot: "bg-sky-500" },
  completed: { label: "Completada", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
};

const priorityConfig = {
  low: { label: "Baja", text: "text-slate-600", bg: "bg-slate-100" },
  medium: { label: "Media", text: "text-amber-700", bg: "bg-amber-50" },
  high: { label: "Alta", text: "text-rose-700", bg: "bg-rose-50" },
  urgent: { label: "Urgente", text: "text-white", bg: "bg-rose-500" },
};

const NEXT_STATUS = { open: "in_progress", in_progress: "completed" };

function CategoryIcon({ name }) {
  const paths = {
    general: <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
    plumbing: <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />,
    electrical: <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
    hvac: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.6 4.6A2 2 0 1 1 11 8H2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12.6 19.4A2 2 0 1 0 14 16H2" />
      </>
    ),
    furniture: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 18v2m14-2v2" />
      </>
    ),
    appliance: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </>
    ),
    structural: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2m10-10h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6h4m-4 4h4m-4 4h4m-4 4h4" />
      </>
    ),
    safety: <path strokeLinecap="round" strokeLinejoin="round" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />,
  };
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      {paths[name] || paths.general}
    </svg>
  );
}

export default function MaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ room_id: "", category: "", priority: "medium", description: "" });
  const [message, setMessage] = useState(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setRequests(await listMaintenanceRequests("eden-hotel"));
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar solicitudes");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await createMaintenanceRequest(form, "eden-hotel");
      setMessage({ type: "success", text: "Solicitud creada" });
      setForm({ room_id: "", category: "", priority: "medium", description: "" });
      setShowForm(false);
      load();
    } catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  async function handleStatus(id, status) {
    setMessage(null);
    try {
      await updateMaintenanceRequestStatus(id, { status }, "eden-hotel");
      load();
    } catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  const counts = {
    all: requests.length,
    open: requests.filter(r => r.status === "open").length,
    in_progress: requests.filter(r => r.status === "in_progress").length,
    completed: requests.filter(r => r.status === "completed").length,
  };

  const filtered = filter ? requests.filter(r => r.status === filter) : requests;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>Mantenimiento</h1>
          <p className="text-slate-500 mt-1">{requests.length} solicitudes registradas</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          {showForm ? "Cancelar" : "+ Nueva Solicitud"}
        </button>
      </div>

      {(message || error) && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${(error || message.type === "error") ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          {error || message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Nueva Solicitud</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input name="room_id" placeholder="ID de habitacion" value={form.room_id} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
            <select name="category" value={form.category} onChange={handleChange} required className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
              <option value="">Categoria...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{categoryConfig[c].label}</option>)}
            </select>
            <select name="priority" value={form.priority} onChange={handleChange} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
              {Object.entries(priorityConfig).map(([key, p]) => <option key={key} value={key}>{p.label}</option>)}
            </select>
            <button type="submit" className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">Crear</button>
            <textarea name="description" placeholder="Descripcion del problema" value={form.description} onChange={handleChange} rows="3" required className="md:col-span-4 px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none" />
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { key: "", label: "Total", count: counts.all, dot: "bg-slate-900" },
          { key: "open", label: "Abiertas", count: counts.open, dot: statusConfig.open.dot },
          { key: "in_progress", label: "En Progreso", count: counts.in_progress, dot: statusConfig.in_progress.dot },
          { key: "completed", label: "Completadas", count: counts.completed, dot: statusConfig.completed.dot },
        ].map(s => (
          <div key={s.label} onClick={() => setFilter(s.key)} className={`bg-white rounded-xl border border-slate-200 p-6 cursor-pointer transition-shadow hover:shadow-md ${filter === s.key ? "ring-2 ring-brand-500" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{s.count}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <p className="text-slate-400">Cargando solicitudes...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(req => {
              const cc = categoryConfig[req.category] || categoryConfig.general;
              const sc = statusConfig[req.status] || statusConfig.open;
              const pc = priorityConfig[req.priority] || priorityConfig.medium;
              const next = NEXT_STATUS[req.status];
              return (
                <div key={req.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className={`h-1.5 ${cc.color}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xl font-bold text-slate-900">Hab. {req.room_number || "-"}</p>
                        <span className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full text-xs font-medium text-white ${cc.color}`}>
                          <CategoryIcon name={req.category} />
                          {cc.label}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sc.text} ${sc.bg}`}>{sc.label}</span>
                    </div>

                    <p className="text-sm text-slate-600 min-h-[40px]">{req.description}</p>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${pc.text} ${pc.bg}`}>{pc.label}</span>
                      {req.assigned_to && (
                        <span className="text-xs text-slate-400">Asignado a: <span className="text-slate-600 font-medium">{req.assigned_to}</span></span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-400">{new Date(req.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</p>
                      {next && (
                        <button onClick={() => handleStatus(req.id, next)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusConfig[next].border} ${statusConfig[next].text} ${statusConfig[next].bg} hover:opacity-80`}>
                          {next === "in_progress" ? "Iniciar" : "Completar"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!isLoading && filtered.length === 0 && !error && (
            <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              <p className="text-slate-500">No hay solicitudes {filter ? "en este estado" : "registradas"}</p>
              <button onClick={() => setShowForm(true)} className="mt-4 text-brand-600 text-sm font-medium hover:text-brand-700">Crear primera solicitud</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
