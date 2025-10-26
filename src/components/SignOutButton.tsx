// src/components/SignOutButton.tsx
"use client";

import { signOutAction } from "@/app/actions/auth";

export default function SignOutButton({
  redirectTo = "/login",
  label = "Sign out",
  className = "inline-flex h-9 items-center rounded-md px-3 text-sm hover:bg-gray-100",
}: {
  redirectTo?: string;
  label?: string;
  className?: string;
}) {
  // Bind the first parameter (redirectTo); the resulting function has the signature (formData) => Promise<void>
  const action = signOutAction.bind(null, redirectTo);

  return (
    <form action={action}>
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
