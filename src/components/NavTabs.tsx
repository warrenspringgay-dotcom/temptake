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
  { href: "/dashboard", label: "Dashboard" },

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

  // billing
  const billing = useSubscriptionStatus();
  const hasValid = billing.hasValid;
  const billingLoading = billing.loading;

  // manager role
  const [canSeeManager, setCanSeeManager] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!ready || !user) {
        if (!alive) return;
        setCanSeeManager(false);
        setRoleLoading(false);
        return;
      }

      setRoleLoading(true);

      try {
        const orgId = await getActiveOrgIdClient();
        const email = user.email?.toLowerCase() ?? null;

        if (!alive) return;

        if (!orgId || !email) {
          setCanSeeManager(false);
          setRoleLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("team_members")
          .select("role,email")
          .eq("org_id", orgId)
          .eq("email", email)
          .maybeSingle();

        if (!alive) return;

        if (error || !data) {
          setCanSeeManager(false);
          setRoleLoading(false);
          return;
        }

        const role = (data.role ?? "").toLowerCase();
        setCanSeeManager(role === "owner" || role === "manager" || role === "admin");
      } catch {
        if (!alive) return;
        setCanSeeManager(false);
      } finally {
        if (!alive) return;
        setRoleLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [ready, user]);

  // ✅ IMPORTANT:
  // Treat billing as "unknown" until it has definitely resolved.
  // While unknown, DO NOT hide plan tabs (prevents the "only dashboard" flash).
  const billingResolved = !billingLoading && typeof hasValid === "boolean";
  const allowPlanTabs = billingResolved ? hasValid : true;

  // ---- Apply gating rules to tabs ----
  const effectiveTabs = useMemo(() => {
    return BASE_TABS.filter((t) => {
      // Manager-only tab:
      // while role is still loading, hide it (prevents pop-in and accidental exposure)
      if (t.requiresManager) {
        if (roleLoading) return false;
        if (!canSeeManager) return false;
      }

      // Plan-only tabs: only hide once billing has actually resolved
      if (t.requiresPlan && !allowPlanTabs) return false;

      return true;
    });
  }, [canSeeManager, roleLoading, allowPlanTabs]);

  if (!ready || !user) return null;

  return (
    <ul className="flex flex-nowrap items-center gap-1 min-w-max px-2">
      {effectiveTabs.map((t) => {
        const isActive =
          pathname === t.href || (pathname?.startsWith(t.href + "/") ?? false);

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
