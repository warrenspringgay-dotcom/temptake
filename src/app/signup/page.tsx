// src/app/signup/page.tsx
"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signUpAction } from "@/app/actions/auth"; // server action
import { supabase } from "@/lib/supabaseBrowser";
import { setActiveOrgIdClient } from "@/lib/orgClient";
import { setActiveLocationIdClient } from "@/lib/locationClient";

function makeInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3);
}

export default function SignupPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const loading = isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!agree) {
      setError("Please agree to the Terms of Use and Privacy Policy.");
      return;
    }
    if (!fullName.trim() || !businessName.trim()) {
      setError("Please enter your name and business name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!password || !confirm) {
      setError("Please enter and confirm your password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const initials = makeInitials(fullName);

    const formData = new FormData();
    formData.set("name", fullName.trim());
    formData.set("orgName", businessName.trim());
    formData.set("email", email.trim().toLowerCase());
    formData.set("password", password);
    formData.set("initials", initials);
    // where to go after signup
    formData.set("next", "/leaderboard");

    startTransition(async () => {
      try {
        const result = await signUpAction({ ok: false }, formData);

        if (!result.ok) {
          setError(result.message ?? "Sign up failed. Please try again.");
          return;
        }

        // 🔐 Make sure the BROWSER is now logged in as this new user
        // (We sign out any old user then sign in with the new creds.)
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (signInErr) {
          console.error("Post-signup sign-in failed:", signInErr.message);
          // We still carry on; user can manually log in if needed.
        }

        // 🏢 Set active org + location for this new account
        // (signUpAction should be returning these IDs)
        if (result.orgId) {
          setActiveOrgIdClient(result.orgId);
        }
        if (result.locationId) {
          setActiveLocationIdClient(result.locationId);
        }

        if (result.message && !result.redirect) {
          setInfo(result.message);
        }

        if (result.redirect) {
          router.push(result.redirect);
        }
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? "Sign up failed. Please try again.");
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow"
      >
        <h1 className="text-xl font-semibold text-slate-900">
          Create your TempTake account
        </h1>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Your name</span>
          <input
            className="h-10 w-full rounded-xl border border-slate-300 px-3"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Business name</span>
          <input
            className="h-10 w-full rounded-xl border border-slate-300 px-3"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Email</span>
          <input
            type="email"
            className="h-10 w-full rounded-xl border border-slate-300 px-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Password</span>
          <input
            type="password"
            className="h-10 w-full rounded-xl border border-slate-300 px-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Confirm password</span>
          <input
            type="password"
            className="h-10 w-full rounded-xl border border-slate-300 px-3"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          I agree to the Terms of Use and Privacy Policy.
        </label>

        {error && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {error}
          </div>
        )}
        {info && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 h-10 w-full rounded-xl bg-black text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
