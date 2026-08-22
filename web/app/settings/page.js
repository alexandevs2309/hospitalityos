"use client";

import { useState, useEffect } from "react";
import { listRoomTypes, createRoomType, listRates, createRate } from "@/lib/api";

export default function SettingsPage() {
  const [roomTypes, setRoomTypes] = useState([]);
  const [rates, setRates] = useState([]);
  const [rtForm, setRtForm] = useState({ name: "", capacity: 2, base_price_cents: 0, currency: "DOP", amenities: "" });
  const [rateForm, setRateForm] = useState({ name: "", amount_cents: 0, currency: "DOP", start_date: "", end_date: "" });
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState("room-types");

  async function load() {
    try {
      const [rt, r] = await Promise.all([listRoomTypes("eden-hotel"), listRates("eden-hotel")]);
      setRoomTypes(rt);
      setRates(r);
    } catch (e) { console.error(e); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreateRT(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await createRoomType(rtForm, "eden-hotel");
      setMessage({ type: "success", text: "Tipo creado" });
      setRtForm({ name: "", capacity: 2, base_price_cents: 0, currency: "DOP", amenities: "" });
      load();
    } catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  async function handleCreateRate(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await createRate(rateForm, "eden-hotel");
      setMessage({ type: "success", text: "Tarifa creada" });
      setRateForm({ name: "", amount_cents: 0, currency: "DOP", start_date: "", end_date: "" });
      load();
    } catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>Configuracion</h1>
        <p className="text-slate-500 mt-1">Gestionar tipos de habitacion y tarifas</p>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${message.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {[
          { key: "room-types", label: "Tipos de Habitacion" },
          { key: "rates", label: "Tarifas" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "room-types" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Existentes ({roomTypes.length})</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {roomTypes.map(rt => (
                <div key={rt.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{rt.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{rt.capacity} personas</p>
                    </div>
                    <p className="text-sm font-semibold text-brand-600">${Math.round(rt.base_price_cents / 100).toLocaleString()} <span className="text-xs font-normal text-slate-400">/noche</span></p>
                  </div>
                </div>
              ))}
              {roomTypes.length === 0 && <div className="px-6 py-8 text-center text-slate-400 text-sm">No hay tipos creados</div>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Nuevo Tipo</h2>
            <form onSubmit={handleCreateRT} className="space-y-4">
              <input name="name" placeholder="Nombre (Standard, Suite...)" value={rtForm.name} onChange={e => setRtForm({ ...rtForm, name: e.target.value })} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input name="capacity" type="number" placeholder="Capacidad" value={rtForm.capacity} onChange={e => setRtForm({ ...rtForm, capacity: Number(e.target.value) })} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                <input name="base_price_cents" type="number" placeholder="Precio/noche (centavos)" value={rtForm.base_price_cents} onChange={e => setRtForm({ ...rtForm, base_price_cents: Number(e.target.value) })} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
              <button type="submit" className="w-full px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">Crear Tipo</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "rates" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Existentes ({rates.length})</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {rates.map(r => (
                <div key={r.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{r.start_date} a {r.end_date}</p>
                    </div>
                    <p className="text-sm font-semibold text-brand-600">${Math.round(r.amount_cents / 100).toLocaleString()} <span className="text-xs font-normal text-slate-400">/noche</span></p>
                  </div>
                </div>
              ))}
              {rates.length === 0 && <div className="px-6 py-8 text-center text-slate-400 text-sm">No hay tarifas creadas</div>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Nueva Tarifa</h2>
            <form onSubmit={handleCreateRate} className="space-y-4">
              <input name="name" placeholder="Nombre (Temporada Alta...)" value={rateForm.name} onChange={e => setRateForm({ ...rateForm, name: e.target.value })} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              <input name="amount_cents" type="number" placeholder="Precio/noche (centavos)" value={rateForm.amount_cents} onChange={e => setRateForm({ ...rateForm, amount_cents: Number(e.target.value) })} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
                  <input name="start_date" type="date" value={rateForm.start_date} onChange={e => setRateForm({ ...rateForm, start_date: e.target.value })} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
                  <input name="end_date" type="date" value={rateForm.end_date} onChange={e => setRateForm({ ...rateForm, end_date: e.target.value })} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
              </div>
              <button type="submit" className="w-full px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">Crear Tarifa</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
