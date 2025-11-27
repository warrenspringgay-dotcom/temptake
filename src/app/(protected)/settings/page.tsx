"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export default function SettingsPage() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password error modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  /* Load user info */
  useEffect(() => {
    (async () => {
      try {
        setLoadingUser(true);
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        const user = data.user;
        if (!user) {
          setError("No session found.");
          return;
        }

        setEmail(user.email ?? "");
        setFullName(
          user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            ""
        );
      } catch (e: any) {
        setError(e?.message || "Error loading account.");
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  /* Update profile */
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setSavingProfile(true);

      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      if (error) throw error;

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
      errs.push("Password must include at least one special character (e.g. !, ?, @, #).");
    }
    if (/\s/.test(pw)) {
      errs.push("Password cannot contain spaces.");
    }
    if (pw !== confirm) {
      errs.push("New password and confirmation do not match.");
    }

    return errs;
  }

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
      setSuccess("Password changed successfully.");
    } catch (e: any) {
      setError(e?.message || "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
        {/* HEADER */}
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
          <h2 className="text-sm font-semibold text-slate-900">
            Profile details
          </h2>

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
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                disabled={loadingUser}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className={cls(
              "rounded-2xl px-4 py-2 text-sm font-medium text-white shadow-sm",
              "bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500",
              savingProfile && "opacity-60 cursor-not-allowed"
            )}
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </form>

        {/* PASSWORD SECTION */}
        <form
          onSubmit={handleChangePassword}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">
            Change password
          </h2>

          <p className="text-xs text-slate-500">
            Password must be at least 8 characters, include upper and lower
            case letters, a number and a special character, and have no spaces.
          </p>

          <div className="grid gap-3 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className={cls(
              "rounded-2xl px-4 py-2 text-sm font-medium text-white shadow-sm",
              "bg-slate-900 hover:bg-black",
              savingPassword && "opacity-60 cursor-not-allowed"
            )}
          >
            {savingPassword ? "Changing…" : "Change password"}
          </button>
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
