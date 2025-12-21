"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseBrowser";

type AuthCtx = {
  user: User | null;
  ready: boolean;
};

const Ctx = createContext<AuthCtx>({ user: null, ready: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // prevent refresh storms
  const refreshQueued = useRef(false);

  const queueRefresh = () => {
    if (refreshQueued.current) return;
    refreshQueued.current = true;

    // schedule once per tick
    setTimeout(() => {
      refreshQueued.current = false;
      router.refresh();
    }, 0);
  };

  useEffect(() => {
    let cancelled = false;

    const setFromSession = (session: Session | null) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setReady(true);
    };

    async function initialSync() {
      try {
        const { data } = await supabase.auth.getSession();
        setFromSession(data.session ?? null);
      } catch {
        setFromSession(null);
      }
    }

    initialSync();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setFromSession(session ?? null);

      // only refresh on events that should change server-rendered gating/UI
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        queueRefresh();
      }
    });

    // Dev-only: cheap rescue, but throttle so it doesn't become a DDOS
    if (process.env.NODE_ENV === "development") {
      let last = 0;
      const throttleMs = 1500;

      const resync = async () => {
        const now = Date.now();
        if (now - last < throttleMs) return;
        last = now;

        try {
          const { data } = await supabase.auth.getSession();
          setFromSession(data.session ?? null);
        } catch {
          setFromSession(null);
        }
      };

      const onVisible = () => {
        if (document.visibilityState === "visible") void resync();
      };
      const onFocus = () => void resync();

      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("focus", onFocus);

      return () => {
        cancelled = true;
        sub?.subscription?.unsubscribe();
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("focus", onFocus);
      };
    }

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, [router]);

  const value = useMemo(() => ({ user, ready }), [user, ready]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
