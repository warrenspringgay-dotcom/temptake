// src/components/AuthButton.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

export default function AuthButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!cancelled) {
          setEmail(user?.email ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="h-9 w-20 rounded-lg bg-gray-100 animate-pulse" aria-hidden="true" />
    );
  }

  // Not signed in: show a button that routes to /login
  if (!email) {
    return (
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-900"
      >
        Sign in
      </button>
    );
  }

  // Signed in: show "Sign out"
  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-lg border px-3 py-2 text-xs font-medium text-gray-800 hover:bg-gray-50"
    >
      Sign out
    </button>
  );
}
