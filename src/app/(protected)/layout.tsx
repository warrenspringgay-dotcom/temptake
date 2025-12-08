// src/app/(protected)/layout.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getUserOrNull } from "@/app/actions/auth";
import { getSubscriptionForCurrentUser } from "@/lib/subscription";

type Props = {
  children: React.ReactNode;
};

export default async function ProtectedLayout({ children }: Props) {
  // 1) Require logged-in user
  const user = await getUserOrNull();

  if (!user) {
    // Default after-login target
    redirect("/login?next=/dashboard");
  }

  // 2) Require active / trial subscription
  const info = await getSubscriptionForCurrentUser();

  if (!info.active) {
    const reason =
      info.status === "past_due" ? "payment_issue" : "no_subscription";
    redirect(`/billing?reason=${reason}`);
  }

  // 3) Auth + subscription OK → just render the page.
  // Root layout already handles <AppHeader /> and outer container.
  return <>{children}</>;
}
