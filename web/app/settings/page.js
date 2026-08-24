"use client";

import { useState, useEffect } from "react";
import { listRoomTypes, createRoomType, listRates, createRate } from "@/lib/api";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  ErrorState,
  FilterPills,
  Input,
  LoadingState,
  Select,
  SkeletonTable,
  useToast,
} from "@/components/ui";
import { Plus, Building2, DollarSign, Calendar, Loader2, Home, Euro } from "lucide-react";

const TENANT = "eden-hotel";

const TABS = [
  { key: "room-types", label: "Tipos de Habitación", icon: Building2 },
  { key: "rates", label: "Tarifas", icon: DollarSign },
];

const EMPTY_RT = { name: "", capacity: 2, base_price_cents: "", currency: "DOP" };
const EMPTY_RATE = { name: "", amount_cents: "", currency: "DOP", start_date: "", end_date: "" };

function money(cents) {
  return `$${Math.round((cents || 0) / 100).toLocaleString()}`;
}

function ListRow({ title, subtitle, price }) {
  return (
    <div
      className="flex items-center justify-between gap-4"
      style={{ padding: "14px 20px", borderBottom: "1px solid var(--stone-100)" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--stone-50)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-900">{title}</p>
        <p className="mt-0.5 text-xs text-stone-400">{subtitle}</p>
      </div>
      <p className="shrink-0 text-right">
        <span className="text-sm font-semibold text-stone-900">{money(price)}</span>
        <span className="text-xs text-stone-400"> /noche</span>
      </p>
    </div>
  );
}

function Field({ id, label, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-stone-600">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("room-types");
  const [roomTypes, setRoomTypes] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rtForm, setRtForm] = useState(EMPTY_RT);
  const [rateForm, setRateForm] = useState(EMPTY_RATE);
  const [creatingRT, setCreatingRT] = useState(false);
  const [creatingRate, setCreatingRate] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [rt, r] = await Promise.all([listRoomTypes(TENANT), listRates(TENANT)]);
      setRoomTypes(rt);
      setRates(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreateRT(e) {
    e.preventDefault();
    setCreatingRT(true);
    try {
      await createRoomType({
        name: rtForm.name,
        capacity: Number(rtForm.capacity),
        base_price_cents: Number(rtForm.base_price_cents),
        currency: rtForm.currency,
      }, TENANT);
      toast("Tipo de habitación creado", "success");
      setRtForm(EMPTY_RT);
      await load();
    } catch (err) {
      toast(err.message || "No se pudo crear el tipo", "error");
    } finally {
      setCreatingRT(false);
    }
  }

  async function handleCreateRate(e) {
    e.preventDefault();
    setCreatingRate(true);
    try {
      await createRate({
        name: rateForm.name,
        amount_cents: Number(rateForm.amount_cents),
        currency: rateForm.currency,
        start_date: rateForm.start_date,
        end_date: rateForm.end_date,
      }, TENANT);
      toast("Tarifa creada", "success");
      setRateForm(EMPTY_RATE);
      await load();
    } catch (err) {
      toast(err.message || "No se pudo crear la tarifa", "error");
    } finally {
      setCreatingRate(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Configuración</h1>
        <p className="mt-1 text-sm text-stone-400">Gestionar tipos de habitación y tarifas</p>
      </div>

      <FilterPills
        options={TABS.map(({ key, label, icon: Icon }) => ({ key, label, icon: <Icon className="w-3.5 h-3.5 mr-1" /> }))}
        value={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {error && !loading ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <SkeletonTable rows={4} cols={3} />
      ) : activeTab === "room-types" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card style={{ overflow: "hidden" }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-stone-500" />
                <h2 className="text-base font-semibold text-stone-900">Tipos de Habitación ({roomTypes.length})</h2>
              </div>
            </CardHeader>
            {roomTypes.length === 0 ? (
              <EmptyState
                icon={<Building2 className="w-12 h-12 text-stone-300" />}
                title="No hay tipos de habitación"
                description="Crea el primer tipo desde el formulario."
              />
            ) : (
              roomTypes.map((rt) => (
                <ListRow key={rt.id} title={rt.name} subtitle={`${rt.capacity} personas`} price={rt.base_price_cents} />
              ))
            )}
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-stone-500" />
                <h2 className="text-base font-semibold text-stone-900">Nuevo Tipo</h2>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateRT} className="space-y-4">
                <Field id="rt-name" label="Nombre *">
                  <Input id="rt-name" placeholder="Standard, Suite..." value={rtForm.name} onChange={(e) => setRtForm({ ...rtForm, name: e.target.value })} required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field id="rt-capacity" label="Capacidad *">
                    <Input id="rt-capacity" type="number" min="1" placeholder="2" value={rtForm.capacity} onChange={(e) => setRtForm({ ...rtForm, capacity: e.target.value })} required />
                  </Field>
                  <Field id="rt-currency" label="Moneda">
                    <Select id="rt-currency" value={rtForm.currency} onChange={(e) => setRtForm({ ...rtForm, currency: e.target.value })}>
                      <option value="DOP">DOP</option>
                      <option value="USD">USD</option>
                    </Select>
                  </Field>
                </div>
                <Field id="rt-price" label="Precio por noche (centavos) *">
                  <Input id="rt-price" type="number" min="0" placeholder="850000" value={rtForm.base_price_cents} onChange={(e) => setRtForm({ ...rtForm, base_price_cents: e.target.value })} required />
                </Field>
                <Button type="submit" loading={creatingRT} className="w-full">
                  <Plus className="w-4 h-4 mr-1" /> Crear Tipo
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card style={{ overflow: "hidden" }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-stone-500" />
                <h2 className="text-base font-semibold text-stone-900">Tarifas ({rates.length})</h2>
              </div>
            </CardHeader>
            {rates.length === 0 ? (
              <EmptyState
                icon={<DollarSign className="w-12 h-12 text-stone-300" />}
                title="No hay tarifas creadas"
                description="Define tarifas por temporada desde el formulario."
              />
            ) : (
              rates.map((r) => (
                <ListRow key={r.id} title={r.name} subtitle={`${r.start_date} a ${r.end_date}`} price={r.amount_cents} />
              ))
            )}
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-stone-500" />
                <h2 className="text-base font-semibold text-stone-900">Nueva Tarifa</h2>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateRate} className="space-y-4">
                <Field id="rate-name" label="Nombre *">
                  <Input id="rate-name" placeholder="Temporada Alta..." value={rateForm.name} onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })} required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field id="rate-price" label="Precio por noche (centavos) *">
                    <Input id="rate-price" type="number" min="0" placeholder="1200000" value={rateForm.amount_cents} onChange={(e) => setRateForm({ ...rateForm, amount_cents: e.target.value })} required />
                  </Field>
                  <Field id="rate-currency" label="Moneda">
                    <Select id="rate-currency" value={rateForm.currency} onChange={(e) => setRateForm({ ...rateForm, currency: e.target.value })}>
                      <option value="DOP">DOP</option>
                      <option value="USD">USD</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field id="rate-start" label="Desde *">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <Input id="rate-start" type="date" value={rateForm.start_date} onChange={(e) => setRateForm({ ...rateForm, start_date: e.target.value })} required className="pl-10" />
                    </div>
                  </Field>
                  <Field id="rate-end" label="Hasta *">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <Input id="rate-end" type="date" value={rateForm.end_date} onChange={(e) => setRateForm({ ...rateForm, end_date: e.target.value })} required className="pl-10" />
                    </div>
                  </Field>
                </div>
                <Button type="submit" loading={creatingRate} className="w-full">
                  <Plus className="w-4 h-4 mr-1" /> Crear Tarifa
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}