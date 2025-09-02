// src/app/login/LoginClient.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInAction, signUpAction } from "@/app/actions/auth";

export default function LoginClient() {
  const sp = useSearchParams();
  const tabParam = sp.get("tab");
  const error = sp.get("error");
  const notice = sp.get("notice");
  const redirectTo = sp.get("redirect") || "/";

  const [tab, setTab] = React.useState<"signin" | "signup">(
    tabParam === "signup" ? "signup" : "signin"
  );

  const signInRef = React.useRef<HTMLFormElement>(null);
  const signUpRef = React.useRef<HTMLFormElement>(null);

  return (
    <div className="mx-auto max-w-sm p-6">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold">Welcome</h1>
        <p className="text-sm text-slate-600">Sign in or create your account</p>
      </div>

      {(error || notice) && (
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            error ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {error ?? notice}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 rounded-md border p-1 text-sm">
        <button
          className={`rounded-md py-1.5 ${tab === "signin" ? "bg-gray-900 text-white" : "text-slate-700 hover:bg-gray-100"}`}
          onClick={() => setTab("signin")}
        >
          Sign in
        </button>
        <button
          className={`rounded-md py-1.5 ${tab === "signup" ? "bg-gray-900 text-white" : "text-slate-700 hover:bg-gray-100"}`}
          onClick={() => setTab("signup")}
        >
          Create account
        </button>
      </div>

      {tab === "signin" ? (
        <form ref={signInRef} action={signInAction} className="space-y-3">
          <input type="hidden" name="redirect" value={redirectTo} />
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button className="w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90">
            Sign in
          </button>
        </form>
      ) : (
        <form ref={signUpRef} action={signUpAction} className="space-y-3">
          <input type="hidden" name="redirect" value={redirectTo} />
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>
          <button className="w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90">
            Create account
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-slate-600 hover:underline">
          ← Back to app
        </Link>
      </div>
    </div>
  );
}
