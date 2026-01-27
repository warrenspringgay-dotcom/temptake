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

function isFutureIso(iso: unknown) {
  if (typeof iso !== "string" || !iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t > Date.now() : false;
}

export default function NavTabs() {
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const billing = useSubscriptionStatus();

  /**
   * PLAN GATING (fixed):
   * - Your billing page shows "Free trial active" but billing.hasValid is false.
   * - So we treat trialing/onTrial/future trial_ends_at as valid access.
   *
   * We keep the original behavior: while loading, don't lock anything.
   */
  const planOK = useMemo(() => {
    if (billing?.loading) return true;

    // Common flags
    const hasValid = !!(billing as any)?.hasValid;
    const active = !!(billing as any)?.active;
    const onTrial = !!(billing as any)?.onTrial;

    // Common fields (depending on your hook's shape)
    const status = String((billing as any)?.status ?? "").toLowerCase();
    const trialEndsAt = (billing as any)?.trialEndsAt ?? (billing as any)?.trial_ends_at ?? null;
    const currentPeriodEnd =
      (billing as any)?.currentPeriodEnd ?? (billing as any)?.current_period_end ?? null;

    // ✅ IMPORTANT: trial counts as valid plan access
    if (hasValid || active || onTrial) return true;
    if (status === "trialing") return true;

    // If status flags are buggy, still allow if trial end is in the future
    if (isFutureIso(trialEndsAt)) return true;

    // Some setups only populate current_period_end even during trial
    if (isFutureIso(currentPeriodEnd) && status !== "canceled") return true;

    return false;
  }, [billing]);

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

        console.log("[billing]", billing);

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
  }, [ready, user, billing]);

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
