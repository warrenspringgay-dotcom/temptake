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

  useEffect(() => {
    (async () => {
      setLoadingUser(true);
      setError(null);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const user = data.user;
        if (!user) {
          setError("No user session found.");
          return;
        }

        setEmail(user.email ?? "");
        const meta = user.user_metadata || {};
        setFullName(meta.full_name || meta.name || "");
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load account details.");
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

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
      console.error(e);
      setError(e?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
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
      console.error(e);
      setError(e?.message || "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
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

      {/* Profile */}
      <form
        onSubmit={handleSaveProfile}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-slate-900">
          Profile details
        </h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 shadow-sm"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Email address is managed by your account and can&apos;t be
              changed here.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loadingUser}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
              placeholder="Your name"
            />
          </div>
        </div>
        <div className="pt-1">
          <button
            type="submit"
            disabled={savingProfile || loadingUser}
            className={cls(
              "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-500/30",
              "bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500",
              (savingProfile || loadingUser) && "opacity-70 cursor-not-allowed"
            )}
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>

      {/* Password */}
      <form
        onSubmit={handleChangePassword}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-slate-900">
          Change password
        </h2>
        <p className="text-xs text-slate-500">
          Choose a strong password you don&apos;t use anywhere else. Minimum 8
          characters.
        </p>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loadingUser}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loadingUser}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            />
          </div>
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={savingPassword || loadingUser}
            className={cls(
              "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium text-white shadow-sm shadow-slate-900/20",
              "bg-slate-900 hover:bg-black",
              (savingPassword || loadingUser) && "opacity-70 cursor-not-allowed"
            )}
          >
            {savingPassword ? "Changing…" : "Change password"}
          </button>
        </div>
      </form>
    </div>
  );
}
