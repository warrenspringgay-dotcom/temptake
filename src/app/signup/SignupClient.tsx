"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

function withWelcomeParam(next: string) {
  const url = new URL(next, "http://local");
  url.searchParams.set("welcome", "1");
  return url.pathname + url.search;
}

export default function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const isSubmitting = useRef(false);

  async function signUpWithGoogle() {
    setError(null);

    if (!agreed) {
      setError("Please accept the Terms of Use and Privacy Policy.");
      return;
    }

    const nextParam = searchParams.get("next");
    const safeNext =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/dashboard";

    const redirectTo = `${window.location.origin}/auth/callback?next=/setup&after=${encodeURIComponent(
      withWelcomeParam(safeNext)
    )}`;

    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (oauthErr) setError(oauthErr.message);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isSubmitting.current) return;
    isSubmitting.current = true;

    try {
      if (!agreed) {
        setError("Please accept the Terms of Use and Privacy Policy.");
        return;
      }
      if (!ownerName.trim()) {
        setError("Your name is required.");
        return;
      }
      if (!businessName.trim()) {
        setError("Business name is required.");
        return;
      }
      if (!email || !password) {
        setError("Email and password are required.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }

      const { error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: ownerName.trim(),
            business_name: businessName.trim(),
          },
        },
      });

      if (signUpErr) {
        setError(signUpErr.message);
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr) {
        setError(
          signInErr.message ||
            "Account created but sign-in failed. Please log in."
        );
        return;
      }

      try {
        const bootstrapRes = await fetch("/api/org/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerName: ownerName.trim(),
            businessName: businessName.trim(),
            locationName: businessName.trim(),
          }),
        });

        const json = await bootstrapRes.json().catch(() => null);

        if (!bootstrapRes.ok || !json || json.ok === false) {
          setError(
            "Account created, but setup did not finish. Please contact support."
          );
        }
      } catch {
        setError(
          "Account created, but setup did not finish. Please contact support."
        );
      }

      const nextParam = searchParams.get("next");
      const safeNext =
        nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
          ? nextParam
          : "/dashboard";

      const redirect = withWelcomeParam(safeNext);
      router.replace(redirect);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      isSubmitting.current = false;
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <input
        className="w-full rounded-xl border p-3"
        type="text"
        value={ownerName}
        placeholder="Your name"
        onChange={(e) => setOwnerName(e.target.value)}
      />

      <input
        className="w-full rounded-xl border p-3"
        type="text"
        value={businessName}
        placeholder="Business name"
        onChange={(e) => setBusinessName(e.target.value)}
      />

      <input
        className="w-full rounded-xl border p-3"
        type="email"
        value={email}
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="w-full rounded-xl border p-3"
        type="password"
        value={password}
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <input
        className="w-full rounded-xl border p-3"
        type="password"
        value={confirm}
        placeholder="Confirm password"
        onChange={(e) => setConfirm(e.target.value)}
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="underline underline-offset-2">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={isSubmitting.current}
        className="w-full rounded-xl bg-black py-3 text-white disabled:opacity-50"
      >
        {isSubmitting.current ? "Creating account..." : "Create account"}
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <div className="text-xs text-gray-500">or</div>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={signUpWithGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-xl border bg-white py-3 text-sm font-medium hover:bg-gray-50"
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
    </form>
  );
}
