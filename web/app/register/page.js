"use client";

import { useState } from "react";
import { registerHotel } from "@/lib/api";
import { Button, Input } from "@/components/ui";
import { Building, Loader2, Eye, EyeOff, Check, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({
    hotel_name: "",
    email: "",
    password: "",
    full_name: "",
    phone: "",
    city: "",
    country: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await registerHotel(form);
      setSuccess(result);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={{ background: "var(--stone-50)" }}>
        <div className="w-full max-w-md text-center animate-scale-in">
          <div
            className="mx-auto mb-5 flex items-center justify-center"
            style={{ width: "64px", height: "64px", borderRadius: "var(--radius-xl)", background: "var(--emerald-50)" }}
          >
            <Check className="w-8 h-8" style={{ color: "var(--emerald-500)" }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--stone-900)" }}>Hotel registrado</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--stone-400)" }}>
            Your property <strong>{success.tenant_id}</strong> is ready.
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--stone-400)" }}>
            You can now log in with <strong>{success.email}</strong>.
          </p>
          <div className="mt-8">
            <Button href="/login" size="lg">
              <ArrowLeft className="w-4 h-4 mr-1" /> Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: "linear-gradient(135deg, #1C1917 0%, #292524 50%, #44403C 100%)" }}
      >
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full opacity-10" style={{ background: "var(--gold-500)" }} />
          <div className="absolute bottom-1/4 right-0 w-60 h-60 rounded-full opacity-5" style={{ background: "var(--gold-400)" }} />
        </div>

        <div className="relative z-10 px-12 max-w-md text-center">
          <div
            className="mx-auto mb-8 flex items-center justify-center"
            style={{ width: "72px", height: "72px", borderRadius: "var(--radius-xl)", background: "var(--gold-500)" }}
          >
            <Building className="w-9 h-9 text-white" strokeWidth={1.5} />
          </div>

          <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
            Listo para empezar?
          </h1>

          <p className="mt-4 text-base text-white/50 leading-relaxed">
            Crea tu propiedad y empieza a gestionar habitaciones, reservas y huespedes en minutos.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { value: "Setup", label: "2 minutos" },
              { value: "Free", label: "Trial 14 dias" },
              { value: "24/7", label: "Soporte" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 overflow-y-auto" style={{ background: "var(--stone-50)" }}>
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <div
              className="mx-auto mb-4 flex items-center justify-center"
              style={{ width: "56px", height: "56px", borderRadius: "var(--radius-xl)", background: "var(--stone-900)" }}
            >
              <Building className="w-7 h-7" style={{ color: "var(--gold-500)" }} strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "var(--stone-900)" }}>Auron Hospitality</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--stone-900)" }}>Register your hotel</h2>
            <p className="mt-1.5 text-sm" style={{ color: "var(--stone-400)" }}>Create your property in under 2 minutes</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-2.5 px-4 py-3 text-sm"
              style={{
                borderRadius: "var(--radius-lg)",
                background: "var(--rose-50)",
                border: "1px solid var(--rose-100)",
                color: "var(--rose-700)",
              }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--stone-700)" }}>
                Hotel Name *
              </label>
              <Input
                required
                value={form.hotel_name}
                onChange={update("hotel_name")}
                placeholder="Grand Hotel Paradise"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--stone-700)" }}>
                Admin Email *
              </label>
              <Input
                type="email"
                required
                value={form.email}
                onChange={update("email")}
                placeholder="admin@grandhotel.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--stone-700)" }}>
                Password *
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={update("password")}
                  placeholder="Min. 6 characters"
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--stone-400)" }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--stone-700)" }}>
                Full Name
              </label>
              <Input
                value={form.full_name}
                onChange={update("full_name")}
                placeholder="John Smith"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--stone-700)" }}>
                  City
                </label>
                <Input
                  value={form.city}
                  onChange={update("city")}
                  placeholder="Santo Domingo"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--stone-700)" }}>
                  Country
                </label>
                <Input
                  value={form.country}
                  onChange={update("country")}
                  placeholder="Rep. Dominicana"
                />
              </div>
            </div>

            <Button type="submit" size="lg" loading={isLoading} className="w-full mt-6">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating your hotel...
                </span>
              ) : (
                "Create Hotel"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "var(--stone-400)" }}>
            Already have an account?{" "}
            <a href="/login" className="font-medium" style={{ color: "var(--gold-600)" }}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
