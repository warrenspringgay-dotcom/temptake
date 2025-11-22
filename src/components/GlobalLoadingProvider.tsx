// src/components/GlobalLoadingProvider.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type GlobalLoadingContextType = {
  startLoading: () => void;
  stopLoading: () => void;
};

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(
  undefined
);

export function useGlobalLoading(): GlobalLoadingContextType {
  const ctx = useContext(GlobalLoadingContext);
  if (!ctx) {
    throw new Error(
      "useGlobalLoading must be used within a GlobalLoadingProvider"
    );
  }
  return ctx;
}

type Props = {
  children: ReactNode;
};

export function GlobalLoadingProvider({ children }: Props) {
  const [count, setCount] = useState(0);

  const startLoading = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setCount((c) => (c > 0 ? c - 1 : 0));
  }, []);

  const isLoading = count > 0;

  return (
    <GlobalLoadingContext.Provider value={{ startLoading, stopLoading }}>
      {children}

      {isLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/25 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-3 shadow-lg shadow-slate-900/20">
            <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-slate-800">
              Syncing data…
            </span>
          </div>
        </div>
      )}
    </GlobalLoadingContext.Provider>
  );
}
