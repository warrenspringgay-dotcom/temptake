// src/app/(protected)/layout.tsx
import React from "react";
import { redirect } from "next/navigation";

import HeaderShell from "@/app/app/HeaderShell";
import { getUserOrNull } from "@/app/actions/auth";
import { getSubscriptionForCurrentUser } from "@/lib/subscription";

type Props = {
  children: React.ReactNode;
};

export default async function ProtectedLayout({ children }: Props) {
  // 1) Require logged-in user
  const user = await getUserOrNull();

  if (!user) {
    // We can’t easily know the exact path here, so use dashboard as the
    // default “after login” target.
    redirect("/login?next=/dashboard");
  }

  // 2) Require active / trial subscription
  const info = await getSubscriptionForCurrentUser();

  if (!info.active) {
    const reason =
      info.status === "past_due" ? "payment_issue" : "no_subscription";
    redirect(`/billing?reason=${reason}`);
  }

  // 3) Auth + subscription OK → render normal app shell
  return (
    <>
      <HeaderShell user={user} />
      <main className="mx-auto max-w-6xl px-4 pb-8 pt-4">{children}</main>
    </>
  );
}
