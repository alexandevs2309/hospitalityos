"use client";

import { useState, useEffect } from "react";
import { getCRMSegments, listCRMGuests, getGuestStayHistory, getGuestCommunications } from "@/lib/api";
import {
  Button,
  Card,
  CardContent,
  Input,
  LoadingState,
  ErrorState,
  EmptyState,
  StatusBadge,
  Modal,
  useToast,
} from "@/components/ui";
import { Users, Search, Crown, Building2, UserCheck, UserPlus, Star, MessageCircle, History, X, ArrowUpRight, ArrowDownLeft } from "lucide-react";

const TENANT = "eden-hotel";

const segmentConfig = {
  vip: { label: "VIP", icon: Crown, tone: "gold" },
  corporate: { label: "Corporativo", icon: Building2, tone: "info" },
  returning: { label: "Recurrente", icon: UserCheck, tone: "success" },
  new: { label: "Nuevo", icon: UserPlus, tone: "info" },
  checked_in: { label: "En Hotel", icon: Users, tone: "success" },
  total: { label: "Total", icon: Users, tone: "default" },
  loyal: { label: "Leal", icon: Star, tone: "gold" },
  high_value: { label: "Alto Valor", icon: Crown, tone: "gold" },
};

function formatCents(c) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format((c || 0) / 100);
}

export default function CRMPage() {
  const toast = useToast();
  const [segments, setSegments] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [history, setHistory] = useState([]);
  const [comms, setComms] = useState([]);
  const [detailTab, setDetailTab] = useState("history");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [segRes, guestRes] = await Promise.all([
        getCRMSegments(TENANT),
        listCRMGuests(TENANT, filter ? { segment: filter } : {}),
      ]);
      setSegments(segRes.segments || []);
      setGuests(guestRes.guests || []);
    } catch (e) {
      setError(e.message || "Error al cargar CRM");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  async function openDetail(guest) {
    setSelectedGuest(guest);
    setDetailTab("history");
    try {
      const [h, c] = await Promise.all([
        getGuestStayHistory(guest.id, TENANT),
        getGuestCommunications(guest.id, TENANT),
      ]);
      setHistory(h.stays || []);
      setComms(c.communications || []);
    } catch (e) {
      toast("Error cargando detalle: " + e.message, "error");
    }
  }

  const filtered = guests.filter(g =>
    !search || [g.first_name, g.last_name, g.email, g.phone].some(f => (f || "").toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <LoadingState message="Cargando CRM..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">CRM</h1>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar huesped..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {segments.map(s => {
          const cfg = segmentConfig[s.name] || segmentConfig.total;
          const Icon = cfg.icon;
          return (
            <button
              key={s.name}
              onClick={() => setFilter(filter === s.name ? "" : s.name)}
              className={`p-4 rounded-lg border text-left transition-all ${
                filter === s.name ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{cfg.label}</span>
              </div>
              <div className="text-2xl font-bold">{s.count}</div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No se encontraron huespedes" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-muted-foreground font-medium">Nombre</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Email</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Telefono</th>
                    <th className="text-center p-3 text-muted-foreground font-medium">Estadias</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Total Gastado</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Segmento</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Tags</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(g => (
                    <tr key={g.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-3 font-medium">{g.first_name} {g.last_name}</td>
                      <td className="p-3 text-muted-foreground">{g.email || "-"}</td>
                      <td className="p-3 text-muted-foreground">{g.phone || "-"}</td>
                      <td className="p-3 text-center">{g.total_stays}</td>
                      <td className="p-3 text-right">{formatCents(g.total_spent_cents)}</td>
                      <td className="p-3">
                        <StatusBadge tone={segmentConfig[g.segment]?.tone || "default"}>
                          {segmentConfig[g.segment]?.label || g.segment}
                        </StatusBadge>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {(g.tags || []).map(t => (
                            <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <Button size="sm" variant="outline" onClick={() => openDetail(g)}>
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Modal open={!!selectedGuest} onClose={() => setSelectedGuest(null)}>
        {selectedGuest && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedGuest.first_name} {selectedGuest.last_name}</h2>
                <p className="text-sm text-muted-foreground">{selectedGuest.email} · {selectedGuest.phone}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedGuest(null)}><X className="w-4 h-4" /></Button>
            </div>

            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Estadias:</span> <span className="font-medium">{selectedGuest.total_stays}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span> <span className="font-medium">{formatCents(selectedGuest.total_spent_cents)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Promedio:</span> <span className="font-medium">{selectedGuest.average_stay_nights} noches</span>
              </div>
            </div>

            <div className="flex gap-2 border-b border-border">
              <button
                className={`pb-2 px-1 text-sm font-medium border-b-2 ${detailTab === "history" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
                onClick={() => setDetailTab("history")}
              >
                <History className="w-4 h-4 inline mr-1" />Historial
              </button>
              <button
                className={`pb-2 px-1 text-sm font-medium border-b-2 ${detailTab === "comms" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
                onClick={() => setDetailTab("comms")}
              >
                <MessageCircle className="w-4 h-4 inline mr-1" />Comunicaciones
              </button>
            </div>

            {detailTab === "history" && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin historial de estadias</p>
                ) : history.map(s => (
                  <div key={s.reservation_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                    <div>
                      <div className="font-medium">Hab. {s.room_number || "-"}</div>
                      <div className="text-muted-foreground">{s.check_in} → {s.check_out} ({s.nights} noches)</div>
                    </div>
                    <div className="text-right">
                      <StatusBadge tone={s.status === "checked_out" ? "default" : "success"}>{s.status}</StatusBadge>
                      <div className="text-muted-foreground mt-1">{formatCents(s.total_cents)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detailTab === "comms" && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {comms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin comunicaciones registradas</p>
                ) : comms.map(c => (
                  <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${c.direction === "outbound" ? "bg-primary/20" : "bg-success/20"}`}>
                      {c.direction === "outbound" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("es-DO")}</div>
                      <div>{c.content}</div>
                    </div>
                    <StatusBadge tone={c.status === "read" ? "gold" : c.status === "delivered" ? "success" : "info"}>
                      {c.status}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
