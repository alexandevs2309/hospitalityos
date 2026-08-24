"use client";

import { useState } from "react";
import { loginUser, storeAuth } from "@/lib/auth";
import { Button, Card, CardContent, Input } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState("eden-hotel");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "var(--stone-50)" }}
    >
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-5 flex items-center justify-center"
            style={{ width: "48px", height: "48px", borderRadius: "var(--radius-lg)", background: "var(--stone-900)" }}
          >
            <svg width="22" height="22" fill="none" stroke="var(--gold-500)" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-8 9 8M5 10v10a1 1 0 001 1h4m4-11v11a1 1 0 001 1h4a1 1 0 001-1V10" />
            </svg>
          </div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--stone-900)", letterSpacing: "-0.01em" }}>
            Auron Hospitality
          </h1>
          <p className="mt-2" style={{ fontSize: "var(--text-sm)", color: "var(--stone-400)" }}>
            Sistema de Gestion Hotelera
          </p>
        </div>

        <Card className="animate-scale-in">
          <CardContent style={{ padding: "32px" }}>
            {error && (
              <div
                role="alert"
                className="mb-6 flex items-start gap-2.5 px-4 py-3"
                style={{
                  borderRadius: "var(--radius)",
                  background: "var(--rose-50)",
                  border: "1px solid var(--rose-200)",
                  color: "var(--rose-700)",
                  fontSize: "var(--text-sm)",
                }}
              >
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block" style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--stone-700)" }}>
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
                <label htmlFor="password" className="mb-1.5 block" style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--stone-700)" }}>
                  Contraseña
                </label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="tenant" className="mb-1.5 block" style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--stone-700)" }}>
                  Tenant ID
                </label>
                <Input
                  id="tenant"
                  type="text"
                  required
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                />
              </div>

              <Button type="submit" size="lg" loading={isLoading} className="w-full">
                {isLoading ? "Autenticando..." : "Iniciar Sesion"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center" style={{ fontSize: "var(--text-xs)", color: "var(--stone-400)" }}>
          Acceso restringido al personal autorizado
        </p>
      </div>
    </div>
  );
}
