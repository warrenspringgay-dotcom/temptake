"use client";

import * as React from "react";

export type ToastType = "default" | "success" | "error" | "warning";

export interface ToastOptions {
  title?: string;
  message?: string;
  type?: ToastType;
  duration?: number; // milliseconds
}

interface Toast extends ToastOptions {
  id: string;
}

type ToastContextType = {
  toasts: Toast[];
  addToast: (opts: ToastOptions) => void;
  removeToast: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextType | undefined>(
  undefined
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    ({ title, message, type = "default", duration = 3000 }: ToastOptions) => {
      const id = typeof crypto !== "undefined"
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

      const toast: Toast = { id, title, message, type, duration };
      setToasts((prev) => [...prev, toast]);

      // auto-remove
      window.setTimeout(() => removeToast(id), duration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastViewport toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/* --------- UI component that actually renders toasts --------- */

function ToastViewport({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "rounded-xl border p-3 shadow-lg backdrop-blur-md transition-all",
            t.type === "success"
              ? "border-emerald-300 bg-emerald-50/90 text-emerald-900"
              : t.type === "error"
              ? "border-red-300 bg-red-50/90 text-red-900"
              : t.type === "warning"
              ? "border-amber-300 bg-amber-50/90 text-amber-900"
              : "border-slate-300 bg-white/90 text-slate-900",
          ].join(" ")}
        >
          {t.title && <div className="font-semibold">{t.title}</div>}
          {t.message && (
            <div className="mt-1 text-sm leading-tight">{t.message}</div>
          )}
          <button
            onClick={() => removeToast(t.id)}
            className="mt-2 text-xs text-slate-500 underline"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
