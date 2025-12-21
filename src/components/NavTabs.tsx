// src/components/NavTabs.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { useAuth } from "@/components/AuthProvider";

type Tab = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  requiresManager?: boolean;
  requiresPlan?: boolean; // 👈 new: subscription gating
};

const BASE_TABS: Tab[] = [


  // everything below is gated behind an active plan
  { href: "/dashboard", label: "Dashboard", requiresPlan: true },  // always visible
  { href: "/routines", label: "Routines", requiresPlan: true },
  { href: "/allergens", label: "Allergens", requiresPlan: true },
  { href: "/cleaning-rota", label: "Cleaning Rota", requiresPlan: true },
  {
    href: "/manager",
    label: "Manager Dashboard",
    requiresManager: true,
    requiresPlan: true,
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    icon: <Trophy className="h-4 w-4 text-amber-500" />,
    requiresPlan: true,
  },
  { href: "/team", label: "Team", requiresPlan: true },
  { href: "/suppliers", label: "Suppliers", requiresPlan: true },
  { href: "/reports", label: "Reports", requiresPlan: true },
];

export default function NavTabs() {
  const pathname = usePathname();
  const { user, ready } = useAuth();

  const [canSeeManager, setCanSeeManager] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState<boolean>(false);

  // 1) Role-based gating (owner / manager / admin)
  useEffect(() => {
    (async () => {
      if (!ready || !user) {
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
        setCanSeeManager(
          role === "owner" || role === "manager" || role === "admin"
        );
      } catch {
        setCanSeeManager(false);
      }
    })();
  }, [ready, user]);

  // 2) Subscription-based gating
  useEffect(() => {
    if (!ready || !user) {
      setHasActivePlan(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // 🔧 Wire this to whatever billing-status endpoint you already have.
        // Expected response shape: { hasActivePlan: boolean }
        const res = await fetch("/api/billing/status", { method: "GET" });
        if (!res.ok) {
          if (!cancelled) setHasActivePlan(false);
          return;
        }

        const json = (await res.json()) as { hasActivePlan?: boolean };
        if (!cancelled) {
          setHasActivePlan(!!json.hasActivePlan);
        }
      } catch {
        if (!cancelled) setHasActivePlan(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  const tabs = useMemo(
    () =>
      BASE_TABS.filter((t) => {
        // manager-only tabs
        if (t.requiresManager && !canSeeManager) return false;

        // subscription-only tabs
        if (t.requiresPlan && !hasActivePlan) return false;

        return true;
      }),
    [canSeeManager, hasActivePlan]
  );

  if (!ready || !user) return null;

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
