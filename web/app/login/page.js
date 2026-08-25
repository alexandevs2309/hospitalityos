"use client";

import { useState } from "react";
import { loginUser, storeAuth } from "@/lib/auth";
import { Button, Input } from "@/components/ui";
import { Building, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState("eden-hotel");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const data = await loginUser(email, password, tenantId);
      storeAuth(data.access_token, data.refresh_token, data.user);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Credenciales incorrectas");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: "linear-gradient(135deg, #1C1917 0%, #292524 50%, #44403C 100%)" }}
      >
        {/* Decorative circles */}
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
            The Operating System<br />That Runs Your Hotel
          </h1>

          <p className="mt-4 text-base text-white/50 leading-relaxed">
            PMS, channel manager, revenue management, and guest portal — all in one place.
          </p>

          <div className="mt-10 flex items-center justify-center gap-8">
            {[
              { value: "99.9%", label: "Uptime" },
              { value: "24/7", label: "Soporte" },
              { value: "<2s", label: "Response" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-bold text-white tabular-nums">{s.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12" style={{ background: "var(--stone-50)" }}>
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
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--stone-900)" }}>Welcome back</h2>
            <p className="mt-1.5 text-sm" style={{ color: "var(--stone-400)" }}>Sign in to your dashboard</p>
          </div>

          {/* Error */}
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
              <AlertIcon />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium" style={{ color: "var(--stone-700)" }}>
                Email
              </label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@edenhotel.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium" style={{ color: "var(--stone-700)" }}>
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
              <label htmlFor="tenant" className="mb-1.5 block text-sm font-medium" style={{ color: "var(--stone-700)" }}>
                Property
              </label>
              <Input
                id="tenant"
                type="text"
                required
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
              />
            </div>

            <Button type="submit" size="lg" loading={isLoading} className="w-full mt-6">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs" style={{ color: "var(--stone-400)" }}>
            Authorized personnel only
          </p>
        </div>
      </div>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
