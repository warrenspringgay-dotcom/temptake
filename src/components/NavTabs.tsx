// src/components/NavTabs.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

type Tab = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  requiresManager?: boolean;
};

const BASE_TABS: Tab[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/cleaning-rota", label: "Cleaning Rota" },
  
  // Manager dashboard – manager-only
  {
    href: "/manager",
    label: "Manager Dashboard",
    requiresManager: true,
  },

  {
    href: "/leaderboard",
    label: "Leaderboard",
    icon: <Trophy className="h-4 w-4 text-amber-500" />,
  },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },

  { href: "/reports", label: "Reports" },
];

export default function NavTabs() {
  const pathname = usePathname();

  // 🔐 Auth
  const [user, setUser] = useState<any | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Role flag for manager-only tab
  const [canSeeManager, setCanSeeManager] = useState(false);

  // 1) Check if user is logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
      setAuthChecked(true);
    });
  }, []);

  // 2) If logged in, resolve role from team_members
  useEffect(() => {
    (async () => {
      if (!authChecked || !user) {
        setCanSeeManager(false);
        return;
      }

      try {
        const orgId = await getActiveOrgIdClient();
        const email = user.email?.toLowerCase() ?? null;

        if (!orgId || !email) {
          setCanSeeManager(false);
          return;
        }

        const { data, error } = await supabase
          .from("team_members")
          .select("role,email")
          .eq("org_id", orgId)
          .eq("email", email)
          .maybeSingle();

        if (error || !data) {
          setCanSeeManager(false);
          return;
        }

        const role = (data.role ?? "").toLowerCase();
        const allowed =
          role === "owner" || role === "manager" || role === "admin";

        setCanSeeManager(allowed);
      } catch {
        setCanSeeManager(false);
      }
    })();
  }, [authChecked, user]);

  // 3) Filter tabs based on role
  const tabs = useMemo(
    () => BASE_TABS.filter((t) => (t.requiresManager ? canSeeManager : true)),
    [canSeeManager]
  );

  // 4) Hide nav completely if auth not done or not logged in
  if (!authChecked) return null;
  if (!user) return null;

  return (
    <ul className="flex flex-nowrap items-center gap-1 min-w-max px-2">
      {tabs.map((t) => {
        const active =
          pathname === t.href ||
          (pathname?.startsWith(t.href + "/") ?? false);

        return (
          <li key={t.href} className="shrink-0">
            <Link
              href={t.href}
              className={[
                "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors whitespace-nowrap",
                active
                  ? "bg-black text-white"
                  : "text-slate-700 hover:bg-gray-100 hover:text-black",
              ].join(" ")}
            >
              {t.icon && <span>{t.icon}</span>}
              {t.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
