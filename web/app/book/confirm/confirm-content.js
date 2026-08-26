"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardContent, useToast } from "@/components/ui";
import { Calendar, Users, CheckCircle, Home, ChevronLeft, Mail, Phone, Shield, Loader2, FileText, Clock } from "lucide-react";

function formatMoney(cents) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format((cents || 0) / 100);
}

export default function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const adults = Number(searchParams.get("adults")) || 2;
  const children = Number(searchParams.get("children")) || 0;
  const roomTypeId = searchParams.get("roomTypeId");
  const guestId = searchParams.get("guestId");
  const reservationId = searchParams.get("reservationId");
  const roomId = searchParams.get("roomId");

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const nights = checkIn && checkOut
    ? Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000))
    : 0;

  useEffect(() => {
    if (!reservationId || !roomId) {
      router.push("/book/search");
      return;
    }
    async function loadReservation() {
      try {
        setLoading(true);
        const guestData = JSON.parse(localStorage.getItem("booking_guest") || "{}");

        // Fetch reservation details from backend
        const res = await fetch(`/api/reservations/${reservationId}`, {
          headers: { "X-Tenant-ID": "eden-hotel" },
        });

        if (res.ok) {
          const data = await res.json();
          setReservation(data);
        } else {
          // Fallback to localStorage data
          setReservation({
            id: reservationId,
            room_id: roomId,
            check_in: checkIn,
            check_out: checkOut,
            adults,
            children,
            total_cents: guestData.total_cents || 0,
            currency: "DOP",
            status: "confirmed",
            room_number: guestData.room_number || "Por asignar",
            room_type: guestData.room_type_name || "Habitación",
          });
        }
      } catch (err) {
        setError(err.message || "Error al cargar la reservacion");
      } finally {
        setLoading(false);
      }
    }
    loadReservation();
  }, [reservationId, roomId, checkIn, checkOut, adults, children, router]);

  async function handleWhatsApp() {
    if (!reservation) return;
    setSendingWhatsApp(true);
    try {
      const guestData = JSON.parse(localStorage.getItem("booking_guest") || "{}");
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: guestData.phone,
          template: "reservation_confirmation",
          variables: {
            guest_name: `${guestData.first_name} ${guestData.last_name}`,
            check_in: checkIn,
            check_out: checkOut,
            room_type: guestData.room_type_name || "Habitación",
            reservation_code: reservationId.slice(0, 8).toUpperCase(),
          },
        }),
      });
      if (res.ok) {
        toast("Confirmación enviada por WhatsApp", "success");
      } else {
        toast("No se pudo enviar por WhatsApp", "error");
      }
    } catch (err) {
      toast("Error al enviar WhatsApp", "error");
    } finally {
      setSendingWhatsApp(false);
    }
  }

  if (!checkIn || !checkOut || !reservationId) return null;

  const dateRange = `${new Date(checkIn).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })} - ${new Date(checkOut).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`;

  const guestData = JSON.parse(localStorage.getItem("booking_guest") || "{}");

  if (loading) {
    return (
      <div className="animate-fade-in min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-stone-200 border-t-stone-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p style={{ color: "var(--rose-600)", fontWeight: 600, marginBottom: "8px" }}>Error</p>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--stone-600)", marginBottom: "16px" }}>{error}</p>
            <Button onClick={() => router.push("/book/search")} variant="secondary">Volver a buscar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--emerald-50)", color: "var(--emerald-600)" }}>
          <CheckCircle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-stone-900">¡Reserva Confirmada!</h1>
        <p className="mt-2 text-stone-500">Tu estancia está garantizada. Hemos enviado los detalles a tu email.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--gold-50)", color: "var(--gold-600)" }}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">Detalles de la Reserva</h2>
                  <p className="text-sm text-stone-500">Código: <span className="font-mono font-bold text-stone-900">{reservationId?.slice(0, 8).toUpperCase()}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-stone-50">
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Habitación</p>
                  <p className="text-lg font-semibold text-stone-900">{reservation?.room_type || guestData.room_type_name || "Habitación seleccionada"}</p>
                  <p className="text-sm text-stone-500 mt-1">Nº {reservation?.room_number || "Por asignar al llegar"}</p>
                </div>
                <div className="p-4 rounded-lg bg-stone-50">
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Fechas</p>
                  <p className="text-lg font-semibold text-stone-900">{dateRange}</p>
                  <p className="text-sm text-stone-500 mt-1">{nights} noche{nights > 1 ? "s" : ""}</p>
                </div>
                <div className="p-4 rounded-lg bg-stone-50">
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Huéspedes</p>
                  <p className="text-lg font-semibold text-stone-900">{adults} adulto{adults > 1 ? "s" : ""}{children > 0 ? `, ${children} niño${children > 1 ? "s" : ""}` : ""}</p>
                </div>
                <div className="p-4 rounded-lg bg-stone-50">
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Huésped principal</p>
                  <p className="text-lg font-semibold text-stone-900">{guestData.first_name} {guestData.last_name}</p>
                  <p className="text-sm text-stone-500 mt-1">{guestData.email}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-stone-400" />
                    <div>
                      <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Check-in</p>
                      <p className="text-sm font-medium text-stone-900">Desde las 15:00</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-stone-400" />
                    <div>
                      <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Check-out</p>
                      <p className="text-sm font-medium text-stone-900">Hasta las 12:00</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-stone-900 mb-4">Huésped Principal</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: "var(--gold-100)", color: "var(--gold-700)" }}>
                  {`${guestData.first_name?.[0] || ""}${guestData.last_name?.[0] || ""}`.toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-semibold text-stone-900">{guestData.first_name} {guestData.last_name}</p>
                  <p className="text-sm text-stone-500">{guestData.email}</p>
                  <p className="text-sm text-stone-500">{guestData.phone || "Sin teléfono"}</p>
                  <p className="text-xs text-stone-400 mt-1">
                    Doc: {guestData.document_type?.toUpperCase()} {guestData.document_number}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-stone-900 mb-4">Acciones</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleWhatsApp}
                  loading={sendingWhatsApp}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {sendingWhatsApp ? "Enviando..." : "Enviar confirmación por WhatsApp"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push("/book/search")}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Nueva reserva
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-stone-900 mb-4">Resumen de Costos</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Alojamiento ({nights} noche{nights > 1 ? "s" : ""})</span>
                  <span className="font-medium text-stone-900">{reservation ? formatMoney(reservation.total_cents) : formatMoney(guestData.total_cents || 0)}</span>
                </div>
                <div className="flex justify-between text-sm text-stone-500">
                  <span>Impuestos y tasas incluidos</span>
                  <span>Incluido</span>
                </div>
                <div className="pt-3 border-t border-stone-100 flex justify-between text-lg font-bold">
                  <span className="text-stone-900">Total pagado</span>
                  <span style={{ color: "var(--gold-600)" }}>{reservation ? formatMoney(reservation.total_cents) : formatMoney(guestData.total_cents || 0)}</span>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-emerald-700">Pago confirmado</p>
                    <p className="text-sm text-emerald-600 mt-1">Tu reserva está garantizada. Recibirás un email con la factura (e-CF) tras el check-out.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-stone-50 border border-stone-100 text-sm text-stone-600">
                <p className="font-medium text-stone-900 mb-2">Política de cancelación</p>
                <p>Cancelación gratuita hasta 48 horas antes del check-in (antes del {new Date(new Date(checkIn).getTime() - 2 * 86400000).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}). Después se cobrará la primera noche.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-stone-900 mb-4">Próximos pasos</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-stone-100">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "var(--gold-500)", color: "white" }}>1</div>
                  <div>
                    <p className="font-medium text-stone-900">Llega al hotel</p>
                    <p className="text-sm text-stone-500">Presenta tu documento de identidad y el código de reserva</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-stone-100">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "var(--stone-200)", color: "var(--stone-600)" }}>2</div>
                  <div>
                    <p className="font-medium text-stone-900">Check-in</p>
                    <p className="text-sm text-stone-500">Recibe tu llave y disfruta de tu estancia</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-stone-100">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "var(--stone-200)", color: "var(--stone-600)" }}>3</div>
                  <div>
                    <p className="font-medium text-stone-900">Check-out</p>
                    <p className="text-sm text-stone-500">Devuelve la llave y recibe tu factura electrónica (e-CF)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Button
          variant="outline"
          size="lg"
          onClick={() => router.push("/book/search")}
          className="w-full max-w-md"
        >
          <Home className="w-5 h-5 mr-2" />
          Hacer otra reserva
        </Button>
      </div>
    </div>
  );
}