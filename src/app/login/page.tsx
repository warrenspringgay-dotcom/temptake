// src/app/login/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<string | null>(null);

  const safeNext = useMemo(() => {
    const rawNext = searchParams.get("next");
    let next =
      rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
        ? rawNext
        : "/dashboard";

    if (next === "/login") next = "/dashboard";
    return next;
  }, [searchParams]);

  useEffect(() => {
    const e = searchParams.get("error");
    if (e === "oauth") {
      setErr("Google sign-in failed. Please try again or use email/password.");
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled && data.user) {
        router.replace(safeNext);
        router.refresh();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, safeNext]);

 async function signInWithGoogle() {
  setErr(null);
  setResetInfo(null);

  try {
    setLoading(true);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      safeNext
    )}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) throw error;
  } catch (e: any) {
    setErr(e?.message || "Google sign-in failed.");
    setLoading(false);
  }
}


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

      router.replace(safeNext);
      router.refresh();
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
    <div className="flex justify-center bg-slate-50 px-4 pt-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold text-gray-900">Sign in</h1>

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

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <div className="text-xs text-gray-500">or</div>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

   <button
  type="button"
  onClick={signInWithGoogle}
  disabled={loading}
  className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    className="h-4 w-4"
  >
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8.1 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.1-.1-2.1-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8.1 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.4 4.3-17.7 10.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.1 0 9.8-2 13.4-5.2l-6.2-5.2C29.1 35.1 26.6 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.5 39.7 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C36.8 40.4 44 36 44 24c0-1.1-.1-2.1-.4-3.5z"
    />
  </svg>
  Continue with Google
</button>


        <p className="mt-4 text-center text-xs text-gray-600">
          Don’t have an account?{" "}
          <Link href="/signup" className="font-medium text-gray-900 underline">
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
