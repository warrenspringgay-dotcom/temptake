"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/`,
      },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold mb-1">Sign in</h1>
        <p className="text-sm text-slate-600 mb-4">Use your work email to receive a one‑time sign‑in link.</p>

        {sent ? (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm">
            Check your inbox — we sent a sign‑in link to <strong>{email}</strong>.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@company.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <div className="text-sm text-rose-700">{error}</div>}
            <button className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800">
              Send magic link
            </button>
          </form>
        )}

        <div className="mt-6 text-xs text-slate-600">
          <Link href="/" className="underline">Back to app</Link>
        </div>
      </div>
    </main>
  );
}
