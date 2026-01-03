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
  requiresStaff?: boolean;
  requiresPlan?: boolean;
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
  { href: "/dashboard", label: "Dashboard" },
  { href: "/staff", label: "Staff", requiresStaff: true, requiresPlan: true },
  { href: "/routines", label: "Routines", requiresPlan: true },
  { href: "/allergens", label: "Allergens", requiresPlan: true },
  { href: "/cleaning-rota", label: "Cleaning Rota", requiresPlan: true },
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

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

type RoleFlags = {
  canSeeManager: boolean;
  canSeeStaff: boolean;
};

async function getRoleFlags(userEmail: string): Promise<RoleFlags> {
  const orgId = await getActiveOrgIdClient();
  if (!orgId) return { canSeeManager: false, canSeeStaff: false };

  const email = userEmail.toLowerCase();

  // Assumption based on your existing patterns: role stored on team_members
  const { data, error } = await supabase
    .from("team_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("email", email)
    .maybeSingle();

  if (error || !data) return { canSeeManager: false, canSeeStaff: false };

  const role = (data.role ?? "").toLowerCase();

  const isManager = role === "manager" || role === "owner";
  const isStaff = role === "staff";

  return {
    canSeeManager: isManager,
    canSeeStaff: isStaff,
  };
}

export default function NavTabs() {
  const pathname = usePathname() || "/";
  const { user, ready } = useAuth();

  const { hasValid, loading: billingLoading } = useSubscriptionStatus();

  const [roleFlags, setRoleFlags] = useState<RoleFlags>({
    canSeeManager: false,
    canSeeStaff: false,
  });
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!ready || !user?.email) {
        if (!alive) return;
        setRoleFlags({ canSeeManager: false, canSeeStaff: false });
        setRoleLoading(false);
        return;
      }

      setRoleLoading(true);
      const flags = await getRoleFlags(user.email);
      if (!alive) return;
      setRoleFlags(flags);
      setRoleLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [ready, user?.email]);

  const baseTabs = roleFlags.canSeeManager ? MANAGER_TABS : STAFF_TABS;

  const effectiveTabs = useMemo(() => {
    const allowPlanTabs = billingLoading ? true : hasValid;

    return baseTabs.filter((t) => {
      if (t.requiresManager && !roleFlags.canSeeManager) return false;
      if (t.requiresStaff && !roleFlags.canSeeStaff) return false;
      if (t.requiresPlan && !allowPlanTabs) return false;
      return true;
    });
  }, [baseTabs, roleFlags, hasValid, billingLoading]);

  // ✅ MOBILE: tabs hidden, they live in MobileMenu
  // ✅ DESKTOP: single-line, no wrap, scroll if needed
  return (
    <nav className="hidden md:block">
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
        {effectiveTabs.map((tab) => {
          const active = isActive(pathname, tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cls(
                "inline-flex items-center gap-2 border px-3 py-2 text-sm",
                "rounded-none", // square
                active
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
              )}
              aria-current={active ? "page" : undefined}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}

        {(roleLoading || billingLoading) && (
          <span className="ml-2 text-xs text-slate-400">
            {/* keep layout stable while loading */}
          </span>
        )}
      </div>
    </nav>
  );
}
