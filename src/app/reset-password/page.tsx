"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

function parseHashParams(hash: string) {
  // hash like: #access_token=...&refresh_token=...&type=recovery
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const sp = new URLSearchParams(h);
  return {
    access_token: sp.get("access_token"),
    refresh_token: sp.get("refresh_token"),
    type: sp.get("type"),
  };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const search = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const code = useMemo(() => search.get("code"), [search]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setErr(null);
        setBooting(true);

        // 1) If we already have a session, we're good.
        const { data: existing } = await supabase.auth.getSession();
        if (cancelled) return;
        if (existing.session) {
          setBooting(false);
          return;
        }

        // 2) Modern flow: ?code=... (PKCE)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;

          if (error) {
            setErr(
              "Reset link is invalid or has expired. Please request a new one from the login page."
            );
            setBooting(false);
            return;
          }

          setBooting(false);
          return;
        }

        // 3) Older flow: tokens in URL hash fragment
        if (typeof window !== "undefined" && window.location.hash) {
          const { access_token, refresh_token } = parseHashParams(
            window.location.hash
          );

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (cancelled) return;

            if (error) {
              setErr(
                "Reset link is invalid or has expired. Please request a new one from the login page."
              );
              setBooting(false);
              return;
            }

            setBooting(false);
            return;
          }
        }

        // 4) Nothing usable found
        setErr(
          "Reset link is invalid or has expired. Please request a new one from the login page."
        );
        setBooting(false);
      } catch {
        if (cancelled) return;
        setErr(
          "Could not validate reset link. Please request a new one from the login page."
        );
        setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (booting) return;

    if (!password || password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setDone(true);

      // optional but tidy: kick them back to login with clean state
      await supabase.auth.signOut().catch(() => {});

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (e: any) {
      setErr(e?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  const disableForm = booting || !!err || loading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold text-gray-900">
          Reset password
        </h1>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-gray-500">New password</span>
            <input
              type="password"
              className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={disableForm}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs text-gray-500">
              Confirm password
            </span>
            <input
              type="password"
              className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={disableForm}
            />
          </label>

          <button
            type="submit"
            disabled={disableForm}
            className={`mt-2 flex h-10 w-full items-center justify-center rounded-2xl text-sm font-medium text-white ${
              disableForm ? "cursor-not-allowed bg-gray-500" : "bg-black hover:bg-gray-900"
            }`}
          >
            {booting ? "Checking link…" : loading ? "Saving…" : "Update password"}
          </button>
        </form>

        <div className="mt-3 space-y-1 text-xs">
          {err && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
              {err}
            </div>
          )}
          {done && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-900">
              Password updated. Redirecting to sign in…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
