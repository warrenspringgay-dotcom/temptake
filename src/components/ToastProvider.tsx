// src/components/ToastProvider.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms
};

type ToastContextValue = {
  toast: (t: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function genId() {
  return Math.random().toString(36).slice(2);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = genId();
    const duration = t.duration ?? 4000;

    setToasts((prev) => [...prev, { ...t, id, duration }]);

    // auto-remove
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, duration);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast viewport */}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[9999] flex justify-center md:inset-x-auto md:right-3 md:justify-end">
        <div className="flex w-full max-w-sm flex-col gap-2 px-3 md:px-0">
          {toasts.map((t) => {
            const variant = t.variant ?? "info";
            const base =
              "pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2 text-sm shadow-lg backdrop-blur bg-white/95";
            const colors =
              variant === "success"
                ? "border-emerald-200 text-emerald-900"
                : variant === "error"
                ? "border-red-200 text-red-900"
                : "border-slate-200 text-slate-900";

            const badge =
              variant === "success"
                ? "bg-emerald-500"
                : variant === "error"
                ? "bg-red-500"
                : "bg-slate-500";

            return (
              <div key={t.id} className={`${base} ${colors}`}>
                <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${badge}`} />
                <div className="min-w-0 flex-1">
                  {t.title && (
                    <div className="font-semibold leading-snug">
                      {t.title}
                    </div>
                  )}
                  {t.description && (
                    <div className="mt-0.5 text-xs text-slate-600">
                      {t.description}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="ml-1 rounded-full p-1 text-xs text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
