"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { checkAvailability } from "@/lib/api";
import { Button, Card, CardContent, Input, SkeletonCard, useToast } from "@/components/ui";
import { Calendar, Users, Search, Loader2, ChevronRight, Home, Sparkles } from "lucide-react";

export default function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [checkIn, setCheckIn] = useState(searchParams.get("checkIn") || "");
  const [checkOut, setCheckOut] = useState(searchParams.get("checkOut") || "");
  const [adults, setAdults] = useState(Number(searchParams.get("adults")) || 2);
  const [children, setChildren] = useState(Number(searchParams.get("children")) || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const nights = checkIn && checkOut
    ? Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000))
    : 0;

  async function handleSearch(e) {
    e.preventDefault();
    if (!checkIn || !checkOut) {
      setError("Por favor selecciona ambas fechas");
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setError("La fecha de salida debe ser posterior a la de entrada");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await checkAvailability(checkIn, checkOut, "eden-hotel");
      const params = new URLSearchParams({
        checkIn,
        checkOut,
        adults: String(adults),
        children: String(children),
      });
      router.push(`/book/select?${params.toString()}`);
    } catch (err) {
      setError(err.message || "Error al buscar disponibilidad");
      toast(err.message || "Error al buscar disponibilidad", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-stone-900">Reserva tu Estancia</h1>
        <p className="mt-2 text-stone-500">Encuentra la habitación perfecta para tus fechas</p>
      </div>

      <Card className="max-w-xl mx-auto">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-600">Check-in</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <Input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={today}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-600">Check-out</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <Input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={checkIn || tomorrow}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-600">Adultos</label>
                <Select
                  value={String(adults)}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  required
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={String(n)}>{n} adulto{n > 1 ? "s" : ""}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-600">Niños</label>
                <Select
                  value={String(children)}
                  onChange={(e) => setChildren(Number(e.target.value))}
                >
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n} value={String(n)}>{n === 0 ? "Sin niños" : `${n} niño${n > 1 ? "s" : ""}`}</option>
                  ))}
                </Select>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                <span className="flex-shrink-0">⚠</span>
                {error}
              </div>
            )}

            {nights > 0 && (
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--gold-500)" }} />
                  <span>{nights} noche{nights > 1 ? "s" : ""}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400" />
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              <Search className="w-5 h-5 mr-2" />
              {loading ? "Buscando..." : "Buscar Disponibilidad"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        {[
          { icon: Home, title: "Habitaciones Cómodas", desc: "Diseñadas para tu descanso" },
          { icon: Sparkles, title: "Limpieza Diaria", desc: "Servicio de housekeeping incluido" },
          { icon: Users, title: "Atención 24/7", desc: "Recepción siempre disponible" },
        ].map((item) => (
          <div key={item.title} className="p-4 rounded-xl bg-white border border-stone-100">
            <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center rounded-lg" style={{ background: "var(--gold-50)", color: "var(--gold-600)" }}>
              <item.icon className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-stone-900">{item.title}</h3>
            <p className="mt-1 text-sm text-stone-500">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Select({ value, onChange, required, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      required={required}
      className="w-100 appearance-none bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-100"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a8a29e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "36px" }}
    >
      {children}
    </select>
  );
}
