"use client";

import { useState, useEffect } from "react";
import { listStaff, createStaff, updateStaffRole } from "@/lib/api";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  useToast,
} from "@/components/ui";

const ROLES = ["admin", "manager", "front_desk", "housekeeping", "maintenance", "read_only"];

const roleConfig = {
  admin: { label: "Admin", tone: "violet", color: "#8b5cf6" },
  manager: { label: "Gerente", tone: "brand", color: "#1a6bf5" },
  front_desk: { label: "Recepcion", tone: "success", color: "#10b981" },
  housekeeping: { label: "Housekeeping", tone: "warning", color: "#f59e0b" },
  maintenance: { label: "Mantenimiento", tone: "danger", color: "#f43f5e" },
  read_only: { label: "Solo Lectura", tone: "neutral", color: "#64748b" },
};

const EMPTY_FORM = { full_name: "", email: "", password: "", role: "front_desk" };

function StaffStat({ label, value, cfg }) {
  return (
    <Card className="hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p
              className={`mt-2 text-3xl font-bold ${!cfg ? "text-slate-900 dark:text-slate-100" : ""}`}
              style={cfg ? { color: cfg.color } : undefined}
            >
              {value}
            </p>
          </div>
          <span className="mt-1.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg ? cfg.color : "#94a3b8" }} />
        </div>
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
      setError(e.message);
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
      <PageHeader
        title="Personal"
        subtitle={`${staff.length} miembros del equipo`}
        actions={<Button onClick={() => setShowForm(true)}>+ Nuevo Personal</Button>}
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <LoadingState label="Cargando personal..." />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <StaffStat label="Total Staff" value={counts.total} />
            <StaffStat label="Admins" value={counts.admin} cfg={roleConfig.admin} />
            <StaffStat label="Managers" value={counts.manager} cfg={roleConfig.manager} />
            <StaffStat label="Front Desk" value={counts.front_desk} cfg={roleConfig.front_desk} />
            <StaffStat label="Housekeeping" value={counts.housekeeping} cfg={roleConfig.housekeeping} />
            <StaffStat label="Maintenance" value={counts.maintenance} cfg={roleConfig.maintenance} />
            <StaffStat label="Read Only" value={counts.read_only} cfg={roleConfig.read_only} />
          </div>

          <Card className="overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nombre</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rol</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => {
                  const cfg = roleConfig[s.role] || roleConfig.read_only;
                  return (
                    <tr key={s.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                            style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}
                          >
                            {s.full_name?.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{s.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{s.email}</td>
                      <td className="px-5 py-4">
                        <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge tone={s.active ? "success" : "neutral"} dot>
                          {s.active ? "Activo" : "Inactivo"}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-4">
                        <Select size="sm" value={s.role} onChange={(e) => handleRoleChange(s.id, e.target.value)} disabled={!s.active} className="disabled:opacity-40">
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {roleConfig[r].label}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {staff.length === 0 && (
              <EmptyState
                icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                title="No hay miembros del personal registrados"
                action={
                  <Button variant="secondary" onClick={() => setShowForm(true)}>
                    Crear primer miembro
                  </Button>
                }
              />
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
              <option key={r} value={r}>
                {roleConfig[r].label}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
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
