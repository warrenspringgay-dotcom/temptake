// src/app/(protected)/layout.tsx
import React from "react";
import { redirect } from "next/navigation";

import { getUserOrNull } from "@/app/actions/auth";
import { getSubscriptionForCurrentUser } from "@/lib/subscription";

type Props = {
  children: React.ReactNode;
};

/**
 * This layout wraps ALL protected pages:
 *   /dashboard
 *   /routines
 *   /allergens
 *   /cleaning-rota
 *   /team
 *   /leaderboard
 *   /suppliers
 *   /reports
 *   /foodtemps
 *
 * It does:
 *  - Require a logged-in user
 *  - Require an active / trial subscription
 *
 * Root layout (`src/app/layout.tsx`) is still responsible for
 * rendering the header / shell, so we just return {children} here.
 */
export default async function ProtectedLayout({ children }: Props) {
  // 1) Require logged-in user
  const user = await getUserOrNull();

  if (!user) {
    // Default redirect after login – you can tweak if you want.
    redirect("/login?next=/dashboard");
  }

  // 2) Require active / trial subscription
  const info = await getSubscriptionForCurrentUser();

  if (!info.active) {
    const reason =
      info.status === "past_due" ? "payment_issue" : "no_subscription";

    // Send them to billing page to sort subscription out
    redirect(`/billing?reason=${reason}`);
  }

  // 3) Auth + subscription OK → render the actual page.
  // Header / nav is already handled by the root layout.
  return <>{children}</>;
}
