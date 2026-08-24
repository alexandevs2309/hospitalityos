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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Hospitality OS
          </h1>
          <p className="text-sm text-slate-400 mt-2">Sistema de Gestion Hotelera</p>
        </div>
        <Card className="animate-scale-in shadow-lg border-0 dark:border-slate-800">
          <CardContent className="p-8">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-lg text-sm mb-6"
              >
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                />
              </div>
              <div>
                <label htmlFor="tenant" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
      </div>
    </div>
  );
}
