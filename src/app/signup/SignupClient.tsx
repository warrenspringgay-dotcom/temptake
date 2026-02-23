// src/app/signup/SignupClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type BootstrapOk = {
  ok: true;
  orgId: string;
  locationId: string;
};

function setCookie(name: string, value: string, days = 365) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
}

export default function SignupClient() {
  const router = useRouter();

  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [locationName, setLocationName] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 3 &&
      password.length >= 6 &&
      businessName.trim().length > 1
    );
  }, [email, password, businessName]);

  async function ensureSessionAfterSignup(): Promise<{
    accessToken: string;
    userId: string;
    userEmail: string | null;
  }> {
    // 1) Try signUp
    const signUpRes = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: ownerName.trim() || null,
        },
      },
    });

    if (signUpRes.error) throw signUpRes.error;

    // 2) If session is returned, great. If not, try immediate sign-in.
    let session = signUpRes.data.session;

    if (!session) {
      const signInRes = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInRes.error) {
        // If email confirmation is enabled, this is expected.
        throw new Error(
          "Account created. Check your email to confirm your address, then log in."
        );
      }
      session = signInRes.data.session;
    }

    if (!session?.access_token || !session.user?.id) {
      throw new Error("No auth session available after signup.");
    }

    return {
      accessToken: session.access_token,
      userId: session.user.id,
      userEmail: session.user.email ?? null,
    };
  }

  async function bootstrapOrg(accessToken: string): Promise<BootstrapOk> {
    const res = await fetch("/api/onboarding/bootstrap", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        ownerName: ownerName.trim() || undefined,
        businessName: businessName.trim() || undefined,
        locationName: locationName.trim() || undefined,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      const reason = data?.reason ?? "bootstrap-failed";
      const details = data?.details ?? data?.detail ?? "";
      throw new Error(
        details ? `${reason}: ${String(details)}` : String(reason)
      );
    }

    const orgId = String(data.orgId ?? "");
    const locationId = String(data.locationId ?? "");
    if (!orgId || !locationId) {
      throw new Error("Bootstrap succeeded but missing orgId/locationId.");
    }

    return { ok: true, orgId, locationId };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setErr(null);

    try {
      const auth = await ensureSessionAfterSignup();
      const boot = await bootstrapOrg(auth.accessToken);

      // ✅ Browser context for your existing client helpers
      localStorage.setItem("tt_active_location", boot.locationId);
      localStorage.setItem(
        "tt_active_org",
        JSON.stringify({ user_id: auth.userId, org_id: boot.orgId })
      );

      // ✅ Middleware context (server-side route gating)
      setCookie("tt_active_org", boot.orgId);
      setCookie("tt_active_location", boot.locationId);

      router.push("/dashboard?welcome=1");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold">Create your TempTake account</h1>
      <p className="mt-1 text-sm text-slate-600">
        You’re here because you enjoy pain. Let’s get you set up.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Owner name</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Warren Springay"
            autoComplete="name"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Business name *</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Pier Vista"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Location name</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="Main Location"
          />
          <p className="mt-1 text-xs text-slate-500">
            Optional. If blank, we’ll create/use the first location.
          </p>
        </div>

        <hr className="my-2 border-slate-200" />

        <div>
          <label className="text-sm font-medium">Email *</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Password *</label>
          <input
            type="password"
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            required
          />
        </div>

        {err ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className={[
            "w-full rounded-md px-4 py-2 text-sm font-medium",
            loading || !canSubmit
              ? "cursor-not-allowed bg-slate-200 text-slate-500"
              : "bg-black text-white hover:bg-slate-900",
          ].join(" ")}
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-xs text-slate-500">
          By continuing you agree to the Terms and Privacy Policy.
        </p>
      </form>
    </div>
  );
}