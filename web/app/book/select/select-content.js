"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { checkAvailability, listRoomTypes } from "@/lib/api";
import { Button, Card, CardContent, LoadingState, ErrorState, EmptyState, useToast } from "@/components/ui";
import { Home, Users, ChevronLeft, ChevronRight, Star, Wifi, Coffee, Bath, Check } from "lucide-react";

function formatMoney(cents) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format((cents || 0) / 100);
}

export default function SelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const adults = Number(searchParams.get("adults")) || 2;
  const children = Number(searchParams.get("children")) || 0;

  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const nights = checkIn && checkOut
    ? Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000))
    : 0;

  useEffect(() => {
    if (!checkIn || !checkOut) {
      router.push("/book/search");
      return;
    }
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [avail, types] = await Promise.all([
          checkAvailability(checkIn, checkOut, "eden-hotel"),
          listRoomTypes("eden-hotel"),
        ]);
        setRooms(Array.isArray(avail) ? avail : avail.rooms || []);
        const typeMap = {};
        (Array.isArray(types) ? types : types.room_types || []).forEach(t => { typeMap[t.id] = t; });
        setRoomTypes(typeMap);
      } catch (e) {
        setError(e.message || "Error al buscar disponibilidad");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [checkIn, checkOut, router]);

  function handleSelect(room) {
    setSelectedRoom(room);
  }

  function handleContinue() {
    if (!selectedRoom) return;
    const params = new URLSearchParams({
      checkIn, checkOut, adults: String(adults), children: String(children),
      roomId: selectedRoom.id || selectedRoom.room_id,
      roomTypeId: selectedRoom.room_type_id || "",
      roomTypeName: roomTypes[selectedRoom.room_type_id]?.name || "Habitación",
      roomNumber: selectedRoom.number || selectedRoom.room_number || "",
      totalCents: String(selectedRoom.total_cents || selectedRoom.price_cents || 0),
    });
    router.push(`/book/guest?${params.toString()}`);
  }

  if (loading) return <LoadingState label="Buscando habitaciones disponibles..." />;
  if (error) return <Card><CardContent><ErrorState message={error} onRetry={() => window.location.reload()} /></CardContent></Card>;

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => router.push("/book/search")}
        className="mb-6 inline-flex items-center gap-1"
        style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--stone-500)", background: "none", border: "none", cursor: "pointer" }}
      >
        <ChevronLeft size={14} /> Cambiar fechas
      </button>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--stone-900)" }}>
            Selecciona tu Habitacion
          </h1>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--stone-400)" }}>
            {checkIn} → {checkOut} · {nights} noche{nights > 1 ? "s" : ""} · {adults} adulto{adults > 1 ? "s" : ""}{children > 0 ? `, ${children} niño${children > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <Button onClick={handleContinue} disabled={!selectedRoom} icon={ChevronRight}>
          Continuar
        </Button>
      </div>

      {rooms.length === 0 ? (
        <EmptyState
          icon={<Home size={48} style={{ color: "var(--stone-300)" }} />}
          title="No hay habitaciones disponibles"
          description="Intenta con otras fechas o modifica tu busqueda"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room, i) => {
            const type = roomTypes[room.room_type_id] || {};
            const isSelected = selectedRoom?.id === room.id || selectedRoom?.room_id === room.room_id;
            return (
              <button
                key={room.id || room.room_id || i}
                onClick={() => handleSelect(room)}
                className="text-left rounded-xl transition-all"
                style={{
                  border: isSelected ? "2px solid var(--gold-500)" : "1px solid var(--stone-200)",
                  background: isSelected ? "var(--gold-50)" : "white",
                  boxShadow: isSelected ? "var(--shadow-card-hover)" : "var(--shadow-card)",
                }}
              >
                <div
                  className="flex items-center justify-center h-32 rounded-t-xl"
                  style={{ background: "linear-gradient(135deg, var(--stone-100), var(--stone-50))" }}
                >
                  <Home size={32} style={{ color: "var(--stone-300)" }} />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--stone-900)" }}>
                        {room.number || room.room_number || `Habitacion ${i + 1}`}
                      </h3>
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--stone-500)" }}>
                        {type.name || "Habitacion"}
                      </p>
                    </div>
                    {isSelected && (
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{ width: "24px", height: "24px", borderRadius: "var(--radius-full)", background: "var(--gold-500)" }}
                      >
                        <Check size={14} style={{ color: "white" }} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    {type.capacity && (
                      <span className="flex items-center gap-1" style={{ fontSize: "var(--text-xs)", color: "var(--stone-500)" }}>
                        <Users size={12} /> {type.capacity}
                      </span>
                    )}
                    <span className="flex items-center gap-1" style={{ fontSize: "var(--text-xs)", color: "var(--stone-500)" }}>
                      <Wifi size={12} /> WiFi
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--stone-100)" }}>
                    <span style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--stone-900)" }}>
                      {formatMoney(room.total_cents || room.price_cents)}
                    </span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--stone-400)" }}>
                      {nights} noche{nights > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
