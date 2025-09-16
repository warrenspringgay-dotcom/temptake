// src/app/login/LoginClient.tsx
"use client";

import { useActionState, useEffect, useRef } from "react";
import { signInAction } from "@/app/actions/auth";

type AuthResult = { ok: boolean; message?: string; redirect?: string };

const initialState: AuthResult | null = null;

export default function LoginClient({ redirectTo = "/" }: { redirectTo?: string }) {
  // Server action handler for the form
  const [state, formAction, pending] = useActionState(
    async (_prev: AuthResult | null, formData: FormData): Promise<AuthResult> => {
      // Expecting your server action to read "email" and "password" fields
      return await signInAction(formData);
    },
    initialState
  );

  // ✅ the missing ref
  const formRef = useRef<HTMLFormElement>(null);

  // On success, reset and navigate
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      const to = state.redirect || redirectTo || "/";
      // Using location.assign avoids Next/Router coupling here
      window.location.assign(to);
    }
  }, [state, redirectTo]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-sm text-gray-600">Email</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-600">Password</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
        />
      </div>

      {state && !state.ok && state.message ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={`h-10 rounded-xl px-4 text-sm font-medium text-white ${
          pending ? "bg-gray-400" : "bg-black hover:bg-gray-900"
        }`}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
