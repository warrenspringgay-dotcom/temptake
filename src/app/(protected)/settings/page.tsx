"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

function useAutoClear(
  value: string | null,
  clear: () => void,
  ms: number = 4500
) {
  useEffect(() => {
    if (!value) return;
    const t = setTimeout(clear, ms);
    return () => clearTimeout(t);
  }, [value, clear, ms]);
}

function hasCapsLock(e: React.KeyboardEvent<HTMLInputElement>) {
  // Some browsers return null for getModifierState
  try {
    return e.getModifierState && e.getModifierState("CapsLock");
  } catch {
    return false;
  }
}

export default function SettingsPage() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [initialFullName, setInitialFullName] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [capsWarning, setCapsWarning] = useState(false);

  // Password error modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  useAutoClear(success, () => setSuccess(null));
  useAutoClear(error, () => setError(null), 6500);

  /* Load user info */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingUser(true);
        setError(null);

        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        const user = data.user;
        if (!user) {
          setError("No session found.");
          return;
        }

        const userEmail = user.email ?? "";
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "";

        if (cancelled) return;

        setEmail(userEmail);
        setFullName(name);
        setInitialFullName(name);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Error loading account.");
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const trimmedFullName = useMemo(() => fullName.trim(), [fullName]);
  const profileDirty = useMemo(
    () => trimmedFullName !== (initialFullName ?? "").trim(),
    [trimmedFullName, initialFullName]
  );

  /* Update profile */
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!profileDirty) {
      setSuccess("No changes to save.");
      return;
    }

    if (!trimmedFullName) {
      setError("Full name cannot be empty.");
      return;
    }

    try {
      setSavingProfile(true);

      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmedFullName },
      });

      if (error) throw error;

      setInitialFullName(trimmedFullName);
      setSuccess("Profile updated.");
    } catch (e: any) {
      setError(e?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  function validatePassword(pw: string, confirm: string): string[] {
    const errs: string[] = [];

    if (!pw || pw.length < 8) {
      errs.push("Password must be at least 8 characters long.");
    }
    if (!/[A-Z]/.test(pw)) {
      errs.push("Password must include at least one uppercase letter.");
    }
    if (!/[a-z]/.test(pw)) {
      errs.push("Password must include at least one lowercase letter.");
    }
    if (!/[0-9]/.test(pw)) {
      errs.push("Password must include at least one number.");
    }
    if (!/[^A-Za-z0-9]/.test(pw)) {
      errs.push(
        "Password must include at least one special character (e.g. !, ?, @, #)."
      );
    }
    if (/\s/.test(pw)) {
      errs.push("Password cannot contain spaces.");
    }
    if (pw !== confirm) {
      errs.push("New password and confirmation do not match.");
    }

    return errs;
  }

  const livePwChecks = useMemo(() => {
    const pw = newPassword;
    const confirm = confirmPassword;

    return [
      { ok: pw.length >= 8, label: "At least 8 characters" },
      { ok: /[A-Z]/.test(pw), label: "One uppercase letter" },
      { ok: /[a-z]/.test(pw), label: "One lowercase letter" },
      { ok: /[0-9]/.test(pw), label: "One number" },
      { ok: /[^A-Za-z0-9]/.test(pw), label: "One special character" },
      { ok: !/\s/.test(pw), label: "No spaces" },
      { ok: pw.length > 0 && pw === confirm, label: "Matches confirmation" },
    ];
  }, [newPassword, confirmPassword]);

  const canSubmitPassword = useMemo(() => {
    if (!newPassword || !confirmPassword) return false;
    return validatePassword(newPassword, confirmPassword).length === 0;
  }, [newPassword, confirmPassword]);

  /* Change password */
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const errs = validatePassword(newPassword, confirmPassword);
    if (errs.length > 0) {
      setPasswordErrors(errs);
      setPasswordModalOpen(true);
      return;
    }

    try {
      setSavingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      setCapsWarning(false);
      setSuccess("Password changed successfully.");
    } catch (e: any) {
      setError(e?.message || "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSignOut() {
    setError(null);
    setSuccess(null);

    try {
      setSigningOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Let your auth guard redirect, but be safe:
      if (typeof window !== "undefined") window.location.href = "/login";
    } catch (e: any) {
      setError(e?.message || "Failed to sign out.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Account
            </div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              Settings
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Manage your account details and password.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={loadingUser || signingOut}
            className={cls(
              "h-9 rounded-xl px-3 text-xs font-semibold shadow-sm",
              "border border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-50",
              (loadingUser || signingOut) && "opacity-60 cursor-not-allowed"
            )}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* PROFILE SECTION */}
        <form
          onSubmit={handleSaveProfile}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Profile details
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                This name can be shown across the app for managers and reports.
              </p>
            </div>

            {profileDirty ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                Unsaved changes
              </span>
            ) : (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
                Up to date
              </span>
            )}
          </div>

          <div className="grid gap-3 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Email
              </label>
              <input
                disabled
                type="email"
                value={email}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                disabled={loadingUser}
                placeholder={loadingUser ? "Loading…" : "e.g. Alex Smith"}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={savingProfile || loadingUser || !profileDirty}
              className={cls(
                "rounded-2xl px-4 py-2 text-sm font-medium text-white shadow-sm",
                "bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500",
                (savingProfile || loadingUser || !profileDirty) &&
                  "opacity-60 cursor-not-allowed"
              )}
            >
              {savingProfile ? "Saving…" : "Save profile"}
            </button>

            {profileDirty ? (
              <button
                type="button"
                onClick={() => setFullName(initialFullName)}
                disabled={savingProfile || loadingUser}
                className={cls(
                  "rounded-2xl px-4 py-2 text-sm font-medium shadow-sm",
                  "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  (savingProfile || loadingUser) && "opacity-60 cursor-not-allowed"
                )}
              >
                Reset
              </button>
            ) : null}
          </div>
        </form>

        {/* PASSWORD SECTION */}
        <form
          onSubmit={handleChangePassword}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Change password
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Strong password required for compliance and safety. Annoying, but
                effective.
              </p>
            </div>

            {capsWarning ? (
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                Caps Lock is on
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                New password
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyUp={(e) => setCapsWarning(hasCapsLock(e))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {showNewPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Confirm new password
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyUp={(e) => setCapsWarning(hasCapsLock(e))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {showConfirmPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          {/* Live checklist */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Password checklist
            </div>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {livePwChecks.map((c) => (
                <div
                  key={c.label}
                  className={cls(
                    "flex items-center gap-2 text-xs font-medium",
                    c.ok ? "text-emerald-700" : "text-slate-600"
                  )}
                >
                  <span
                    className={cls(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold",
                      c.ok
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    )}
                  >
                    {c.ok ? "✓" : "•"}
                  </span>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPassword || !canSubmitPassword}
            className={cls(
              "rounded-2xl px-4 py-2 text-sm font-medium text-white shadow-sm",
              "bg-slate-900 hover:bg-black",
              (savingPassword || !canSubmitPassword) &&
                "opacity-60 cursor-not-allowed"
            )}
          >
            {savingPassword ? "Changing…" : "Change password"}
          </button>

          <p className="text-[11px] text-slate-500">
            Tip: Use a password manager. Humans are famously terrible at this.
          </p>
        </form>
      </div>

      {/* Password criteria error modal */}
      {passwordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3"
          onClick={() => setPasswordModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">
                Password requirements
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <p className="mb-2 text-xs text-slate-600">
              Your new password doesn&apos;t meet the required criteria:
            </p>

            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
              {passwordErrors.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="rounded-xl bg-slate-900 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-black"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
