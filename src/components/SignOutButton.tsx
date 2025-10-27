"use client";

import { useTransition } from "react";
import { signOutAction } from "@/app/actions/auth";

export default function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => signOutAction())}
      disabled={pending}
      className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
