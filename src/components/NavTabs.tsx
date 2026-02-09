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

function isManagerLike(role: string | null | undefined) {
  const r = (role ?? "").toLowerCase().trim();
  return r === "owner" || r === "manager" || r === "admin";
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
        if (!alive) return;

        if (!orgId) {
          setRoleName(null);
          setIsManager(false);
          setRoleLoading(false);
          return;
        }

        // ✅ OPTION A: ORG-WIDE ROLE (authoritative)
        // Use user_id + location_id IS NULL so location-specific rows can’t mess with gating.
        const { data: orgRoleRow, error: orgRoleErr } = await supabase
          .from("team_members")
          .select("role")
          .eq("org_id", orgId)
          .eq("user_id", user.id)
          .is("location_id", null)
          .limit(1)
          .maybeSingle();

        if (!alive) return;

        if (!orgRoleErr && orgRoleRow?.role) {
          const role = String(orgRoleRow.role ?? "staff").toLowerCase().trim() || "staff";
          setRoleName(role);
          setIsManager(isManagerLike(role));
          setRoleLoading(false);
          return;
        }

        // 🔁 Fallback: email (case-insensitive) for edge cases where user_id isn’t linked yet
        const email = (user.email ?? "").trim();
        if (!email) {
          setRoleName(null);
          setIsManager(false);
          setRoleLoading(false);
          return;
        }

        const { data: emailRows, error: emailErr } = await supabase
          .from("team_members")
          .select("role, created_at")
          .eq("org_id", orgId)
          .is("location_id", null)
          .ilike("email", email) // case-insensitive
          .order("created_at", { ascending: false })
          .limit(1);

        if (!alive) return;

        if (emailErr || !emailRows?.length) {
          setRoleName(null);
          setIsManager(false);
          setRoleLoading(false);
          return;
        }

        const role = String(emailRows[0]?.role ?? "staff").toLowerCase().trim() || "staff";
        setRoleName(role);
        setIsManager(isManagerLike(role));
      } catch (e) {
        if (!alive) return;
        console.warn("[NavTabs] role lookup failed:", e);
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
