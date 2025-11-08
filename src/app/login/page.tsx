"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setResetInfo(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      window.location.href = "/dashboard";
    } catch (e: any) {
      setErr(e?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setErr(null);
    setResetInfo(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErr("Enter your email first, then tap ‘Forgot password?’."); 
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setResetInfo("If that email exists, we’ve sent a reset link.");
    } catch (e: any) {
      setErr(e?.message || "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold text-gray-900">
          Sign in
        </h1>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-gray-500">Email</span>
            <input
              type="email"
              autoComplete="email"
              className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs text-gray-500">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </label>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-blue-600 hover:text-blue-700"
              disabled={loading}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`mt-2 flex h-10 w-full items-center justify-center rounded-2xl text-sm font-medium text-white ${
              loading
                ? "cursor-not-allowed bg-gray-500"
                : "bg-black hover:bg-gray-900"
            }`}
          >
            {loading ? "Please wait…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-600">
          Don’t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-gray-900 underline"
          >
            Create one
          </Link>
        </p>

        <div className="mt-3 space-y-1 text-xs">
          {err && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
              {err}
            </div>
          )}
          {resetInfo && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-900">
              {resetInfo}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
