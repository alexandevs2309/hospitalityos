"use client";

import "../globals.css";
import Link from "next/link";
import { Building } from "lucide-react";

export default function BookLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen" style={{ background: "var(--stone-50)" }}>
        <header className="border-b" style={{ background: "white", borderColor: "var(--stone-200)" }}>
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/book" style={{ textDecoration: "none" }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: "var(--stone-900)", color: "var(--stone-50)" }}>
                  <Building className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <span className="text-lg font-semibold text-stone-900">Auron Hospitality</span>
              </div>
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium px-3 py-1.5 rounded"
              style={{ color: "var(--gold-600)", background: "var(--gold-50)", border: "1px solid var(--gold-200)" }}
            >
              Área Staff
            </Link>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t mt-12" style={{ borderColor: "var(--stone-200)" }}>
          <div className="max-w-4xl mx-auto px-4 py-6 text-center text-xs text-stone-400">
            &copy; {new Date().getFullYear()} Auron Hospitality. Todos los derechos reservados.
          </div>
        </footer>
      </body>
    </html>
  );
}