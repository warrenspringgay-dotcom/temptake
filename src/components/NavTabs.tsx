// src/components/NavTabs.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { useAuth } from "@/components/AuthProvider";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

type Tab = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  requiresManager?: boolean;
  requiresPlan?: boolean; // needs active sub OR trial
};

const BASE_TABS: Tab[] = [
  // Always visible for logged-in users
  { href: "/dashboard", label: "Dashboard" },

  // Plan-gated tabs
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
  const { hasValid, loading: billingLoading } = useSubscriptionStatus();

  const [canSeeManager, setCanSeeManager] = useState(false);

  // ---- Role-based gating for Manager Dashboard ----
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

  // ---- Apply gating rules to tabs ----
  const tabs = useMemo(
    () =>
      BASE_TABS.filter((t) => {
        // Manager-only tabs
        if (t.requiresManager && !canSeeManager) return false;

        // Plan-only tabs: hide if billing says no valid plan/trial
        if (t.requiresPlan && !hasValid) return false;

        return true;
      }),
    [canSeeManager, hasValid]
  );

  // While auth is not ready, don't render nav at all
  if (!ready || !user) return null;

  // Optional: while billing is loading, show all tabs except manager ones,
  // so the UI doesn't "flash" hidden then visible.
  const effectiveTabs = billingLoading ? BASE_TABS.filter(t => !t.requiresManager || canSeeManager) : tabs;

  return (
    <ul className="flex flex-nowrap items-center gap-1 min-w-max px-2">
      {effectiveTabs.map((t) => {
        const isActive =
          pathname === t.href ||
          (pathname?.startsWith(t.href + "/") ?? false);

        return (
          <li key={t.href} className="shrink-0">
            <Link
              href={t.href}
              className={[
                "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors whitespace-nowrap",
                isActive
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
