// src/app/setup/setupClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

export default function SetupClient() {
  const router = useRouter();
  const busy = useRef(false);

  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Try to prefill owner name from Google profile
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const full =
        (user?.user_metadata as any)?.full_name ||
        (user?.user_metadata as any)?.name ||
        "";
      if (full && !ownerName) setOwnerName(String(full));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    setError(null);
    if (busy.current) return;
    busy.current = true;

    try {
      if (!ownerName.trim()) {
        setError("Your name is required.");
        return;
      }
      if (!businessName.trim()) {
        setError("Business name is required.");
        return;
      }

      const res = await fetch("/api/org/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: ownerName.trim(),
          businessName: businessName.trim(),
          locationName: businessName.trim(),
        }),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok || !json || json.ok === false) {
        console.error("[setup] bootstrap failed", json);
        setError("Setup failed. Please contact support.");
        return;
      }

      // Read the cookie set by /auth/callback to know where to go next
      // (We can’t read httpOnly cookie client-side, so we just go dashboard.
      // Your middleware already routes /login and protects correctly.)
      router.replace("/dashboard?welcome=1");
      router.refresh();
    } catch (e: any) {
      console.error("[setup] error", e);
      setError(e?.message ?? "Something went wrong.");
    } finally {
      busy.current = false;
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <input
        className="w-full rounded-xl border p-3"
        value={ownerName}
        onChange={(e) => setOwnerName(e.target.value)}
        placeholder="Your name"
      />

      <input
        className="w-full rounded-xl border p-3"
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        placeholder="Business name"
      />

      <button
        type="button"
        onClick={submit}
        className="w-full rounded-xl bg-black py-3 text-white disabled:opacity-50"
        disabled={busy.current}
      >
        {busy.current ? "Saving..." : "Create workspace"}
      </button>
    </div>
  );
}
