// src/app/signup/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseBrowser";

export default function SignUpPage() {
  const router = useRouter();
  const search = useSearchParams();
  const redirectTo = search.get("redirectTo") || "/dashboard";

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email || !password) {
      setError("Please enter an email and password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!acceptTerms) {
      setError("Please accept the terms to continue.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // these end up in auth.user.user_metadata
          data: {
            full_name: fullName || null,
            business_name: businessName || null,
          },
          // used if you ever enable "confirm email" in Supabase
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });

      if (error) {
        throw error;
      }

      // If email confirmation is OFF, Supabase returns a session and user is logged in
      if (data.session) {
        router.replace(redirectTo);
        return;
      }

      // If confirmation is ON, no session yet – ask them to check email
      setInfo(
        "We've sent you a confirmation email. Please follow the link to finish creating your account."
      );
    } catch (err: any) {
      console.error("Sign up failed", err);
      setError(err?.message ?? "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Create your account</h1>
        <p className="mb-6 text-sm text-gray-500">
          Set up TempTake for your business in a few seconds.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Your name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10 w-full rounded-xl border px-3 text-sm"
              placeholder="e.g., Alex Smith"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Business name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="h-10 w-full rounded-xl border px-3 text-sm"
              placeholder="e.g., Pier Vista"
              autoComplete="organization"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              className="h-10 w-full rounded-xl border px-3 text-sm"
              placeholder="you@restaurant.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-xl border px-3 text-sm"
              autoComplete="new-password"
              required
            />
            <p className="mt-1 text-[11px] text-gray-500">
              At least 8 characters.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-10 w-full rounded-xl border px-3 text-sm"
              autoComplete="new-password"
              required
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              className="mt-[3px] h-4 w-4 rounded border-gray-300"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <span>
              I agree to the{" "}
              <span className="underline">Terms of Use</span> and{" "}
              <span className="underline">Privacy Policy</span>.
            </span>
          </label>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {info && !error && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`mt-2 flex h-10 w-full items-center justify-center rounded-2xl text-sm font-medium text-white ${
              loading
                ? "cursor-not-allowed bg-gray-500"
                : "bg-black hover:bg-gray-900"
            }`}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-gray-600">
          Already have an account?{" "}
          <Link
            href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
            className="font-medium text-gray-900 underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
