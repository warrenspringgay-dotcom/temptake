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
  requiresPlan?: boolean;
};

const TABS: Tab[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/staff", label: "Staff", requiresStaffOnly: true, requiresPlan: true },
  { href: "/routines", label: "Routines", requiresPlan: true },
  { href: "/allergens", label: "Allergens", requiresPlan: true },
  { href: "/cleaning-rota", label: "Cleaning Rota", requiresPlan: true },
  { href: "/manager", label: "Manager Dashboard", requiresManager: true, requiresPlan: true },
  { href: "/leaderboard", label: "Leaderboard", icon: <Trophy className="h-4 w-4 text-amber-500" />, requiresPlan: true },
  { href: "/team", label: "Team", requiresPlan: true },
  { href: "/suppliers", label: "Suppliers", requiresPlan: true },
  { href: "/reports", label: "Reports", requiresPlan: true },
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
  return 1; // staff default
}

export default function NavTabs() {
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const billing = useSubscriptionStatus();

  const planOK = useMemo(() => {
    if (billing?.loading) return true;

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
        const email = (user.email ?? "").trim().toLowerCase();
        const userId = user.id;

        if (!alive) return;

        if (!orgId) {
          setRoleName(null);
          setIsManager(false);
          setRoleLoading(false);
          return;
        }

        // ✅ Option A: org-wide role comes from team_members row where location_id IS NULL.
        // Prefer user_id match; fallback to email match.
        let rows: Array<{ role: string | null }> = [];

        // 1) Try user_id
        const byUser = await supabase
          .from("team_members")
          .select("role")
          .eq("org_id", orgId)
          .eq("user_id", userId)
          .is("location_id", null);

        if (!byUser.error && Array.isArray(byUser.data) && byUser.data.length) {
          rows = byUser.data as any;
        } else if (email) {
          // 2) Fallback email
          const byEmail = await supabase
            .from("team_members")
            .select("role")
            .eq("org_id", orgId)
            .eq("email", email)
            .is("location_id", null);

          if (!byEmail.error && Array.isArray(byEmail.data) && byEmail.data.length) {
            rows = byEmail.data as any;
          }
        }

        if (!alive) return;

        if (!rows.length) {
          setRoleName("staff");
          setIsManager(false);
          setRoleLoading(false);
          return;
        }

        // ✅ Deterministic: pick highest privilege
        const best = rows
          .map((r) => (r.role ?? "staff").toLowerCase())
          .sort((a, b) => roleScore(b) - roleScore(a))[0];

        const role = best || "staff";
        setRoleName(role);

        const managerLike = role === "owner" || role === "admin" || role === "manager";
        setIsManager(managerLike);
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
  }, [ready, user]);

  const visibleTabs = useMemo(() => {
    const roleKnown = !roleLoading;

    return TABS.filter((t) => {
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
  }, [roleLoading, isManager]);

  if (!ready || !user) return null;

  return (
    <ul className="flex flex-nowrap items-center gap-1 min-w-max px-2 overflow-x-auto">
      {visibleTabs.map((t) => {
        const active = pathname === t.href || (pathname?.startsWith(t.href + "/") ?? false);
        const locked = !!t.requiresPlan && !planOK;
        const href = locked ? "/billing" : t.href;

        return (
          <li key={t.href} className="shrink-0">
            <Link
              href={href}
              title={locked ? "Requires an active plan" : undefined}
              className={[
                "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors whitespace-nowrap",
                active && !locked ? "bg-black text-white" : "text-slate-700 hover:bg-gray-100 hover:text-black",
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
