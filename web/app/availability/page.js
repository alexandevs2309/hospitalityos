"use client";

import { useState } from "react";
import { checkAvailability } from "@/lib/api";
import { Button, Card, CardContent, Input, SkeletonCard, useToast } from "@/components/ui";
import { Calendar, Building2, DollarSign, Search, Loader2, Home, Euro, ChevronRight } from "lucide-react";

export default function AvailabilityPage() {
  const toast = useToast();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRooms(null);
    try {
      const result = await checkAvailability(checkIn, checkOut, "eden-hotel");
      setRooms(result);
    } catch (err) {
      setError(err.message);
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const nights = checkIn && checkOut ? Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000)) : 0;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Disponibilidad</h1>
        <p className="mt-1 text-sm text-stone-400">Consulta habitaciones libres por fecha</p>
      </div>

      <Card className="mb-8">
        <CardContent>
          <form onSubmit={handleSearch} className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Check-in</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} required className="pl-10" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Check-out</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} required className="pl-10" />
              </div>
            </div>
            <Button type="submit" loading={loading}>
              <Search className="w-4 h-4 mr-1" /> {loading ? "Buscando..." : "Buscar Disponibilidad"}
            </Button>
            {nights > 0 && (
              <span className="text-sm text-stone-400 pb-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--gold-500)" }} />
                {nights} noche{nights > 1 ? "s" : ""}
              </span>
            )}
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6">
          <CardContent style={{ background: "var(--rose-50)", borderColor: "var(--rose-200)" }}>
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-rose-500" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && rooms !== null && (
        <div>
          <p className="mb-6 text-sm text-stone-500">
            <span className="font-semibold text-lg text-stone-900">{rooms.length}</span>{" "}
            habitacion{rooms.length !== 1 ? "es" : ""} disponible{rooms.length !== 1 ? "s" : ""}
          </p>

          {rooms.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center justify-center text-center p-16">
                <Building2 className="w-16 h-16 text-stone-300 mb-4" />
                <p className="text-sm text-stone-500">No hay habitaciones disponibles para esas fechas</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rooms.map(rm => (
                <Card key={rm.room_id} style={{ borderLeft: "3px solid var(--emerald-500)" }}>
                  <CardContent>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-2xl font-bold text-stone-900">#{rm.room_number}</p>
                        <p className="text-sm text-stone-400 flex items-center gap-1">
                          <Home className="w-3.5 h-3.5" /> {rm.room_type}
                        </p>
                      </div>
                      <span
                        className="inline-flex items-center rounded-full"
                        style={{ padding: "3px 10px", fontSize: "var(--text-xs)", fontWeight: 500, background: "var(--emerald-50)", color: "var(--emerald-700)" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ background: "var(--emerald-500)" }} />
                        Disponible
                      </span>
                    </div>
                    <div className="flex items-end justify-between mt-6 pt-4 border-t border-stone-100">
                      <p className="text-xs text-stone-400 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> Piso {rm.floor || "-"}
                      </p>
                      <div className="text-right">
                        <p className="tabular-nums text-xl font-bold" style={{ color: "var(--gold-600)" }}>
                          ${Math.round(rm.price_cents / 100).toLocaleString()}
                        </p>
                        <p className="text-xs text-stone-400">{rm.currency} / noche</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}