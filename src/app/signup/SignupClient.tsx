// src/app/signup/SignupClient.tsx
"use client";

import React, { useRef, useState } from "react";
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

    // After Google auth, send them to /setup so you can collect business name if needed
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
      // Basic validation
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

      // 1) Sign up in Supabase auth
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

      // 2) Immediately sign in
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

      // 3) Ask server to bootstrap org, user_orgs, team_members, locations
      try {
        const bootstrapRes = await fetch("/api/org/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerName: ownerName.trim(),
            businessName: businessName.trim(),
            locationName: businessName.trim(), // use business name for first location
          }),
        });

        let json: any = null;
        try {
          json = await bootstrapRes.json();
        } catch {
          json = null;
        }

        if (!bootstrapRes.ok || !json || json.ok === false) {
          console.error("[signup] bootstrap failed", json);
          setError(
            "Account created, but setup did not finish. Please contact support."
          );
        }
      } catch (err) {
        console.error("[signup] bootstrap exception", err);
        setError(
          "Account created, but setup did not finish. Please contact support."
        );
      }

      // 4) Navigate to dashboard
      const nextParam = searchParams.get("next");
      const safeNext =
        nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
          ? nextParam
          : "/dashboard";

      const redirect = withWelcomeParam(safeNext);
      router.replace(redirect);
      router.refresh();
    } catch (err: any) {
      console.error("[signup] unexpected error", err);
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
        I agree to the Terms of Use and Privacy Policy.
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
        className="w-full rounded-xl border bg-white py-3 text-sm font-medium hover:bg-gray-50"
      >
        Continue with Google
      </button>
    </form>
  );
}
