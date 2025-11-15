// src/app/signup/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

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

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = fullName.trim();
      const trimmedBiz = businessName.trim();

      // 1) Create auth user
      const {
        data: signData,
        error: signUpError,
      } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
          },
        },
      });

      if (signUpError) {
        console.error("Auth signup error", signUpError);
        setError(
          signUpError.message ||
            "Sign up failed at auth step. Please try a different email."
        );
        setLoading(false);
        return;
      }

      const user = signData.user;
      if (!user) {
        setInfo(
          "Account created. Please check your email for a confirmation link."
        );
        setLoading(false);
        return;
      }

      // 2) Create org
      const {
        data: orgRow,
        error: orgError,
      } = await supabase
        .from("orgs")
        .insert({ name: trimmedBiz })
        .select("id")
        .single();

      if (orgError) {
        console.error("Org insert error", orgError);
        setError(
          orgError.message ||
            "Failed to create organisation (orgs). Check RLS policies."
        );
        setLoading(false);
        return;
      }

      const orgId = orgRow.id as string;

      // 3) Store org on the auth user metadata
      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          org_id: orgId,
        },
      });
      if (metaError) {
        console.error("User metadata update error", metaError);
      }

      // 4) Attach profile row to org (include role)
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: trimmedName,
        email: trimmedEmail,
        org_id: orgId,
        role: "owner",
      });

      if (profileError) {
        console.error("Profiles upsert error", profileError);
        setError(
          profileError.message ||
            "Failed to save profile. Check RLS on table 'profiles'."
        );
        setLoading(false);
        return;
      }

      // 5) Add them to team_members as owner
      const initials = makeInitials(trimmedName);
      const { error: teamError } = await supabase.from("team_members").upsert(
        {
          org_id: orgId,
          name: trimmedName,
          email: trimmedEmail,
          initials,
          role: "owner",
          active: true,
        },
        {
          onConflict: "org_id,email",
        }
      );

      if (teamError) {
        console.error("team_members upsert error", teamError);
        setError(
          teamError.message ||
            "Failed to create team member. Check RLS on table 'team_members'."
        );
        setLoading(false);
        return;
      }

      // 6) Go to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Signup failed (unexpected)", err);
      const msg =
        err?.message ||
        (typeof err === "string" ? err : null) ||
        "Sign up failed due to an unexpected error.";
      setError(msg);
    } finally {
      setLoading(false);
    }
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
