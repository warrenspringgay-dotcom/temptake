// src/app/login/LoginClient.tsx
"use client";

import { useActionState, useEffect } from "react";
import { signInAction } from "@/app/actions/auth";

type AuthResult = { ok: boolean; message?: string; redirect?: string };
const initialState: AuthResult = { ok: false };

export default function LoginClient({ redirectTo = "/" }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(
    signInAction,
    initialState
  );

  useEffect(() => {
    if (state.ok && state.redirect) {
      window.location.href = state.redirect;
    }
  }, [state]);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="space-y-2">
        <label className="block text-sm">Email</label>
        <input
          name="email"
          type="email"
          required
          className="w-full rounded-md border px-3 py-2"
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Password</label>
        <input
          name="password"
          type="password"
          required
          className="w-full rounded-md border px-3 py-2"
          placeholder="••••••••"
        />
      </div>

      {state.message && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
