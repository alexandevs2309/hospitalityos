"use client";

import { useState, useEffect } from "react";
import { listRooms, createRoom, updateRoomStatus, listRoomTypes } from "@/lib/api";
import { Card, Button, StatusBadge, Modal, Input, Select, LoadingState, ErrorState, EmptyState, PageHeader, FilterPills, useToast } from "@/components/ui";

const statusConfig = {
  available: { label: "Disponible", tone: "success", color: "bg-emerald-500" },
  occupied: { label: "Ocupada", tone: "warning", color: "bg-amber-500" },
  cleaning: { label: "Limpieza", tone: "info", color: "bg-sky-500" },
  maintenance: { label: "Mantenimiento", tone: "danger", color: "bg-rose-500" },
};

export default function RoomsPage() {
  const toast = useToast();
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [filter, setFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ room_type_id: "", number: "", floor: "" });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  async function load() {
    try {
      const [r, rt] = await Promise.all([listRooms("eden-hotel", filter || undefined), listRoomTypes("eden-hotel")]);
      setRooms(r);
      setRoomTypes(rt);
      setLoadError(null);
    } catch (e) {
      setLoadError(e.message || "No se pudieron cargar las habitaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createRoom(form, "eden-hotel");
      toast.success("Habitacion creada");
      setForm({ room_type_id: "", number: "", floor: "" });
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleStatus(rm, s) {
    try {
      await updateRoomStatus(rm.id, s, "eden-hotel");
      toast.success(`Habitacion ${rm.number} ahora en ${statusConfig[s].label.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const counts = { all: rooms.length, available: rooms.filter(r => r.status === "available").length, occupied: rooms.filter(r => r.status === "occupied").length, cleaning: rooms.filter(r => r.status === "cleaning").length, maintenance: rooms.filter(r => r.status === "maintenance").length };

  const filterOptions = [
    { key: "", label: "Todas", count: counts.all },
    { key: "available", label: "Disponible", count: counts.available },
    { key: "occupied", label: "Ocupada", count: counts.occupied },
    { key: "cleaning", label: "Limpieza", count: counts.cleaning },
    { key: "maintenance", label: "Mant.", count: counts.maintenance },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Habitaciones"
        description={`${rooms.length} habitaciones registradas`}
        actions={
          <Button onClick={() => setShowModal(true)}>+ Nueva Habitacion</Button>
        }
      />

      <FilterPills options={filterOptions} value={filter} onChange={setFilter} className="mb-6" />

      {loading ? (
        <LoadingState label="Cargando habitaciones..." />
      ) : loadError ? (
        <Card>
          <ErrorState message={loadError} onRetry={load} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms.map((rm) => {
            const sc = statusConfig[rm.status] || statusConfig.available;
            return (
              <Card key={rm.id} hover className="overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                <div className={`h-1.5 ${sc.color}`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{rm.number}</p>
                      <p className="text-sm text-slate-400 dark:text-slate-500">Piso {rm.floor || "-"}</p>
                    </div>
                    <StatusBadge tone={sc.tone}>{sc.label}</StatusBadge>
                  </div>
                  <div className="flex gap-1.5 flex-wrap mt-4">
                    {Object.entries(statusConfig).map(([key, cfg]) => (
                      rm.status !== key && (
                        <Button key={key} size="sm" variant={cfg.tone} onClick={() => handleStatus(rm, key)}>
                          {cfg.label}
                        </Button>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && !loadError && rooms.length === 0 && (
        <Card>
          <EmptyState
            icon={
              <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            title="No hay habitaciones registradas"
            description="Crea la primera habitacion para empezar"
            action={<Button onClick={() => setShowModal(true)}>Crear primera habitacion</Button>}
          />
        </Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nueva Habitacion">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select name="room_type_id" value={form.room_type_id} onChange={handleChange} required>
            <option value="">Tipo...</option>
            {roomTypes.map((rt) => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
          </Select>
          <Input name="number" placeholder="Numero (101)" value={form.number} onChange={handleChange} required />
          <Input name="floor" placeholder="Piso (1)" value={form.floor} onChange={handleChange} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit">Crear</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
