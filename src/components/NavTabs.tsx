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
  requiresStaffOnly?: boolean;
  requiresPlan?: boolean; // needs active sub OR trial
};

const TABS: Tab[] = [
  { href: "/dashboard", label: "Dashboard" },

  // Staff-only dashboard (only show to non-managers)
  { href: "/staff", label: "Staff", requiresStaffOnly: true, requiresPlan: true },

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

  // Billing
  const billing = useSubscriptionStatus();
  const hasValid = billing.hasValid;
  const billingLoading = billing.loading;

  // Role
  const [roleName, setRoleName] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!ready || !user) {
        if (!alive) return;
        setRoleName(null);
        setIsManager(false);
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
          setIsManager(false);
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
          setIsManager(false);
          setRoleLoading(false);
          return;
        }

        const role = (data.role ?? "").toLowerCase() || "staff";
        setRoleName(role);

        const managerLike = role === "owner" || role === "manager" || role === "admin";
        setIsManager(managerLike);
      } catch {
        if (!alive) return;
        setRoleName(null);
        setIsManager(false);
      } finally {
        if (!alive) return;
        setRoleLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [ready, user]);

  // Billing resolved means we trust hasValid.
  const billingResolved = !billingLoading && typeof hasValid === "boolean";
  const planOK = billingResolved ? !!hasValid : true; // unknown => don’t punish the UI

  // Build visible tabs by role (DO NOT hide plan tabs, only redirect them)
  const visibleTabs = useMemo(() => {
    // While role is loading, don’t show role-sensitive tabs (prevents pop-in)
    const roleKnown = !roleLoading;

    return TABS.filter((t) => {
      if (t.requiresManager) {
        if (!roleKnown) return false;
        return isManager;
      }

      if (t.requiresStaffOnly) {
        if (!roleKnown) return false;
        return !isManager; // staff-only means NOT manager-like
      }

      return true;
    });
  }, [roleLoading, isManager]);

  // No auth, no nav
  if (!ready || !user) return null;

  return (
    <ul className="flex flex-nowrap items-center gap-1 min-w-max px-2 overflow-x-auto">
      {visibleTabs.map((t) => {
        const active =
          pathname === t.href || (pathname?.startsWith(t.href + "/") ?? false);

        const locked = !!t.requiresPlan && !planOK;

        // Keep UI consistent: show the tab, but send them to billing if locked.
        const href = locked ? "/billing" : t.href;

        return (
          <li key={t.href} className="shrink-0">
            <Link
              href={href}
              title={locked ? "Requires an active plan" : undefined}
              className={[
                "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors whitespace-nowrap",
                active && !locked
                  ? "bg-black text-white"
                  : "text-slate-700 hover:bg-gray-100 hover:text-black",
                locked ? "opacity-60" : "",
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
