"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { getTapeChart } from "@/lib/api";
import { Card, CardContent, Button, LoadingState, ErrorState } from "@/components/ui";
import {
  ChevronLeft, ChevronRight, CalendarDays, BedDouble, RotateCcw,
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

/* ═══════════════════════════════════════════════════════════════
   TAPE CHART PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function TapeChartPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const scrollRef = useRef(null);

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);

  const startDate = useMemo(() => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - d.getDay() + 1); // Monday
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
      const result = await getTapeChart(formatDate(startDate), formatDate(endDate), "eden-hotel");
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
      // Scroll to roughly center on today
      const todayIdx = days.findIndex((d) => isToday(d));
      if (todayIdx > 0) {
        const cellWidth = 60;
        scrollRef.current.scrollLeft = Math.max(0, (todayIdx - 3) * cellWidth);
      }
    }
  }, [data, days]);

  if (loading && !data) return <LoadingState label="Loading tape chart..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const rooms = data?.rooms || [];
  const reservations = data?.reservations || [];

  // Build a map: roomId -> [{ startIdx, endIdx, reservation }]
  const reservationMap = useMemo(() => {
    const map = {};
    rooms.forEach((room) => { map[room.id] = []; });

    reservations.forEach((res) => {
      if (!map[res.room_id]) return;
      const resStart = new Date(res.check_in + "T00:00:00");
      const resEnd = new Date(res.check_out + "T00:00:00");

      const startIdx = days.findIndex((d) => formatDate(d) === formatDate(resStart) || (d > resStart && formatDate(d) === formatDate(resStart)));
      // Find the day BEFORE check_out (half-open range)
      const endIdx = days.findIndex((d) => formatDate(d) >= formatDate(resEnd));

      // Also handle: if res starts before our visible range
      let visStart = startIdx;
      if (startIdx === -1 && resEnd > startDate) {
        visStart = 0;
      } else if (startIdx === -1) {
        return; // reservation is completely before our range
      }

      let visEnd = endIdx === -1 ? 27 : endIdx - 1;
      // Clamp
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

  // Group rooms by floor
  const floorGroups = useMemo(() => {
    const groups = {};
    rooms.forEach((room) => {
      const floor = room.floor || "1";
      if (!groups[floor]) groups[floor] = [];
      groups[floor].push(room);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rooms]);

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
      </div>

      {/* Grid */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--stone-100)", background: "white" }}>
        {/* Date header */}
        <div className="flex" style={{ borderBottom: "1px solid var(--stone-100)" }}>
          {/* Room column */}
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
          {/* Days */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto">
            <div className="flex" style={{ minWidth: `${days.length * 60}px` }}>
              {days.map((d, i) => {
                const today = isToday(d);
                const weekend = isWeekend(d);
                const isMonday = d.getDay() === 1;
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-center shrink-0"
                    style={{
                      width: "60px",
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
            {/* Floor header */}
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
                {/* Room label */}
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

                {/* Day cells with reservations */}
                <div className="flex-1 overflow-hidden">
                  <div className="relative" style={{ minWidth: `${days.length * 60}px`, height: "44px" }}>
                    {/* Day grid lines */}
                    {days.map((d, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0"
                        style={{
                          left: `${i * 60}px`,
                          width: "60px",
                          borderRight: "1px solid var(--stone-50)",
                          background: isToday(d) ? "var(--gold-50/50)" : isWeekend(d) ? "var(--stone-50/30)" : "transparent",
                        }}
                      />
                    ))}

                    {/* Reservation bars */}
                    {(reservationMap[room.id] || []).map((entry) => {
                      const cfg = STATUS_COLORS[entry.reservation.status] || STATUS_COLORS.pending;
                      const left = entry.startIdx * 60 + 2;
                      const width = (entry.endIdx - entry.startIdx + 1) * 60 - 4;
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
    </div>
  );
}
