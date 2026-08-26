"use client";

import { useState, useEffect, useRef } from "react";
import { listWhatsAppMessages, sendWhatsAppMessage } from "@/lib/api";
import {
  Button, Card, CardContent, Input, LoadingState, EmptyState,
  Modal, useToast,
} from "@/components/ui";
import {
  MessageCircle, Send, Search, ArrowUpRight, ArrowDownLeft,
  Phone, User, Sparkles, Wrench, Utensils, Loader2, X, RefreshCw,
} from "lucide-react";

const TENANT = "eden-hotel";

const SERVICE_ACTIONS = [
  { label: "Room Service", icon: Utensils, message: "Hola, necesito room service por favor." },
  { label: "Housekeeping", icon: Sparkles, message: "Hola, puedo solicitar limpieza de habitacion?" },
  { label: "Mantenimiento", icon: Wrench, message: "Hola, tengo un reporte de mantenimiento." },
];

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return "Hoy";
  if (diff < 172800000) return "Ayer";
  return d.toLocaleDateString("es-DO", { day: "2-digit", month: "short" });
}

function groupByPhone(messages) {
  const map = {};
  messages.forEach((msg) => {
    const phone = msg.direction === "inbound" ? msg.from_number : msg.to_number;
    if (!phone) return;
    if (!map[phone]) map[phone] = { phone, messages: [], lastAt: null, unread: 0 };
    map[phone].messages.push(msg);
    if (!map[phone].lastAt || msg.created_at > map[phone].lastAt) {
      map[phone].lastAt = msg.created_at;
    }
    if (msg.direction === "inbound" && msg.status !== "read") {
      map[phone].unread++;
    }
  });
  return Object.values(map).sort((a, b) => (b.lastAt || "").localeCompare(a.lastAt || ""));
}

const STATUS_COLOR = {
  sent: "var(--blue-500)", delivered: "var(--emerald-500)", read: "var(--gold-500)",
  received: "var(--stone-400)", failed: "var(--rose-500)",
};

