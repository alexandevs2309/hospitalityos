"use client";

import { useState, useEffect } from "react";
import { listWhatsAppMessages, sendWhatsAppMessage } from "@/lib/api";
import {
  Button,
  Card,
  CardContent,
  Input,
  LoadingState,
  ErrorState,
  EmptyState,
  StatusBadge,
  useToast,
} from "@/components/ui";
import { MessageCircle, Send, Search, ArrowUpRight, ArrowDownLeft, Loader2, X } from "lucide-react";

const TENANT = "eden-hotel";

const directionConfig = {
  inbound: { label: "Entrante", tone: "info" },
  outbound: { label: "Saliente", tone: "success" },
};

const statusConfig = {
  sent: { label: "Enviado", tone: "info" },
  delivered: { label: "Entregado", tone: "success" },
  read: { label: "Leido", tone: "gold" },
  received: { label: "Recibido", tone: "info" },
  failed: { label: "Fallido", tone: "danger" },
};

function formatTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("es-DO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function WhatsAppPage() {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [showSend, setShowSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ to: "", message: "", reservation_id: "" });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await listWhatsAppMessages(TENANT);
      setMessages(Array.isArray(res) ? res : res.messages || []);
    } catch (e) {
      setError(e.message || "Error al cargar mensajes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSend(e) {
    e.preventDefault();
    if (!form.to.trim() || !form.message.trim()) return;
    setSending(true);
    try {
      await sendWhatsAppMessage({ to: form.to, message: form.message, reservation_id: form.reservation_id || undefined }, TENANT);
      toast("Mensaje enviado", "success");
      setForm({ to: "", message: "", reservation_id: "" });
      setShowSend(false);
      load();
    } catch (e) {
      toast(e.message || "Error al enviar", "error");
    } finally {
      setSending(false);
    }
  }

  const filtered = messages.filter(
    (m) =>
      m.content?.toLowerCase().includes(search.toLowerCase()) ||
      m.from_number?.includes(search) ||
      m.to_number?.includes(search)
  );

  const stats = {
    total: messages.length,
    inbound: messages.filter((m) => m.direction === "inbound").length,
    outbound: messages.filter((m) => m.direction === "outbound").length,
    sent: messages.filter((m) => m.status === "sent").length,
    delivered: messages.filter((m) => m.status === "delivered").length,
    read: messages.filter((m) => m.status === "read").length,
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">WhatsApp</h1>
          <p className="mt-1 text-sm text-stone-400">Mensajes y comunicacion con huespedes</p>
        </div>
        <Button onClick={() => setShowSend(true)}>
          <Send className="w-4 h-4 mr-2" /> Enviar Mensaje
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md">
          <CardContent>
            <p className="text-sm font-medium text-stone-500">Total Mensajes</p>
            <p className="mt-2 text-3xl font-bold text-stone-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md">
          <CardContent>
            <p className="text-sm font-medium text-stone-500">Entrantes</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{stats.inbound}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md">
          <CardContent>
            <p className="text-sm font-medium text-stone-500">Salientes</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.outbound}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md">
          <CardContent>
            <p className="text-sm font-medium text-stone-500">Leidos</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{stats.read}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-stone-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por contenido, telefono..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
            />
          </div>
        </div>

        {error && !loading ? (
          <CardContent><ErrorState message={error} onRetry={load} /></CardContent>
        ) : loading ? (
          <CardContent><LoadingState label="Cargando mensajes..." /></CardContent>
        ) : filtered.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={<MessageCircle className="w-12 h-12 text-stone-300" />}
              title="Sin mensajes"
              description="No hay mensajes de WhatsApp registrados"
            />
          </CardContent>
        ) : (
          <div className="divide-y divide-stone-100">
            {filtered.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start gap-4 p-4 hover:bg-stone-50 transition-colors"
              >
                <div
                  className="flex items-center justify-center shrink-0 mt-1"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-full)",
                    background: msg.direction === "inbound" ? "var(--stone-100)" : "var(--gold-50)",
                  }}
                >
                  {msg.direction === "inbound" ? (
                    <ArrowDownLeft className="w-4 h-4 text-stone-600" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" style={{ color: "var(--gold-600)" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-stone-900">
                      {msg.direction === "inbound" ? msg.from_number : msg.to_number}
                    </span>
                    <StatusBadge tone={directionConfig[msg.direction]?.tone || "neutral"}>
                      {directionConfig[msg.direction]?.label || msg.direction}
                    </StatusBadge>
                    <StatusBadge tone={statusConfig[msg.status]?.tone || "neutral"}>
                      {statusConfig[msg.status]?.label || msg.status}
                    </StatusBadge>
                  </div>
                  <p className="text-sm text-stone-600 truncate">{msg.content}</p>
                  <p className="text-xs text-stone-400 mt-1">{formatTime(msg.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showSend && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowSend(false)}
        >
          <div
            className="w-full max-w-md rounded-xl shadow-xl"
            style={{ background: "var(--stone-0, #fff)", border: "1px solid var(--stone-200)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h3 className="text-lg font-semibold text-stone-900">Enviar Mensaje WhatsApp</h3>
              <button onClick={() => setShowSend(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSend} className="p-5 space-y-4">
              <Input
                label="Numero de telefono"
                value={form.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                placeholder="18095551234"
                required
              />
              <Input
                label="ID de Reserva (opcional)"
                value={form.reservation_id}
                onChange={(e) => setForm({ ...form, reservation_id: e.target.value })}
                placeholder="UUID de la reserva"
              />
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Mensaje</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Escribe tu mensaje..."
                  rows={4}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setShowSend(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={sending}>
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Enviar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
