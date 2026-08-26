"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { getTapeChart, createGuest, createReservation } from "@/lib/api";
import { Button, Modal, Input, LoadingState, ErrorState, useToast } from "@/components/ui";
import {
  ChevronLeft, ChevronRight, CalendarDays, BedDouble, RotateCcw,
  Plus, UserPlus,
} from "lucide-react";

const STATUS_COLORS = {
  confirmed: { bg: "var(--blue-500)", text: "white", label: "Confirmada" },
  checked_in: { bg: "var(--emerald-500)", text: "white", label: "Check-in" },
  checked_out: { bg: "var(--stone-400)", text: "white", label: "Check-out" },
  pending: { bg: "var(--amber-400)", text: "white", label: "Pendiente" },
};

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isToday(d) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

const CELL_WIDTH = 60;
const TENANT = "eden-hotel";

export default function TapeChartPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const scrollRef = useRef(null);
  const toast = useToast();

  // ── Drag state ──
  const [dragging, setDragging] = useState(false);
  const [dragRoom, setDragRoom] = useState(null);
  const [dragStartIdx, setDragStartIdx] = useState(null);
  const [dragEndIdx, setDragEndIdx] = useState(null);

  // ── Create modal ──
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    adults: 1,
  });

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);

  const startDate = useMemo(() => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - d.getDay() + 1);
    return d;
  }, [baseDate]);

  const days = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => addDays(startDate, i));
  }, [startDate]);

  const endDate = days[days.length - 1];

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const result = await getTapeChart(formatDate(startDate), formatDate(endDate), TENANT);
      setData(result);
    } catch (e) {
      setError(e.message || "Failed to load tape chart");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [formatDate(startDate), formatDate(endDate)]);

  useEffect(() => {
    if (scrollRef.current) {
      const todayIdx = days.findIndex((d) => isToday(d));
      if (todayIdx > 0) {
        scrollRef.current.scrollLeft = Math.max(0, (todayIdx - 3) * CELL_WIDTH);
      }
    }
  }, [data, days]);

  const rooms = data?.rooms || [];
  const reservations = data?.reservations || [];

  const reservationMap = useMemo(() => {
    const map = {};
    rooms.forEach((room) => { map[room.id] = []; });

    reservations.forEach((res) => {
      if (!map[res.room_id]) return;
      const resStart = new Date(res.check_in + "T00:00:00");
      const resEnd = new Date(res.check_out + "T00:00:00");

      const startIdx = days.findIndex((d) => formatDate(d) === formatDate(resStart));
      const endIdx = days.findIndex((d) => formatDate(d) >= formatDate(resEnd));

      let visStart = startIdx;
      if (startIdx === -1 && resEnd > startDate) {
        visStart = 0;
      } else if (startIdx === -1) {
        return;
      }

      let visEnd = endIdx === -1 ? 27 : endIdx - 1;
      visStart = Math.max(0, visStart);
      visEnd = Math.min(27, visEnd);

      if (visStart <= visEnd) {
        map[res.room_id].push({
          startIdx: visStart,
          endIdx: visEnd,
          reservation: res,
        });
      }
    });
    return map;
  }, [rooms, reservations, days, startDate]);

  const floorGroups = useMemo(() => {
    const groups = {};
    rooms.forEach((room) => {
      const floor = room.floor || "1";
      if (!groups[floor]) groups[floor] = [];
      groups[floor].push(room);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rooms]);

  // ── Drag handlers ──
  const handleMouseDown = useCallback((roomId, cellIdx) => {
    setDragging(true);
    setDragRoom(roomId);
    setDragStartIdx(cellIdx);
    setDragEndIdx(cellIdx);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const cellIdx = Math.max(0, Math.min(27, Math.floor(x / CELL_WIDTH)));
    setDragEndIdx(cellIdx);
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    if (!dragging || dragStartIdx === null || dragEndIdx === null || !dragRoom) {
      setDragging(false);
      return;
    }

    const minIdx = Math.min(dragStartIdx, dragEndIdx);
    const maxIdx = Math.max(dragStartIdx, dragEndIdx);

    if (minIdx === maxIdx) {
      setDragging(false);
      return;
    }

    const room = rooms.find((r) => r.id === dragRoom);
    if (!room) {
      setDragging(false);
      return;
    }

    const checkIn = formatDate(addDays(startDate, minIdx));
    const checkOut = formatDate(addDays(startDate, maxIdx + 1));

    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      adults: 1,
      _room: room,
      _checkIn: checkIn,
      _checkOut: checkOut,
    });
    setModalOpen(true);
    setDragging(false);
    setDragRoom(null);
    setDragStartIdx(null);
    setDragEndIdx(null);
  }, [dragging, dragStartIdx, dragEndIdx, dragRoom, rooms, startDate]);

  useEffect(() => {
    if (dragging) {
      const onUp = () => setDragging(false);
      window.addEventListener("mouseup", onUp);
      return () => window.removeEventListener("mouseup", onUp);
    }
  }, [dragging]);

  async function handleCreate(e) {
    e.preventDefault();
    const { _room, _checkIn, _checkOut } = form;
    if (!form.firstName || !form.email || !_room) return;

    setCreating(true);
    try {
      const guestId = crypto.randomUUID();
      await createGuest({
        guest_id: guestId,
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone,
      }, TENANT);

      const nights = Math.max(1, Math.round((new Date(_checkOut) - new Date(_checkIn)) / 86400000));
      const totalCents = nights * 8500;

      await createReservation({
        reservation_id: crypto.randomUUID(),
        guest_id: guestId,
        room_id: _room.id,
        room_type_id: "",
        rate_id: "",
        check_in: _checkIn,
        check_out: _checkOut,
        adults: form.adults,
        children: 0,
        total_cents: totalCents,
        currency: "USD",
      }, TENANT);

      toast(`Reserva creada: ${_room.number} (${_checkIn} → ${_checkOut})`, "success");
      setModalOpen(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", adults: 1 });
      load();
    } catch (err) {
      toast(err.message || "Error al crear reserva", "error");
    } finally {
      setCreating(false);
    }
  }

  if (loading && !data) return <LoadingState label="Loading tape chart..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const dragMin = dragging ? Math.min(dragStartIdx ?? 0, dragEndIdx ?? 0) : null;
  const dragMax = dragging ? Math.max(dragStartIdx ?? 0, dragEndIdx ?? 0) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--stone-900)" }}>Tape Chart</h1>
          <p className="text-sm mt-1" style={{ color: "var(--stone-400)" }}>
            {days[0].toLocaleDateString("es-DO", { month: "short", day: "numeric" })} — {days[27].toLocaleDateString("es-DO", { month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Hoy
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium tabular-nums px-2" style={{ color: "var(--stone-700)" }}>
            Semana {Math.abs(weekOffset) === 0 ? "actual" : `${Math.abs(weekOffset)} ${weekOffset < 0 ? "atras" : "adelante"}`}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4">
        {Object.entries(STATUS_COLORS).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: cfg.bg }} />
            <span className="text-xs" style={{ color: "var(--stone-500)" }}>{cfg.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ background: "var(--blue-200)", border: "1px dashed var(--blue-500)" }} />
          <span className="text-xs" style={{ color: "var(--stone-500)" }}>Arrastrar para crear</span>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--stone-100)", background: "white" }}>
        {/* Date header */}
        <div className="flex" style={{ borderBottom: "1px solid var(--stone-100)" }}>
          <div
            className="sticky left-0 z-10 shrink-0 flex items-center px-3"
            style={{
              width: "140px",
              height: "48px",
              background: "var(--stone-50)",
              borderRight: "1px solid var(--stone-100)",
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--stone-400)",
            }}
          >
            <BedDouble className="w-3.5 h-3.5 mr-1.5" style={{ color: "var(--stone-400)" }} />
            Habitacion
          </div>
          <div ref={scrollRef} className="flex-1 overflow-x-auto">
            <div className="flex" style={{ minWidth: `${days.length * CELL_WIDTH}px` }}>
              {days.map((d, i) => {
                const today = isToday(d);
                const weekend = isWeekend(d);
                const isMonday = d.getDay() === 1;
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-center shrink-0"
                    style={{
                      width: `${CELL_WIDTH}px`,
                      height: "48px",
                      background: today ? "var(--gold-50)" : weekend ? "var(--stone-50)" : "transparent",
                      borderRight: "1px solid var(--stone-50)",
                      borderBottom: today ? "2px solid var(--gold-500)" : "none",
                    }}
                  >
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: today ? "var(--gold-600)" : "var(--stone-400)" }}
                    >
                      {d.toLocaleDateString("es-DO", { weekday: "short" })}
                    </span>
                    <span
                      className="text-xs font-bold tabular-nums"
                      style={{ color: today ? "var(--gold-600)" : isMonday ? "var(--stone-700)" : "var(--stone-500)" }}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Room rows */}
        {floorGroups.map(([floor, floorRooms]) => (
          <div key={floor}>
            <div
              className="flex items-center px-3"
              style={{
                height: "32px",
                background: "var(--stone-50)",
                borderBottom: "1px solid var(--stone-100)",
                borderTop: "1px solid var(--stone-100)",
              }}
            >
              <span className="text-xs font-semibold" style={{ color: "var(--stone-500)" }}>
                Piso {floor}
              </span>
              <span className="ml-2 text-[10px] tabular-nums" style={{ color: "var(--stone-400)" }}>
                {floorRooms.length} habitaciones
              </span>
            </div>

            {floorRooms.map((room) => (
              <div
                key={room.id}
                className="flex"
                style={{ borderBottom: "1px solid var(--stone-50)" }}
              >
                <div
                  className="sticky left-0 z-10 shrink-0 flex items-center px-3 gap-2"
                  style={{
                    width: "140px",
                    height: "44px",
                    background: "white",
                    borderRight: "1px solid var(--stone-100)",
                  }}
                >
                  <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--stone-800)" }}>
                    {room.number}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--stone-400)" }}>
                    {room.room_type}
                  </span>
                </div>

                <div
                  className="flex-1 overflow-hidden"
                  style={{ cursor: "crosshair" }}
                  onMouseMove={(e) => {
                    if (!dragging || dragRoom !== room.id) return;
                    handleMouseMove(e);
                  }}
                >
                  <div
                    className="relative"
                    style={{ minWidth: `${days.length * CELL_WIDTH}px`, height: "44px" }}
                    onMouseDown={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const cellIdx = Math.max(0, Math.min(27, Math.floor(x / CELL_WIDTH)));
                      handleMouseDown(room.id, cellIdx);
                    }}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => {
                      if (dragging && dragRoom === room.id) {
                        setDragging(false);
                      }
                    }}
                  >
                    {/* Day grid lines */}
                    {days.map((d, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0"
                        style={{
                          left: `${i * CELL_WIDTH}px`,
                          width: `${CELL_WIDTH}px`,
                          borderRight: "1px solid var(--stone-50)",
                          background: isToday(d) ? "var(--gold-50/50)" : isWeekend(d) ? "var(--stone-50/30)" : "transparent",
                        }}
                      />
                    ))}

                    {/* Drag selection overlay */}
                    {dragging && dragRoom === room.id && dragMin !== null && dragMax !== null && (
                      <div
                        className="absolute top-0 bottom-0 z-[4]"
                        style={{
                          left: `${dragMin * CELL_WIDTH}px`,
                          width: `${(dragMax - dragMin + 1) * CELL_WIDTH}px`,
                          background: "var(--blue-100)",
                          border: "1px dashed var(--blue-500)",
                          borderRadius: "var(--radius-sm)",
                          opacity: 0.8,
                          pointerEvents: "none",
                        }}
                      />
                    )}

                    {/* Reservation bars */}
                    {(reservationMap[room.id] || []).map((entry) => {
                      const cfg = STATUS_COLORS[entry.reservation.status] || STATUS_COLORS.pending;
                      const left = entry.startIdx * CELL_WIDTH + 2;
                      const width = (entry.endIdx - entry.startIdx + 1) * CELL_WIDTH - 4;
                      return (
                        <div
                          key={entry.reservation.id}
                          className="absolute top-1.5 bottom-1.5 flex items-center px-2 rounded-md cursor-pointer transition-all duration-150 hover:brightness-110 hover:shadow-md group z-[5]"
                          style={{
                            left: `${left}px`,
                            width: `${Math.max(width, 56)}px`,
                            background: cfg.bg,
                            color: cfg.text,
                            minWidth: "56px",
                          }}
                          title={`${entry.reservation.guest_name}\n${entry.reservation.check_in} → ${entry.reservation.check_out}\n$${(entry.reservation.total_cents / 100).toFixed(2)}`}
                        >
                          <span className="text-[11px] font-medium truncate">
                            {entry.reservation.guest_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {rooms.length === 0 && (
          <div className="text-center py-16" style={{ color: "var(--stone-400)" }}>
            <CalendarDays className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--stone-300)" }} />
            <p className="text-sm font-medium">No hay habitaciones configuradas</p>
            <p className="text-xs mt-1">Agrega habitaciones para ver el tape chart</p>
          </div>
        )}
      </div>

      <p className="text-xs" style={{ color: "var(--stone-400)" }}>
        Tip: Haz clic y arrastra sobre las celdas vacías de una habitación para crear una reserva.
      </p>

      {/* ── Create Reservation Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => !creating && setModalOpen(false)}
        title="Nueva Reserva"
      >
        {form._room && (
          <div className="px-6 pt-4 pb-2">
            <div
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: "var(--blue-50)", border: "1px solid var(--blue-200)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: "var(--blue-600)" }}>
                  {form._room.number}
                </span>
                <span className="text-[10px]" style={{ color: "var(--blue-500)" }}>
                  {form._room.room_type}
                </span>
              </div>
              <div className="ml-auto text-right">
                <span className="text-xs font-medium" style={{ color: "var(--stone-700)" }}>
                  {form._checkIn} → {form._checkOut}
                </span>
                <span className="text-[10px] block" style={{ color: "var(--stone-400)" }}>
                  {Math.max(1, Math.round((new Date(form._checkOut) - new Date(form._checkIn)) / 86400000))} noches
                </span>
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleCreate} className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombre *"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="Juan"
              required
            />
            <Input
              label="Apellido"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Pérez"
            />
          </div>
          <Input
            label="Email *"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="juan@email.com"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Teléfono"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+1 809-555-0000"
            />
            <Input
              label="Adultos"
              type="number"
              min={1}
              max={10}
              value={form.adults}
              onChange={(e) => setForm({ ...form, adults: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3" style={{ borderTop: "1px solid var(--stone-100)" }}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={creating}>
              {creating ? "Creando..." : "Crear Reserva"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
