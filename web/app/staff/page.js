"use client";

import { useState, useEffect } from "react";
import { listStaff, createStaff, updateStaffRole } from "@/lib/api";
import {
  Button,
  Card,
  CardContent,
  StatusBadge,
  Modal,
  Input,
  Select,
  LoadingState,
  ErrorState,
  EmptyState,
  useToast,
} from "@/components/ui";
import { Plus, Users, Shield, UserCheck, Loader2, X } from "lucide-react";

const ROLES = ["admin", "manager", "front_desk", "housekeeping", "maintenance", "read_only"];

const roleConfig = {
  admin: { label: "Admin", tone: "gold" },
  manager: { label: "Gerente", tone: "info" },
  front_desk: { label: "Recepción", tone: "success" },
  housekeeping: { label: "Housekeeping", tone: "warning" },
  maintenance: { label: "Mantenimiento", tone: "danger" },
  read_only: { label: "Solo Lectura", tone: "neutral" },
};

const TH = {
  padding: "12px 20px",
  textAlign: "left",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--stone-400)",
};

const EMPTY_FORM = { full_name: "", email: "", password: "", role: "front_desk" };

function StatCard({ label, value }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-400">{label}</p>
        <p className="mt-1 tabular-nums text-2xl font-semibold text-stone-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const toast = useToast();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setStaff(await listStaff("eden-hotel"));
    } catch (e) {
      setError(e.message || "Error al cargar el personal");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await createStaff(form, "eden-hotel");
      toast("Miembro del personal creado", "success");
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      toast(err.message || "No se pudo crear el miembro del personal", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(id, role) {
    try {
      await updateStaffRole(id, role, "eden-hotel");
      toast("Rol actualizado", "success");
      await load();
    } catch (err) {
      toast(err.message || "No se pudo actualizar el rol", "error");
    }
  }

  const counts = {
    total: staff.length,
    admin: staff.filter((s) => s.role === "admin").length,
    manager: staff.filter((s) => s.role === "manager").length,
    front_desk: staff.filter((s) => s.role === "front_desk").length,
    housekeeping: staff.filter((s) => s.role === "housekeeping").length,
    maintenance: staff.filter((s) => s.role === "maintenance").length,
    read_only: staff.filter((s) => s.role === "read_only").length,
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Personal</h1>
          <p className="text-sm text-stone-400 mt-1">{staff.length} miembros del equipo</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo Personal
        </Button>
      </div>

      {error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : loading ? (
        <LoadingState label="Cargando personal..." />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
            <StatCard label="Total Staff" value={counts.total} />
            <StatCard label="Admins" value={counts.admin} />
            <StatCard label="Managers" value={counts.manager} />
            <StatCard label="Front Desk" value={counts.front_desk} />
            <StatCard label="Housekeeping" value={counts.housekeeping} />
            <StatCard label="Maintenance" value={counts.maintenance} />
            <StatCard label="Read Only" value={counts.read_only} />
          </div>

          <Card className="overflow-hidden">
            {staff.length === 0 ? (
              <EmptyState
                icon={<Users className="w-12 h-12 text-stone-300" />}
                title="No hay miembros del personal registrados"
                description="Crea el primer miembro del equipo"
                action={<Button onClick={() => setShowForm(true)}>Crear primer miembro</Button>}
              />
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--stone-200)", background: "var(--stone-50)" }}>
                    <th style={TH}>Nombre</th>
                    <th style={TH}>Email</th>
                    <th style={TH}>Rol</th>
                    <th style={TH}>Estado</th>
                    <th style={TH}>Cambiar Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => {
                    const cfg = roleConfig[s.role] || roleConfig.read_only;
                    return (
                      <tr
                        key={s.id}
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
                              {s.full_name?.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-stone-900">{s.full_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: "var(--text-sm)", color: "var(--stone-600)" }}>
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-stone-300" />
                            {s.email}
                          </span>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <StatusBadge tone={s.active ? "success" : "neutral"} dot>
                            {s.active ? "Activo" : "Inactivo"}
                          </StatusBadge>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <Select
                            size="sm"
                            value={s.role}
                            disabled={!s.active}
                            onChange={(e) => handleRoleChange(s.id, e.target.value)}
                            style={{ maxWidth: "160px", opacity: s.active ? 1 : 0.5 }}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{roleConfig[r].label}</option>
                            ))}
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo Personal">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input name="full_name" placeholder="Nombre completo" value={form.full_name} onChange={handleChange} required />
          <Input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          <Input name="password" type="password" placeholder="Contraseña" value={form.password} onChange={handleChange} required minLength={6} />
          <Select name="role" value={form.role} onChange={handleChange}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{roleConfig[r].label}</option>
            ))}
          </Select>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
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