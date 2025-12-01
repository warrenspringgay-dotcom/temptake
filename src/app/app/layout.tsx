// src/app/app/layout.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getSubscriptionForCurrentUser } from "@/lib/subscription";

export default async function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const info = await getSubscriptionForCurrentUser();

  // Not logged in → push to main landing page (or login page if you prefer)
  if (!info.loggedIn) {
    redirect("/?auth=required");
  }

  // Logged in but no active subscription → go to billing
  if (!info.active) {
    const reason =
      info.status === "past_due" ? "payment_issue" : "no_subscription";
    redirect(`/billing?reason=${reason}`);
  }

  // Active subscription → allow access to /app subtree
  return <>{children}</>;
}
