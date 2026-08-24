"use client";

import { useState, useEffect } from "react";
import { listRooms, createRoom, updateRoomStatus, listRoomTypes } from "@/lib/api";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  ErrorState,
  FilterPills,
  Input,
  Modal,
  Select,
  Skeleton,
  StatusBadge,
  useToast,
} from "@/components/ui";
import { Plus, Building2, Building, Search, Home, Wrench, Sparkles, ChevronDown } from "lucide-react";

const TENANT = "eden-hotel";

const statusConfig = {
  available: { label: "Disponible", tone: "success", colorClass: "text-emerald-500", borderColor: "var(--emerald-500)" },
  occupied: { label: "Ocupada", tone: "warning", colorClass: "text-amber-500", borderColor: "var(--amber-500)" },
  cleaning: { label: "Limpieza", tone: "info", colorClass: "text-sky-500", borderColor: "var(--sky-500)" },
  maintenance: { label: "Mantenimiento", tone: "danger", colorClass: "text-rose-500", borderColor: "var(--rose-500)" },
};

const EMPTY_FORM = { room_type_id: "", number: "", floor: "" };

function RoomSkeleton() {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-2">
          <div>
            <Skeleton style={{ height: "26px", width: "64px", marginBottom: "8px" }} />
            <Skeleton style={{ height: "11px", width: "84px" }} />
          </div>
          <Skeleton style={{ height: "22px", width: "80px", borderRadius: "9999px" }} />
        </div>
        <Skeleton style={{ height: "22px", width: "65%", marginTop: "20px" }} />
      </CardContent>
    </Card>
  );
}

export default function RoomsPage() {
  const toast = useToast();
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [filter, setFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  async function load() {
    try {
      const [r, rt] = await Promise.all([listRooms(TENANT, filter || undefined), listRoomTypes(TENANT)]);
      setRooms(r);
      setRoomTypes(rt);
      setLoadError(null);
    } catch (e) {
      setLoadError(e.message || "No se pudieron cargar las habitaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await createRoom(form, TENANT);
      toast("Habitación creada", "success");
      setForm(EMPTY_FORM);
      setShowModal(false);
      await load();
    } catch (err) {
      toast(err.message || "No se pudo crear la habitación", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleStatus(rm, s) {
    try {
      await updateRoomStatus(rm.id, s, TENANT);
      toast(`Habitación ${rm.number} ahora en ${statusConfig[s].label.toLowerCase()}`, "success");
      await load();
    } catch (err) {
      toast(err.message || "No se pudo actualizar el estado", "error");
    }
  }

  const typeNameOf = (id) => roomTypes.find((rt) => rt.id === id)?.name;

  const counts = {
    all: rooms.length,
    available: rooms.filter((r) => r.status === "available").length,
    occupied: rooms.filter((r) => r.status === "occupied").length,
    cleaning: rooms.filter((r) => r.status === "cleaning").length,
    maintenance: rooms.filter((r) => r.status === "maintenance").length,
  };

  const filterOptions = [
    { key: "", label: "Todas", count: counts.all },
    { key: "available", label: "Disponibles", count: counts.available },
    { key: "occupied", label: "Ocupadas", count: counts.occupied },
    { key: "cleaning", label: "Limpieza", count: counts.cleaning },
    { key: "maintenance", label: "Mantenimiento", count: counts.maintenance },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900" style={{ lineHeight: 1.2 }}>
            Habitaciones
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            {rooms.length} habitaciones registradas
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nueva Habitación
        </Button>
      </div>

      <FilterPills options={filterOptions} value={filter} onChange={setFilter} className="mb-6" />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <RoomSkeleton key={i} />
          ))}
        </div>
      ) : loadError ? (
        <Card>
          <ErrorState message={loadError} onRetry={load} />
        </Card>
      ) : rooms.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 className="w-12 h-12 text-stone-300" />}
            title="No hay habitaciones registradas"
            description="Crea la primera habitación para empezar a gestionar el hotel"
            action={<Button onClick={() => setShowModal(true)}>Crear primera habitación</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {rooms.map((rm) => {
            const sc = statusConfig[rm.status] || statusConfig.available;
            const typeName = typeNameOf(rm.room_type_id);
            return (
              <Card
                key={rm.id}
                className="group transition-shadow hover:shadow-md"
                style={{ borderLeft: `3px solid ${sc.borderColor}` }}
              >
                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-2xl font-bold text-stone-900" style={{ lineHeight: 1.2 }}>
                        {rm.number}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Piso {rm.floor || "-"}
                        {typeName ? ` · ${typeName}` : ""}
                      </p>
                    </div>
                    <StatusBadge tone={sc.tone} dot>
                      {sc.label}
                    </StatusBadge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                    {Object.entries(statusConfig).map(([key, cfg]) =>
                      rm.status !== key ? (
                        <Button key={key} variant="ghost" size="xs" onClick={() => handleStatus(rm, key)}>
                          {cfg.label}
                        </Button>
                      ) : null
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nueva Habitación">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select name="room_type_id" value={form.room_type_id} onChange={handleChange} required>
            <option value="">Tipo...</option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </Select>
          <Input name="number" placeholder="Número (101)" value={form.number} onChange={handleChange} required />
          <Input name="floor" placeholder="Piso (1)" value={form.floor} onChange={handleChange} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>
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