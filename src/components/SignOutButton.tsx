// src/components/SignOutButton.tsx
"use client";

import { signOutAndRedirect } from "@/app/actions/auth";

export default function SignOutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <form action={signOutAndRedirect}>
      <button
        type="submit"
        className="rounded-md bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-900"
      >
        {label}
      </button>
    </form>
  );
}
