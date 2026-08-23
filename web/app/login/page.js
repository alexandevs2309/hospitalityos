"use client";

import { useState } from "react";
import { loginUser, storeAuth } from "@/lib/auth";

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

  const inputClass =
    "w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600 transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Hospitality OS
          </h1>
          <p className="text-sm text-slate-400 mt-2">Sistema de Gestion Hotelera</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@edenhotel.com"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="tenant" className="block text-sm font-medium text-slate-700 mb-1.5">
                Tenant ID
              </label>
              <input
                id="tenant"
                type="text"
                required
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? "Autenticando..." : "Iniciar Sesion"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
