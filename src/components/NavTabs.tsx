// src/components/NavTabs.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tab = {
  href: string;
  label: string;
  icon?: React.ReactNode;
};

const TABS: Tab[] = [
  { href: "/", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/reports", label: "Reports" },
];

export default function NavTabs() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setUserEmail(session?.user?.email ?? null);
      }
    );

    return () => {
      mounted = false;
      const anySub: any = authListener;
      if (anySub?.subscription && typeof anySub.subscription.unsubscribe === "function") {
        anySub.subscription.unsubscribe();
        return;
      }
      if (typeof anySub?.unsubscribe === "function") {
        anySub.unsubscribe();
      }
    };
  }, []);

  return (
    <nav className="flex flex-wrap items-center justify-between border-b bg-white px-4 py-2 shadow-sm">
      {/* LEFT SIDE: LOGO + BRAND */}
      <div className="flex items-center gap-3">
        <img
          src="/icon.png"
          alt="TempTake logo"
          className="h-8 w-8 object-contain"
        />
        <span className="text-lg font-semibold">TempTake</span>
      </div>

      {/* CENTER: NAV TABS */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/" && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* RIGHT SIDE: USER EMAIL */}
      <div className="text-xs text-gray-500">
        {userEmail ? userEmail : "Not signed in"}
      </div>
    </nav>
  );
}
