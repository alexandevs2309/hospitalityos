"use client";

import "./globals.css";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { ToastProvider } from "@/components/ui";
import { getStoredUser, clearAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Hotel,
  Home,
  Calendar,
  CalendarCheck,
  Users,
  Sparkles,
  Wrench,
  Building2,
  BarChart3,
  Moon,
  FileText,
  Settings,
  Menu,
  LogOut,
  Sun,
  Plus,
  Search,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  X,
  Loader2,
  Building,
} from "lucide-react";

const navGroups = [
  {
    label: "Operaciones",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/frontdesk", label: "Front Desk", icon: Hotel },
      { href: "/rooms", label: "Habitaciones", icon: Home },
      { href: "/reservations", label: "Reservas", icon: Calendar },
      { href: "/availability", label: "Disponibilidad", icon: CalendarCheck },
      { href: "/guests", label: "Huespedes", icon: Users },
    ],
  },
  {
    label: "Equipo",
    items: [
      { href: "/housekeeping", label: "Housekeeping", icon: Sparkles },
      { href: "/maintenance", label: "Mantenimiento", icon: Wrench },
      { href: "/staff", label: "Personal", icon: Users },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/reports", label: "Reportes", icon: BarChart3 },
      { href: "/night-audit", label: "Auditoria", icon: Moon },
      { href: "/fiscal", label: "Fiscal (e-CF)", icon: FileText },
    ],
  },
  {
    label: "",
    items: [
      { href: "/settings", label: "Configuracion", icon: Settings },
    ],
  },
];

const pageTitles = {
  "/": "Dashboard",
  "/frontdesk": "Front Desk",
  "/rooms": "Habitaciones",
  "/reservations": "Reservas",
  "/availability": "Disponibilidad",
  "/guests": "Huespedes",
  "/housekeeping": "Housekeeping",
  "/maintenance": "Mantenimiento",
  "/staff": "Personal",
  "/reports": "Reportes",
  "/night-audit": "Auditoria",
  "/fiscal": "Fiscal (e-CF)",
  "/settings": "Configuracion",
};

function BuildingIcon() {
  return <Building className="w-6 h-6" strokeWidth={1.5} />;
}

function Sidebar({ onLinkClick }) {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const { dark, toggle } = useTheme();

  useEffect(() => { setUser(getStoredUser()); }, []);

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-[var(--z-sidebar)] flex flex-col border-r transition-colors duration-200"
      style={{
        width: "var(--sidebar-width)",
        background: "var(--stone-100)",
        borderColor: "var(--stone-200)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: "var(--stone-200)" }}>
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ background: "var(--stone-900)", color: "var(--stone-50)" }}
        >
          <BuildingIcon />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--stone-900)" }}>Auron Hospitality</p>
          <p className="text-xs truncate" style={{ color: "var(--stone-400)" }}>{user?.tenant_id || "eden-hotel"}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {group.label && (
              <p
                className="px-3 mb-1.5 text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--stone-400)", fontSize: "var(--text-xs)" }}
              >
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onLinkClick}
                    className="flex items-center gap-2.5 rounded-md transition-all duration-150"
                    style={{
                      padding: "8px 12px",
                      fontSize: "var(--text-sm)",
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? "var(--stone-900)" : "var(--stone-500)",
                      background: isActive ? "white" : "transparent",
                      boxShadow: isActive ? "var(--shadow-sm)" : "none",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--stone-200)"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t" style={{ borderColor: "var(--stone-200)" }}>
        <div className="flex items-center gap-2.5 px-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ background: "var(--gold-100)", color: "var(--gold-700)" }}
          >
            {user?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "AH"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "var(--stone-900)" }}>{user?.full_name || "Admin"}</p>
            <p className="text-xs truncate" style={{ color: "var(--stone-400)" }}>{user?.role || "admin"}</p>
          </div>
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--stone-400)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gold-500)"; e.currentTarget.style.background = "var(--gold-50)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--stone-400)"; e.currentTarget.style.background = "transparent"; }}
            title={dark ? "Modo claro" : "Modo oscuro"}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun className="w-5 h-5" strokeWidth={2} /> : <Moon className="w-5 h-5" strokeWidth={2} />}
          </button>
          <button
            onClick={() => { clearAuth(); window.location.href = "/login"; }}
            className="p-1 rounded transition-colors"
            style={{ color: "var(--stone-400)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--rose-500)"; e.currentTarget.style.background = "var(--rose-50)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--stone-400)"; e.currentTarget.style.background = "transparent"; }}
            title="Cerrar sesion"
          >
            <LogOut className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ title }) {
  return (
    <header
      className="fixed top-0 right-0 z-[var(--z-topbar)] flex items-center border-b transition-colors duration-200"
      style={{
        left: "var(--sidebar-width)",
        height: "var(--topbar-height)",
        background: "white",
        borderColor: "var(--stone-200)",
        boxShadow: "var(--shadow-xs)",
        padding: "0 var(--content-padding)",
      }}
    >
      <h1 className="text-base font-semibold" style={{ color: "var(--stone-900)", fontWeight: 600 }}>{title}</h1>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "var(--emerald-50)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--emerald-500)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--emerald-700)", fontSize: "var(--text-xs)" }}>Online</span>
        </div>
      </div>
    </header>
  );
}

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isAuth = pathname === "/login";

  if (isAuth) return <>{children}</>;

  const title = pageTitles[pathname] || "Hospitality OS";

  return (
    <div className="min-h-screen" style={{ background: "var(--stone-50)" }}>
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg transition-colors"
        style={{ background: "var(--stone-900)", color: "var(--stone-50)" }}
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" strokeWidth={2} />
      </button>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 animate-backdrop-in"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed h-screen z-40 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onLinkClick={() => setSidebarOpen(false)} />
      </div>

      {/* Topbar */}
      <div className="hidden lg:block">
        <Topbar title={title} />
      </div>

      {/* Content */}
      <main
        className="transition-all duration-200"
        style={{
          marginLeft: "var(--sidebar-width)",
          paddingTop: "calc(var(--topbar-height) + var(--content-padding))",
          paddingLeft: "var(--content-padding)",
          paddingRight: "var(--content-padding)",
          paddingBottom: "var(--content-padding)",
        }}
      >
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AppLayout>{children}</AppLayout>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}