"use client";

import { useState, useEffect } from "react";
import { listGuests, createGuest } from "@/lib/api";
import Link from "next/link";
import { Card, CardContent, Button, Modal, Input, LoadingState, ErrorState, EmptyState, PageHeader, useToast } from "@/components/ui";

export default function GuestsPage() {
  const toast = useToast();
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  async function load(q) {
    try {
      setGuests(await listGuests("eden-hotel", q || undefined));
      setLoadError(null);
    } catch (e) {
      setLoadError(e.message || "No se pudieron cargar los huespedes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { const t = setTimeout(() => load(search), 300); return () => clearTimeout(t); }, [search]);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createGuest(form, "eden-hotel");
      toast.success("Huesped creado");
      setForm({ first_name: "", last_name: "", email: "", phone: "" });
      setShowModal(false);
      load(search);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Huespedes"
        description={`${guests.length} huespedes registrados`}
        actions={
          <Button onClick={() => setShowModal(true)}>+ Nuevo Huesped</Button>
        }
      />

      <div className="mb-6">
        <Input
          type="search"
          placeholder="Buscar por nombre, email o telefono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md"
        />
      </div>

      {loading ? (
        <Card>
          <LoadingState label="Cargando huespedes..." />
        </Card>
      ) : loadError ? (
        <Card>
          <ErrorState message={loadError} onRetry={() => load(search)} />
        </Card>
      ) : (
        <Card className="overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          {guests.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              }
              title={search ? "Sin resultados" : "No hay huespedes registrados"}
              description={search ? `No se encontraron huespedes para "${search}"` : "Registra el primer huesped del hotel"}
              action={!search && <Button onClick={() => setShowModal(true)}>Registrar primer huesped</Button>}
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nombre</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Telefono</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 flex items-center justify-center text-xs font-bold">
                          {g.first_name?.[0]}{g.last_name?.[0]}
                        </div>
                        <Link href={`/guests/${g.id}`} className="text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline dark:text-brand-400 dark:hover:text-brand-300">{g.first_name} {g.last_name}</Link>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{g.email}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{g.phone || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo Huesped">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="first_name" placeholder="Nombre" value={form.first_name} onChange={handleChange} required />
            <Input name="last_name" placeholder="Apellido" value={form.last_name} onChange={handleChange} required />
          </div>
          <Input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          <Input name="phone" placeholder="Telefono" value={form.phone} onChange={handleChange} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit">Crear</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
