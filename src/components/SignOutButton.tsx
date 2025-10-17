// src/components/SignOutButton.tsx
"use client";

import { useFormStatus } from "react-dom";
import { signOutAndRedirect } from "@/app/actions/auth";

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export default function SignOutButton() {
  return (
    <form action={signOutAndRedirect}>
      <Submit label="Sign out" pendingLabel="Signing out…" />
    </form>
  );
}
