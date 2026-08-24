"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listRoomTypes, createGuest } from "@/lib/api";
import { Button, Card, CardContent, Input, useToast } from "@/components/ui";
import { Calendar, Users, ChevronLeft, ArrowRight, User, Mail, Phone, BadgeCheck, Shield, Loader2 } from "lucide-react";

function formatMoney(cents) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format((cents || 0) / 100);
}

const DOC_TYPES = [
  { value: "passport", label: "Pasaporte" },
  { value: "cedula", label: "Cédula" },
  { value: "dni", label: "DNI" },
  { value: "other", label: "Otro" },
];

export default function GuestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const adults = Number(searchParams.get("adults")) || 2;
  const children = Number(searchParams.get("children")) || 0;
  const roomTypeId = searchParams.get("roomTypeId");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    document_type: "passport",
    document_number: "",
    nationality: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [guestId, setGuestId] = useState(null);

  const nights = checkIn && checkOut
    ? Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000))
    : 0;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validaciones
    if (!form.first_name || !form.last_name || !form.email || !form.document_number) {
      setError("Completa todos los campos obligatorios");
      setLoading(false);
      return;
    }
    if (!form.email.includes("@")) {
      setError("Email inválido");
      setLoading(false);
      return;
    }

    try {
      // Crear o buscar huésped
      const guestData = await createGuest({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
      }, "eden-hotel");

      setGuestId(guestData.id);

      // Guardar datos de documento en localStorage para el paso de pago
      const guestFull = {
        ...guestData,
        document_type: form.document_type,
        document_number: form.document_number,
        nationality: form.nationality,
      };
      localStorage.setItem("booking_guest", JSON.stringify(guestFull));

      const params = new URLSearchParams({
        checkIn,
        checkOut,
        adults: String(adults),
        children: String(children),
        roomTypeId: roomTypeId || "",
        guestId: guestData.id,
      });
      router.push(`/book/payment?${params.toString()}`);
    } catch (err) {
      setError(err.message || "Error al registrar huésped");
      toast(err.message || "Error al registrar huésped", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!checkIn || !checkOut || !roomTypeId) return null;

  const dateRange = `${new Date(checkIn).toLocaleDateString("es-ES", { day: "numeric", month: "short" })} - ${new Date(checkOut).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Datos del Huésped</h1>
            <p className="mt-1 text-stone-500 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {dateRange} · {nights} noche{nights > 1 ? "s" : ""}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/book/select?${new URLSearchParams({ checkIn, checkOut, adults: String(adults), children: String(children) }).toString()}`)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Cambiar habitación
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold" style={{ background: "var(--stone-200)", color: "var(--stone-400)" }}>1</div>
          <div className="w-16 h-1 mx-2" style={{ background: "var(--gold-500)" }} />
          <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold" style={{ background: "var(--gold-500)", color: "white" }}>2</div>
          <div className="w-16 h-1 mx-2" style={{ background: "var(--gold-500)" }} />
          <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold" style={{ background: "var(--stone-200)", color: "var(--stone-400)" }}>3</div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <span>⚠</span> {error}
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-600">Nombre *</label>
                <Input
                  name="first_name"
                  placeholder="Juan"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-600">Apellido *</label>
                <Input
                  name="last_name"
                  placeholder="Pérez"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                  name="email"
                  type="email"
                  placeholder="juan@email.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-600">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <Input
                    name="phone"
                    type="tel"
                    placeholder="+1 809 555 0123"
                    value={form.phone}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-600">Nacionalidad</label>
                <Input
                  name="nationality"
                  placeholder="Dominicana"
                  value={form.nationality}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100">
              <h3 className="text-base font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-emerald-500" /> Documento de Identidad (requerido para check-in y facturación)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-stone-600">Tipo de documento *</label>
                  <select
                    name="document_type"
                    value={form.document_type}
                    onChange={handleChange}
                    required
                    className="w-full appearance-none bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-100"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a8a29e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "36px" }}
                  >
                    {DOC_TYPES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-stone-600">Número de documento *</label>
                  <Input
                    name="document_number"
                    placeholder="Ej. 123456789"
                    value={form.document_number}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/book/select?${new URLSearchParams({ checkIn, checkOut, adults: String(adults), children: String(children) }).toString()}`)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
                </Button>
                <Button type="submit" loading={loading} size="lg" className="w-full md:w-auto">
                  Continuar al pago
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 rounded-lg bg-stone-50 border border-stone-100 text-sm text-stone-600">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-stone-900">Tus datos están seguros</p>
            <p className="mt-1">Usamos tus datos solo para la reserva y facturación (e-CF DGII). No los compartimos con terceros.</p>
          </div>
        </div>
      </div>
    </div>
  );
}