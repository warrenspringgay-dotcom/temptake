// src/components/SignOutButton.tsx
"use client";

import { signOutAndRedirect } from "@/app/actions/auth";

export default function SignOutButton({
  redirectTo = "/login",
}: { redirectTo?: string }) {
  return (
    <form action={signOutAndRedirect}>
      {/* optional: lets you control where to go after sign out */}
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button
        type="submit"
        className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-900"
      >
        Sign out
      </button>
    </form>
  );
}
