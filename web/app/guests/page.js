"use client";

import { useState, useEffect } from "react";
import { listGuests, createGuest } from "@/lib/api";
import Link from "next/link";
import {
  Button,
  Card,
  Input,
  Modal,
  LoadingState,
  ErrorState,
  EmptyState,
  useToast,
} from "@/components/ui";
import { Plus, User, Mail, Phone, Search, Loader2, X } from "lucide-react";

const TH = {
  padding: "12px 20px",
  textAlign: "left",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--stone-400)",
};

const EMPTY_FORM = { first_name: "", last_name: "", email: "", phone: "" };

export default function GuestsPage() {
  const toast = useToast();
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  async function load(q) {
    try {
      setGuests(await listGuests("eden-hotel", q || undefined));
      setLoadError(null);
    } catch (e) {
      setLoadError(e.message || "No se pudieron cargar los huéspedes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await createGuest(form, "eden-hotel");
      toast("Huésped creado", "success");
      setForm(EMPTY_FORM);
      setShowModal(false);
      await load(search);
    } catch (err) {
      toast(err.message || "No se pudo crear el huésped", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "24px" }}>
        <h1 className="text-2xl font-semibold text-stone-900">Huéspedes</h1>
        <p className="text-sm text-stone-400 mt-1">{guests.length} huéspedes registrados</p>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            type="search"
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <Card>
          <LoadingState label="Cargando huéspedes..." />
        </Card>
      ) : loadError ? (
        <Card>
          <ErrorState message={loadError} onRetry={() => load(search)} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {guests.length === 0 ? (
            <EmptyState
              icon={<User className="w-12 h-12 text-stone-300" />}
              title={search ? "Sin resultados" : "No hay huéspedes registrados"}
              description={search ? `No se encontraron huéspedes para "${search}"` : "Registra el primer huésped del hotel"}
              action={!search && <Button onClick={() => setShowModal(true)}>Registrar primer huésped</Button>}
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--stone-200)", background: "var(--stone-50)" }}>
                  <th style={TH}>Nombre</th>
                  <th style={TH}>Email</th>
                  <th style={TH}>Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr
                    key={g.id}
                    style={{ borderBottom: "1px solid var(--stone-100)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--stone-50)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ padding: "14px 20px" }}>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex w-8 h-8 shrink-0 items-center justify-center rounded-full"
                          style={{ background: "var(--gold-100)", color: "var(--gold-700)", fontSize: "var(--text-xs)", fontWeight: 700 }}
                        >
                          {`${g.first_name?.[0] || ""}${g.last_name?.[0] || ""}`.toUpperCase()}
                        </div>
                        <Link
                          href={`/guests/${g.id}`}
                          style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--stone-900)", textDecoration: "none" }}
                          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                        >
                          {g.first_name} {g.last_name}
                        </Link>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "var(--text-sm)", color: "var(--stone-600)" }}>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-stone-300" />
                        {g.email}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "var(--text-sm)", color: "var(--stone-600)" }}>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-stone-300" />
                        {g.phone || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo Huésped">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input name="first_name" placeholder="Nombre" value={form.first_name} onChange={handleChange} required />
            <Input name="last_name" placeholder="Apellido" value={form.last_name} onChange={handleChange} required />
          </div>
          <Input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          <Input name="phone" placeholder="Teléfono" value={form.phone} onChange={handleChange} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={creating}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}