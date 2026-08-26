"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   BUTTON
   ═══════════════════════════════════════════════════════════════ */
const BTN = {
  primary:   { bg: "var(--stone-900)", color: "var(--stone-50)", hover: "var(--stone-800)" },
  secondary: { bg: "var(--stone-100)", color: "var(--stone-700)", hover: "var(--stone-200)" },
  outline:   { bg: "transparent", color: "var(--stone-700)", hover: "var(--stone-50)", border: "var(--stone-200)" },
  ghost:     { bg: "transparent", color: "var(--stone-600)", hover: "var(--stone-100)" },
  success:   { bg: "var(--emerald-500)", color: "white", hover: "var(--emerald-600)" },
  danger:    { bg: "var(--rose-500)", color: "white", hover: "var(--rose-600)" },
  gold:      { bg: "var(--gold-500)", color: "white", hover: "var(--gold-600)" },
};

const BTN_SIZE = {
  xs: "padding: 4px 8px; font-size: var(--text-xs);",
  sm: "padding: 6px 12px; font-size: var(--text-xs);",
  md: "padding: 8px 16px; font-size: var(--text-sm);",
  lg: "padding: 10px 20px; font-size: var(--text-base);",
};

export function Button({ variant = "primary", size = "md", type = "button", loading = false, disabled, onClick, className = "", children, href }) {
  const style = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    borderRadius: "var(--radius)",
    fontWeight: 500,
    border: BTN[variant]?.border ? `1px solid ${BTN[variant].border}` : "1px solid transparent",
    background: BTN[variant]?.bg || BTN.primary.bg,
    color: BTN[variant]?.color || BTN.primary.color,
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled || loading ? 0.5 : 1,
    transition: "all var(--transition-fast)",
    whiteSpace: "nowrap",
    ...(BTN_SIZE[size] ? {} : {}),
    lineHeight: 1.5,
    fontSize: "var(--text-sm)",
    padding: size === "xs" ? "4px 8px" : size === "sm" ? "6px 12px" : size === "lg" ? "10px 20px" : "8px 16px",
  };

  const handlers = {
    onMouseEnter: (e) => { if (!disabled && !loading) e.currentTarget.style.background = BTN[variant]?.hover || BTN.primary.hover; },
    onMouseLeave: (e) => { if (!disabled && !loading) e.currentTarget.style.background = BTN[variant]?.bg || BTN.primary.bg; },
  };

  if (href) {
    return (
      <a href={href} style={style} className={className} {...handlers}>
        {loading && <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />}
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} style={style} className={className} {...handlers}>
      {loading && <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />}
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BADGE — small, no icons, just text + subtle bg
   ═══════════════════════════════════════════════════════════════ */
const BADGE = {
  neutral:  { bg: "var(--stone-100)", color: "var(--stone-600)" },
  success:  { bg: "var(--emerald-50)", color: "var(--emerald-700)" },
  warning:  { bg: "var(--amber-50)", color: "var(--amber-700)" },
  danger:   { bg: "var(--rose-50)", color: "var(--rose-700)" },
  info:     { bg: "var(--sky-50)", color: "var(--sky-700)" },
  gold:     { bg: "var(--gold-100)", color: "var(--gold-700)" },
};

export function Badge({ tone = "neutral", className = "", children }) {
  const s = BADGE[tone] || BADGE.neutral;
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${className}`}
      style={{ padding: "2px 8px", fontSize: "var(--text-xs)", background: s.bg, color: s.color }}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ tone = "neutral", dot = false, className = "", children }) {
  const s = BADGE[tone] || BADGE.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ${className}`}
      style={{ padding: "3px 10px", fontSize: "11px", background: s.bg, color: s.color, letterSpacing: "0.01em" }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />}
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CARD
   ═══════════════════════════════════════════════════════════════ */
export function Card({ className = "", children, style: s = {} }) {
  return (
    <div
      className={className}
      style={{
        background: "white",
        border: "1px solid var(--stone-100)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
        transition: "box-shadow 200ms ease, transform 200ms ease",
        ...s,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-card-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-card)"; }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, action, className = "", children }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${className}`}
      style={{ padding: "16px 20px", borderBottom: "1px solid var(--stone-100)" }}
    >
      {children ?? (
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--stone-900)" }}>{title}</h2>
      )}
      {action}
    </div>
  );
}

export function CardContent({ className = "", children, style: s = {} }) {
  return <div className={className} style={{ padding: "20px", ...s }}>{children}</div>;
}

/* ═══════════════════════════════════════════════════════════════
   FORM FIELDS
   ═══════════════════════════════════════════════════════════════ */
const fieldStyle = (size = "md") => ({
  width: "100%",
  borderRadius: "var(--radius)",
  border: "1px solid var(--stone-200)",
  background: "white",
  color: "var(--stone-900)",
  fontSize: size === "sm" ? "var(--text-xs)" : "var(--text-sm)",
  padding: size === "sm" ? "6px 10px" : "8px 12px",
  outline: "none",
  transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
  lineHeight: 1.5,
});

export function Input({ size = "md", className = "", style: s = {}, ...props }) {
  return (
    <input
      {...props}
      className={className}
      style={{ ...fieldStyle(size), ...s }}
      onFocus={(e) => { e.target.style.borderColor = "var(--gold-500)"; e.target.style.boxShadow = "0 0 0 3px var(--gold-100)"; }}
      onBlur={(e) => { e.target.style.borderColor = "var(--stone-200)"; e.target.style.boxShadow = "none"; }}
    />
  );
}

export function Select({ size = "md", className = "", style: s = {}, children, ...props }) {
  return (
    <select
      {...props}
      className={className}
      style={{ ...fieldStyle(size), appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a8a29e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "28px", ...s }}
      onFocus={(e) => { e.target.style.borderColor = "var(--gold-500)"; e.target.style.boxShadow = "0 0 0 3px var(--gold-100)"; }}
      onBlur={(e) => { e.target.style.borderColor = "var(--stone-200)"; e.target.style.boxShadow = "none"; }}
    >
      {children}
    </select>
  );
}

export function Textarea({ size = "md", className = "", style: s = {}, ...props }) {
  return (
    <textarea
      {...props}
      className={className}
      style={{ ...fieldStyle(size), resize: "none", ...s }}
      onFocus={(e) => { e.target.style.borderColor = "var(--gold-500)"; e.target.style.boxShadow = "0 0 0 3px var(--gold-100)"; }}
      onBlur={(e) => { e.target.style.borderColor = "var(--stone-200)"; e.target.style.boxShadow = "none"; }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   SKELETON — shimmer animation
   ═══════════════════════════════════════════════════════════════ */
export function Skeleton({ className = "", style: s = {} }) {
  return (
    <div
      className={`animate-shimmer ${className}`}
      style={{ borderRadius: "var(--radius)", background: "var(--stone-100)", ...s }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--stone-100)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div style={{ padding: "20px" }}>
        <Skeleton style={{ height: "12px", width: "80px", marginBottom: "12px" }} />
        <Skeleton style={{ height: "28px", width: "48px" }} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <Card>
      <div style={{ padding: "0" }}>
        <div style={{ display: "flex", gap: "16px", padding: "12px 20px", borderBottom: "1px solid var(--stone-100)" }}>
          {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} style={{ height: "10px", flex: i === 0 ? "0 0 60px" : "1" }} />)}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} style={{ display: "flex", gap: "16px", padding: "14px 20px", borderBottom: "1px solid var(--stone-50)" }}>
            {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} style={{ height: "12px", flex: c === 0 ? "0 0 60px" : "1" }} />)}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOADING / ERROR / EMPTY STATES
   ═══════════════════════════════════════════════════════════════ */
export function LoadingState({ label = "Cargando...", className = "" }) {
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ padding: "120px 0" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full" style={{ border: "3px solid var(--stone-100)" }} />
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{ border: "3px solid transparent", borderTopColor: "var(--stone-900)" }}
          />
        </div>
        <span className="text-sm font-medium" style={{ color: "var(--stone-400)" }}>{label}</span>
      </div>
    </div>
  );
}

