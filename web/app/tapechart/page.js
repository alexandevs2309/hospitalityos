"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  getTapeChart, createGuest, createReservation, updateReservation,
  listGuests, listRates,
} from "@/lib/api";
import {
  Button, Drawer, Input, Select, LoadingState, ErrorState, useToast,
} from "@/components/ui";
import {
  ChevronLeft, ChevronRight, CalendarDays, BedDouble, RotateCcw,
  X, ArrowRight, GripVertical,
} from "lucide-react";

const CELL_WIDTH = 60;
const ROW_HEIGHT = 44;
const TENANT = "eden-hotel";

const STATUS_COLORS = {
  confirmed: { bg: "var(--blue-500)", text: "white", label: "Confirmada" },
  pending:   { bg: "var(--amber-400)", text: "white", label: "Pendiente" },
  checked_in:  { bg: "var(--emerald-500)", text: "white", label: "Check-in" },
  checked_out: { bg: "var(--stone-400)", text: "white", label: "Check-out" },
};

function fmtDate(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isToday(d) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function isWeekend(d) { const day = d.getDay(); return day === 0 || day === 6; }
function nightsBetween(a, b) { return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000)); }

/* ═══════════════════════════════════════════════════════════════
   TAPE CHART PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function TapeChartPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const scrollRef = useRef(null);
  const gridRef = useRef(null);
  const toast = useToast();

  // ── Drag-to-create state ──
  const [dragCreate, setDragCreate] = useState(false);
  const [dragRoom, setDragRoom] = useState(null);
  const [dragStartIdx, setDragStartIdx] = useState(null);
  const [dragEndIdx, setDragEndIdx] = useState(null);

  // ── Drag-to-move state ──
  const [dragMove, setDragMove] = useState(null);
  const [dragMoveOver, setDragMoveOver] = useState(null);

  // ── Resize state ──
  const [resizeReservation, setResizeReservation] = useState(null);
  const [resizeNewEndIdx, setResizeNewEndIdx] = useState(null);

  // ── Create Drawer ──
  const [createDrawer, setCreateDrawer] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ firstName: "", lastName: "", email: "", phone: "", adults: 1, rateId: "" });
  const [guestSearch, setGuestSearch] = useState("");
  const [foundGuests, setFoundGuests] = useState([]);

  // ── Move confirm ──
  const [moveConfirm, setMoveConfirm] = useState(null);

  // ── Data ──
  const [rates, setRates] = useState([]);

  const baseDate = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + weekOffset * 7); d.setHours(0, 0, 0, 0); return d;
  }, [weekOffset]);

  const startDate = useMemo(() => {
    const d = new Date(baseDate); d.setDate(d.getDate() - d.getDay() + 1); return d;
  }, [baseDate]);

  const days = useMemo(() => Array.from({ length: 28 }, (_, i) => addDays(startDate, i)), [startDate]);
  const endDate = days[days.length - 1];

  async function load() {
    try {
      setError(null); setLoading(true);
      const result = await getTapeChart(fmtDate(startDate), fmtDate(endDate), TENANT);
      setData(result);
    } catch (e) { setError(e.message || "Failed to load tape chart"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [fmtDate(startDate), fmtDate(endDate)]);

  useEffect(() => {
    if (scrollRef.current) {
      const todayIdx = days.findIndex((d) => isToday(d));
      if (todayIdx > 0) scrollRef.current.scrollLeft = Math.max(0, (todayIdx - 3) * CELL_WIDTH);
    }
  }, [data, days]);

  useEffect(() => {
    listRates(TENANT).then((r) => setRates(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);

  const rooms = data?.rooms || [];
  const reservations = data?.reservations || [];

  const reservationMap = useMemo(() => {
    const map = {};
    rooms.forEach((room) => { map[room.id] = []; });
    reservations.forEach((res) => {
      if (!map[res.room_id]) return;
      const resStart = new Date(res.check_in + "T00:00:00");
      const resEnd = new Date(res.check_out + "T00:00:00");
      let visStart = days.findIndex((d) => fmtDate(d) === fmtDate(resStart));
      if (visStart === -1 && resEnd > startDate) visStart = 0;
      else if (visStart === -1) return;
      const endIdx = days.findIndex((d) => fmtDate(d) >= fmtDate(resEnd));
      let visEnd = endIdx === -1 ? 27 : endIdx - 1;
      visStart = Math.max(0, visStart); visEnd = Math.min(27, visEnd);
      if (visStart <= visEnd) map[res.room_id].push({ startIdx: visStart, endIdx: visEnd, reservation: res });
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

  // ── Check if a range is occupied in a room ──
  const isRangeOccupied = useCallback((roomId, startIdx, endIdx, excludeId) => {
    const entries = reservationMap[roomId] || [];
    return entries.some((e) => {
      if (excludeId && e.reservation.id === excludeId) return false;
      return e.startIdx <= endIdx && e.endIdx >= startIdx;
    });
  }, [reservationMap]);

  // ── Drag-to-create handlers ──
  const handleCellMouseDown = useCallback((roomId, cellIdx, e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragCreate(true);
    setDragRoom(roomId);
    setDragStartIdx(cellIdx);
    setDragEndIdx(cellIdx);
  }, []);

  const handleGridMouseMove = useCallback((e) => {
    if (!dragCreate || !gridRef.current) return;
    const roomRows = gridRef.current.querySelectorAll("[data-room-id]");
    for (const row of roomRows) {
      const rect = row.querySelector("[data-cells]")?.getBoundingClientRect();
      if (rect && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const x = e.clientX - rect.left;
        const idx = Math.max(0, Math.min(27, Math.floor(x / CELL_WIDTH)));
        setDragEndIdx(idx);
        break;
      }
    }
  }, [dragCreate]);

  const handleGridMouseUp = useCallback(() => {
    if (dragCreate && dragStartIdx !== null && dragEndIdx !== null && dragRoom) {
      const minIdx = Math.min(dragStartIdx, dragEndIdx);
      const maxIdx = Math.max(dragStartIdx, dragEndIdx);
      if (minIdx !== maxIdx) {
        const room = rooms.find((r) => r.id === dragRoom);
        if (room) {
          setCreateDrawer({
            room,
            checkIn: fmtDate(addDays(startDate, minIdx)),
            checkOut: fmtDate(addDays(startDate, maxIdx + 1)),
            minIdx, maxIdx,
          });
          setCreateForm({ firstName: "", lastName: "", email: "", phone: "", adults: 1, rateId: "" });
        }
      }
    }
    setDragCreate(false); setDragRoom(null); setDragStartIdx(null); setDragEndIdx(null);
  }, [dragCreate, dragStartIdx, dragEndIdx, dragRoom, rooms, startDate]);

  useEffect(() => {
    if (dragCreate) {
      window.addEventListener("mouseup", handleGridMouseUp);
      return () => window.removeEventListener("mouseup", handleGridMouseUp);
    }
  }, [dragCreate, handleGridMouseUp]);

  // ── Drag-to-move handlers ──
  const handleBarMouseDown = useCallback((e, entry, roomId) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setDragMove({
      reservation: entry.reservation,
      fromRoomId: roomId,
      fromStartIdx: entry.startIdx,
      fromEndIdx: entry.endIdx,
      offsetX: e.nativeEvent.offsetX,
      startClientX: e.clientX,
      startClientY: e.clientY,
      currentClientX: e.clientX,
      currentClientY: e.clientY,
    });
  }, []);

  useEffect(() => {
    if (!dragMove) return;
    const onMove = (e) => {
      setDragMove((prev) => prev ? { ...prev, currentClientX: e.clientX, currentClientY: e.clientY } : null);
      if (!gridRef.current) return;
      const roomRows = gridRef.current.querySelectorAll("[data-room-id]");
      let found = null;
      for (const row of roomRows) {
        const rect = row.querySelector("[data-cells]")?.getBoundingClientRect();
        if (rect && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const x = e.clientX - rect.left;
          const idx = Math.max(0, Math.min(27, Math.floor(x / CELL_WIDTH)));
          const roomId = row.getAttribute("data-room-id");
          found = { roomId, cellIdx: idx };
          break;
        }
      }
      setDragMoveOver(found);
    };
    const onUp = () => {
      if (dragMove && dragMoveOver) {
        const duration = dragMove.fromEndIdx - dragMove.fromStartIdx;
        const newStart = dragMoveOver.cellIdx;
        const newEnd = newStart + duration;
        if (dragMoveOver.roomId !== dragMove.fromRoomId || newStart !== dragMove.fromStartIdx) {
          const conflict = isRangeOccupied(dragMoveOver.roomId, newStart, newEnd, dragMove.reservation.id);
          const targetRoom = rooms.find((r) => r.id === dragMoveOver.roomId);
          if (!conflict && targetRoom) {
            setMoveConfirm({
              reservation: dragMove.reservation,
              fromRoom: rooms.find((r) => r.id === dragMove.fromRoomId),
              toRoom: targetRoom,
              newCheckIn: fmtDate(addDays(startDate, newStart)),
              newCheckOut: fmtDate(addDays(startDate, newEnd + 1)),
              newStartIdx: newStart,
              newEndIdx: newEnd,
            });
          } else if (conflict) {
            toast("Conflicto: habitación ocupada en esas fechas", "error");
          }
        }
      }
      setDragMove(null); setDragMoveOver(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragMove, dragMoveOver, isRangeOccupied, rooms, startDate, toast]);

  // ── Resize handlers ──
  const handleResizeMouseDown = useCallback((e, entry, roomId) => {
    e.stopPropagation(); e.preventDefault();
    setResizeReservation({ ...entry, roomId });
    setResizeNewEndIdx(entry.endIdx);
  }, []);

  useEffect(() => {
    if (!resizeReservation) return;
    const onMove = (e) => {
      if (!gridRef.current) return;
      const row = gridRef.current.querySelector(`[data-room-id="${resizeReservation.roomId}"]`);
      if (!row) return;
      const rect = row.querySelector("[data-cells]")?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const idx = Math.max(resizeReservation.startIdx + 1, Math.min(27, Math.floor(x / CELL_WIDTH)));
      setResizeNewEndIdx(idx);
    };
    const onUp = () => {
      if (resizeReservation && resizeNewEndIdx !== null && resizeNewEndIdx !== resizeReservation.endIdx) {
        const newCheckOut = fmtDate(addDays(startDate, resizeNewEndIdx + 1));
        const conflict = isRangeOccupied(
          resizeReservation.roomId,
          resizeReservation.startIdx,
          resizeNewEndIdx,
          resizeReservation.reservation.id,
        );
        if (!conflict) {
          setMoveConfirm({
            reservation: resizeReservation.reservation,
            fromRoom: rooms.find((r) => r.id === resizeReservation.roomId),
            toRoom: rooms.find((r) => r.id === resizeReservation.roomId),
            newCheckIn: resizeReservation.reservation.check_in,
            newCheckOut: newCheckOut,
            newStartIdx: resizeReservation.startIdx,
            newEndIdx: resizeNewEndIdx,
            isResize: true,
          });
        } else {
          toast("Conflicto: fechas superpuestas con otra reserva", "error");
        }
      }
      setResizeReservation(null); setResizeNewEndIdx(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [resizeReservation, resizeNewEndIdx, isRangeOccupied, rooms, startDate, toast]);

  // ── Guest search ──
  useEffect(() => {
    if (guestSearch.length < 2) { setFoundGuests([]); return; }
    const t = setTimeout(() => {
      listGuests(TENANT).then((g) => {
        const all = Array.isArray(g) ? g : [];
        const q = guestSearch.toLowerCase();
        setFoundGuests(all.filter((x) =>
          (x.first_name + " " + x.last_name).toLowerCase().includes(q) ||
          (x.email || "").toLowerCase().includes(q)
        ).slice(0, 5));
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [guestSearch]);

  // ── Create reservation ──
  async function handleCreateSubmit(e) {
    e.preventDefault();
    const { room, checkIn, checkOut } = createDrawer;
    if (!createForm.firstName || !createForm.email) return;
    setCreating(true);
    try {
      const guestId = crypto.randomUUID();
      await createGuest({
        guest_id: guestId,
        first_name: createForm.firstName,
        last_name: createForm.lastName,
        email: createForm.email,
        phone: createForm.phone,
      }, TENANT);

      const nights = nightsBetween(checkIn, checkOut);
      const rate = rates.find((r) => r.id === createForm.rateId);
      const pricePerNight = rate ? (rate.price_cents || rate.base_price_cents || 8500) : 8500;
      const totalCents = nights * pricePerNight;

      await createReservation({
        reservation_id: crypto.randomUUID(),
        guest_id: guestId,
        room_id: room.id,
        room_type_id: "",
        rate_id: createForm.rateId || "",
        check_in: checkIn,
        check_out: checkOut,
        adults: createForm.adults,
        children: 0,
        total_cents: totalCents,
        currency: "USD",
      }, TENANT);

      toast(`Reserva creada: ${room.number} (${checkIn} → ${checkOut})`, "success");
      setCreateDrawer(null);
      load();
    } catch (err) { toast(err.message || "Error al crear reserva", "error"); }
    finally { setCreating(false); }
  }

  async function handleMoveConfirm() {
    if (!moveConfirm) return;
    try {
      await updateReservation(moveConfirm.reservation.id, {
        room_id: moveConfirm.toRoom.id,
        check_in: moveConfirm.newCheckIn,
        check_out: moveConfirm.newCheckOut,
        adults: moveConfirm.reservation.adults || 1,
        children: moveConfirm.reservation.children || 0,
        total_cents: moveConfirm.reservation.total_cents,
      }, TENANT);
      toast("Reserva actualizada", "success");
      setMoveConfirm(null);
      load();
    } catch (err) { toast(err.message || "Error al actualizar", "error"); }
  }

  function selectGuest(g) {
    setCreateForm({ ...createForm, firstName: g.first_name, lastName: g.last_name || "", email: g.email || "", phone: g.phone || "" });
    setFoundGuests([]); setGuestSearch("");
  }

  if (loading && !data) return <LoadingState label="Loading tape chart..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const dragMin = dragCreate ? Math.min(dragStartIdx ?? 0, dragEndIdx ?? 0) : null;
  const dragMax = dragCreate ? Math.max(dragStartIdx ?? 0, dragEndIdx ?? 0) : null;

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
            {Math.abs(weekOffset) === 0 ? "Actual" : `${Math.abs(weekOffset)} ${weekOffset < 0 ? "atras" : "adelante"}`}
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
          <span className="w-3 h-3 rounded" style={{ background: "var(--blue-100)", border: "1px dashed var(--blue-500)" }} />
          <span className="text-xs" style={{ color: "var(--stone-500)" }}>Arrastrar para crear</span>
        </div>
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        className="rounded-xl overflow-hidden select-none"
        style={{ border: "1px solid var(--stone-100)", background: "white", userSelect: "none" }}
        onMouseMove={handleGridMouseMove}
      >
        {/* Date header */}
        <div className="flex" style={{ borderBottom: "1px solid var(--stone-100)" }}>
          <div
            className="sticky left-0 z-10 shrink-0 flex items-center px-3"
            style={{
              width: "140px", height: "48px", background: "var(--stone-50)",
              borderRight: "1px solid var(--stone-100)", fontSize: "11px", fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--stone-400)",
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
                      width: `${CELL_WIDTH}px`, height: "48px",
                      background: today ? "var(--gold-50)" : weekend ? "var(--stone-50)" : "transparent",
                      borderRight: "1px solid var(--stone-50)",
                      borderBottom: today ? "2px solid var(--gold-500)" : "none",
                    }}
                  >
                    <span className="text-[10px] font-medium" style={{ color: today ? "var(--gold-600)" : "var(--stone-400)" }}>
                      {d.toLocaleDateString("es-DO", { weekday: "short" })}
                    </span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: today ? "var(--gold-600)" : isMonday ? "var(--stone-700)" : "var(--stone-500)" }}>
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
              style={{ height: "32px", background: "var(--stone-50)", borderBottom: "1px solid var(--stone-100)", borderTop: "1px solid var(--stone-100)" }}
            >
              <span className="text-xs font-semibold" style={{ color: "var(--stone-500)" }}>Piso {floor}</span>
              <span className="ml-2 text-[10px] tabular-nums" style={{ color: "var(--stone-400)" }}>{floorRooms.length} habitaciones</span>
            </div>

            {floorRooms.map((room) => (
              <div
                key={room.id}
                data-room-id={room.id}
                className="flex"
                style={{ borderBottom: "1px solid var(--stone-50)", height: `${ROW_HEIGHT}px` }}
              >
                {/* Room label */}
                <div
                  className="sticky left-0 z-10 shrink-0 flex items-center px-3 gap-2"
                  style={{ width: "140px", height: `${ROW_HEIGHT}px`, background: "white", borderRight: "1px solid var(--stone-100)" }}
                >
                  <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--stone-800)" }}>{room.number}</span>
                  <span className="text-[10px]" style={{ color: "var(--stone-400)" }}>{room.room_type}</span>
                </div>

                {/* Day cells */}
                <div className="flex-1 overflow-hidden relative">
                  <div
                    data-cells
                    className="relative"
                    style={{ minWidth: `${days.length * CELL_WIDTH}px`, height: `${ROW_HEIGHT}px`, cursor: dragCreate && dragRoom === room.id ? "crosshair" : "default" }}
                    onMouseDown={(e) => {
                      if (dragMove) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const idx = Math.max(0, Math.min(27, Math.floor(x / CELL_WIDTH)));
                      handleCellMouseDown(room.id, idx, e);
                    }}
                  >
                    {/* Grid lines */}
                    {days.map((d, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0"
                        style={{
                          left: `${i * CELL_WIDTH}px`, width: `${CELL_WIDTH}px`,
                          borderRight: "1px solid var(--stone-50)",
                          background: isToday(d) ? "var(--gold-50/50)" : isWeekend(d) ? "var(--stone-50/30)" : "transparent",
                        }}
                      />
                    ))}

                    {/* Drag-to-create overlay */}
                    {dragCreate && dragRoom === room.id && dragMin !== null && dragMax !== null && (
                      <div
                        className="absolute top-0 bottom-0 z-[4]"
                        style={{
                          left: `${dragMin * CELL_WIDTH}px`,
                          width: `${(dragMax - dragMin + 1) * CELL_WIDTH}px`,
                          background: isRangeOccupied(room.id, dragMin, dragMax)
                            ? "var(--danger-100)" : "var(--blue-100)",
                          border: `1px dashed ${isRangeOccupied(room.id, dragMin, dragMax)
                            ? "var(--danger-500)" : "var(--blue-500)"}`,
                          borderRadius: "var(--radius-sm)", opacity: 0.85, pointerEvents: "none",
                        }}
                      />
                    )}

                    {/* Drag-to-move overlay */}
                    {dragMove && dragMoveOver && dragMoveOver.roomId === room.id && (
                      <div
                        className="absolute top-0 bottom-0 z-[4]"
                        style={{
                          left: `${dragMoveOver.cellIdx * CELL_WIDTH}px`,
                          width: `${(dragMove.fromEndIdx - dragMove.fromStartIdx + 1) * CELL_WIDTH}px`,
                          background: isRangeOccupied(room.id, dragMoveOver.cellIdx, dragMoveOver.cellIdx + (dragMove.fromEndIdx - dragMove.fromStartIdx), dragMove.reservation.id)
                            ? "var(--danger-100)" : "var(--emerald-100)",
                          border: `1px dashed ${isRangeOccupied(room.id, dragMoveOver.cellIdx, dragMoveOver.cellIdx + (dragMove.fromEndIdx - dragMove.fromStartIdx), dragMove.reservation.id)
                            ? "var(--danger-500)" : "var(--emerald-500)"}`,
                          borderRadius: "var(--radius-sm)", opacity: 0.85, pointerEvents: "none",
                        }}
                      />
                    )}

                    {/* Reservation bars */}
                    {(reservationMap[room.id] || []).map((entry) => {
                      const cfg = STATUS_COLORS[entry.reservation.status] || STATUS_COLORS.pending;
                      const left = entry.startIdx * CELL_WIDTH + 2;
                      const width = (entry.endIdx - entry.startIdx + 1) * CELL_WIDTH - 4;
                      const isDragging = dragMove?.reservation?.id === entry.reservation.id;
                      const canUpdate = entry.reservation.status === "pending" || entry.reservation.status === "confirmed";
                      return (
                        <div
                          key={entry.reservation.id}
                          className="absolute flex items-center px-2 rounded-md transition-all duration-100 group z-[5]"
                          style={{
                            left: `${left}px`, width: `${Math.max(width, 56)}px`,
                            top: "3px", bottom: "3px",
                            background: cfg.bg, color: cfg.text, minWidth: "56px",
                            cursor: canUpdate ? "grab" : "default",
                            opacity: isDragging ? 0.4 : 1,
                            boxShadow: isDragging ? "var(--shadow-md)" : "none",
                          }}
                          onMouseDown={(e) => canUpdate && handleBarMouseDown(e, entry, room.id)}
                          title={`${entry.reservation.guest_name}\n${entry.reservation.check_in} → ${entry.reservation.check_out}`}
                        >
                          <span className="text-[11px] font-medium truncate flex-1">
                            {entry.reservation.guest_name}
                          </span>
                          {/* Resize handle */}
                          {canUpdate && !isDragging && (
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ borderRadius: "0 var(--radius-md) var(--radius-md) 0" }}
                              onMouseDown={(e) => handleResizeMouseDown(e, entry, room.id)}
                            >
                              <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full" style={{ background: "rgba(255,255,255,0.6)" }} />
                            </div>
                          )}
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
          </div>
        )}
      </div>

      <p className="text-xs" style={{ color: "var(--stone-400)" }}>
        Arrastra celdas vacías para crear. Arrastra barras para mover. Arrastra el borde derecho para extender.
      </p>

      {/* ═══ CREATE DRAWER ═══ */}
      <Drawer
        open={!!createDrawer}
        onClose={() => !creating && setCreateDrawer(null)}
        title="Nueva Reserva"
      >
        {createDrawer && (
          <>
            <div className="flex items-center gap-3 p-3 rounded-lg mb-4" style={{ background: "var(--blue-50)", border: "1px solid var(--blue-200)" }}>
              <div>
                <span className="text-sm font-semibold" style={{ color: "var(--blue-600)" }}>{createDrawer.room.number}</span>
                <span className="text-xs ml-1" style={{ color: "var(--blue-500)" }}>{createDrawer.room.room_type}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5" style={{ color: "var(--blue-400)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--stone-700)" }}>
                {createDrawer.checkIn} → {createDrawer.checkOut} ({nightsBetween(createDrawer.checkIn, createDrawer.checkOut)} noches)
              </span>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Guest search */}
              <div>
                <Input
                  label="Buscar huésped existente"
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  placeholder="Nombre o email..."
                />
                {foundGuests.length > 0 && (
                  <div className="mt-1 rounded-lg overflow-hidden" style={{ border: "1px solid var(--stone-200)" }}>
                    {foundGuests.map((g) => (
                      <button
                        key={g.id} type="button"
                        className="w-full text-left px-3 py-2 flex items-center gap-2"
                        style={{ fontSize: "var(--text-sm)", borderBottom: "1px solid var(--stone-100)", background: "white", border: "none", cursor: "pointer", width: "100%" }}
                        onClick={() => selectGuest(g)}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--stone-50)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                      >
                        <span className="font-medium" style={{ color: "var(--stone-800)" }}>{g.first_name} {g.last_name}</span>
                        <span style={{ color: "var(--stone-400)", fontSize: "var(--text-xs)" }}>{g.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Nombre *" value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })} required />
                <Input label="Apellido" value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} />
              </div>
              <Input label="Email *" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Teléfono" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
                <Input label="Adultos" type="number" min={1} max={10} value={createForm.adults} onChange={(e) => setCreateForm({ ...createForm, adults: parseInt(e.target.value) || 1 })} />
              </div>

              <Select
                label="Tarifa"
                value={createForm.rateId}
                onChange={(v) => setCreateForm({ ...createForm, rateId: v })}
                options={[
                  { value: "", label: "Sin tarifa asignada" },
                  ...rates.map((r) => ({ value: r.id, label: `${r.name || r.id} — $${((r.price_cents || r.base_price_cents || 0) / 100).toFixed(0)}/noche` })),
                ]}
              />

              <div className="flex justify-end gap-2 pt-4" style={{ borderTop: "1px solid var(--stone-100)" }}>
                <Button type="button" variant="secondary" size="sm" onClick={() => setCreateDrawer(null)} disabled={creating}>Cancelar</Button>
                <Button type="submit" variant="primary" size="sm" disabled={creating}>
                  {creating ? "Creando..." : "Crear Reserva"}
                </Button>
              </div>
            </form>
          </>
        )}
      </Drawer>

      {/* ═══ MOVE CONFIRM DIALOG ═══ */}
      {moveConfirm && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: "var(--z-modal)" }}>
          <div className="absolute inset-0 animate-backdrop-in" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(4px)" }} onClick={() => setMoveConfirm(null)} />
          <div
            className="relative w-full max-w-md animate-scale-in p-6 rounded-xl"
            style={{ background: "white", border: "1px solid var(--stone-200)", boxShadow: "var(--shadow-xl)" }}
          >
            <h3 className="text-base font-semibold mb-3" style={{ color: "var(--stone-900)" }}>
              {moveConfirm.isResize ? "Extender Reserva" : "Mover Reserva"}
            </h3>
            <p className="text-sm mb-1" style={{ color: "var(--stone-600)" }}>
              <span className="font-medium" style={{ color: "var(--stone-800)" }}>{moveConfirm.reservation.guest_name}</span>
            </p>
            <div className="flex items-center gap-2 text-sm mb-4" style={{ color: "var(--stone-500)" }}>
              <span>{moveConfirm.fromRoom?.number}</span>
              {!moveConfirm.isResize && <><ArrowRight className="w-3.5 h-3.5" /><span className="font-medium" style={{ color: "var(--stone-800)" }}>{moveConfirm.toRoom?.number}</span></>}
              <span>·</span>
              <span>{moveConfirm.newCheckIn} → {moveConfirm.newCheckOut}</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMoveConfirm(null)}>Cancelar</Button>
              <Button variant="primary" size="sm" onClick={handleMoveConfirm}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
