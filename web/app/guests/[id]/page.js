"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getGuestProfile, addGuestPreference, addGuestTag, removeGuestTag } from "@/lib/api";

const STATUS_BADGES = {
  confirmed: "bg-brand-100 text-brand-700",
  checked_in: "bg-emerald-100 text-emerald-700",
  checked_out: "bg-slate-100 text-slate-600",
  canceled: "bg-rose-100 text-rose-700",
};

const STATUS_LABELS = {
  confirmed: "Confirmada",
  checked_in: "En Curso",
  checked_out: "Finalizada",
  canceled: "Cancelada",
};

function formatMoney(cents, currency) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency }).format(cents / 100);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function GuestProfilePage() {
  const { id } = useParams();
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [prefKey, setPrefKey] = useState("");
  const [prefValue, setPrefValue] = useState("");
  const [newTag, setNewTag] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setProfile(await getGuestProfile(id, "eden-hotel"));
    } catch (err) {
      setError(err.message || "Error al cargar el perfil");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

  async function handleAddPreference(e) {
    e.preventDefault();
    if (!prefKey.trim() || !prefValue.trim()) return;
    try {
      await addGuestPreference(id, { key: prefKey.trim(), value: prefValue.trim() }, "eden-hotel");
      setPrefKey("");
      setPrefValue("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddTag(e) {
    e.preventDefault();
    const tag = newTag.trim();
    if (!tag) return;
    try {
      await addGuestTag(id, tag, "eden-hotel");
      setNewTag("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveTag(tag) {
    try {
      await removeGuestTag(id, tag, "eden-hotel");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-rose-600 font-medium">{error}</p>
        <button onClick={load} className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">Reintentar</button>
      </div>
    );
  }

  if (!profile) return null;

  const { guest, preferences = [], tags = [], reservations = [], total_stays = 0, total_spent_cents = 0, last_stay } = profile;

  const summary = [
    { label: "Total Estadias", value: total_stays },
    { label: "Total Gastado", value: formatMoney(total_spent_cents, reservations[0]?.currency || "DOP") },
    { label: "Ultima Estadia", value: formatDate(last_stay) },
    { label: "Miembro Desde", value: formatDate(guest.created_at) },
  ];

  return (
    <div>
      <button onClick={() => router.push("/guests")} className="mb-6 text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors">
        &larr; Volver
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
          {guest.first_name} {guest.last_name}
        </h1>
        <p className="text-slate-500 mt-1">{guest.email}{guest.phone ? ` · ${guest.phone}` : ""}</p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg text-sm font-medium bg-rose-50 text-rose-700 border border-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summary.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Historial de Reservas</h2>
          {reservations.length === 0 ? (
            <div className="p-16 text-center text-slate-400">Sin reservas registradas</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Habitacion</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check-in</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check-out</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 text-sm font-mono text-slate-500">{r.id.slice(0, 8)}</td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-900">{r.room_number}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{formatDate(r.check_in)}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{formatDate(r.check_out)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGES[r.status]}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-900 text-right">{formatMoney(r.total_cents, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Preferencias</h2>
            {preferences.length === 0 ? (
              <p className="py-6 text-center text-slate-400 text-sm">Sin preferencias registradas</p>
            ) : (
              <ul className="divide-y divide-slate-100 mb-4">
                {preferences.map((p, i) => (
                  <li key={`${p.key}-${i}`} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <span className="text-sm font-medium text-slate-900 capitalize">{p.key}</span>
                    <span className="text-sm text-slate-600 text-right">{p.value}</span>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleAddPreference} className="space-y-2">
              <input value={prefKey} onChange={e => setPrefKey(e.target.value)} placeholder="Preferencia (ej. piso alto)" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              <input value={prefValue} onChange={e => setPrefValue(e.target.value)} placeholder="Detalle (ej. vista al mar)" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              <button type="submit" className="w-full px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">Agregar</button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Etiquetas</h2>
            {tags.length === 0 ? (
              <p className="py-6 text-center text-slate-400 text-sm mb-4">Sin etiquetas</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-700">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-brand-200 transition-colors" title={`Quitar ${tag}`}>&times;</button>
                  </span>
                ))}
              </div>
            )}
            <form onSubmit={handleAddTag} className="flex gap-2">
              <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nueva etiqueta..." className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              <button type="submit" className="shrink-0 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">Agregar</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
