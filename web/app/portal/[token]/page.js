"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getPortalData, portalSelfCheckIn, portalSelfCheckOut, portalCreateRequest, portalSubmitReview } from "@/lib/api";
import { Button, Card, CardContent, Input, Select, Textarea, StatusBadge, useToast } from "@/components/ui";
import { Hotel, CheckCircle, LogOut, MessageSquare, Star, Wifi, WifiOff, Loader2 } from "lucide-react";

const requestTypes = [
  { value: "towel", label: "Toallas extra" },
  { value: "pillow", label: "Almohada extra" },
  { value: "cleaning", label: "Limpieza" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "room_service", label: "Room Service" },
  { value: "other", label: "Otro" },
];

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          className="transition-colors"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
        >
          <Star
            className={`w-6 h-6 ${i <= (hover || value) ? "fill-primary text-primary" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function PortalPage() {
  const params = useParams();
  const token = params.token;
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState("info");

  const [reqForm, setReqForm] = useState({ request_type: "towel", description: "", priority: "normal" });
  const [revForm, setRevForm] = useState({ rating: 0, category: "overall", comment: "" });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getPortalData(token);
      if (res.error) throw new Error(res.error.message);
      setData(res);
    } catch (e) {
      setError(e.message || "Token invalido o expirado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (token) load(); }, [token]);

  async function handleCheckIn() {
    setActionLoading(true);
    try {
      const res = await portalSelfCheckIn(token);
      if (res.error) throw new Error(res.error.message);
      toast("Check-in completado!", "success");
      load();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckOut() {
    setActionLoading(true);
    try {
      const res = await portalSelfCheckOut(token);
      if (res.error) throw new Error(res.error.message);
      toast("Check-out completado!", "success");
      load();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRequest(e) {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await portalCreateRequest(token, reqForm);
      if (res.error) throw new Error(res.error.message);
      toast("Solicitud enviada!", "success");
      setReqForm({ request_type: "towel", description: "", priority: "normal" });
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReview(e) {
    e.preventDefault();
    if (!revForm.rating) { toast("Selecciona una calificacion", "error"); return; }
    setActionLoading(true);
    try {
      const res = await portalSubmitReview(token, revForm);
      if (res.error) throw new Error(res.error.message);
      toast("Gracias por tu evaluacion!", "success");
      setRevForm({ rating: 0, category: "overall", comment: "" });
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <WifiOff className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-lg font-semibold mb-2">Portal no disponible</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    </div>
  );

  const r = data.reservation;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Hotel className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-semibold">Portal del Huesped</h1>
            <p className="text-xs text-muted-foreground">Bienvenido, {r.guest_name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Habitacion:</span> <span className="font-medium">{r.room_number || "-"}</span></div>
              <div><span className="text-muted-foreground">Estado:</span> <StatusBadge tone={r.status === "checked_in" ? "success" : r.status === "confirmed" ? "info" : "default"}>{r.status}</StatusBadge></div>
              <div><span className="text-muted-foreground">Check-in:</span> <span className="font-medium">{r.check_in}</span></div>
              <div><span className="text-muted-foreground">Check-out:</span> <span className="font-medium">{r.check_out}</span></div>
              <div><span className="text-muted-foreground">Total:</span> <span className="font-medium">{new Intl.NumberFormat("es-DO", { style: "currency", currency: r.currency || "DOP" }).format((r.total_cents || 0) / 100)}</span></div>
              <div><span className="text-muted-foreground">Balance:</span> <span className="font-medium">{new Intl.NumberFormat("es-DO", { style: "currency", currency: r.currency || "DOP" }).format((r.balance_cents || 0) / 100)}</span></div>
            </div>

            <div className="flex gap-2 mt-4">
              {r.status === "confirmed" && (
                <Button onClick={handleCheckIn} disabled={actionLoading} className="flex-1">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Check-in
                </Button>
              )}
              {r.status === "checked_in" && (
                <Button onClick={handleCheckOut} disabled={actionLoading} variant="outline" className="flex-1">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                  Check-out
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 border-b border-border">
          {[["requests", "Solicitudes", MessageSquare], ["review", "Calificar", Star]].map(([k, l, Icon]) => (
            <button
              key={k}
              className={`pb-2 px-1 text-sm font-medium border-b-2 ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
              onClick={() => setTab(k)}
            >
              <Icon className="w-4 h-4 inline mr-1" />{l}
            </button>
          ))}
        </div>

        {tab === "requests" && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4">Enviar solicitud</h3>
              <form onSubmit={handleRequest} className="space-y-3">
                <Select value={reqForm.request_type} onChange={e => setReqForm(f => ({ ...f, request_type: e.target.value }))}>
                  {requestTypes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
                <Textarea placeholder="Descripcion (opcional)" value={reqForm.description} onChange={e => setReqForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Enviar solicitud
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {tab === "review" && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4">Califica tu estadia</h3>
              <form onSubmit={handleReview} className="space-y-3">
                <StarRating value={revForm.rating} onChange={v => setRevForm(f => ({ ...f, rating: v }))} />
                <Select value={revForm.category} onChange={e => setRevForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="overall">General</option>
                  <option value="room">Habitacion</option>
                  <option value="service">Servicio</option>
                  <option value="cleanliness">Limpieza</option>
                  <option value="location">Ubicacion</option>
                </Select>
                <Textarea placeholder="Comentarios (opcional)" value={revForm.comment} onChange={e => setRevForm(f => ({ ...f, comment: e.target.value }))} rows={3} />
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Enviar calificacion
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
