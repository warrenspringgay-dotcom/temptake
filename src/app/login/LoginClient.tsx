// src/app/login/LoginClient.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseBrowser";

type LoginClientProps = {
  initialNext: string;
};

export default function LoginClient({ initialNext }: LoginClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message || "Could not sign in.");
      setSubmitting(false);
      return;
    }

    if (!data.session) {
      setError("No session returned from Supabase.");
      setSubmitting(false);
      return;
    }

    // ✅ On success: send them to the intended page
    router.replace(initialNext || "/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-[calc(100vh-48px)] items-center justify-center bg-slate-50 px-4 py-6">
      <div className="w-full max-w-md rounded-3xl bg-white px-6 py-8 shadow-lg">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Sign in</h1>
        <p className="mb-6 text-sm text-slate-600">
          Use your TempTake account details to access your kitchen dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-xs font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-slate-600">
            <Link
              href="/reset-password"
              className="text-blue-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex w-full items-center justify-center rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-slate-900 underline-offset-2 hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
