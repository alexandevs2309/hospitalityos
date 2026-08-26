"use client";

import { Suspense, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getGuestProfile, addGuestPreference, addGuestTag, removeGuestTag } from "@/lib/api";
import { Button, Card, CardContent, StatusBadge, Input, LoadingState, ErrorState, useToast } from "@/components/ui";

const STATUS_BADGES = {
  confirmed: "gold",
  checked_in: "success",
  checked_out: "neutral",
  canceled: "danger",
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

function GuestProfileContent() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();

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
      toast(err.message, "error");
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
      toast(err.message, "error");
    }
  }

  async function handleRemoveTag(tag) {
    try {
      await removeGuestTag(id, tag, "eden-hotel");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  if (loading) return <LoadingState label="Cargando perfil..." />;
  if (error && !profile) return <Card><ErrorState message={error} onRetry={load} /></Card>;
  if (!profile) return null;

  const { tags = [], total_stays = 0, total_spent_cents = 0, last_stay_date, currency = "DOP" } = profile;
  const guest = profile;
  const prefObj = profile.preferences || {};
  const preferences = Object.entries(prefObj).map(([key, value]) => ({ key, value: String(value) }));

  const summary = [
    { label: "Total Estadias", value: total_stays },
    { label: "Total Gastado", value: formatMoney(total_spent_cents, currency) },
    { label: "Ultima Estadia", value: formatDate(last_stay_date) },
    { label: "Estancia Promedio", value: `${(profile.average_stay_nights || 0)} noches` },
  ];

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => router.push("/guests")}
        className="mb-6 inline-flex items-center gap-1"
        style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--stone-500)", background: "none", border: "none", cursor: "pointer" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--stone-900)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--stone-500)"; }}
      >
        &larr; Volver
      </button>

      <div className="mb-6 flex items-center gap-4">
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: "56px", height: "56px", borderRadius: "var(--radius-full)", background: "var(--gold-100)", color: "var(--gold-700)", fontSize: "var(--text-xl)", fontWeight: 700 }}
        >
          {guest.first_name?.[0]}{guest.last_name?.[0]}
        </div>
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 600, color: "var(--stone-900)" }}>{guest.first_name} {guest.last_name}</h1>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--stone-400)" }}>{guest.email}{guest.phone ? ` · ${guest.phone}` : ""}</p>
        </div>
      </div>

      {error && (
        <Card className="mb-6" style={{ background: "var(--rose-50)", borderColor: "var(--rose-200)" }}>
          <CardContent><p style={{ fontSize: "var(--text-sm)", color: "var(--rose-700)" }}>{error}</p></CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summary.map(card => (
          <Card key={card.label}>
            <CardContent>
              <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--stone-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{card.label}</p>
              <p className="mt-2 tabular-nums" style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--stone-900)" }}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card style={{ overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--stone-100)" }}>
              <h2 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--stone-900)" }}>Datos del Huesped</h2>
            </div>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--stone-500)", textTransform: "uppercase" }}>Email</p>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--stone-900)" }}>{guest.email || "-"}</p>
                </div>
                <div>
                  <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--stone-500)", textTransform: "uppercase" }}>Telefono</p>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--stone-900)" }}>{guest.phone || "-"}</p>
                </div>
                <div>
                  <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--stone-500)", textTransform: "uppercase" }}>Pais</p>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--stone-900)" }}>{guest.country || "-"}</p>
                </div>
                <div>
                  <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--stone-500)", textTransform: "uppercase" }}>Documento</p>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--stone-900)" }}>{guest.id_type ? `${guest.id_type}: ` : ""}{guest.id_number || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--stone-100)" }}>
              <h2 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--stone-900)" }}>Preferencias</h2>
            </div>
            <CardContent>
              {preferences.length > 0 && (
                <div className="mb-4">
                  {preferences.map((p, i) => (
                    <div key={`${p.key}-${i}`} className="flex items-start justify-between gap-4" style={{ padding: "10px 0", borderBottom: i < preferences.length - 1 ? "1px solid var(--stone-100)" : "none" }}>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--stone-900)", textTransform: "capitalize" }}>{p.key}</span>
                      <span style={{ fontSize: "var(--text-sm)", color: "var(--stone-600)" }}>{p.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {preferences.length === 0 && (
                <p className="mb-4" style={{ fontSize: "var(--text-sm)", color: "var(--stone-400)", textAlign: "center", padding: "16px 0" }}>Sin preferencias</p>
              )}
              <form onSubmit={handleAddPreference} className="space-y-2">
                <Input value={prefKey} onChange={e => setPrefKey(e.target.value)} placeholder="Preferencia (ej. piso alto)" />
                <Input value={prefValue} onChange={e => setPrefValue(e.target.value)} placeholder="Detalle (ej. vista al mar)" />
                <Button type="submit" className="w-full">Agregar</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--stone-100)" }}>
              <h2 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--stone-900)" }}>Etiquetas</h2>
            </div>
            <CardContent>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1.5" style={{ padding: "4px 10px", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)", fontWeight: 600, background: "var(--gold-100)", color: "var(--gold-700)" }}>
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gold-500)", padding: "0", lineHeight: 1 }} title={`Quitar ${tag}`}>&times;</button>
                    </span>
                  ))}
                </div>
              )}
              {tags.length === 0 && (
                <p className="mb-4" style={{ fontSize: "var(--text-sm)", color: "var(--stone-400)", textAlign: "center", padding: "16px 0" }}>Sin etiquetas</p>
              )}
              <form onSubmit={handleAddTag} className="flex gap-2">
                <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nueva etiqueta..." className="flex-1 min-w-0" />
                <Button type="submit">Agregar</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function GuestProfilePage() {
  return (
    <Suspense fallback={<div className="p-6"><div className="animate-pulse h-8 w-48 rounded" style={{ background: "var(--stone-200)" }} /></div>}>
      <GuestProfileContent />
    </Suspense>
  );
}
