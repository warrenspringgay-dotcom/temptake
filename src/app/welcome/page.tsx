// src/app/welcome/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type TeamMemberRow = {
  org_id: string;
  name: string | null;
};

export default function WelcomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [initials, setInitials] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userRes.user) {
          setError("You must be signed in via the email link first.");
          setLoading(false);
          return;
        }

        const user = userRes.user;
        const cleanEmail = user.email?.toLowerCase() ?? null;
        setEmail(cleanEmail);

        if (!cleanEmail) {
          setError("No email found on your account.");
          setLoading(false);
          return;
        }

        // Find the team_members row that matches this invite email
        const { data: tm, error: tmErr } = await supabase
          .from("team_members")
          .select("org_id,name")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (tmErr || !tm) {
          setError(
            "We couldn’t find an invite for this email. Ask the owner to invite you again."
          );
          setLoading(false);
          return;
        }

        const org_id = (tm as TeamMemberRow).org_id;
        setOrgId(org_id);
        setName(tm.name ?? "");
      } catch (e: any) {
        setError(e?.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!orgId || !email) {
      setError("No organisation found for this invite.");
      return;
    }
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!initials.trim()) {
      setError("Enter your initials.");
      return;
    }
    if (!password.trim()) {
      setError("Set a password.");
      return;
    }

    try {
      setSaving(true);

      // 1) Get current auth user id
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) throw userErr || new Error("No user");

      const userId = userRes.user.id;

      // 2) Ensure user_orgs membership exists
      await supabase.from("user_orgs").upsert(
        {
          org_id: orgId,
          user_id: userId,
          is_active: true,
        },
        { onConflict: "org_id,user_id" }
      );

      // 3) Update their team_members row (name + initials)
      await supabase
        .from("team_members")
        .update({
          name: name.trim(),
          initials: initials.trim().toUpperCase(),
          active: true,
        })
        .eq("org_id", orgId)
        .eq("email", email);

      // 4) Let them create a password + set full_name in auth
      const { error: updErr } = await supabase.auth.updateUser({
        password: password,
        data: {
          full_name: name.trim(),
        },
      });
      if (updErr) throw updErr;

      // 5) Go to dashboard using that org
      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Failed to finish setup.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-600">Loading your invite…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-2xl bg-white p-4 text-sm text-red-800 shadow">
          <div className="mb-2 text-base font-semibold text-slate-900">
            Problem with your invite
          </div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleComplete}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-sm"
      >
        <h1 className="mb-3 text-lg font-semibold text-slate-900">
          Finish setting up your account
        </h1>

        <p className="mb-4 text-xs text-slate-500">
          You’ve been invited to join this business. Confirm your details and
          choose a password.
        </p>

        <div className="mb-3 text-xs text-slate-500">
          Signing in as <span className="font-medium">{email}</span>
        </div>

        <label className="mb-2 block text-sm">
          <span className="mb-1 block text-xs text-slate-500">Name</span>
          <input
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="mb-2 block text-sm">
          <span className="mb-1 block text-xs text-slate-500">Initials</span>
          <input
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm uppercase"
            value={initials}
            onChange={(e) => setInitials(e.target.value.toUpperCase())}
          />
        </label>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-xs text-slate-500">Password</span>
          <input
            type="password"
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-1 flex h-10 w-full items-center justify-center rounded-2xl bg-black text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
