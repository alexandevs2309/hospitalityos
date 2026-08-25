"use client";

import { useState, useEffect } from "react";
import { getRevenueSuggestions, getRevenueForecast, applySeasonPrice } from "@/lib/api";
import {
  Button, Card, CardContent, StatusBadge, LoadingState, ErrorState, useToast,
} from "@/components/ui";
import { TrendingUp, TrendingDown, Minus, DollarSign, BarChart3, Loader2 } from "lucide-react";

const TENANT = "eden-hotel";

function formatCents(c) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format((c || 0) / 100);
}

const demandConfig = {
  low: { label: "Baja", tone: "info", color: "text-blue-500" },
  medium: { label: "Media", tone: "gold", color: "text-amber-500" },
  high: { label: "Alta", tone: "success", color: "text-emerald-500" },
};

export default function RevenuePage() {
  const toast = useToast();
  const [suggestions, setSuggestions] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(null);
  const [tab, setTab] = useState("suggestions");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [sRes, fRes] = await Promise.all([
        getRevenueSuggestions(TENANT),
        getRevenueForecast(TENANT),
      ]);
      setSuggestions(sRes.suggestions || []);
      setForecast(fRes.forecasts || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleApply(s) {
    setApplying(s.room_type_id + s.date);
    try {
      const res = await applySeasonPrice({
        room_type_id: s.room_type_id,
        date: s.date,
        new_price_cents: s.suggested_price_cents,
      }, TENANT);
      if (res.error) throw new Error(res.error.message);
      toast("Precio aplicado: " + s.room_type_name + " " + s.date, "success");
      load();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setApplying(null);
    }
  }

  const groupedByDate = suggestions.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

  if (loading) return <LoadingState message="Cargando Revenue Management..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Revenue Management</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Sugerencias</div>
          <div className="text-2xl font-bold">{suggestions.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Proximos 30 dias</div>
          <div className="text-2xl font-bold">{forecast.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Revenue Esperado Hoy</div>
          <div className="text-2xl font-bold">{formatCents(forecast[0]?.expected_revenue_cents || 0)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Ocupacion Promedio</div>
          <div className="text-2xl font-bold">{forecast.length ? Math.round(forecast.slice(0, 7).reduce((s, f) => s + f.occupancy_rate, 0) / 7 * 100) : 0}%</div>
        </CardContent></Card>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button className={`pb-2 px-1 text-sm font-medium border-b-2 ${tab === "suggestions" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`} onClick={() => setTab("suggestions")}>
          <DollarSign className="w-4 h-4 inline mr-1" />Sugerencias de Precio
        </button>
        <button className={`pb-2 px-1 text-sm font-medium border-b-2 ${tab === "forecast" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`} onClick={() => setTab("forecast")}>
          <BarChart3 className="w-4 h-4 inline mr-1" />Forecast 30 Dias
        </button>
      </div>

      {tab === "suggestions" && (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{date}</h3>
              <div className="grid gap-3">
                {items.map(s => {
                  const diff = s.suggested_price_cents - s.current_price_cents;
                  const diffPct = s.current_price_cents > 0 ? Math.round(diff / s.current_price_cents * 100) : 0;
                  const isApplying = applying === s.room_type_id + s.date;
                  return (
                    <Card key={s.room_type_id}>
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-medium">{s.room_type_name}</div>
                          <div className="text-sm text-muted-foreground mt-0.5">{s.reason}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Actual</div>
                          <div className="font-medium">{formatCents(s.current_price_cents)}</div>
                        </div>
                        <div className="text-center px-3">
                          {diff > 0 ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : diff < 0 ? <TrendingDown className="w-5 h-5 text-red-500" /> : <Minus className="w-5 h-5 text-muted-foreground" />}
                          <div className={`text-xs font-medium ${diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                            {diffPct > 0 ? "+" : ""}{diffPct}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Sugerido</div>
                          <div className="font-semibold text-primary">{formatCents(s.suggested_price_cents)}</div>
                        </div>
                        <div className="text-right min-w-[60px]">
                          <StatusBadge tone={demandConfig[s.demand]?.tone || "default"}>
                            {demandConfig[s.demand]?.label || s.demand}
                          </StatusBadge>
                          <div className="text-xs text-muted-foreground mt-1">{Math.round(s.occupancy_pct * 100)}% occ</div>
                        </div>
                        <Button size="sm" onClick={() => handleApply(s)} disabled={isApplying}>
                          {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : "Aplicar"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
          {suggestions.length === 0 && <p className="text-center text-muted-foreground py-8">Sin sugerencias disponibles</p>}
        </div>
      )}

      {tab === "forecast" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-muted-foreground font-medium">Fecha</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Ocupacion</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Revenue Esperado</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.map(f => (
                    <tr key={f.date} className="border-b border-border hover:bg-muted/30">
                      <td className="p-3 font-medium">{f.date}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(f.occupancy_rate * 100)}%` }} />
                          </div>
                          <span className="w-12 text-right">{Math.round(f.occupancy_rate * 100)}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium">{formatCents(f.expected_revenue_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
