// src/components/UserMenu.tsx
"use client";
import { useEffect, useState } from "react";

export default function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // light client fetch of /api/me if you have it, or just hide for now
      try {
        const r = await fetch("/api/me").then((r) => (r.ok ? r.json() : null));
        setEmail(r?.email ?? null);
      } catch {}
    })();
  }, []);

  return (
    <div className="flex items-center gap-3">
      {email ? (
        <>
          <span className="text-sm text-gray-600">{email}</span>
          <form action="/api/auth/signout" method="post">
            <button className="rounded-md border px-3 py-1.5 text-sm">Sign out</button>
          </form>
        </>
      ) : (
        <a className="text-sm underline" href="/login?redirect=/">
          Sign in
        </a>
      )}
    </div>
  );
}
