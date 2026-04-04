"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { useAuth } from "@/components/AuthProvider";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";

type Tab = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  requiresManager?: boolean;
  requiresStaffOnly?: boolean;
  requiresPlan?: boolean;
};

const APP_TABS: Tab[] = [
  { href: "/dashboard", label: "Dashboard" },

  { href: "/staff", label: "Staff", requiresStaffOnly: true, requiresPlan: true },

  { href: "/routines", label: "Routines", requiresPlan: true },
  { href: "/allergens", label: "Allergens", requiresPlan: true },
  { href: "/cleaning-rota", label: "Cleaning Rota", requiresPlan: true },

  { href: "/manager", label: "Manager Dashboard", requiresManager: true, requiresPlan: true },
  { href: "/team", label: "Team", requiresManager: true, requiresPlan: true },
  { href: "/suppliers", label: "Suppliers", requiresManager: true, requiresPlan: true },
  { href: "/billing", label: "Billing", requiresManager: true, requiresPlan: true },

  { href: "/leaderboard", label: "Leaderboard", requiresPlan: true },
  { href: "/reports", label: "Reports", requiresPlan: true },
];

const PUBLIC_TABS: Tab[] = [
  { href: "/", label: "Home" },
  { href: "/templates", label: "Templates" },
  { href: "/guides", label: "Guides" },
  { href: "/demo", label: "Demo App" },
  { href: "/food-hygiene-app", label: "The App" },
  { href: "/pricing", label: "Pricing" },

];

function isFutureIso(iso: unknown) {
  if (typeof iso !== "string" || !iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t > Date.now() : false;
}

function roleScore(role: string) {
  const r = (role ?? "").toLowerCase();
  if (r === "owner") return 4;
  if (r === "admin") return 3;
  if (r === "manager") return 2;
  return 1;
}

function isManagerLike(role: string | null | undefined) {
  const r = (role ?? "").toLowerCase();
  return r === "owner" || r === "admin" || r === "manager";
}

type NavTabsProps = {
  mode?: "app" | "public";
};

export default function NavTabs({ mode = "app" }: NavTabsProps) {
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const billing = useSubscriptionStatus();
  const { operator } = useWorkstation();

  const planOK = useMemo(() => {
    if ((billing as any)?.loading) return true;

    const hasValid = !!(billing as any)?.hasValid;
    const active = !!(billing as any)?.active;
    const onTrial = !!(billing as any)?.onTrial;

    const status = String((billing as any)?.status ?? "").toLowerCase();
    const trialEndsAt = (billing as any)?.trialEndsAt ?? (billing as any)?.trial_ends_at ?? null;
    const currentPeriodEnd =
      (billing as any)?.currentPeriodEnd ?? (billing as any)?.current_period_end ?? null;

    if (hasValid || active || onTrial) return true;
    if (status === "trialing") return true;
    if (isFutureIso(trialEndsAt)) return true;
    if (isFutureIso(currentPeriodEnd) && status !== "canceled") return true;

    return false;
  }, [billing]);

  const [roleName, setRoleName] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (mode === "public") {
        if (!alive) return;
        setRoleName(null);
        setIsManager(false);
        setRoleLoading(false);
        return;
      }

      if (operator?.role) {
        if (!alive) return;
        const r = String(operator.role).toLowerCase();
        setRoleName(r);
        setIsManager(isManagerLike(r));
        setRoleLoading(false);
        return;
      }

      if (!ready || !user) {
        if (!alive) return;
        setRoleName(null);
        setIsManager(false);
        setRoleLoading(false);
        return;
      }

      setRoleLoading(true);

      try {
        const [orgId, locationId] = await Promise.all([
          getActiveOrgIdClient(),
          getActiveLocationIdClient().catch(() => null),
        ]);

        const email = (user.email ?? "").trim().toLowerCase();
        const userId = user.id;

        if (!alive) return;

        if (!orgId) {
          setRoleName(null);
          setIsManager(false);
          setRoleLoading(false);
          return;
        }

        async function fetchRoles(
          scope: "location" | "org"
        ): Promise<Array<{ role: string | null }>> {
          let q = supabase.from("team_members").select("role").eq("org_id", orgId);

          if (scope === "location") {
            if (!locationId) return [];
            q = q.eq("location_id", locationId);
          } else {
            q = q.is("location_id", null);
          }

          const byUser = await q.eq("user_id", userId);
          if (!byUser.error && Array.isArray(byUser.data) && byUser.data.length) {
            return byUser.data as any;
          }

          if (email) {
            const byEmail = await q.ilike("email", email);
            if (!byEmail.error && Array.isArray(byEmail.data) && byEmail.data.length) {
              return byEmail.data as any;
            }
          }

          return [];
        }

        let rows: Array<{ role: string | null }> = await fetchRoles("location");
        if (!rows.length) rows = await fetchRoles("org");

        if (!alive) return;

        if (!rows.length) {
          setRoleName("staff");
          setIsManager(false);
          setRoleLoading(false);
          return;
        }

        const best = rows
          .map((r) => (r.role ?? "staff").toLowerCase())
          .sort((a, b) => roleScore(b) - roleScore(a))[0];

        const role = best || "staff";
        setRoleName(role);
        setIsManager(isManagerLike(role));
      } catch {
        if (!alive) return;
        setRoleName("staff");
        setIsManager(false);
      } finally {
        if (!alive) return;
        setRoleLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [ready, user, operator?.role, mode]);

  const visibleTabs = useMemo(() => {
    if (mode === "public") return PUBLIC_TABS;

    const roleKnown = !roleLoading;

    return APP_TABS.filter((t) => {
      if (t.requiresManager) {
        if (!roleKnown) return false;
        return isManager;
      }
      if (t.requiresStaffOnly) {
        if (!roleKnown) return false;
        return !isManager;
      }
      return true;
    });
  }, [mode, roleLoading, isManager]);

  if (mode === "app" && (!ready || !user)) return null;

  return (
    <ul className="flex min-w-max flex-nowrap items-center gap-1 overflow-x-auto px-2">
      {visibleTabs.map((t) => {
        const active =
          pathname === t.href || (t.href !== "/" && (pathname?.startsWith(t.href + "/") ?? false));

        const lockedByPlan = mode === "app" && !!t.requiresPlan && !planOK;
        const href = lockedByPlan ? "/billing" : t.href;

        return (
          <li key={t.href} className="shrink-0">
            <Link
              href={href}
              title={lockedByPlan ? "Requires an active plan" : undefined}
              className={[
                "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors",
                active && !lockedByPlan
                  ? "bg-black text-white"
                  : "text-slate-700 hover:bg-gray-100 hover:text-black",
                lockedByPlan ? "opacity-60" : "",
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