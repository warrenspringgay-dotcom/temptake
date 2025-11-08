"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const search = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Optional: check that we actually have a type= and token from Supabase
  const hasAccessToken =
    typeof window !== "undefined" &&
    (search.get("access_token") || search.get("code"));

  useEffect(() => {
    if (!hasAccessToken) {
      setErr(
        "Reset link is invalid or has expired. Please request a new one from the login page."
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

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

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setDone(true);

      // small delay so user can read message
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (e: any) {
      setErr(e?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold text-gray-900">
          Reset password
        </h1>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-gray-500">
              New password
            </span>
            <input
              type="password"
              className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
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
              disabled={loading}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className={`mt-2 flex h-10 w-full items-center justify-center rounded-2xl text-sm font-medium text-white ${
              loading
                ? "cursor-not-allowed bg-gray-500"
                : "bg-black hover:bg-gray-900"
            }`}
          >
            {loading ? "Saving…" : "Update password"}
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