export default function WhatsAppPage() {
  const toast = useToast();
  const chatEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePhone, setActivePhone] = useState(null);
  const [search, setSearch] = useState("");
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [showService, setShowService] = useState(false);

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
  useEffect(() => {
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activePhone]);

  const conversations = groupByPhone(messages);
  const activeConvo = conversations.find((c) => c.phone === activePhone);
  const chatMessages = activeConvo?.messages || [];

  const filteredConvos = conversations.filter((c) =>
    c.phone.includes(search) || search === ""
  );

  async function handleSend(e) {
    e.preventDefault();
    if (!inputText.trim() || !activePhone) return;
    setSending(true);
    try {
      await sendWhatsAppMessage({ to: activePhone, message: inputText.trim() }, TENANT);
      setInputText("");
      load();
    } catch (e) {
      toast(e.message || "Error al enviar", "error");
    } finally {
      setSending(false);
    }
  }

  async function handleServiceAction(action) {
    if (!activePhone) return;
    setShowService(false);
    setSending(true);
    try {
      await sendWhatsAppMessage({ to: activePhone, message: action.message }, TENANT);
      toast(`Mensaje de ${action.label} enviado`, "success");
      load();
    } catch (e) {
      toast(e.message || "Error al enviar", "error");
    } finally {
      setSending(false);
    }
  }

  if (loading && messages.length === 0) return <LoadingState label="Cargando WhatsApp..." />;

  return (
    <div className="animate-fade-in" style={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--stone-900)" }}>WhatsApp</h1>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--stone-400)" }}>
            {conversations.length} conversaciones activas
          </p>
        </div>
        <Button onClick={load} variant="secondary" icon={RefreshCw}>Actualizar</Button>
      </div>

      {error && (
        <Card className="mb-4" style={{ background: "var(--rose-50)", borderColor: "var(--rose-200)" }}>
          <CardContent><p style={{ fontSize: "var(--text-sm)", color: "var(--rose-700)" }}>{error}</p></CardContent>
        </Card>
      )}

      {/* Main Chat Layout */}
      <div className="flex flex-1 min-h-0 gap-0 rounded-xl overflow-hidden" style={{ border: "1px solid var(--stone-200)" }}>
        {/* Conversations Sidebar */}
        <div className="w-80 shrink-0 flex flex-col" style={{ borderRight: "1px solid var(--stone-200)", background: "var(--stone-50)" }}>
          <div className="p-3" style={{ borderBottom: "1px solid var(--stone-200)" }}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--stone-400)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar telefono..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg"
                style={{ border: "1px solid var(--stone-200)", background: "white", outline: "none" }}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConvos.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle size={32} style={{ color: "var(--stone-300)", margin: "0 auto" }} />
                <p style={{ fontSize: "var(--text-sm)", color: "var(--stone-400)", marginTop: "8px" }}>Sin conversaciones</p>
              </div>
            ) : (
              filteredConvos.map((convo) => {
                const lastMsg = convo.messages[convo.messages.length - 1];
                const isActive = convo.phone === activePhone;
                return (
                  <button
                    key={convo.phone}
                    onClick={() => setActivePhone(convo.phone)}
                    className="w-full text-left p-3 flex items-start gap-3 transition-colors"
                    style={{
                      background: isActive ? "var(--gold-50)" : "transparent",
                      borderLeft: isActive ? "3px solid var(--gold-500)" : "3px solid transparent",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--stone-100)"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: "40px", height: "40px", borderRadius: "var(--radius-full)",
                        background: "var(--stone-200)", color: "var(--stone-600)",
                      }}
                    >
                      <User size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--stone-900)" }}>
                          {convo.phone}
                        </span>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--stone-400)" }}>
                          {formatDate(convo.lastAt)}
                        </span>
                      </div>
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--stone-500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
                        {lastMsg?.content || ""}
                      </p>
                    </div>
                    {convo.unread > 0 && (
                      <span
                        className="flex items-center justify-center shrink-0"
                        style={{
                          minWidth: "20px", height: "20px", borderRadius: "var(--radius-full)",
                          background: "var(--gold-500)", color: "white",
                          fontSize: "11px", fontWeight: 700, padding: "0 6px",
                        }}
                      >
                        {convo.unread}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: "white" }}>
          {!activePhone ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={<MessageCircle size={48} style={{ color: "var(--stone-200)" }} />}
                title="Selecciona una conversacion"
                description="Elige una conversacion de la izquierda para ver los mensajes"
              />
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--stone-100)" }}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: "36px", height: "36px", borderRadius: "var(--radius-full)",
                      background: "var(--gold-100)", color: "var(--gold-700)", fontWeight: 700, fontSize: "var(--text-sm)",
                    }}
                  >
                    <Phone size={16} />
                  </div>
                  <div>
                    <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--stone-900)" }}>{activePhone}</p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--stone-400)" }}>{chatMessages.length} mensajes</p>
                  </div>
                </div>
                <Button onClick={() => setShowService(true)} variant="secondary" icon={Sparkles} size="sm">
                  Servicios
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4" style={{ background: "var(--stone-50)" }}>
                <div className="flex flex-col gap-3">
                  {chatMessages.map((msg) => {
                    const isOut = msg.direction === "outbound";
                    return (
                      <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                        <div
                          className="max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl"
                          style={{
                            background: isOut ? "var(--gold-100)" : "white",
                            color: "var(--stone-900)",
                            borderTopRightRadius: isOut ? "4px" : undefined,
                            borderTopLeftRadius: !isOut ? "4px" : undefined,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          }}
                        >
                          <p style={{ fontSize: "var(--text-sm)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{msg.content}</p>
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                            <span style={{ fontSize: "10px", color: "var(--stone-400)" }}>{formatTime(msg.created_at)}</span>
                            {isOut && (
                              <span style={{ fontSize: "10px", color: STATUS_COLOR[msg.status] || "var(--stone-400)" }}>
                                {msg.status === "read" ? "✓✓" : msg.status === "delivered" ? "✓✓" : msg.status === "sent" ? "✓" : "○"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--stone-100)" }}>
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-2.5 text-sm rounded-full"
                  style={{ border: "1px solid var(--stone-200)", outline: "none", background: "white" }}
                  disabled={sending}
                />
                <Button type="submit" disabled={!inputText.trim() || sending} variant="primary" icon={sending ? Loader2 : Send}>
                  {sending ? "" : ""}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Service Actions Modal */}
      {showService && (
        <Modal onClose={() => setShowService(false)}>
          <div style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--stone-900)", marginBottom: "16px" }}>
              Enviar Solicitud de Servicio
            </h3>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--stone-500)", marginBottom: "20px" }}>
              Envia un mensaje predefinido a {activePhone}
            </p>
            <div className="flex flex-col gap-3">
              {SERVICE_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => handleServiceAction(action)}
                    className="flex items-center gap-4 p-4 rounded-xl text-left transition-colors"
                    style={{ border: "1px solid var(--stone-200)", background: "white" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold-300)"; e.currentTarget.style.background = "var(--gold-50)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--stone-200)"; e.currentTarget.style.background = "white"; }}
                  >
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: "40px", height: "40px", borderRadius: "var(--radius-lg)",
                        background: "var(--gold-100)", color: "var(--gold-600)",
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--stone-900)" }}>{action.label}</p>
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--stone-500)" }}>{action.message}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-5">
              <Button variant="secondary" onClick={() => setShowService(false)}>Cerrar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
