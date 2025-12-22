"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseBrowser";

type AuthContextValue = {
  user: User | null;
  ready: boolean; // true once we've checked auth at least once
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Initial auth fetch
    async function initialSync() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled) {
          setUser(user ?? null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    initialSync();

    // Subscribe to auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (cancelled) return;

        // You can log or branch on event if you care:
        // console.log("[auth] event", event);

        setUser(session?.user ?? null);
      }
    );

    return () => {
      cancelled = true;
      sub?.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
