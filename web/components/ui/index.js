"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const BUTTON_VARIANTS = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
  outline: "border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
  ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  success: "bg-emerald-500 text-white hover:bg-emerald-600",
  danger: "bg-rose-500 text-white hover:bg-rose-600",
};

const BUTTON_SIZES = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm" };

export function Button({ variant = "primary", size = "md", type = "button", loading = false, disabled, onClick, className = "", children }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary} ${BUTTON_SIZES[size] || BUTTON_SIZES.md} ${className}`}
    >
      {loading && <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />}
      {children}
    </button>
  );
}

const BADGE_TONES = {
  neutral: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  brand: "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
  danger: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400",
  info: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400",
  violet: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400",
};

const DOT_TONES = {
  neutral: "bg-slate-400",
  brand: "bg-brand-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-sky-500",
  violet: "bg-violet-500",
};

export function Badge({ tone = "neutral", className = "", children }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE_TONES[tone] || BADGE_TONES.neutral} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ tone = "neutral", dot = false, className = "", children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${BADGE_TONES[tone] || BADGE_TONES.neutral} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT_TONES[tone] || DOT_TONES.neutral}`} />}
      {children}
    </span>
  );
}

export function Card({ className = "", children }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow dark:border-slate-800 dark:bg-slate-900 ${className}`}>{children}</div>;
}

export function CardHeader({ title, action, className = "", children }) {
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-4 ${className}`}>
      {children ?? (
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
      )}
      {action}
    </div>
  );
}

export function CardContent({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

const FIELD_BASE = "w-full rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500";
const FIELD_SIZES = { sm: "px-2.5 py-1.5 text-xs", md: "px-3 py-2.5 text-sm" };

export function Input({ size = "md", className = "", ...props }) {
  return <input {...props} className={`${FIELD_BASE} ${FIELD_SIZES[size] || FIELD_SIZES.md} ${className}`} />;
}

export function Select({ size = "md", className = "", children, ...props }) {
  return (
    <select {...props} className={`${FIELD_BASE} ${FIELD_SIZES[size] || FIELD_SIZES.md} ${className}`}>
      {children}
    </select>
  );
}

export function Textarea({ size = "md", className = "", ...props }) {
  return <textarea {...props} className={`${FIELD_BASE} ${FIELD_SIZES[size] || FIELD_SIZES.md} resize-none ${className}`} />;
}

export function Skeleton({ className = "" }) {
  return <div className={`rounded-md bg-slate-200/70 dark:bg-slate-800 animate-pulse ${className}`} />;
}

export function SkeletonCard() {
  return (
    <Card className="p-6">
      <Skeleton className="mb-3 h-3 w-20" />
      <Skeleton className="h-8 w-12" />
    </Card>
  );
}

export function LoadingState({ label = "Cargando...", className = "" }) {
  return (
    <div className={`flex items-center justify-center py-24 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="h-8 w-8 rounded-full border-4 border-brand-200 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-500 animate-spin" />
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      </div>
    </div>
  );
}

export function ErrorState({ title = "Error al cargar", message, retryLabel = "Reintentar", onRetry, className = "" }) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <svg className="mx-auto mb-4 h-12 w-12 text-rose-300 dark:text-rose-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="mb-1 font-medium text-slate-900 dark:text-slate-100">{title}</p>
          {message && <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{message}</p>}
          {onRetry && <Button onClick={onRetry}>{retryLabel}</Button>}
        </CardContent>
      </Card>
    </div>
  );
}

const EMPTY_ICON = "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4";

export function EmptyState({ icon, title, description, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}>
      {icon !== null && (
        <svg className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d={typeof icon === "string" ? icon : EMPTY_ICON} />
        </svg>
      )}
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      {description && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, className = "" }) {
  return (
    <div className={`mb-8 flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function FilterPills({ options, value, onChange, className = "" }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {opt.label}
            {opt.count != null && <span className="ml-1 text-xs opacity-70">{opt.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({ open, onClose, title, maxWidth = "max-w-lg", children }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 animate-backdrop-in" onClick={onClose} />
      <div role="dialog" aria-modal="true" className={`relative w-full rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-scale-in ${maxWidth}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100" style={{ fontFamily: "var(--font-display)" }}>
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 pb-6 pt-5">{children}</div>
      </div>
    </div>
  );
}

const ToastContext = createContext(null);

const styles = {
  success: { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", bar: "bg-emerald-500" },
  error: { icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", bar: "bg-rose-500" },
  info: { icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", bar: "bg-brand-500" },
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

  const toast = useCallback(
    (message, type = "info", duration = 3500) => {
      const id = ++toastId;
      setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => {
          const s = styles[t.type] || styles.info;
          return (
            <div
              key={t.id}
              onClick={() => dismiss(t.id)}
              className="animate-toast-in cursor-pointer flex items-stretch overflow-hidden rounded-lg shadow-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              role="status"
            >
              <div className={`w-1 shrink-0 ${s.bar}`} />
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-700 dark:text-slate-200">
                <svg className={`w-4 h-4 shrink-0 ${s.bar.replace("bg-", "text-")}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