export function ErrorState({ title = "Error al cargar", message, retryLabel = "Reintentar", onRetry, className = "" }) {
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ padding: "48px 0" }}>
      <div className="text-center">
        <svg className="mx-auto mb-3" width="40" height="40" fill="none" stroke="var(--rose-300)" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="font-medium" style={{ fontSize: "var(--text-sm)", color: "var(--stone-900)" }}>{title}</p>
        {message && <p className="mt-1" style={{ fontSize: "var(--text-xs)", color: "var(--stone-400)" }}>{message}</p>}
        {onRetry && <div className="mt-3"><Button size="sm" onClick={onRetry}>{retryLabel}</Button></div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`} style={{ padding: "64px 24px" }}>
      {icon !== null && (
        <div className="mb-3" style={{ color: "var(--stone-300)" }}>
          {icon || (
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          )}
        </div>
      )}
      <p style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--stone-600)" }}>{title}</p>
      {description && <p className="mt-1" style={{ fontSize: "var(--text-xs)", color: "var(--stone-400)" }}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE HEADER — rendered in topbar now, but kept for compat
   ═══════════════════════════════════════════════════════════════ */
export function PageHeader({ title, subtitle, actions, className = "" }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`} style={{ marginBottom: "24px" }}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--stone-900)" }}>{title}</h1>
        {subtitle && <p className="mt-1 text-sm" style={{ color: "var(--stone-400)" }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FILTER PILLS — compact, rounded
   ═══════════════════════════════════════════════════════════════ */
export function FilterPills({ options, value, onChange, className = "" }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            style={{
              borderRadius: "var(--radius-full)",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 500,
              border: active ? "1px solid var(--stone-900)" : "1px solid var(--stone-200)",
              background: active ? "var(--stone-900)" : "white",
              color: active ? "white" : "var(--stone-600)",
              cursor: "pointer",
              transition: "all 150ms ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            {opt.icon && <span>{opt.icon}</span>}
            {opt.label}
            {opt.count != null && <span className="ml-0.5 opacity-60">{opt.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MODAL
   ═══════════════════════════════════════════════════════════════ */
export function Modal({ open, onClose, title, maxWidth = "max-w-lg", children }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: "var(--z-modal)" }}>
      <div className="absolute inset-0 animate-backdrop-in" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full animate-scale-in ${maxWidth}`}
        style={{
          background: "white",
          border: "1px solid var(--stone-200)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: "16px 24px", borderBottom: "1px solid var(--stone-100)" }}
        >
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--stone-900)" }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{ padding: "6px", borderRadius: "var(--radius)", color: "var(--stone-400)", background: "transparent", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--stone-100)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════════ */
const ToastContext = createContext(null);

const toastStyles = {
  success: { bar: "var(--emerald-500)", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  error:   { bar: "var(--rose-500)", icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  info:    { bar: "var(--sky-500)", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
};

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const toast = useCallback((message, type = "info", duration = 3500) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed flex flex-col gap-2" style={{ top: "16px", right: "16px", zIndex: "var(--z-toast)", width: "320px", maxWidth: "calc(100vw - 32px)" }}>
        {toasts.map((t) => {
          const s = toastStyles[t.type] || toastStyles.info;
          return (
            <div
              key={t.id}
              onClick={() => dismiss(t.id)}
              className="animate-toast-in cursor-pointer flex items-stretch"
              style={{
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-lg)",
                background: "white",
                border: "1px solid var(--stone-100)",
                overflow: "hidden",
              }}
            >
              <div style={{ width: "3px", flexShrink: 0, background: s.bar }} />
              <div className="flex items-center gap-2.5" style={{ padding: "12px 14px", fontSize: "13px", color: "var(--stone-700)" }}>
                <svg width="16" height="16" style={{ flexShrink: 0, color: s.bar }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
                <span className="flex-1">{t.message}</span>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

/* ═══════════════════════════════════════════════════════════════
   DRAWER — slide-in panel from the right
   ═══════════════════════════════════════════════════════════════ */
export function Drawer({ open, onClose, title, children, width = "440px" }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0" style={{ zIndex: "var(--z-modal)" }}>
      <div
        className="absolute inset-0 animate-backdrop-in"
        style={{ background: "var(--overlay-bg)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute top-0 right-0 h-full animate-slide-in-right flex flex-col"
        style={{
          width,
          maxWidth: "100vw",
          background: "white",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div
          className="flex items-center justify-between shrink-0"
          style={{ padding: "16px 24px", borderBottom: "1px solid var(--stone-100)" }}
        >
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--stone-900)" }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{ padding: "6px", borderRadius: "var(--radius)", color: "var(--stone-400)", background: "transparent", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--stone-100)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ padding: "24px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
