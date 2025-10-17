// src/app/login/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser"; // cookie-syncing client

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const redirectTo = search.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // If already authenticated, bounce to redirect target
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      if (data.user) router.replace(redirectTo);
    })();
    return () => { alive = false; };
  }, [router, redirectTo]);

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.replace(redirectTo);
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setMsg("Check your email for the sign-in link.");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold mb-1">Sign in</h1>
        <p className="text-sm text-slate-600 mb-4">
          Use your email + password or request a magic link.
        </p>

        <form className="space-y-3" onSubmit={signInWithPassword}>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !email || !pwd}
            className={`w-full rounded-md px-3 py-2 text-sm font-medium text-white ${busy || !email || !pwd ? "bg-gray-400" : "bg-black hover:bg-gray-900"}`}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <button
            onClick={sendMagicLink}
            disabled={busy || !email}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            {busy ? "Sending…" : "Email me a magic link"}
          </button>
        </form>

        {err && <div className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{err}</div>}
        {msg && <div className="mt-3 rounded-md bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</div>}
      </div>
    </div>
  );
}
