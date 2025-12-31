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

const MANAGER_TABS: Tab[] = [
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

const STAFF_TABS: Tab[] = [
  { href: "/staff", label: "Dashboard" },

  { href: "/routines", label: "Routines", requiresPlan: true },
  { href: "/allergens", label: "Allergens", requiresPlan: true },
  { href: "/cleaning-rota", label: "Cleaning Rota", requiresPlan: true },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    icon: <Trophy className="h-4 w-4 text-amber-500" />,
    requiresPlan: true,
  },
];

export default function NavTabs() {
  const pathname = usePathname();
  const { user, ready } = useAuth();

  // billing
  const billing = useSubscriptionStatus();
  const hasValid = billing.hasValid;
  const billingLoading = billing.loading;

  // role
  const [roleName, setRoleName] = useState<string | null>(null);
  const [canSeeManager, setCanSeeManager] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!ready || !user) {
        if (!alive) return;
        setRoleName(null);
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
          setRoleName(null);
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
          setRoleName(null);
          setCanSeeManager(false);
          setRoleLoading(false);
          return;
        }

        const role = (data.role ?? "").toLowerCase() || "staff";
        setRoleName(role);

        const isManager = role === "owner" || role === "manager" || role === "admin";
        setCanSeeManager(isManager);
      } catch {
        if (!alive) return;
        setRoleName(null);
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

  // Choose tab set by role (hide everything role-specific until role is known to avoid pop-in)
  const baseTabs = useMemo(() => {
    if (roleLoading) return null;
    return canSeeManager ? MANAGER_TABS : STAFF_TABS;
  }, [roleLoading, canSeeManager]);

  // ---- Apply gating rules to tabs ----
  const effectiveTabs = useMemo(() => {
    const tabs = baseTabs ?? (canSeeManager ? MANAGER_TABS : STAFF_TABS);

    return tabs.filter((t) => {
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
  }, [baseTabs, canSeeManager, roleLoading, allowPlanTabs]);

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
