// src/components/AppHeader.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { supabase } from "@/lib/supabase";

export default function AppHeader() {
  const [email, setEmail] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    const { data: auth } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setEmail(s?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      const any: any = auth;
      any?.subscription?.unsubscribe?.();
      any?.unsubscribe?.();
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    location.reload();
  }

  return (
    <header className="flex items-center justify-between border-b bg-white px-4 py-2">
      <div className="flex items-center gap-2">
        <Image src="/favicon.png" alt="logo" width={24} height={24} priority />
        <span className="text-base font-semibold">TempTake</span>
      </div>

      <div className="relative">
        <button
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          onClick={() => setOpen((v) => !v)}
        >
          {email ?? "Account"}
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-40 rounded-lg border bg-white p-1 shadow-md">
            <Link href="/settings" className="block rounded-md px-3 py-2 text-sm hover:bg-gray-50">Settings</Link>
            <button onClick={logout} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
