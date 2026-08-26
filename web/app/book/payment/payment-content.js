"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPaymentIntent } from "@/lib/api";
import { Button, Card, CardContent, useToast } from "@/components/ui";
import { Calendar, Users, CreditCard, ChevronLeft, ArrowRight, Shield, Lock, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

function formatMoney(cents) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format((cents || 0) / 100);
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const adults = Number(searchParams.get("adults")) || 2;
  const children = Number(searchParams.get("children")) || 0;
  const roomTypeId = searchParams.get("roomTypeId");
  const guestId = searchParams.get("guestId");

  const [paymentIntent, setPaymentIntent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [stripe, setStripe] = useState(null);
  const [cardElement, setCardElement] = useState(null);
  const cardElementRef = useRef(null);

  const nights = checkIn && checkOut
    ? Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000))
    : 0;

  // Load Stripe.js
  useEffect(() => {
    if (window.Stripe) {
      // In production, use your actual Stripe publishable key from env
      const stripeInstance = window.Stripe("pk_test_placeholder");
      setStripe(stripeInstance);
    } else {
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.async = true;
      script.onload = () => {
        if (window.Stripe) {
          const stripeInstance = window.Stripe("pk_test_placeholder");
          setStripe(stripeInstance);
        }
      };
      document.head.appendChild(script);
      return () => document.head.removeChild(script);
    }
  }, []);

  // Create card element when Stripe is ready
  useEffect(() => {
    if (stripe && cardElementRef.current && !cardElement) {
      const elements = stripe.elements();
      const card = elements.create("card", {
        style: {
          base: {
            fontSize: "16px",
            color: "#1c1917", // Stripe requires hex — maps to --stone-900
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            "::placeholder": { color: "#78716c" }, // maps to --stone-500
          },
          invalid: { color: "#e11d48", iconColor: "#e11d48" }, // maps to --rose-600
        },
      });
      card.mount(cardElementRef.current);
      setCardElement(card);
    }
  }, [stripe]);

  useEffect(() => {
    if (!checkIn || !checkOut || !guestId || !roomTypeId) {
      router.push("/book/search");
      return;
    }
    async function loadPaymentIntent() {
      try {
        setLoading(true);
        const guestData = JSON.parse(localStorage.getItem("booking_guest") || "{}");

        const intent = await createPaymentIntent({
          amount_cents: 0, // Backend will calculate based on room type and dates
          currency: "DOP",
          description: `Reserva ${guestData.room_type_name || "Habitación"} - ${checkIn} a ${checkOut}`,
          reservation_id: "",
          guest_id: guestId,
          metadata: {
            check_in: checkIn,
            check_out: checkOut,
            adults: String(adults),
            children: String(children),
            room_type_id: roomTypeId,
          },
        }, "eden-hotel");

        setPaymentIntent(intent);
      } catch (err) {
        setError(err.message || "Error al crear intención de pago");
        toast(err.message || "Error al preparar el pago", "error");
      } finally {
        setLoading(false);
      }
    }
    loadPaymentIntent();
  }, [checkIn, checkOut, guestId, roomTypeId, adults, children, router]);

  async function handlePayment(e) {
    e.preventDefault();
    if (!stripe || !cardElement || !paymentIntent?.client_secret) {
      setError("El sistema de pagos no está listo. Por favor espera.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // First, create the reservation via public endpoint
      const guestData = JSON.parse(localStorage.getItem("booking_guest") || "{}");

      const res = await fetch("/api/booking/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservation_id: crypto.randomUUID(),
          guest_id: guestId,
          room_type_id: roomTypeId,
          check_in: checkIn,
          check_out: checkOut,
          adults,
          children,
          total_cents: paymentIntent.amount,
          currency: paymentIntent.currency,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Error al crear reserva");
      }

      const { id: reservationId, room_id } = await res.json();

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(
        paymentIntent.client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: `${guestData.first_name} ${guestData.last_name}`,
              email: guestData.email,
              phone: guestData.phone,
            },
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (confirmedIntent.status !== "succeeded") {
        throw new Error("El pago no se completó correctamente");
      }

      toast("¡Pago completado! Redirigiendo a confirmación...", "success");

      const params = new URLSearchParams({
        checkIn,
        checkOut,
        adults: String(adults),
        children: String(children),
        roomTypeId,
        guestId,
        reservationId,
        roomId: room_id,
      });
      router.push(`/book/confirm?${params.toString()}`);
    } catch (err) {
      setError(err.message);
      toast(err.message || "Error en el pago", "error");
    } finally {
      setProcessing(false);
    }
  }

  if (!checkIn || !checkOut || !guestId || !roomTypeId) return null;

  const dateRange = `${new Date(checkIn).toLocaleDateString("es-ES", { day: "numeric", month: "short" })} - ${new Date(checkOut).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`;

  const guestData = JSON.parse(localStorage.getItem("booking_guest") || "{}");

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Pago Seguro</h1>
            <p className="mt-1 text-stone-500 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {dateRange} · {nights} noche{nights > 1 ? "s" : ""}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/book/guest?${new URLSearchParams({ checkIn, checkOut, adults: String(adults), children: String(children), roomTypeId }).toString()}`)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Cambiar datos
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold" style={{ background: "var(--stone-200)", color: "var(--stone-400)" }}>1</div>
          <div className="w-16 h-1 mx-2" style={{ background: "var(--gold-500)" }} />
          <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold" style={{ background: "var(--stone-200)", color: "var(--stone-400)" }}>2</div>
          <div className="w-16 h-1 mx-2" style={{ background: "var(--gold-500)" }} />
          <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold" style={{ background: "var(--gold-500)", color: "white" }}>3</div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-4">Datos de la Tarjeta</h2>

              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-12 bg-stone-100 rounded" />
                  <div className="h-12 bg-stone-100 rounded" />
                </div>
              ) : paymentIntent ? (
                <form onSubmit={handlePayment}>
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-stone-600 mb-1">Número de tarjeta</label>
                    <div ref={cardElementRef} className="p-4 border border-stone-200 rounded-lg bg-white" />
                  </div>
                  <div className="mb-4 p-3 rounded bg-stone-50 border border-stone-100">
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Lock className="w-4 h-4 text-emerald-500" />
                      <span>Tu pago se procesa de forma segura con Stripe. No almacenamos los datos de tu tarjeta.</span>
                    </div>
                  </div>
                  <Button type="submit" loading={processing} size="lg" className="w-full">
                    <CreditCard className="w-5 h-5 mr-2" />
                    {processing ? "Procesando..." : `Pagar ${formatMoney(paymentIntent.amount)}`}
                  </Button>
                </form>
              ) : (
                <div className="text-center py-8 text-stone-500">Preparando pago...</div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardContent className="p-6">
              <h3 className="font-semibold text-stone-900 mb-4">Resumen de la Reserva</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Habitación</span>
                  <span className="font-medium text-stone-900">{guestData.room_type_name || "Habitación seleccionada"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Fechas</span>
                  <span className="font-medium text-stone-900">{dateRange}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Noches</span>
                  <span className="font-medium text-stone-900">{nights}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Huéspedes</span>
                  <span className="font-medium text-stone-900">{adults} adulto{adults > 1 ? "s" : ""}{children > 0 ? `, ${children} niño${children > 1 ? "s" : ""}` : ""}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Huésped principal</span>
                  <span className="font-medium text-stone-900">{guestData.first_name} {guestData.last_name}</span>
                </div>
                <div className="pt-3 border-t border-stone-100 flex justify-between text-lg font-bold">
                  <span className="text-stone-900">Total</span>
                  <span style={{ color: "var(--gold-600)" }}>{paymentIntent ? formatMoney(paymentIntent.amount) : "Calculando..."}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-stone-900 mb-4">Métodos de pago aceptados</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-stone-200">
                  <div className="w-10 h-6 rounded flex items-center justify-center text-xs font-bold" style={{ background: "var(--stone-900)", color: "white" }}>VISA</div>
                  <span className="text-sm text-stone-600">Tarjeta de crédito/débito</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-stone-200">
                  <div className="w-10 h-6 rounded flex items-center justify-center text-xs font-bold" style={{ background: "var(--stone-900)", color: "white" }}>MC</div>
                  <span className="text-sm text-stone-600">Mastercard</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-stone-200">
                  <div className="w-10 h-6 rounded flex items-center justify-center text-xs font-bold" style={{ background: "var(--stone-900)", color: "white" }}>AE</div>
                  <span className="text-sm text-stone-600">American Express</span>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="font-medium text-emerald-700">Pago 100% Seguro</p>
                    <p className="text-sm text-emerald-600">Certificado PCI DSS Nivel 1</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-stone-50 border border-stone-100 text-sm text-stone-600">
                <p className="font-medium text-stone-900 mb-2">Política de cancelación</p>
                <p>Cancelación gratuita hasta 48 horas antes del check-in. Después se cobrará la primera noche.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-lg bg-stone-50 border border-stone-100 text-sm text-stone-600">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-stone-900">Pago protegido</p>
            <p className="mt-1">Tu información de pago está encriptada y procesada por Stripe. Nosotros nunca vemos tu número de tarjeta completo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}