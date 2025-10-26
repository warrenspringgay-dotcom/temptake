// src/app/login/LoginClient.tsx
"use client";

import React, { useActionState, useEffect } from "react";
import { signInAction, type AuthResult } from "@/app/actions/auth";

const initialState: AuthResult = { ok: false };

export default function LoginClient() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  useEffect(() => {
    if (state?.ok && state.redirect) {
      window.location.href = state.redirect;
    }
  }, [state]);

  return (
    <form action={formAction} className="max-w-sm space-y-3">
      <div className="space-y-1">
        <label className="text-sm text-gray-600">Email</label>
        <input
          name="email"
          type="email"
          className="w-full rounded-xl border px-3 py-2"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-gray-600">Password</label>
        <input
          name="password"
          type="password"
          className="w-full rounded-xl border px-3 py-2"
          required
        />
      </div>

      {state?.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
